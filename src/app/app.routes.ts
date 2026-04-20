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
        path: 'agents/produkttext-agent/result',
        loadComponent: () =>
          import('./pages/product-text-result/product-text-result').then((m) => m.ProductTextResultComponent),
      },
      {
        path: 'agents/produkttext-agent',
        loadComponent: () =>
          import('./pages/product-text-agent/product-text-agent').then((m) => m.ProductTextAgentComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent',
        loadComponent: () =>
          import('./pages/seo-geo-assistant/seo-geo-assistant').then((m) => m.SeoGeoAssistantComponent),
      },
      {
        path: 'agents/geo-report-alternative',
        loadComponent: () =>
          import('./pages/geo-report-alternative/geo-report-alternative').then((m) => m.GeoReportAlternativeComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent/result',
        loadComponent: () =>
          import('./pages/seo-geo-assistant/seo-geo-assistant-result').then((m) => m.SeoGeoAssistantResultComponent),
      },
      {
        path: 'agents/geo-report-alternative/result',
        loadComponent: () =>
          import('./pages/geo-report-alternative/geo-report-alternative-result').then((m) => m.GeoReportAlternativeResultComponent),
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
        path: 'kpi-dashboard',
        loadComponent: () =>
          import('./pages/kpi-dashboard/kpi-dashboard').then((m) => m.KpiDashboardComponent),
      },
      {
        path: 'reporting-bot',
        loadComponent: () =>
          import('./pages/reporting-bot/reporting-bot').then((m) => m.ReportingBot),
      },
      {
        path: 'fehler-melden',
        loadComponent: () =>
          import('./pages/error-form/error-form').then((m) => m.ErrorFormComponent),
      },
      {
        path: 'kontakt',
        loadComponent: () =>
          import('./pages/contact/contact').then((m) => m.ContactComponent),
      },
      {
        path: 'idee-einreichen',
        loadComponent: () =>
          import('./pages/idea-form/idea-form').then((m) => m.IdeaFormComponent),
      },
      {
        path: 'success/:type',
        loadComponent: () =>
          import('./pages/success/success').then((m) => m.SuccessComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
