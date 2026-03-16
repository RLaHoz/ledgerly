import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { of, Subject } from 'rxjs';
import { AuthStore } from '../../store/auth.store';
import { AuthService } from '../auth.service';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { BankLinkCoordinatorService } from './bank-link-coordinator.service';

describe('BankLinkCoordinatorService', () => {
  const callback$ = new Subject<unknown>();
  const cancelled$ = new Subject<void>();
  const routerMock = {
    navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
  };
  const authStoreMock = {
    isLoading: () => false,
    requestBankAuthorizeUrl: jasmine
      .createSpy('requestBankAuthorizeUrl')
      .and.callFake(() => undefined),
    bankAuthorizeUrl: () => null,
    pendingConsentState: () => 'state-1',
    setBankLinkError: jasmine.createSpy('setBankLinkError').and.callFake(() => undefined),
    resetBankLinkFlow: jasmine.createSpy('resetBankLinkFlow').and.callFake(() => undefined),
    markBankConnected: jasmine.createSpy('markBankConnected').and.callFake(() => undefined),
    user: () => ({ id: 'user-1' }),
    getBootstrapTargetRoute: () => '/dashboard',
  };
  const authServiceMock = {
    verifyBankConsent: jasmine.createSpy('verifyBankConsent'),
  };
  const consentUiMock = {
    callback$,
    cancelled$,
    initialize: jasmine.createSpy('initialize').and.returnValue(of(void 0)),
    openConsent: jasmine.createSpy('openConsent').and.returnValue(of(void 0)),
    closeConsent: jasmine.createSpy('closeConsent').and.returnValue(of(void 0)),
    parseCallbackFromUrl: jasmine.createSpy('parseCallbackFromUrl'),
  };

  beforeEach(() => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    authStoreMock.pendingConsentState = () => 'state-1';
    routerMock.navigateByUrl.calls.reset();
    authStoreMock.requestBankAuthorizeUrl.calls.reset();
    authStoreMock.setBankLinkError.calls.reset();
    authStoreMock.resetBankLinkFlow.calls.reset();
    authStoreMock.markBankConnected.calls.reset();
    authServiceMock.verifyBankConsent.calls.reset();
    consentUiMock.initialize.calls.reset();
    consentUiMock.openConsent.calls.reset();
    consentUiMock.closeConsent.calls.reset();
    consentUiMock.parseCallbackFromUrl.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        BankLinkCoordinatorService,
        { provide: Router, useValue: routerMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: BasiqConsentUiService, useValue: consentUiMock },
      ],
    });
  });

  it('retries consent verification when provider is still processing and then succeeds', fakeAsync(() => {
    const service = TestBed.inject(BankLinkCoordinatorService);
    consentUiMock.parseCallbackFromUrl.and.returnValue({
      rawUrl: 'http://localhost:8100/auth/callback?state=state-1&jobId=job-1',
      state: 'state-1',
      jobId: 'job-1',
      jobIds: [],
    });
    authServiceMock.verifyBankConsent.and.returnValues(
      of({
        success: false,
        failedJobIds: [],
        pendingJobIds: ['job-1'],
        message: 'Consent is still processing. Please retry in a moment.',
      }),
      of({
        success: true,
        failedJobIds: [],
        pendingJobIds: [],
        message: 'ok',
        context: {
          appUserId: 'user-1',
          providerCode: 'BASIQ',
          providerUserId: 'provider-user-1',
          providerConnectionIds: ['connection-1'],
          jobIds: ['job-1'],
          isFirstSuccessfulConsentForUser: true,
          isFirstBankConnectionForUser: true,
        },
      }),
    );

    expect(service.consumeCallbackUrl('ignored')).toBeTrue();
    tick(1500);

    expect(authServiceMock.verifyBankConsent).toHaveBeenCalledTimes(2);
    expect(authStoreMock.markBankConnected).toHaveBeenCalledWith({
      isFirstBankConnectionForUser: true,
    });
    expect(authStoreMock.setBankLinkError).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
  }));

  it('fails after the retry window is exhausted while jobs remain pending', fakeAsync(() => {
    const service = TestBed.inject(BankLinkCoordinatorService);
    consentUiMock.parseCallbackFromUrl.and.returnValue({
      rawUrl: 'http://localhost:8100/auth/callback?state=state-1&jobId=job-1',
      state: 'state-1',
      jobId: 'job-1',
      jobIds: [],
    });
    authServiceMock.verifyBankConsent.and.returnValues(
      ...Array.from({ length: 20 }, () =>
        of({
          success: false,
          failedJobIds: [],
          pendingJobIds: ['job-1'],
          message: 'Consent is still processing. Please retry in a moment.',
        }),
      ),
    );

    expect(service.consumeCallbackUrl('ignored')).toBeTrue();
    tick(1500 * 19);

    expect(authServiceMock.verifyBankConsent).toHaveBeenCalledTimes(20);
    expect(authStoreMock.markBankConnected).not.toHaveBeenCalled();
    expect(authStoreMock.setBankLinkError).toHaveBeenCalledWith(
      'Consent verification is taking longer than expected. Please retry in a moment.',
    );
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/auth', { replaceUrl: true });
  }));

  it('allows native callback verification when local pending state is missing', fakeAsync(() => {
    const service = TestBed.inject(BankLinkCoordinatorService);
    (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(true);
    consentUiMock.parseCallbackFromUrl.and.returnValue({
      rawUrl: 'ledgerly://auth/callback?state=state-recovered&jobId=job-1',
      state: 'state-recovered',
      jobId: 'job-1',
      jobIds: [],
    });
    (authStoreMock.pendingConsentState as any) = () => null;
    authServiceMock.verifyBankConsent.and.returnValue(
      of({
        success: true,
        failedJobIds: [],
        pendingJobIds: [],
        message: 'ok',
        context: {
          appUserId: 'user-1',
          providerCode: 'BASIQ',
          providerUserId: 'provider-user-1',
          providerConnectionIds: ['connection-1'],
          jobIds: ['job-1'],
          isFirstSuccessfulConsentForUser: true,
          isFirstBankConnectionForUser: true,
        },
      }),
    );

    expect(service.consumeCallbackUrl('ignored')).toBeTrue();
    tick();

    expect(authServiceMock.verifyBankConsent).toHaveBeenCalledWith({
      state: 'state-recovered',
      jobIds: ['job-1'],
    });
    expect(authStoreMock.setBankLinkError).not.toHaveBeenCalled();
    expect(authStoreMock.markBankConnected).toHaveBeenCalled();
    expect(consentUiMock.closeConsent).toHaveBeenCalled();
  }));
});
