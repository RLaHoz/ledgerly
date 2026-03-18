import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bagHandleOutline,
  barbellOutline,
  bulbOutline,
  businessOutline,
  carSportOutline,
  cartOutline,
  chevronForwardOutline,
  createOutline,
  heartOutline,
  happyOutline,
  homeOutline,
} from 'ionicons/icons';
import { BudgetItemStatus } from '../../../../shared/components/budget-item/budget-item.component';
import { BudgetStore } from '../../store/budget.store';
import { AdjustBudgetModalComponent } from '../adjust-budget-modal/adjust-budget-modal.component';

interface BudgetDetailsHistoryVm {
  monthLabel: string;
  amountLabel: string;
  progressPercent: number;
  tone: 'on-track' | 'watch' | 'over';
}

interface BudgetDetailsSubcategoryVm {
  id: string;
  name: string;
  spentLabel: string;
  limitLabel: string;
  leftLabel: string;
  progressPercent: number;
  tone: 'on-track' | 'watch' | 'over';
}

interface BudgetDetailsTransactionVm {
  id: string;
  title: string;
  dateLabel: string;
  amountLabel: string;
}

interface BudgetDetailsVm {
  id: string;
  title: string;
  categoryName: string;
  iconName: string;
  iconTone: string;
  statusTone: 'on-track' | 'watch' | 'over';
  statusLabel: string;
  budgetLabel: string;
  spentLabel: string;
  remainingLabel: string;
  usedPercent: number;
  dailySpendAdviceLabel: string;
  averageLabel: string;
  recommendedBudgetLabel: string;
  history: readonly BudgetDetailsHistoryVm[];
  subcategories: readonly BudgetDetailsSubcategoryVm[];
  recentTransactions: readonly BudgetDetailsTransactionVm[];
}

interface BudgetDetailsSeed {
  recommendedBudget: number;
  history: readonly { monthLabel: string; amount: number }[];
  averageAmount: number;
  subcategories: readonly { id: string; name: string; spent: number; limit: number }[];
  recentTransactions: readonly { id: string; title: string; dateLabel: string; amount: number }[];
}

