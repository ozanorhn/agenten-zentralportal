# Geo Report Alternative Design

## Goal

Add a second GEO-related agent without changing the existing GEO audit flows.

The new agent should:

- appear as its own SEO agent in the marketplace
- expose a dedicated input page with exactly one field for a URL
- send a POST request to the n8n test webhook at `/webhook-test/9d69d006-c52a-4a7f-a55e-843846ee3aab`
- accept a markdown response from the webhook
- render that markdown on a dedicated result page

## Scope

This work is intentionally isolated from:

- `Geo Site Audit`
- `SEO/GEO Analyse Assistent`
- generic `agent-detail` and `agent-result` behavior

## Approach

Implement the feature as a dedicated specialized agent, following the same high-level pattern as the existing SEO/GEO assistant:

1. A dedicated form page normalizes and validates the URL.
2. The form sends the URL to a dedicated webhook environment variable.
3. The response is read as text and normalized into markdown.
4. The result is stored in `sessionStorage`.
5. A dedicated result page reads the stored record and renders markdown with `marked`.

## Files

- add `src/app/pages/geo-report-alternative/*`
- update `src/app/app.routes.ts`
- update `src/environments/environment*.ts`
- update `src/app/data/agents.data.ts`
- update `src/app/pages/dashboard/dashboard.ts`

## Data Flow

- input payload: `{ url: "<normalized-url>" }`
- local storage model:
  - `id`
  - `createdAt`
  - `url`
  - `markdown`

## Error Handling

- invalid URL blocks submission with a user-facing message
- timeout and network errors get dedicated messages
- empty or unparsable webhook responses fail gracefully
- opening the result route without a stored report shows a fallback state with a return action

## Testing

- verify the new specialized routes resolve before the generic `agents/:id` route
- verify local development uses the proxy path
- run a production build to catch Angular template and typing issues
