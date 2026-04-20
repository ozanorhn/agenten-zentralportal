# GEO Analysis Async n8n Setup

Diese Dateien bauen den Async-Teil fuer den bestehenden `SEO/GEO Analyse Assistent` auf.

## Was enthalten ist

- [01-geo-analyse-start.workflow.json](/Users/macbookvoneom/Desktop/ki-portal/ki-portal/docs/superpowers/n8n/geo-analysis-async/01-geo-analyse-start.workflow.json)
- [02-geo-analyse-status.workflow.json](/Users/macbookvoneom/Desktop/ki-portal/ki-portal/docs/superpowers/n8n/geo-analysis-async/02-geo-analyse-status.workflow.json)
- [03-geo-analyse-worker-conversion.md](/Users/macbookvoneom/Desktop/ki-portal/ki-portal/docs/superpowers/n8n/geo-analysis-async/03-geo-analyse-worker-conversion.md)

## Vor dem Import

Lege in n8n eine Data Table mit dem Namen `geo_analysis_jobs` an.

Empfohlene Spalten:

- `jobId` als `string`
- `status` als `string`
- `progress` als `number`
- `step` als `string`
- `createdAt` als `string`
- `updatedAt` als `string`
- `inputJson` als `string`
- `resultJson` als `string`
- `errorJson` als `string`

## Import-Reihenfolge

1. Importiere den Start-Workflow.
2. Importiere den Status-Workflow.
3. Wandle deinen bestehenden `geo-analyse` Workflow mit der Anleitung in einen Worker um.
4. Trage im Start-Workflow die echte Worker-Workflow-ID ein.

## Wichtige Platzhalter

Im Start-Workflow musst du noch `REPLACE_WITH_WORKER_WORKFLOW_ID` ersetzen.

Im Worker solltest du deine echten Credentials in n8n neu zuweisen, statt geheime Werte im JSON zu speichern.

## Warum `resultJson` als String gespeichert wird

Die Data Table dient hier nur als leichter Job-Speicher. Das Status-Workflow parst `inputJson`, `resultJson` und `errorJson` wieder zurueck in JSON, damit das Frontend sauber pollen kann.
