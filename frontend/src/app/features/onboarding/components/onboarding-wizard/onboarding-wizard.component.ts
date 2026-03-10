import {
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonLoading,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  airplaneOutline,
  arrowBackOutline,
  bagHandleOutline,
  barbellOutline,
  bodyOutline,
  briefcaseOutline,
  cardOutline,
  cashOutline,
  cartOutline,
  checkmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  cloudUploadOutline,
  documentTextOutline,
  ellipseOutline,
  filmOutline,
  flashOutline,
  giftOutline,
  happyOutline,
  heartOutline,
  homeOutline,
  carOutline,
  medkitOutline,
  pawOutline,
  peopleOutline,
  pricetagOutline,
  repeatOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  searchOutline,
  shieldOutline,
  sparklesOutline,
  warningOutline,
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingStepKey } from '../../models/onboarding.models';
import { OnboardingWizardStore } from '../../store/onboarding-wizard.store';
import { AuthStore } from '../../../auth/store/auth.store';
import { OnboardingWizardImportComponent } from './onboarding-wizard-import/onboarding-wizard-import.component';
import { OnboardingWizardCategoryComponent } from './onboarding-wizard-category/onboarding-wizard-category.component';
import { OnboardingWizardBudgetComponent } from './onboarding-wizard-budget/onboarding-wizard-budget.component';
import { OnboardingWizardConfirmComponent } from './onboarding-wizard-confirm/onboarding-wizard-confirm.component';
import { OnboardingUnassignedModalComponent } from './onboarding-unassigned-modal/onboarding-unassigned-modal.component';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonModal,
    IonLoading,
    OnboardingWizardImportComponent,
    OnboardingWizardCategoryComponent,
    OnboardingWizardBudgetComponent,
    OnboardingWizardConfirmComponent,
    OnboardingUnassignedModalComponent,
  ],
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardComponent {
  private readonly document = inject(DOCUMENT);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly authStore = inject(AuthStore);

  readonly wizard = inject(OnboardingWizardStore);
  private readonly ionContent = viewChild(IonContent);
  private readonly unassignedWarningModal = viewChild(IonModal);
  readonly fileInputId = 'onboarding-file-input';
  readonly currentStep = signal<OnboardingStepKey>('import');
  readonly isUnassignedWarningModalOpen = signal(false);
  private readonly finalizeRequested = signal(false);
  private readonly onboardingCompletionRequested = signal(false);

  readonly stepIndex = computed(() => STEP_ORDER.indexOf(this.currentStep()) + 1);
  readonly stepLabel = computed(() => STEP_LABELS[this.currentStep()]);
  readonly canGoBack = computed(() => this.stepIndex() > 1);
  readonly continueLabel = computed(() =>
    this.currentStep() === 'confirm'
      ? (this.wizard.isSavingClassifications() || this.authStore.isCompletingOnboarding()
          ? 'Saving...'
          : 'Finish Setup')
      : 'Continue',
  );
  readonly isContinueDisabled = computed(() => {
    const step = this.currentStep();

    if (step === 'import') {
      return (
        this.wizard.isParsing() ||
        (!this.wizard.isImportReady() && !this.wizard.directDataFromBankAccounts())
      );
    }

    if (step === 'confirm') {
      return (
        !this.wizard.confirmAccepted() ||
        this.wizard.isSavingClassifications() ||
        this.authStore.isCompletingOnboarding()
      );
    }

    return false;
  });

  readonly isFinishStep = computed(() => this.currentStep() === 'confirm');

  constructor() {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'checkmark-outline': checkmarkOutline,
      'document-text-outline': documentTextOutline,
      'pricetag-outline': pricetagOutline,
      'ellipse-outline': ellipseOutline,
      'flash-outline': flashOutline,
      'medkit-outline': medkitOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'airplane-outline': airplaneOutline,
      'school-outline': schoolOutline,
      'people-outline': peopleOutline,
      'paw-outline': pawOutline,
      'repeat-outline': repeatOutline,
      'card-outline': cardOutline,
      'body-outline': bodyOutline,
      'gift-outline': giftOutline,
      'briefcase-outline': briefcaseOutline,
      'cash-outline': cashOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'chevron-back-outline': chevronBackOutline,
      'search-outline': searchOutline,
      'close-outline': closeOutline,
      'sparkles-outline': sparklesOutline,
      'warning-outline': warningOutline,
      'shield-outline': shieldOutline,
      'happy-outline': happyOutline,
      'cart-outline': cartOutline,
      'home-outline': homeOutline,
      'car-outline': carOutline,
      'barbell-outline': barbellOutline,
      'bag-handle-outline': bagHandleOutline,
      'film-outline': filmOutline,
      'heart-outline': heartOutline,
      'alert-circle-outline': alertCircleOutline,
    });

    this.loadUserTransactionsIfNeeded();
    this.document.body.classList.add('onboarding-layout-lock');
    this.destroyRef.onDestroy(() => {
      this.document.body.classList.remove('onboarding-layout-lock');
    });

    if (!Capacitor.isNativePlatform()) {
      const scrollAnchorY = window.scrollY;
      const handleFocusIn = (event: FocusEvent) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        if (!this.hostElement.nativeElement.contains(target)) {
          return;
        }

        requestAnimationFrame(() => {
          this.restoreIonContentScrollTop();

          if (window.scrollY !== scrollAnchorY) {
            window.scrollTo({ top: scrollAnchorY, left: 0, behavior: 'auto' });
          }
        });
      };

      this.document.addEventListener('focusin', handleFocusIn, true);
      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener('focusin', handleFocusIn, true);
      });
    }

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const step = params.get('step');
        if (!isStepKey(step)) {
          void this.router.navigate(['/onboarding/import'], { replaceUrl: true });
          return;
        }

        this.currentStep.set(step);
        if (step !== 'confirm' && this.isUnassignedWarningModalOpen()) {
          this.closeUnassignedWarningModal();
        }
        this.authStore.setOnboardingCurrentStep(step);
      });

    effect(() => {
      if (!this.finalizeRequested()) {
        return;
      }

      if (this.wizard.isSavingClassifications()) {
        return;
      }

      if (this.wizard.saveClassificationsError()) {
        this.finalizeRequested.set(false);
        this.onboardingCompletionRequested.set(false);
        return;
      }

      if (!this.wizard.saveCompletedAt()) {
        return;
      }

      if (!this.onboardingCompletionRequested()) {
        this.onboardingCompletionRequested.set(true);
        this.authStore.completeOnboarding();
        return;
      }

      if (this.authStore.isCompletingOnboarding()) {
        return;
      }

      if (this.authStore.onboardingCompletionError()) {
        this.finalizeRequested.set(false);
        this.onboardingCompletionRequested.set(false);
        return;
      }

      if (!this.authStore.onboardingCompleted()) {
        return;
      }

      this.finalizeRequested.set(false);
      this.onboardingCompletionRequested.set(false);
      void this.router.navigateByUrl('/dashboard');
    });

    effect(() => {
      if (!this.wizard.bankReconnectionRequired()) {
        return;
      }

      this.wizard.acknowledgeBankReconnectionRequired();
      this.authStore.markBankConnected({ isFirstBankConnectionForUser: null });
      this.authStore.resetBankLinkFlow();
      void this.router.navigateByUrl('/auth', { replaceUrl: true });
    });
  }

  onHeaderBack(): void {
    if (this.canGoBack()) {
      this.goToPreviousStep();
      return;
    }

    void this.router.navigateByUrl('/settings');
  }

  onContinue(): void {
    if (this.isContinueDisabled()) {
      return;
    }

    if (this.currentStep() === 'confirm') {
      if (this.wizard.uncategorizedCount() > 0) {
        this.isUnassignedWarningModalOpen.set(true);
        return;
      }

      this.finalizeOnboarding();
      return;
    }

    this.goToNextStep();
  }

  onBack(): void {
    this.goToPreviousStep();
  }

  async onAssignMissingFromModal(): Promise<void> {
    this.closeUnassignedWarningModal();
    this.wizard.setFilter('uncategorized');
    await this.router.navigate(['/onboarding', 'categories']);
  }

  async onSaveAsIsFromModal(): Promise<void> {
    this.closeUnassignedWarningModal();
    this.finalizeOnboarding();
  }

  onDismissUnassignedWarningModal(): void {
    this.isUnassignedWarningModalOpen.set(false);
  }

  private goToNextStep(): void {
    const index = STEP_ORDER.indexOf(this.currentStep());
    const next = STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)];
    if (next) {
      void this.router.navigate(['/onboarding', next]);
    }
  }

  private goToPreviousStep(): void {
    const index = STEP_ORDER.indexOf(this.currentStep());
    const previous = STEP_ORDER[Math.max(index - 1, 0)];
    if (previous) {
      void this.router.navigate(['/onboarding', previous]);
    }
  }

  private finalizeOnboarding(): void {
    if (this.wizard.isSavingClassifications()) {
      return;
    }

    this.wizard.resetSaveTransactionAssignmentsState();
    this.finalizeRequested.set(true);
    this.onboardingCompletionRequested.set(false);
    this.wizard.saveTransactionAssignments();
  }

  private closeUnassignedWarningModal(): void {
    this.isUnassignedWarningModalOpen.set(false);
    const modal = this.unassignedWarningModal();
    if (!modal) {
      return;
    }

    void modal.dismiss().catch(() => undefined);
  }

  private loadUserTransactionsIfNeeded(): void {
    if (this.wizard.directDataFromBankAccounts() || this.wizard.isParsing()) {
      return;
    }

    this.wizard.loadUserTransactions();
  }

  private restoreIonContentScrollTop(): void {
    const content = this.ionContent();
    if (!content) {
      return;
    }

    void content
      .getScrollElement()
      .then((scrollElement) => {
        if (scrollElement.scrollTop !== 0) {
          scrollElement.scrollTop = 0;
          return;
        }

        return content.scrollToTop(0);
      })
      .catch(() => undefined);
  }
}

const STEP_ORDER: readonly OnboardingStepKey[] = ['import', 'categories', 'budgets', 'confirm'];

const STEP_LABELS: Record<OnboardingStepKey, string> = {
  import: 'Import',
  categories: 'Categories',
  budgets: 'Budgets',
  confirm: 'Confirm',
};

function isStepKey(value: string | null): value is OnboardingStepKey {
  return value === 'import' || value === 'categories' || value === 'budgets' || value === 'confirm';
}
