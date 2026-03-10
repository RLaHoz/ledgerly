/* tslint:disable:no-unused-variable */

import { Router } from '@angular/router';
import { TestBed, inject } from '@angular/core/testing';
import { EMPTY, Subject } from 'rxjs';
import { AuthStore } from '../../store/auth.store';
import { AuthService } from '../auth.service';
import { BasiqConsentUiService } from './basiq-consent-ui.service';
import { BankLinkCoordinatorService } from './bank-link-coordinator.service';


describe('Service: BankLinkCoordinator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BankLinkCoordinatorService,
        {
          provide: Router,
          useValue: {
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
          },
        },
        {
          provide: AuthStore,
          useValue: {
            isLoading: () => false,
            requestBankAuthorizeUrl: jasmine
              .createSpy('requestBankAuthorizeUrl')
              .and.callFake(() => undefined),
            bankAuthorizeUrl: () => null,
            pendingConsentState: () => null,
            setBankLinkError: jasmine.createSpy('setBankLinkError').and.callFake(() => undefined),
            resetBankLinkFlow: jasmine.createSpy('resetBankLinkFlow').and.callFake(() => undefined),
            markBankConnected: jasmine.createSpy('markBankConnected').and.callFake(() => undefined),
            user: () => null,
            getBootstrapTargetRoute: () => null,
          },
        },
        {
          provide: AuthService,
          useValue: {
            verifyBankConsent: jasmine.createSpy('verifyBankConsent').and.returnValue(EMPTY),
          },
        },
        {
          provide: BasiqConsentUiService,
          useValue: {
            callback$: new Subject<unknown>(),
            cancelled$: new Subject<void>(),
            initialize: jasmine.createSpy('initialize').and.returnValue(EMPTY),
            openConsent: jasmine.createSpy('openConsent').and.returnValue(EMPTY),
            parseCallbackFromUrl: jasmine.createSpy('parseCallbackFromUrl').and.returnValue(null),
          },
        },
      ],
    });
  });

  it('should ...', inject([BankLinkCoordinatorService], (service: BankLinkCoordinatorService) => {
    expect(service).toBeTruthy();
  }));
});