@Component({
  selector: 'app-budget-details',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, AdjustBudgetModalComponent],
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
    const daysRemaining = 3;
    const seed = BUDGET_DETAILS_SEEDS[category.id] ?? defaultSeed(spentAmount);

    return {
      id: category.id,
      title: `${category.name} Budget`,
      categoryName: category.name,
      iconName: category.iconName,
      iconTone: category.iconTone,
      statusTone: mapStatusTone(category.status),
      statusLabel: mapStatusLabel(category.status),
      budgetLabel: formatCurrency(budgetAmount),
      spentLabel: formatCurrency(spentAmount),
      remainingLabel: formatCurrency(remainingAmount),
      usedPercent,
      dailySpendAdviceLabel: `You can spend ${formatCurrency(Math.floor(remainingAmount / daysRemaining))}/day for the next ${daysRemaining} days`,
      averageLabel: formatCurrency(seed.averageAmount),
      recommendedBudgetLabel: formatCurrency(seed.recommendedBudget),
      history: seed.history.map((entry) => ({
        monthLabel: entry.monthLabel,
        amountLabel: formatCurrency(entry.amount),
        progressPercent: budgetAmount > 0 ? clamp((entry.amount / budgetAmount) * 100, 0, 100) : 0,
        tone: mapHistoryTone(budgetAmount > 0 ? (entry.amount / budgetAmount) * 100 : 0),
      })),
      subcategories: seed.subcategories.map((entry) => ({
        id: entry.id,
        name: entry.name,
        spentLabel: formatCurrency(entry.spent),
        limitLabel: formatCurrency(entry.limit),
        leftLabel: `${formatCurrency(Math.max(0, entry.limit - entry.spent))} left`,
        progressPercent: entry.limit > 0 ? clamp((entry.spent / entry.limit) * 100, 0, 100) : 0,
        tone: mapHistoryTone(entry.limit > 0 ? (entry.spent / entry.limit) * 100 : 0),
      })),
      recentTransactions: seed.recentTransactions.map((entry) => ({
        id: entry.id,
        title: entry.title,
        dateLabel: entry.dateLabel,
        amountLabel: formatSignedCurrency(entry.amount),
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
      'chevron-forward-outline': chevronForwardOutline,
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

  setRecommendedAmount(): void {
    const details = this.details();
    if (!details) {
      return;
    }

    this.adjustAmountInput.set(String(parseCurrencyAmount(details.recommendedBudgetLabel)));
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
    averageAmount: Math.max(100, Math.round(spentAmount * 0.95)),
    history: [
      { monthLabel: 'Dec 2025', amount: Math.round(spentAmount * 1.24) },
      { monthLabel: 'Jan 2026', amount: Math.round(spentAmount * 1.08) },
      { monthLabel: 'Feb 2026', amount: spentAmount },
    ],
    subcategories: [],
    recentTransactions: [],
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

function formatSignedCurrency(value: number): string {
  const absolute = formatCurrency(Math.abs(value));
  return value < 0 ? `-${absolute}` : absolute;
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
    averageAmount: 172,
    history: [
      { monthLabel: 'Dec 2025', amount: 187 },
      { monthLabel: 'Jan 2026', amount: 220 },
      { monthLabel: 'Feb 2026', amount: 145 },
    ],
    subcategories: [
      { id: 'streaming', name: 'Streaming', spent: 89, limit: 120 },
      { id: 'games', name: 'Games', spent: 32, limit: 80 },
      { id: 'cinema', name: 'Cinema', spent: 24, limit: 100 },
    ],
    recentTransactions: [{ id: 'ent-1', title: 'Netflix', dateLabel: 'Feb 2', amount: -32 }],
  },
  groceries: {
    recommendedBudget: 760,
    averageAmount: 702,
    history: [
      { monthLabel: 'Dec 2025', amount: 588 },
      { monthLabel: 'Jan 2026', amount: 631 },
      { monthLabel: 'Feb 2026', amount: 624 },
    ],
    subcategories: [
      { id: 'produce', name: 'Produce', spent: 224, limit: 300 },
      { id: 'pantry', name: 'Pantry', spent: 180, limit: 240 },
      { id: 'household', name: 'Household', spent: 220, limit: 260 },
    ],
    recentTransactions: [{ id: 'gro-1', title: 'Woolworths', dateLabel: 'Feb 6', amount: -94 }],
  },
  home: {
    recommendedBudget: 1250,
    averageAmount: 1140,
    history: [
      { monthLabel: 'Dec 2025', amount: 1020 },
      { monthLabel: 'Jan 2026', amount: 1200 },
      { monthLabel: 'Feb 2026', amount: 1200 },
    ],
    subcategories: [
      { id: 'rent', name: 'Rent', spent: 1000, limit: 1000 },
      { id: 'utilities', name: 'Utilities', spent: 150, limit: 150 },
      { id: 'maintenance', name: 'Maintenance', spent: 50, limit: 50 },
    ],
    recentTransactions: [{ id: 'home-1', title: 'Rent Payment', dateLabel: 'Feb 1', amount: -1200 }],
  },
  transport: {
    recommendedBudget: 320,
    averageAmount: 276,
    history: [
      { monthLabel: 'Dec 2025', amount: 238 },
      { monthLabel: 'Jan 2026', amount: 302 },
      { monthLabel: 'Feb 2026', amount: 289 },
    ],
    subcategories: [
      { id: 'fuel', name: 'Fuel', spent: 121, limit: 150 },
      { id: 'parking', name: 'Parking', spent: 58, limit: 80 },
      { id: 'rideshare', name: 'Rideshare', spent: 110, limit: 120 },
    ],
    recentTransactions: [{ id: 'trans-1', title: 'BP', dateLabel: 'Feb 12', amount: -52 }],
  },
  gym: {
    recommendedBudget: 130,
    averageAmount: 118,
    history: [
      { monthLabel: 'Dec 2025', amount: 108 },
      { monthLabel: 'Jan 2026', amount: 120 },
      { monthLabel: 'Feb 2026', amount: 120 },
    ],
    subcategories: [
      { id: 'membership', name: 'Membership', spent: 120, limit: 120 },
      { id: 'classes', name: 'Classes', spent: 0, limit: 10 },
    ],
    recentTransactions: [{ id: 'gym-1', title: 'Goodlife', dateLabel: 'Feb 10', amount: -100 }],
  },
  shopping: {
    recommendedBudget: 520,
    averageAmount: 451,
    history: [
      { monthLabel: 'Dec 2025', amount: 430 },
      { monthLabel: 'Jan 2026', amount: 458 },
      { monthLabel: 'Feb 2026', amount: 467 },
    ],
    subcategories: [
      { id: 'clothes', name: 'Clothes', spent: 188, limit: 200 },
      { id: 'beauty', name: 'Beauty', spent: 141, limit: 150 },
      { id: 'misc', name: 'Misc', spent: 138, limit: 150 },
    ],
    recentTransactions: [{ id: 'shop-1', title: 'Myer', dateLabel: 'Feb 6', amount: -178 }],
  },
  baby: {
    recommendedBudget: 300,
    averageAmount: 275,
    history: [
      { monthLabel: 'Dec 2025', amount: 295 },
      { monthLabel: 'Jan 2026', amount: 306 },
      { monthLabel: 'Feb 2026', amount: 312 },
    ],
    subcategories: [
      { id: 'diapers-wipes', name: 'Diapers & Wipes', spent: 120, limit: 150 },
      { id: 'baby-food', name: 'Baby Food', spent: 87, limit: 100 },
      { id: 'clothes', name: 'Clothes', spent: 65, limit: 100 },
      { id: 'gear-toys', name: 'Gear & Toys', spent: 40, limit: 50 },
    ],
    recentTransactions: [{ id: 'baby-1', title: 'Chemist Warehouse', dateLabel: 'Feb 8', amount: -61 }],
  },
  health: {
    recommendedBudget: 210,
    averageAmount: 171,
    history: [
      { monthLabel: 'Dec 2025', amount: 76 },
      { monthLabel: 'Jan 2026', amount: 84 },
      { monthLabel: 'Feb 2026', amount: 89 },
    ],
    subcategories: [
      { id: 'pharmacy', name: 'Pharmacy', spent: 42, limit: 90 },
      { id: 'doctor', name: 'Doctor', spent: 47, limit: 100 },
      { id: 'wellness', name: 'Wellness', spent: 0, limit: 60 },
    ],
    recentTransactions: [{ id: 'health-1', title: 'Pharmacy', dateLabel: 'Feb 3', amount: -42 }],
  },
};
