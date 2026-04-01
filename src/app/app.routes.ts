import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  // Standalone login page (no shell)
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.Login),
  },
  // Shell-wrapped pages
  {
    path: '',
    component: Shell,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'agents/:id',
        loadComponent: () =>
          import('./pages/agent-detail/agent-detail').then((m) => m.AgentDetail),
      },
      {
        path: 'agents/:id/result',
        loadComponent: () =>
          import('./pages/agent-result/agent-result').then((m) => m.AgentResult),
      },
      {
        path: 'conversations',
        loadComponent: () =>
          import('./pages/conversations/conversations').then((m) => m.Conversations),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'management',
        loadComponent: () =>
          import('./pages/management/management').then((m) => m.Management),
      },
      {
        path: 'ceo-dashboard',
        loadComponent: () =>
          import('./pages/ceo-dashboard/ceo-dashboard').then((m) => m.CeoDashboard),
      },
      {
        path: 'reporting-bot',
        loadComponent: () =>
          import('./pages/reporting-bot/reporting-bot').then((m) => m.ReportingBot),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
