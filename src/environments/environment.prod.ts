export const environment = {
  production: true,
  supabase: {
    url: 'http://72.62.49.215:8000',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE',
  },
  n8nBase: 'https://n8n.eom.de',
  geoAnalysisWebhookUrl: 'https://n8n.eom.de/webhook/geo-analyse',
  geoAnalysisStartWebhookUrl: 'https://n8n.eom.de/webhook/geo-analyse-start',
  geoAnalysisStatusWebhookUrl: 'https://n8n.eom.de/webhook/geo-analyse-status',
  geoAnalysisNoLlmWebhookUrl: 'https://n8n.eom.de/webhook/geo-analyse-nollm',
  geoAnalysisNoLlmForwardWebhookUrl: 'https://n8n.eom.de/webhook/63bcffbf-bd2f-4a66-bc2a-dd9b15e4698a',
  contentSeoAnalyzerWebhookUrl: 'https://n8n.eom.de/webhook/analyze-website',
  contentOpportunityWebhookUrl: 'https://n8n.eom.de/webhook/omr-content-opportunity',
  internalLinkSuggestionsWebhookUrl: 'https://n8n.eom.de/webhook/internal-linking',
  geoReportAlternativeWebhookUrl:
    'https://n8n.eom.de/webhook/9d69d006-c52a-4a7f-a55e-843846ee3aab',
};
