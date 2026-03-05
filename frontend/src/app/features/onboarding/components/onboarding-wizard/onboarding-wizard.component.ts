import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowBackOutline,
  bagHandleOutline,
  barbellOutline,
  cartOutline,
  checkmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  cloudUploadOutline,
  documentTextOutline,
  filmOutline,
  happyOutline,
  heartOutline,
  homeOutline,
  carOutline,
  searchOutline,
  shieldOutline,
  sparklesOutline,
  warningOutline,
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CategoryFilter,
  OnboardingStepKey,
  OnboardingTransaction,
} from '../../models/onboarding.models';
import { OnboardingWizardStore } from '../../store/onboarding-wizard.store';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonCheckbox,
    IonToggle,
    IonList,
    IonItem,
    FormsModule,
  ],
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly wizard = inject(OnboardingWizardStore);
  readonly fileInputId = 'onboarding-file-input';
  readonly currentStep = signal<OnboardingStepKey>('import');

  readonly stepIndex = computed(() => STEP_ORDER.indexOf(this.currentStep()) + 1);
  readonly stepLabel = computed(() => STEP_LABELS[this.currentStep()]);
  readonly canGoBack = computed(() => this.stepIndex() > 1);
  readonly continueLabel = computed(() =>
    this.currentStep() === 'confirm' ? 'Finish Setup' : 'Continue',
  );
  readonly isContinueDisabled = computed(() => {
    const step = this.currentStep();

    if (step === 'import') {
      return this.wizard.isParsing() || !this.wizard.isImportReady();
    }

    if (step === 'confirm') {
      return !this.wizard.confirmAccepted();
    }

    return false;
  });

  readonly isFinishStep = computed(() => this.currentStep() === 'confirm');
  readonly monthlyTargetInputValue = computed(() =>
    this.wizard.monthlyTarget() === null ? '' : String(Math.round(this.wizard.monthlyTarget()!)),
  );
  readonly monthlyDifference = computed(() =>
    (this.wizard.monthlyTarget() ?? this.wizard.assignedTotal()) - this.wizard.assignedTotal(),
  );
  readonly hasUncategorized = computed(() => this.wizard.uncategorizedCount() > 0);

  constructor() {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'checkmark-outline': checkmarkOutline,
      'document-text-outline': documentTextOutline,
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

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const step = params.get('step');
        if (!isStepKey(step)) {
          void this.router.navigate(['/onboarding/import'], { replaceUrl: true });
          return;
        }

        this.currentStep.set(step);
      });
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    const file = target?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    await this.wizard.parseFile(file);
    target.value = '';
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
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.goToNextStep();
  }

  onBack(): void {
    this.goToPreviousStep();
  }

  onAssignCategory(slug: string | null): void {
    this.wizard.assignCategoryToSheetSelection(slug);
  }

  onFilterChange(filter: CategoryFilter): void {
    this.wizard.setFilter(filter);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  }

  formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(value);
  }

  onMonthlyTargetChange(value: string | number | null | undefined): void {
    this.wizard.setMonthlyTarget(String(value ?? ''));
  }

  onCategoryBudgetChange(slug: string, value: string | number | null | undefined): void {
    this.wizard.setCategoryBudget(slug, String(value ?? ''));
  }

  onCategorySearchChange(value: string | number | null | undefined): void {
    this.wizard.setCategorySearch(String(value ?? ''));
  }

  categoryName(tx: OnboardingTransaction): string {
    return this.wizard.categoryBySlug(tx.categorySlug)?.name ?? 'Uncategorized';
  }

  categoryIcon(tx: OnboardingTransaction): string {
    return this.wizard.categoryBySlug(tx.categorySlug)?.iconName ?? 'alert-circle-outline';
  }

  categoryColor(tx: OnboardingTransaction): string {
    return this.wizard.categoryBySlug(tx.categorySlug)?.colorHex ?? '#F0B255';
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
