# Content SEO Analyzer Design

## Goal

Add a new specialized SEO agent that accepts only a domain, sends it to the n8n test webhook at `https://n8n.eom.de/webhook-test/analyze-website`, and then shows a success confirmation in the portal.

The new agent should:

- appear as its own SEO agent in the marketplace
- expose a dedicated input page with exactly one domain field
- normalize and validate the input before submission
- send a `POST` request with a minimal JSON payload
- redirect to a success page after a successful webhook response

## Scope

This work stays intentionally isolated from:

- `Geo Site Audit`
- `SEO/GEO Analyse Assistent`
- generic `agent-detail` workflow execution
- agent result rendering and run history storage

## Chosen Approach

Implement the feature as a dedicated specialized agent page instead of extending the generic `agent-detail` component.

Flow:

1. The user opens a dedicated route for the new agent.
2. The page shows one input for the target domain.
3. The submit handler trims the input and normalizes it to a bare domain value.
4. The page sends the domain to a dedicated environment-backed webhook URL.
5. On success, the page routes to the generic success screen with a new success type dedicated to this analyzer.

This keeps the implementation small, avoids adding more branching to `agent-detail.ts`, and matches the existing pattern used for other specialized agents.

## Files

- add `src/app/pages/content-seo-analyzer/*`
- update `src/app/app.routes.ts`
- update `src/app/data/agents.data.ts`
- update `src/app/pages/dashboard/dashboard.ts`
- update `src/environments/environment.ts`
- update `src/environments/environment.prod.ts`
- update `src/app/pages/success/success.ts`

## Data Flow

Input handling:

- UI input: a single text field labeled for a domain
- accepted examples:
  - `eom.de`
  - `www.eom.de`
  - `https://eom.de`

Normalized payload:

- `{ "domain": "eom.de" }`

The frontend should remove protocol, path, query, fragment, and trailing slash noise before sending the payload.

## Validation

- empty input blocks submission with a user-facing message
- malformed values that do not produce a valid hostname block submission
- the normalized value sent to the webhook should be the hostname only

## Request Handling

- request method: `POST`
- request headers:
  - `Content-Type: application/json`
  - `Accept: application/json`
- request target comes from a dedicated environment field
- a local loading state disables duplicate submissions

The response body does not need to be rendered. A successful HTTP response is enough to continue to the success page.

## Success Handling

After a successful request, the flow navigates to `success/content-seo-analyzer`.

The success page should get a dedicated title and message, for example confirming that the domain was submitted and the analysis was started successfully.

## Error Handling

- timeout errors show a clear retry message
- network errors show a connectivity message
- non-2xx responses show a generic submission error
- failed requests keep the user on the input page

## Testing

- verify the specialized route resolves before the generic `agents/:id` route
- verify the new agent appears on the dashboard and in the shared agent data
- verify domain normalization for values with and without protocol
- verify duplicate clicks are blocked while the request is in flight
- run a production build to catch Angular template and typing issues
