import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  barbellOutline,
  bulbOutline,
  businessOutline,
  carSportOutline,
  cartOutline,
  closeOutline,
  createOutline,
  heartOutline,
  happyOutline,
  homeOutline,
} from 'ionicons/icons';
import { BudgetItemStatus } from '../../../../shared/components/budget-item/budget-item.component';
import { BudgetStore } from '../../store/budget.store';

interface BudgetDetailsHistoryVm {
  monthLabel: string;
  amountLabel: string;
  progressPercent: number;
  tone: 'on-track' | 'watch' | 'over';
}

interface BudgetDetailsVm {
  id: string;
  title: string;
  iconName: string;
  iconTone: string;
  statusTone: 'on-track' | 'watch' | 'over';
  statusLabel: string;
  noteLabel: string;
  budgetLabel: string;
  spentLabel: string;
  remainingLabel: string;
  usedPercent: number;
  thresholdsLabel: string;
  recommendation: string;
  recommendedBudgetLabel: string;
  history: readonly BudgetDetailsHistoryVm[];
}

interface BudgetDetailsSeed {
  recommendedBudget: number;
  history: readonly { monthLabel: string; amount: number }[];
}

@Component({
  selector: 'app-budget-details',
  standalone: true,
  imports: [CommonModule, IonContent, IonModal, IonIcon],
  templateUrl: './budget-details.component.html',
  styleUrl: './budget-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly store = inject(BudgetStore);
  readonly isAdjustModalOpen = signal(false);
  readonly adjustAmountInput = signal('');

  readonly categoryType = computed(() => (this.route.snapshot.paramMap.get('type') ?? '').toLowerCase());

  readonly category = computed(() => this.store.categories().find((item) => item.id === this.categoryType()) ?? null);

  readonly details = computed<BudgetDetailsVm | null>(() => {
    const category = this.category();

    if (!category) {
      return null;
    }

    const spentAmount = parseCurrencyAmount(category.spentLabel);
    const budgetAmount = parseCurrencyAmount(category.limitLabel);
    const remainingAmount = Math.max(0, budgetAmount - spentAmount);
    const usedPercent = budgetAmount > 0 ? clamp((spentAmount / budgetAmount) * 100, 0, 100) : 0;
    const seed = BUDGET_DETAILS_SEEDS[category.id] ?? defaultSeed(spentAmount);

    return {
      id: category.id,
      title: `${category.name} Budget`,
      iconName: category.iconName,
      iconTone: category.iconTone,
      statusTone: mapStatusTone(category.status),
      statusLabel: mapStatusLabel(category.status),
      noteLabel: category.noteLabel ?? 'Safe pace',
      budgetLabel: formatCurrency(budgetAmount),
      spentLabel: formatCurrency(spentAmount),
      remainingLabel: formatCurrency(remainingAmount),
      usedPercent,
      thresholdsLabel: 'Thresholds: 75% / 90% / 100%',
      recommendation: `Based on your 3-month average, we recommend a budget of ${formatCurrency(seed.recommendedBudget)}.`,
      recommendedBudgetLabel: formatCurrency(seed.recommendedBudget),
      history: seed.history.map((entry) => ({
        monthLabel: entry.monthLabel,
        amountLabel: formatCurrency(entry.amount),
        progressPercent: budgetAmount > 0 ? clamp((entry.amount / budgetAmount) * 100, 0, 100) : 0,
        tone: mapHistoryTone(budgetAmount > 0 ? (entry.amount / budgetAmount) * 100 : 0),
      })),
    };
  });

  readonly canSaveAdjust = computed(() => {
    const details = this.details();
    const value = Number.parseFloat(this.adjustAmountInput());

    if (!details) {
      return false;
    }

    return Number.isFinite(value) && value > 0 && Math.round(value) !== parseCurrencyAmount(details.budgetLabel);
  });

  constructor() {
    addIcons({
      'bag-handle-outline': bagHandleOutline,
      'barbell-outline': barbellOutline,
      'bulb-outline': bulbOutline,
      'business-outline': businessOutline,
      'car-sport-outline': carSportOutline,
      'cart-outline': cartOutline,
      'close-outline': closeOutline,
      'create-outline': createOutline,
      'heart-outline': heartOutline,
      'happy-outline': happyOutline,
      'home-outline': homeOutline,
    });
  }

  openAdjustModal(): void {
    const details = this.details();
    if (!details) {
      return;
    }

    this.adjustAmountInput.set(String(parseCurrencyAmount(details.budgetLabel)));
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen.set(false);
  }

  onAdjustAmountInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.adjustAmountInput.set(sanitizeNumberInput(target?.value ?? ''));
  }

  onApplySuggestion(): void {
    const details = this.details();
    if (!details) {
      return;
    }

    this.adjustAmountInput.set(String(parseCurrencyAmount(details.recommendedBudgetLabel)));
    this.onSaveAdjust();
  }

  onSaveAdjust(): void {
    const details = this.details();
    const amount = Number.parseFloat(this.adjustAmountInput());

    if (!details || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.store.adjustBudgetLimit(details.id, amount);
    this.isAdjustModalOpen.set(false);
  }

  onBackToBudgets(): void {
    void this.router.navigateByUrl('/budgets');
  }
}

function defaultSeed(spentAmount: number): BudgetDetailsSeed {
  return {
    recommendedBudget: Math.max(100, Math.round(spentAmount * 1.15)),
    history: [
      { monthLabel: 'Dec 2025', amount: Math.round(spentAmount * 1.24) },
      { monthLabel: 'Jan 2026', amount: Math.round(spentAmount * 1.08) },
      { monthLabel: 'Feb 2026', amount: spentAmount },
    ],
  };
}

function sanitizeNumberInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function parseCurrencyAmount(value: string): number {
  const normalized = value.replace(/[^\d.]/g, '');
  const amount = Number.parseFloat(normalized);

  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function mapStatusLabel(status: BudgetItemStatus): string {
  if (status === 'on-track') {
    return 'On Track';
  }

  if (status === 'watch' || status === 'high-risk') {
    return 'Watch';
  }

  if (status === 'over' || status === 'exceeded') {
    return 'Over';
  }

  return 'Moderate';
}

function mapStatusTone(status: BudgetItemStatus): 'on-track' | 'watch' | 'over' {
  if (status === 'on-track') {
    return 'on-track';
  }

  if (status === 'over' || status === 'exceeded') {
    return 'over';
  }

  return 'watch';
}

function mapHistoryTone(percentage: number): 'on-track' | 'watch' | 'over' {
  if (percentage >= 100) {
    return 'over';
  }

  if (percentage >= 75) {
    return 'watch';
  }

  return 'on-track';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const BUDGET_DETAILS_SEEDS: Record<string, BudgetDetailsSeed> = {
  entertainment: {
    recommendedBudget: 200,
    history: [
      { monthLabel: 'Dec 2025', amount: 187 },
      { monthLabel: 'Jan 2026', amount: 220 },
      { monthLabel: 'Feb 2026', amount: 145 },
    ],
  },
  groceries: {
    recommendedBudget: 760,
    history: [
      { monthLabel: 'Dec 2025', amount: 588 },
      { monthLabel: 'Jan 2026', amount: 631 },
      { monthLabel: 'Feb 2026', amount: 624 },
    ],
  },
  home: {
    recommendedBudget: 1180,
    history: [
      { monthLabel: 'Dec 2025', amount: 1120 },
      { monthLabel: 'Jan 2026', amount: 1212 },
      { monthLabel: 'Feb 2026', amount: 1200 },
    ],
  },
  transport: {
    recommendedBudget: 320,
    history: [
      { monthLabel: 'Dec 2025', amount: 238 },
      { monthLabel: 'Jan 2026', amount: 302 },
      { monthLabel: 'Feb 2026', amount: 289 },
    ],
  },
  gym: {
    recommendedBudget: 130,
    history: [
      { monthLabel: 'Dec 2025', amount: 108 },
      { monthLabel: 'Jan 2026', amount: 120 },
      { monthLabel: 'Feb 2026', amount: 120 },
    ],
  },
  shopping: {
    recommendedBudget: 520,
    history: [
      { monthLabel: 'Dec 2025', amount: 430 },
      { monthLabel: 'Jan 2026', amount: 458 },
      { monthLabel: 'Feb 2026', amount: 467 },
    ],
  },
  baby: {
    recommendedBudget: 380,
    history: [
      { monthLabel: 'Dec 2025', amount: 295 },
      { monthLabel: 'Jan 2026', amount: 306 },
      { monthLabel: 'Feb 2026', amount: 312 },
    ],
  },
  health: {
    recommendedBudget: 210,
    history: [
      { monthLabel: 'Dec 2025', amount: 76 },
      { monthLabel: 'Jan 2026', amount: 84 },
      { monthLabel: 'Feb 2026', amount: 89 },
    ],
  },
};
