import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { initialBudgetState } from './budget.state';

export const BudgetStore = signalStore(
  { providedIn: 'root' },
  withState(initialBudgetState),
  withComputed((store) => ({
    canCreateNewBudget: computed(() => {
      const name = store.newBudgetNameInput().trim();
      const amount = Number.parseFloat(store.newBudgetAmountInput());

      return name.length > 0 && Number.isFinite(amount) && amount > 0;
    }),
  })),
  withMethods((store) => ({
    requestEditBudgets(): void {
      patchState(store, {
        editRequests: store.editRequests() + 1,
        isNewBudgetModalOpen: true,
      });
    },
    closeNewBudgetModal(): void {
      patchState(store, { isNewBudgetModalOpen: false });
    },
    setNewBudgetNameInput(value: string): void {
      patchState(store, { newBudgetNameInput: value.slice(0, 40) });
    },
    setNewBudgetAmountInput(value: string): void {
      patchState(store, { newBudgetAmountInput: sanitizeNumberInput(value) });
    },
    addNewBudgetCategory(): void {
      if (!store.canCreateNewBudget()) {
        return;
      }

      const name = store.newBudgetNameInput().trim();
      const amount = Number.parseFloat(store.newBudgetAmountInput());
      const id = slugify(name);
      const amountLabel = formatCurrency(amount);

      patchState(store, {
        categories: [
          {
            id,
            name,
            spentLabel: '$0',
            limitLabel: amountLabel,
            leftLabel: `${amountLabel} left`,
            noteLabel: 'Safe pace',
            status: 'on-track',
            progressPercent: 0,
            iconName: 'home-outline',
            iconTone: 'home',
          },
          ...store.categories(),
        ],
        isNewBudgetModalOpen: false,
        newBudgetNameInput: '',
        newBudgetAmountInput: '',
      });
    },
    openBudgetItem(itemId: string): void {
      const exists = store.categories().some((item) => item.id === itemId);
      if (!exists) {
        return;
      }

      patchState(store, { lastOpenedItemId: itemId });
    },
    adjustBudgetLimit(itemId: string, amount: number): void {
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }

      patchState(store, {
        categories: store.categories().map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const spent = parseCurrencyValue(item.spentLabel);
          const remaining = Math.max(0, amount - spent);
          const progressPercent = amount > 0 ? clamp((spent / amount) * 100, 0, 100) : 0;
          const status = resolveStatus(spent, amount);

          return {
            ...item,
            limitLabel: formatCurrency(amount),
            leftLabel: `${formatCurrency(remaining)} left`,
            progressPercent,
            status,
            noteLabel: status === 'over' ? 'Exceeded' : 'Safe pace',
          };
        }),
      });
    },
    setBudgetProgress(itemId: string, progressPercent: number): void {
      if (!Number.isFinite(progressPercent)) {
        return;
      }

      patchState(store, {
        categories: store.categories().map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            progressPercent: clamp(progressPercent, 0, 100),
          };
        }),
      });
    },
  })),
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNumberInput(value: string): string {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function parseCurrencyValue(value: string): number {
  const normalized = value.replace(/[^\d.]/g, '');
  const amount = Number.parseFloat(normalized);

  return Number.isFinite(amount) ? amount : 0;
}

function resolveStatus(spent: number, limit: number): 'on-track' | 'watch' | 'over' {
  if (spent >= limit) {
    return 'over';
  }

  if (limit > 0 && spent / limit >= 0.75) {
    return 'watch';
  }

  return 'on-track';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : `category-${Date.now()}`;
}
