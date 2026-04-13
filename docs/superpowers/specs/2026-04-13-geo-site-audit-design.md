# Geo Site Audit Agent Design

Date: 2026-04-13
Status: Approved for implementation review

## Goal

Add a new SEO agent named `Geo Site Audit` to the portal. The agent should let a user submit a domain and a page limit, call the n8n test webhook at `https://n8n.eom.de/webhook-test/site-audit`, and display the returned audit text in the existing result view.

This is intentionally a lightweight integration for now:

- no backend/BFF is introduced
- the integration runs through the Angular dev proxy
- the n8n endpoint remains a test webhook for the first version

## User Experience

The new agent appears alongside the existing SEO agents in the marketplace.

On the detail page, the form contains only:

- `Domain`
- `Max. Seiten`

The `Name` field shown in the n8n form flow is not exposed in the portal and is not sent by the frontend.

When the user starts the workflow:

1. the existing loading overlay is shown
2. progress labels communicate that the audit is running
3. after success, the user is redirected to the result page
4. the result page renders the returned audit report as text/markdown

## Architecture

The feature uses the existing agent architecture already used by `Lead-Researcher` and `Firmen-Finder`.

### Agent registration

Add `Geo Site Audit` to:

- the central agent metadata in `src/app/data/agents.data.ts`
- the marketplace cards in `src/app/pages/dashboard/dashboard.ts`

The new agent belongs to the `SEO` category.

### Detail page handling

Extend `src/app/pages/agent-detail/agent-detail.ts` and `src/app/pages/agent-detail/agent-detail.html` with a dedicated branch for the new agent ID.

The detail page needs:

- a signal for `domain`
- a signal for `maxPages`
- a boolean discriminator such as `isGeoSiteAudit`
- dedicated progress labels for the audit run

### Webhook integration

The frontend posts to a relative proxy path, not directly to n8n.

Planned request path:

- `/api/n8n/webhook-test/site-audit`

The Angular dev proxy rewrites that path to:

- `https://n8n.eom.de/webhook-test/site-audit`

The request payload includes:

- `Domain`
- `Max. Seiten`

The payload does not include `Name`.

## Response Handling

The n8n workflow currently returns an array whose first item contains:

- `resultText`
- `totalProcessed`
- `totalFound`
- `averageScore`

The frontend should parse responses defensively to support:

1. an array response with `resultText`
2. a single object with `resultText`
3. a raw text response

The parsed result is stored as a markdown/text output so the existing markdown result renderer can display it without creating a new result template.

## Data Model

No new result view type is introduced in this version.

The implementation reuses the existing `MarkdownOutput` shape, with:

- `type: 'markdown'`
- `content: <audit text>`
- `websiteUrl` or equivalent domain context populated from the form

The run history summary should be more specific than a generic report label.

Preferred summary format:

- `Geo Audit: <domain>`

If useful metadata is available from the webhook response, the summary may optionally include processed page count, for example:

- `Geo Audit: eom.de (254 Seiten)`

## Error Handling

Failure cases should match the existing webhook-backed agent behavior:

- network/proxy failure shows the existing connection error state
- malformed responses fall back to a readable generic report if possible
- empty responses should not crash the result page

If parsing fails completely, the workflow should surface an error instead of saving a broken run.

## Testing

Implementation is complete when all of the following are true:

1. `npm run build` succeeds
2. the new agent appears in the SEO category
3. the detail form shows only `Domain` and `Max. Seiten`
4. the webhook request goes through the local proxy path
5. a successful n8n response renders in the existing result page
6. copy/download/history continue to work for the new result

## Scope Boundaries

Out of scope for this change:

- production backend proxy or BFF
- migration from `webhook-test` to production webhook
- redesign of the result page
- replacing `Top-Ranker Bot`
- adding the `Name` field to the portal

## Implementation Notes

The current codebase has two agent registries:

- `src/app/data/agents.data.ts`
- `src/app/pages/dashboard/dashboard.ts`

Both need to be updated so the agent appears consistently across navigation and runtime metadata.

The existing dev proxy already supports external n8n requests, so this feature should extend that pattern instead of introducing a second networking approach.
