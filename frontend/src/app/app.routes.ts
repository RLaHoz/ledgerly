import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'onboarding',
    pathMatch: 'full',
    redirectTo: 'onboarding/import',
  },
  {
    path: 'onboarding/:step',
    loadComponent: () =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/layout.page').then((m) => m.LayoutPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      // placeholders (luego los creas)
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'budgets',
        loadComponent: () =>
          import('./features/budget/budget.page').then((m) => m.BudgetPage),
      },
      {
        path: 'budget/detail/:type',
        loadComponent: () =>
          import('./features/budget/components/budget-details/budget-details.component').then((m) => m.BudgetDetailsComponent),
      },
      {
        path: 'budgets/detail/:type',
        loadComponent: () =>
          import('./features/budget/components/budget-details/budget-details.component').then((m) => m.BudgetDetailsComponent),
      },
      {
        path: 'budget',
        pathMatch: 'full',
        redirectTo: 'budgets',
      },
      {
        path: 'rules',
        loadComponent: () =>
          import('./features/rules/rules.page').then((m) => m.RulesPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
