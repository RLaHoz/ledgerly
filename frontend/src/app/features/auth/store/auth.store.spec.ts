import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import { SessionResponse } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { SessionTokenService } from '../services/session-token.service';
import {
  LS_BANK_CONNECTION_STATE_KEY,
  LS_HAS_CONNECTED_BANK_KEY,
  LS_ONBOARDING_COMPLETED_KEY,
  LS_ONBOARDING_CURRENT_STEP_KEY,
  LS_PENDING_GOOGLE_STATE_KEY,
} from './auth.state';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let authService: jasmine.SpyObj<AuthService>;
  let tokenService: jasmine.SpyObj<SessionTokenService>;

  beforeEach(() => {
    localStorage.clear();

    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'refreshSession',
      'logoutSession',
      'startGoogleAuth',
      'startBankConsent',
      'verifyBankConsent',
      'completeOnboarding',
    ]);

    tokenService = jasmine.createSpyObj<SessionTokenService>('SessionTokenService', [
      'setTokens',
      'clearTokens',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authService },
        { provide: SessionTokenService, useValue: tokenService },
        {
          provide: RuntimeConfigService,
          useValue: {
            getApiUrl: () => 'http://localhost:3000/api',
            isLocalhostApiUrl: () => true,
          },
        },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('boots completed users with a connected bank to dashboard', () => {
    store.adoptSession(
      buildSession({ onboardingCompleted: true, bankConnectionState: 'connected' }),
    );

    expect(store.getBootstrapTargetRoute('/auth/login')).toBe('/dashboard');
    expect(store.getPostAuthTargetRoute()).toBe('/dashboard');
    expect(store.canAccessDashboard()).toBeTrue();
  });

  it('blocks authenticated users without bank at connect-bank', () => {
    store.adoptSession(
      buildSession({
        bankConnectionState: 'never_connected',
        onboardingCompleted: false,
      }),
    );

    expect(store.requiresBankLogin()).toBeTrue();
    expect(store.getBootstrapTargetRoute('/dashboard')).toBe('/auth/connect-bank');
  });

  it('keeps auth subtree reachable when there is no refresh cookie to restore', () => {
    authService.refreshSession.and.returnValue(
      throwError(() => ({ status: 401 })),
    );

    store.ensureSession();

    expect(authService.refreshSession).toHaveBeenCalled();
    expect(store.hasSession()).toBeFalse();
    expect(store.getBootstrapTargetRoute('/auth')).toBeNull();
    expect(store.status()).toBe('idle');
  });

  it('preserves the pending Google state when bootstrap refresh returns 401 during callback recovery', () => {
    authService.startGoogleAuth.and.returnValue(
      of({
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'google-state-1',
      }),
    );
    authService.refreshSession.and.returnValue(
      throwError(() => ({ status: 401 })),
    );

    store.requestGoogleAuthorizeUrl();
    store.ensureSession();

    expect(store.pendingGoogleState()).toBe('google-state-1');
    expect(localStorage.getItem(LS_PENDING_GOOGLE_STATE_KEY)).toBe('google-state-1');
    expect(store.status()).toBe('idle');
  });

  it('captures onboarding completion errors and clears the loading flag', () => {
    authService.completeOnboarding.and.returnValue(
      throwError(() => new Error('Unable to complete onboarding')),
    );

    store.completeOnboarding();

    expect(store.isCompletingOnboarding()).toBeFalse();
    expect(store.onboardingCompletionError()).toBe('Unable to complete onboarding');
  });

  it('starts Google auth and persists the pending state', () => {
    authService.startGoogleAuth.and.returnValue(
      of({
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'google-state-1',
      }),
    );

    store.requestGoogleAuthorizeUrl();

    expect(store.pendingGoogleState()).toBe('google-state-1');
    expect(store.googleAuthorizeUrl()).toContain('accounts.google.com');
    expect(localStorage.getItem(LS_PENDING_GOOGLE_STATE_KEY)).toBe('google-state-1');
  });

  it('starts bank consent for authenticated users', () => {
    authService.startBankConsent.and.returnValue(
      of({
        authorizeUrl: 'https://consent.example.com',
        state: 'state-1',
      }),
    );

    store.requestBankAuthorizeUrl();

    expect(store.pendingConsentState()).toBe('state-1');
    expect(store.bankAuthorizeUrl()).toBe('https://consent.example.com');
  });

  it('expires the connected session without creating another session', () => {
    authService.logoutSession.and.returnValue(of({ success: true }));
    store.adoptSession(
      buildSession({ onboardingCompleted: true, bankConnectionState: 'connected' }),
    );

    store.expireSessionByInactivity();

    expect(authService.logoutSession).toHaveBeenCalledWith();
    expect(store.hasSession()).toBeFalse();
    expect(store.bankConnectionState()).toBeNull();
  });

  it('tracks explicit bank disconnection without fabricating a session', () => {
    store.setBankConnectionState('reconnect_required');

    expect(store.bankConnectionState()).toBe('reconnect_required');
    expect(store.hasConnectedBank()).toBeFalse();
    expect(store.hasSession()).toBeFalse();
    expect(localStorage.getItem(LS_BANK_CONNECTION_STATE_KEY)).toBe('reconnect_required');
    expect(localStorage.getItem(LS_HAS_CONNECTED_BANK_KEY)).toBeNull();
    expect(localStorage.getItem(LS_ONBOARDING_COMPLETED_KEY)).toBe('false');
  });

  it('routes reconnect-required users back to connect-bank after session adoption', () => {
    store.adoptSession(
      buildSession({
        onboardingCompleted: true,
        bankConnectionState: 'reconnect_required',
      }),
    );

    expect(store.getPostAuthTargetRoute()).toBe('/auth/connect-bank');
    expect(store.getBootstrapTargetRoute('/dashboard')).toBe('/auth/connect-bank');
  });

  it('preserves onboarding step across a reconnect-required transition', () => {
    store.adoptSession(
      buildSession({
        onboardingCompleted: false,
        bankConnectionState: 'connected',
      }),
    );
    store.setOnboardingCurrentStep('categories');

    store.setBankConnectionState('reconnect_required');

    expect(store.onboardingCurrentStep()).toBe('categories');
    expect(localStorage.getItem(LS_ONBOARDING_CURRENT_STEP_KEY)).toBe('categories');

    store.adoptSession(
      buildSession({
        onboardingCompleted: false,
        bankConnectionState: 'connected',
      }),
    );

    expect(store.getPostAuthTargetRoute()).toBe('/onboarding/categories');
  });
});

function buildSession(overrides: Partial<SessionResponse> = {}): SessionResponse {
  const bankConnectionState = overrides.bankConnectionState ?? 'connected';

  return {
    user: {
      id: 'user-1',
      roles: [],
      email: 'user@example.com',
      fullName: 'User Example',
      avatarUrl: null,
    },
    accessToken: 'access-token',
    accessTokenExpiresInSeconds: 3600,
    onboardingCompleted: false,
    bankConnectionState,
    hasConnectedBank: bankConnectionState === 'connected',
    ...overrides,
  };
}
