import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { of, Subject, throwError } from 'rxjs';
import { AuthStore } from '../../store/auth.store';
import { AuthService } from '../auth.service';
import { AuthFlowLoggerService } from '../auth-flow-logger.service';
import { GoogleAuthCoordinatorService } from './google-auth-coordinator.service';
import { GoogleAuthUiService } from './google-auth-ui.service';
import { AUTH_ENTRY_ROUTE } from '../../store/auth-route.constants';

describe('GoogleAuthCoordinatorService', () => {
  const callback$ = new Subject<unknown>();
  const cancelled$ = new Subject<void>();
  const routerMock = {
    navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
  };
  const authStoreMock: any = {
    isLoading: () => false,
    requestGoogleAuthorizeUrl: jasmine.createSpy('requestGoogleAuthorizeUrl'),
    googleAuthorizeUrl: () => null,
    pendingGoogleState: () => 'google-state-1',
    setGoogleAuthError: jasmine.createSpy('setGoogleAuthError'),
    resetGoogleAuthFlow: jasmine.createSpy('resetGoogleAuthFlow'),
    adoptSession: jasmine.createSpy('adoptSession'),
    getPostAuthTargetRoute: () => '/auth/connect-bank',
  };
  const authServiceMock = {
    completeGoogleAuth: jasmine.createSpy('completeGoogleAuth'),
  };
  const loggerMock = {
    info: jasmine.createSpy('info'),
    warn: jasmine.createSpy('warn'),
    error: jasmine.createSpy('error'),
  };
  const googleAuthUiMock = {
    callback$,
    cancelled$,
    initialize: jasmine.createSpy('initialize').and.returnValue(of(void 0)),
    openAuth: jasmine.createSpy('openAuth').and.returnValue(of(void 0)),
    closeAuth: jasmine.createSpy('closeAuth').and.returnValue(of(void 0)),
    parseCallbackFromUrl: jasmine.createSpy('parseCallbackFromUrl'),
  };

  beforeEach(() => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    routerMock.navigateByUrl.calls.reset();
    authStoreMock.requestGoogleAuthorizeUrl.calls.reset();
    authStoreMock.setGoogleAuthError.calls.reset();
    authStoreMock.resetGoogleAuthFlow.calls.reset();
    authStoreMock.adoptSession.calls.reset();
    authServiceMock.completeGoogleAuth.calls.reset();
    loggerMock.info.calls.reset();
    loggerMock.warn.calls.reset();
    loggerMock.error.calls.reset();
    googleAuthUiMock.initialize.calls.reset();
    googleAuthUiMock.openAuth.calls.reset();
    googleAuthUiMock.closeAuth.calls.reset();
    googleAuthUiMock.parseCallbackFromUrl.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        GoogleAuthCoordinatorService,
        { provide: Router, useValue: routerMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthFlowLoggerService, useValue: loggerMock },
        { provide: GoogleAuthUiService, useValue: googleAuthUiMock },
      ],
    });
  });

  it('starts Google auth from store request', () => {
    const service = TestBed.inject(GoogleAuthCoordinatorService);

    service.startGoogleAuth();

    expect(authStoreMock.requestGoogleAuthorizeUrl).toHaveBeenCalledTimes(1);
  });

  it('adopts the completed Google session and routes to bank connect', fakeAsync(() => {
    const service = TestBed.inject(GoogleAuthCoordinatorService);
    googleAuthUiMock.parseCallbackFromUrl.and.returnValue({
      rawUrl: 'http://localhost:8100/auth/google/callback?state=google-state-1&code=auth-code-1',
      state: 'google-state-1',
      code: 'auth-code-1',
      error: null,
      errorDescription: null,
    });
    authServiceMock.completeGoogleAuth.and.returnValue(
      of({
        user: {
          id: 'user-1',
          roles: [],
          email: 'user@example.com',
          fullName: 'User Example',
          avatarUrl: null,
        },
        accessToken: 'access-1',
        accessTokenExpiresInSeconds: 900,
        onboardingCompleted: false,
        bankConnectionState: 'never_connected',
        hasConnectedBank: false,
      }),
    );

    expect(service.consumeCallbackUrl('ignored')).toBeTrue();
    tick();

    expect(authServiceMock.completeGoogleAuth).toHaveBeenCalledWith({
      state: 'google-state-1',
      code: 'auth-code-1',
      error: undefined,
      errorDescription: undefined,
    });
    expect(authStoreMock.adoptSession).toHaveBeenCalled();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/auth/connect-bank', {
      replaceUrl: true,
    });
  }));

  it('fails the flow when Google auth completion errors', fakeAsync(() => {
    const service = TestBed.inject(GoogleAuthCoordinatorService);
    googleAuthUiMock.parseCallbackFromUrl.and.returnValue({
      rawUrl: 'http://localhost:8100/auth/google/callback?state=google-state-1&code=auth-code-1',
      state: 'google-state-1',
      code: 'auth-code-1',
      error: null,
      errorDescription: null,
    });
    authServiceMock.completeGoogleAuth.and.returnValue(
      throwError(() => new Error('Google exchange failed')),
    );

    expect(service.consumeCallbackUrl('ignored')).toBeTrue();
    tick();

    expect(authStoreMock.setGoogleAuthError).toHaveBeenCalledWith('Google exchange failed');
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith(AUTH_ENTRY_ROUTE, {
      replaceUrl: true,
    });
  }));
});
