import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((component) => component.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((route) => route.dashboardRoutes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
