import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonLoading,
  IonModal,
} from '@ionic/angular/standalone';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OnboardingStepKey } from '../../models/onboarding.models';
import { OnboardingWizardStore } from '../../store/onboarding-wizard.store';
import { AuthStore } from '../../../auth/store/auth.store';
import { OnboardingWizardImportComponent } from './onboarding-wizard-import/onboarding-wizard-import.component';
import { OnboardingWizardCategoryComponent } from './onboarding-wizard-category/onboarding-wizard-category.component';
import { OnboardingWizardBudgetComponent } from './onboarding-wizard-budget/onboarding-wizard-budget.component';
import { OnboardingWizardConfirmComponent } from './onboarding-wizard-confirm/onboarding-wizard-confirm.component';
import { OnboardingUnassignedModalComponent } from './onboarding-unassigned-modal/onboarding-unassigned-modal.component';
import { registerOnboardingIcons } from './onboarding-wizard.icons';
import { OnboardingWizardLayoutService } from './onboarding-wizard-layout.service';
import {
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  parseOnboardingStep,
  STEP_LABELS,
  STEP_ORDER,
} from './onboarding-wizard-step.util';

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
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly layoutService = inject(OnboardingWizardLayoutService);
  readonly authStore = inject(AuthStore);
  readonly wizardStore = inject(OnboardingWizardStore);

  private readonly ionContent = viewChild(IonContent);
  private readonly unassignedWarningModal = viewChild(IonModal);
  private readonly routeStep = toSignal(
    this.route.paramMap.pipe(map((params) => parseOnboardingStep(params.get('step')))),
    {
      initialValue: parseOnboardingStep(this.route.snapshot?.paramMap?.get('step') ?? null),
    },
  );
  readonly fileInputId = 'onboarding-file-input';
  readonly currentStep = computed<OnboardingStepKey>(() => this.routeStep() ?? 'import');
  readonly isUnassignedWarningModalOpen = signal(false);
  private readonly finalizeRequested = signal(false);
  private readonly onboardingCompletionRequested = signal(false);

  readonly stepIndex = computed(() => STEP_ORDER.indexOf(this.currentStep()) + 1);
  readonly stepLabel = computed(() => STEP_LABELS[this.currentStep()]);
  readonly canGoBack = computed(() => this.stepIndex() > 1);
  readonly continueLabel = computed(() =>
    this.currentStep() === 'confirm'
      ? (this.wizardStore.isSavingClassifications() || this.authStore.isCompletingOnboarding()
          ? 'Saving...'
          : 'Finish Setup')
      : 'Continue',
  );
  readonly isContinueDisabled = computed(() => {
    const step = this.currentStep();

    if (step === 'import') {
      return (
        this.wizardStore.isParsing() ||
        (!this.wizardStore.isImportReady() && !this.wizardStore.directDataFromBankAccounts())
      );
    }

    if (step === 'confirm') {
      return (
        !this.wizardStore.confirmAccepted() ||
        this.wizardStore.isSavingClassifications() ||
        this.authStore.isCompletingOnboarding()
      );
    }

    return false;
  });

  readonly isFinishStep = computed(() => this.currentStep() === 'confirm');

  constructor() {
    registerOnboardingIcons();
    this.wizardStore.loadUserTransactionsIfNeeded();
    this.layoutService.lockBodyScroll(this.destroyRef);
    this.layoutService.installDesktopFocusGuard({
      destroyRef: this.destroyRef,
      hostElement: this.hostElement,
      getIonContent: () => this.ionContent(),
    });
    this.initializeStepSyncEffect();
    this.initializeFinalizeEffect();
    this.initializeBankReconnectEffect();
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
      if (this.wizardStore.uncategorizedCount() > 0) {
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
    this.wizardStore.setFilter('uncategorized');
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
    const next = getNextOnboardingStep(this.currentStep());
    if (next) {
      void this.router.navigate(['/onboarding', next]);
    }
  }

  private goToPreviousStep(): void {
    const previous = getPreviousOnboardingStep(this.currentStep());
    if (previous) {
      void this.router.navigate(['/onboarding', previous]);
    }
  }

  private finalizeOnboarding(): void {
    if (this.wizardStore.isSavingClassifications()) {
      return;
    }

    this.wizardStore.resetSaveTransactionAssignmentsState();
    this.finalizeRequested.set(true);
    this.onboardingCompletionRequested.set(false);
    this.wizardStore.saveTransactionAssignments();
  }

  private closeUnassignedWarningModal(): void {
    this.isUnassignedWarningModalOpen.set(false);
    const modal = this.unassignedWarningModal();
    if (!modal) {
      return;
    }

    void modal.dismiss().catch(() => undefined);
  }

  private initializeStepSyncEffect(): void {
    effect(() => {
      const step = this.routeStep();
      if (!step) {
        void this.router.navigate(['/onboarding/import'], { replaceUrl: true });
        return;
      }

      if (step !== 'confirm' && this.isUnassignedWarningModalOpen()) {
        this.closeUnassignedWarningModal();
      }

      this.authStore.setOnboardingCurrentStep(step);
    });
  }

  private initializeFinalizeEffect(): void {
    effect(() => {
      if (!this.finalizeRequested()) {
        return;
      }

      if (this.wizardStore.isSavingClassifications()) {
        return;
      }

      if (this.wizardStore.saveClassificationsError()) {
        this.finalizeRequested.set(false);
        this.onboardingCompletionRequested.set(false);
        return;
      }

      if (!this.wizardStore.saveCompletedAt()) {
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
      void this.router.navigateByUrl(this.authStore.getPostAuthTargetRoute(), {
        replaceUrl: true,
      });
    });
  }

  private initializeBankReconnectEffect(): void {
    effect(() => {
      if (!this.wizardStore.bankReconnectionRequired()) {
        return;
      }

      this.wizardStore.acknowledgeBankReconnectionRequired();
      this.authStore.setBankConnectionState('reconnect_required');
      this.authStore.resetBankLinkFlow();
      void this.router.navigateByUrl(this.authStore.getPostAuthTargetRoute(), {
        replaceUrl: true,
      });
    });
  }
}
