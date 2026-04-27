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
        path: 'agents/csv-produkttext-agent/result',
        loadComponent: () =>
          import('./pages/csv-product-text-result/csv-product-text-result').then((m) => m.CsvProductTextResultComponent),
      },
      {
        path: 'agents/produkttext-agent',
        loadComponent: () =>
          import('./pages/product-text-agent/product-text-agent').then((m) => m.ProductTextAgentComponent),
      },
      {
        path: 'agents/csv-produkttext-agent',
        loadComponent: () =>
          import('./pages/csv-product-text-agent/csv-product-text-agent').then((m) => m.CsvProductTextAgentComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent',
        loadComponent: () =>
          import('./pages/seo-geo-assistant/seo-geo-assistant').then((m) => m.SeoGeoAssistantComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent-nollm',
        loadComponent: () =>
          import('./pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm').then((m) => m.SeoGeoAssistantNoLlmComponent),
      },
      {
        path: 'agents/geo-report-alternative',
        loadComponent: () =>
          import('./pages/geo-report-alternative/geo-report-alternative').then((m) => m.GeoReportAlternativeComponent),
      },
      {
        path: 'agents/content-seo-analyzer',
        loadComponent: () =>
          import('./pages/content-seo-analyzer/content-seo-analyzer').then((m) => m.ContentSeoAnalyzerComponent),
      },
      {
        path: 'agents/content-seo-analyzer/result',
        loadComponent: () =>
          import('./pages/content-seo-analyzer/content-seo-analyzer-result').then((m) => m.ContentSeoAnalyzerResultComponent),
      },
      {
        path: 'agents/omr-seo-content-strategie',
        loadComponent: () =>
          import('./pages/omr-seo-content-strategie/omr-seo-content-strategie').then((m) => m.OmrSeoContentStrategieComponent),
      },
      {
        path: 'agents/omr-seo-content-strategie/result',
        loadComponent: () =>
          import('./pages/omr-seo-content-strategie/omr-seo-content-strategie-result').then((m) => m.OmrSeoContentStrategieResultComponent),
      },
      {
        path: 'agents/interne-verlinkung-vorschlaege',
        loadComponent: () =>
          import('./pages/interne-verlinkung-vorschlaege/interne-verlinkung-vorschlaege').then((m) => m.InterneVerlinkungVorschlaegeComponent),
      },
      {
        path: 'agents/interne-verlinkung-vorschlaege/result',
        loadComponent: () =>
          import('./pages/interne-verlinkung-vorschlaege/interne-verlinkung-vorschlaege-result').then((m) => m.InterneVerlinkungVorschlaegeResultComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent/result',
        data: { agentId: 'seo-geo-analyse-assistent' },
        loadComponent: () =>
          import('./pages/seo-geo-assistant/seo-geo-assistant-result').then((m) => m.SeoGeoAssistantResultComponent),
      },
      {
        path: 'agents/seo-geo-analyse-assistent-nollm/result',
        data: { agentId: 'seo-geo-analyse-assistent-nollm' },
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
        path: 'history',
        loadComponent: () =>
          import('./pages/conversations/conversations').then((m) => m.Conversations),
      },
      { path: 'conversations', redirectTo: 'history', pathMatch: 'full' },
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
