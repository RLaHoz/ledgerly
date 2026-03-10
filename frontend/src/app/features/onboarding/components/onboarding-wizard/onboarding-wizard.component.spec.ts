import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { AuthStore } from '../../../auth/store/auth.store';
import { OnboardingWizardStore } from '../../store/onboarding-wizard.store';
import { OnboardingWizardComponent } from './onboarding-wizard.component';

class MockOnboardingWizardStore {
  readonly isParsing = signal(false);
  readonly isImportReady = signal(true);
  readonly loadUserTransactionsError = signal<string | null>(null);
  readonly bankReconnectionRequired = signal(false);
  readonly directDataFromBankAccounts = signal(true);
  readonly confirmAccepted = signal(true);
  readonly uncategorizedCount = signal(0);
  readonly isSavingClassifications = signal(false);
  readonly saveClassificationsError = signal<string | null>(null);
  readonly saveCompletedAt = signal<string | null>(null);

  readonly loadUserTransactions = jasmine
    .createSpy('loadUserTransactions')
    .and.callFake(() => undefined);

  readonly setFilter = jasmine
    .createSpy('setFilter')
    .and.callFake(() => undefined);

  readonly resetSaveTransactionAssignmentsState = jasmine
    .createSpy('resetSaveTransactionAssignmentsState')
    .and.callFake(() => {
      this.saveClassificationsError.set(null);
      this.saveCompletedAt.set(null);
    });

  readonly saveTransactionAssignments = jasmine
    .createSpy('saveTransactionAssignments')
    .and.callFake(() => {
      this.isSavingClassifications.set(true);
    });

  readonly acknowledgeBankReconnectionRequired = jasmine
    .createSpy('acknowledgeBankReconnectionRequired')
    .and.callFake(() => {
      this.bankReconnectionRequired.set(false);
    });
}

