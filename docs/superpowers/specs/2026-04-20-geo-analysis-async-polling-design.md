# GEO Analysis Async Polling Design

## Goal

Turn the existing synchronous `SEO/GEO Analyse Assistent` webhook flow into an asynchronous job flow:

- `POST` starts the analysis immediately
- the UI can navigate right away to a dedicated status/result page
- the frontend polls a separate status endpoint
- the final GEO report appears automatically once n8n has finished

## Scope

This design covers the n8n-side orchestration for the existing GEO analysis workflow:

- a dedicated async start endpoint
- a dedicated async status endpoint
- persistence of job state inside n8n Data Tables
- conversion of the current long-running GEO workflow into a worker sub-workflow

This design does not yet cover the Angular frontend implementation details.

## Approach

Split the current single webhook workflow into three pieces:

1. `geo-analyse-start`
   Accepts the existing form payload, creates a `jobId`, stores an initial pending row, kicks off the worker asynchronously, and returns immediately.

2. `geo-analyse-status`
   Reads the current job row from the data table and returns normalized status/result JSON for polling.

3. `geo-analyse-worker`
   Reuses the existing GEO analysis pipeline, but is triggered by `Execute Sub-workflow Trigger` instead of a public webhook and writes progress updates plus the final result back into the data table.

## Data Model

Use one n8n Data Table named `geo_analysis_jobs` with these columns:

- `jobId` (`string`)
- `status` (`string`)
- `progress` (`number`)
- `step` (`string`)
- `createdAt` (`string`)
- `updatedAt` (`string`)
- `inputJson` (`string`)
- `resultJson` (`string`)
- `errorJson` (`string`)

`inputJson`, `resultJson`, and `errorJson` are stored as serialized JSON strings so the status endpoint can return structured objects after parsing.

## Status Contract

Start endpoint response:

```json
{
  "jobId": "geo-1745143200000",
  "status": "running",
  "progress": 5,
  "step": "Analyse gestartet"
}
```

Status endpoint response while running:

```json
{
  "jobId": "geo-1745143200000",
  "status": "running",
  "progress": 55,
  "step": "Bot- und Crawl-Signale geprueft",
  "input": {
    "url": "https://example.com/",
    "brand": "Example",
    "industry": "SaaS",
    "location": "Deutschland"
  },
  "result": null,
  "error": null
}
```

Status endpoint response when finished:

```json
{
  "jobId": "geo-1745143200000",
  "status": "done",
  "progress": 100,
  "step": "Analyse abgeschlossen",
  "input": {
    "url": "https://example.com/",
    "brand": "Example",
    "industry": "SaaS",
    "location": "Deutschland"
  },
  "result": {
    "analysedAt": "2026-04-20T09:00:00.000Z"
  },
  "error": null
}
```

## Worker Progress Checkpoints

The converted worker should persist progress at these milestones:

- `10` `Eingaben aufbereitet`
- `35` `Seiten und SEO-Daten analysiert`
- `55` `Bot- und Crawl-Signale geprueft`
- `70` `GEO-Scores berechnet`
- `85` `Report wird erstellt`
- `100` `Analyse abgeschlossen`

## Error Handling

- invalid input should still fail early in the frontend before the start call
- if the worker fails hard, the final design should update the job row to `failed`
- in the first iteration, node-level `continueRegularOutput` can stay where it already exists
- if a global worker failure path is needed, add a dedicated n8n error workflow that updates the same `jobId`

## Files

- add `docs/superpowers/n8n/geo-analysis-async/README.md`
- add `docs/superpowers/n8n/geo-analysis-async/01-geo-analyse-start.workflow.json`
- add `docs/superpowers/n8n/geo-analysis-async/02-geo-analyse-status.workflow.json`
- add `docs/superpowers/n8n/geo-analysis-async/03-geo-analyse-worker-conversion.md`

## Testing

- import the `start` and `status` workflows
- create the `geo_analysis_jobs` data table with the documented columns
- connect the `start` workflow to the converted worker ID
- run one POST against `geo-analyse-start`
- verify that the returned `jobId` can be polled via `geo-analyse-status`
- verify that `resultJson` is populated when the worker completes
