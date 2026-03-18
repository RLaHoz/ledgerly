import { Routes } from '@angular/router';
import { AuthPage } from '../auth.page';
import { AuthSignupPage } from '../pages/auth-signup/auth-signup.page';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthPage,
    children: [
      {
        path: '',
        component: AuthSignupPage,
      },
      {
        path: 'signup',
        pathMatch: 'full',
        redirectTo: '',
      },
      {
        path: 'login',
        pathMatch: 'full',
        redirectTo: '',
      },
      {
        path: 'connect-bank',
        loadComponent: () =>
          import('../pages/auth-connect-bank/auth-connect-bank.page').then(
            (m) => m.AuthConnectBankPage,
          ),
      },
    ],
  },
];