describe('OnboardingWizardComponent (finish flow)', () => {
  let fixture: ComponentFixture<OnboardingWizardComponent>;
  let component: OnboardingWizardComponent;
  let wizardStore: MockOnboardingWizardStore;
  let router: Pick<Router, 'navigate' | 'navigateByUrl'>;
  let authStore: {
    setOnboardingCurrentStep: jasmine.Spy;
    completeOnboarding: jasmine.Spy;
    markBankConnected: jasmine.Spy;
    resetBankLinkFlow: jasmine.Spy;
    isCompletingOnboarding: () => boolean;
    onboardingCompletionError: () => string | null;
    onboardingCompleted: () => boolean;
  };
  let isCompletingOnboardingSignal = signal(false);
  let onboardingCompletionErrorSignal = signal<string | null>(null);
  let onboardingCompletedSignal = signal(false);

  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(async () => {
    routeParamMap$ = new BehaviorSubject(convertToParamMap({ step: 'confirm' }));
    routerEvents$ = new Subject<NavigationEnd>();
    wizardStore = new MockOnboardingWizardStore();
    isCompletingOnboardingSignal = signal(false);
    onboardingCompletionErrorSignal = signal<string | null>(null);
    onboardingCompletedSignal = signal(false);

    router = {
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };

    authStore = {
      setOnboardingCurrentStep: jasmine
        .createSpy('setOnboardingCurrentStep')
        .and.callFake(() => undefined),
      completeOnboarding: jasmine
        .createSpy('completeOnboarding')
        .and.callFake(() => {
          isCompletingOnboardingSignal.set(true);
        }),
      markBankConnected: jasmine
        .createSpy('markBankConnected')
        .and.callFake(() => undefined),
      resetBankLinkFlow: jasmine
        .createSpy('resetBankLinkFlow')
        .and.callFake(() => undefined),
      isCompletingOnboarding: () => isCompletingOnboardingSignal(),
      onboardingCompletionError: () => onboardingCompletionErrorSignal(),
      onboardingCompleted: () => onboardingCompletedSignal(),
    };

    await TestBed.configureTestingModule({
      imports: [OnboardingWizardComponent],
      providers: [
        {
          provide: OnboardingWizardStore,
          useValue: wizardStore,
        },
        {
          provide: AuthStore,
          useValue: authStore,
        },
        {
          provide: Router,
          useValue: {
            ...router,
            url: '/onboarding/confirm',
            events: routerEvents$.asObservable(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParamMap$.asObservable(),
          },
        },
      ],
    })
      .overrideComponent(OnboardingWizardComponent, {
        set: {
          template: '<div></div>',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OnboardingWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens warning modal when finish is pressed with uncategorized transactions', () => {
    component.currentStep.set('confirm');
    wizardStore.confirmAccepted.set(true);
    wizardStore.uncategorizedCount.set(2);

    component.onContinue();

    expect(component.isUnassignedWarningModalOpen()).toBeTrue();
    expect(wizardStore.saveTransactionAssignments).not.toHaveBeenCalled();
  });

  it('navigates to categories with uncategorized filter from modal action', async () => {
    component.isUnassignedWarningModalOpen.set(true);

    await component.onAssignMissingFromModal();

    expect(component.isUnassignedWarningModalOpen()).toBeFalse();
    expect(wizardStore.setFilter).toHaveBeenCalledWith('uncategorized');
    expect(router.navigate).toHaveBeenCalledWith(['/onboarding', 'categories']);
  });

  it('navigates even when modal dismiss stays pending', async () => {
    component.isUnassignedWarningModalOpen.set(true);
    (component as unknown as { unassignedWarningModal: () => { dismiss: () => Promise<void> } })
      .unassignedWarningModal = () => ({
      dismiss: () => new Promise<void>(() => undefined),
    });

    await component.onAssignMissingFromModal();

    expect(component.isUnassignedWarningModalOpen()).toBeFalse();
    expect(wizardStore.setFilter).toHaveBeenCalledWith('uncategorized');
    expect(router.navigate).toHaveBeenCalledWith(['/onboarding', 'categories']);
  });

  it('closes warning modal when leaving confirm step', async () => {
    component.isUnassignedWarningModalOpen.set(true);

    routeParamMap$.next(convertToParamMap({ step: 'categories' }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isUnassignedWarningModalOpen()).toBeFalse();
  });

  it('saves assignments and navigates to dashboard after successful finish', async () => {
    component.currentStep.set('confirm');
    wizardStore.confirmAccepted.set(true);
    wizardStore.uncategorizedCount.set(0);

    component.onContinue();

    expect(wizardStore.resetSaveTransactionAssignmentsState).toHaveBeenCalled();
    expect(wizardStore.saveTransactionAssignments).toHaveBeenCalledTimes(1);

    wizardStore.isSavingClassifications.set(false);
    wizardStore.saveCompletedAt.set('2026-03-09T12:00:00.000Z');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(authStore.completeOnboarding).toHaveBeenCalledTimes(1);

    isCompletingOnboardingSignal.set(false);
    onboardingCompletedSignal.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('does not navigate when backend save fails', async () => {
    component.currentStep.set('confirm');
    wizardStore.confirmAccepted.set(true);
    wizardStore.uncategorizedCount.set(0);

    component.onContinue();

    wizardStore.isSavingClassifications.set(false);
    wizardStore.saveCompletedAt.set('2026-03-09T12:00:00.000Z');
    fixture.detectChanges();
    await fixture.whenStable();

    isCompletingOnboardingSignal.set(false);
    onboardingCompletionErrorSignal.set('backend error');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(authStore.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores a second finish click while saving is in progress', () => {
    component.currentStep.set('confirm');
    wizardStore.confirmAccepted.set(true);
    wizardStore.uncategorizedCount.set(0);

    component.onContinue();
    component.onContinue();

    expect(wizardStore.saveTransactionAssignments).toHaveBeenCalledTimes(1);
  });

  it('does not reload transactions when moving between onboarding steps', async () => {
    routeParamMap$.next(convertToParamMap({ step: 'categories' }));
    fixture.detectChanges();
    await fixture.whenStable();

    routeParamMap$.next(convertToParamMap({ step: 'budgets' }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(wizardStore.loadUserTransactions).not.toHaveBeenCalled();
  });

  it('redirects to auth when bank reconnection is required', async () => {
    wizardStore.bankReconnectionRequired.set(true);
    wizardStore.loadUserTransactionsError.set('reconnect required');

    fixture.detectChanges();
    await fixture.whenStable();

    expect(wizardStore.acknowledgeBankReconnectionRequired).toHaveBeenCalled();
    expect(authStore.markBankConnected).toHaveBeenCalledWith({
      isFirstBankConnectionForUser: null,
    });
    expect(authStore.resetBankLinkFlow).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth', { replaceUrl: true });
  });
});
