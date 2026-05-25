import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './core/services/auth.service';

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash.page').then((m) => m.SplashPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/main-tabs/main-tabs.page').then((m) => m.MainTabsPage),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.page').then((m) => m.ReportsPage)
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then((m) => m.HistoryPage)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage)
      },
      {
        path: 'user',
        loadComponent: () => import('./pages/user/user.page').then((m) => m.UserPage)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'splash'
  }
];
