import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BehaviorSubject, Subject } from 'rxjs';
import { buildIonicConfig } from 'src/app/core/config/ionic-config';
import { AuthStore } from '../../../auth/store/auth.store';
import { OnboardingWizardStore } from '../../store/onboarding-wizard.store';
import { OnboardingWizardComponent } from './onboarding-wizard.component';

class BudgetStepStoreMock {
  readonly isParsing = signal(false);
  readonly isImportReady = signal(true);
  readonly loadUserTransactionsError = signal<string | null>(null);
  readonly bankReconnectionRequired = signal(false);
  readonly directDataFromBankAccounts = signal(true);
  readonly confirmAccepted = signal(true);
  readonly isSavingClassifications = signal(false);
  readonly saveClassificationsError = signal<string | null>(null);
  readonly saveCompletedAt = signal<string | null>(null);
  readonly uncategorizedCount = signal(0);
  readonly monthlyTarget = signal<number | null>(null);
  readonly assignedTotal = signal(157);

  readonly categories = signal([
    {
      id: 'cat-1',
      slug: 'dining',
      name: 'Dining',
      iconName: 'pricetag-outline',
      colorHex: '#F97316',
      plannedAmount: 117,
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          slug: 'fast-food',
          name: 'Fast Food',
          iconName: 'ellipse-outline',
          colorHex: '#F97316',
        },
      ],
    },
  ]);

  readonly loadUserTransactions = jasmine
    .createSpy('loadUserTransactions')
    .and.callFake(() => undefined);
  readonly setFilter = jasmine.createSpy('setFilter').and.callFake(() => undefined);
  readonly resetSaveTransactionAssignmentsState = jasmine
    .createSpy('resetSaveTransactionAssignmentsState')
    .and.callFake(() => undefined);
  readonly saveTransactionAssignments = jasmine
    .createSpy('saveTransactionAssignments')
    .and.callFake(() => undefined);
  readonly acknowledgeBankReconnectionRequired = jasmine
    .createSpy('acknowledgeBankReconnectionRequired')
    .and.callFake(() => {
      this.bankReconnectionRequired.set(false);
    });
  readonly setMonthlyTarget = jasmine
    .createSpy('setMonthlyTarget')
    .and.callFake(() => undefined);
  readonly setCategoryBudget = jasmine
    .createSpy('setCategoryBudget')
    .and.callFake(() => undefined);
  readonly setSubcategoryBudget = jasmine
    .createSpy('setSubcategoryBudget')
    .and.callFake(() => undefined);
  readonly autoFillFromHistory = jasmine
    .createSpy('autoFillFromHistory')
    .and.callFake(() => undefined);
  readonly distributeRemaining = jasmine
    .createSpy('distributeRemaining')
    .and.callFake(() => undefined);

  usedCategories() {
    return this.categories();
  }

  categoryBudgetBySlug(slug: string): number {
    return this.categories().find((category) => category.slug === slug)?.plannedAmount ?? 0;
  }

  subcategoryBudgetById(subcategoryId: string): number {
    for (const category of this.categories()) {
      const subcategory = category.subcategories.find((item) => item.id === subcategoryId);
      if (subcategory) {
        return 116.51;
      }
    }

    return 0;
  }

  importedAmountBySlug(): number {
    return 116.51;
  }

  importedAmountBySubcategoryId(): number {
    return 116.51;
  }
}

describe('OnboardingWizard budget focus regression', () => {
  let fixture: ComponentFixture<OnboardingWizardComponent>;

  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(async () => {
    routeParamMap$ = new BehaviorSubject(convertToParamMap({ step: 'budgets' }));
    routerEvents$ = new Subject<NavigationEnd>();

    await TestBed.configureTestingModule({
      imports: [OnboardingWizardComponent],
      providers: [
        provideIonicAngular(buildIonicConfig(false)),
        {
          provide: OnboardingWizardStore,
          useValue: new BudgetStepStoreMock(),
        },
        {
          provide: AuthStore,
          useValue: {
            setOnboardingCurrentStep: jasmine
              .createSpy('setOnboardingCurrentStep')
              .and.callFake(() => undefined),
            completeOnboarding: jasmine
              .createSpy('completeOnboarding')
              .and.callFake(() => undefined),
            markBankConnected: jasmine
              .createSpy('markBankConnected')
              .and.callFake(() => undefined),
            resetBankLinkFlow: jasmine
              .createSpy('resetBankLinkFlow')
              .and.callFake(() => undefined),
            isCompletingOnboarding: () => false,
            onboardingCompletionError: () => null,
            onboardingCompleted: () => false,
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/onboarding/budgets',
            events: routerEvents$.asObservable(),
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParamMap$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingWizardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('keeps wizard layout stable after focusing monthly budget input', async () => {
    const wizardShell = fixture.nativeElement.querySelector('.wizard-shell') as HTMLElement;
    const stepContent = fixture.nativeElement.querySelector('.step-content') as HTMLElement;

    expect(wizardShell).toBeTruthy();
    expect(stepContent).toBeTruthy();

    stepContent.scrollTop = 0;
    const beforeTop = wizardShell.getBoundingClientRect().top;
    const beforeScrollTop = stepContent.scrollTop;

    const nativeInput = await getMonthlyBudgetNativeInput(fixture);
    nativeInput.focus();
    nativeInput.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    nativeInput.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    await delay(220);
    fixture.detectChanges();

    const afterTop = wizardShell.getBoundingClientRect().top;
    const afterScrollTop = stepContent.scrollTop;

    expect(Math.abs(afterTop - beforeTop)).toBeLessThan(1);
    expect(afterScrollTop).toBe(beforeScrollTop);
  });
});

async function getMonthlyBudgetNativeInput(
  fixture: ComponentFixture<OnboardingWizardComponent>,
): Promise<HTMLInputElement> {
  const ionInput = fixture.nativeElement.querySelector(
    'app-onboarding-wizard-budget ion-input',
  ) as (HTMLElement & { getInputElement?: () => Promise<HTMLInputElement> }) | null;

  if (!ionInput) {
    throw new Error('Monthly budget ion-input not found');
  }

  if (typeof ionInput.getInputElement === 'function') {
    const nativeInput = await ionInput.getInputElement();
    if (nativeInput) {
      return nativeInput;
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const nativeInput = ionInput.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (nativeInput) {
      return nativeInput;
    }

    await delay(25);
  }

  throw new Error('Native input inside ion-input not found');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
