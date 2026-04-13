# GEO Audit JSON Dashboard Design

Date: 2026-04-13
Status: Approved for implementation review

## Goal

Replace the current text-first GEO audit result flow with a JSON-first result model and a dedicated dashboard UI in the portal.

The new flow should:

- accept the structured webhook payload from n8n
- store it in run history as first-class audit data
- render an easy-to-scan executive dashboard in the result view
- avoid large monolithic text blocks as the primary working surface

## Current State

The GEO Site Audit agent currently:

- calls the n8n webhook successfully
- receives a structured JSON payload
- still treats the result as a markdown/text report in the frontend

This makes the result hard to work with even though the source data is already rich enough for cards, issue lists, and ranked page sections.

## Source Payload

The frontend should treat the n8n response as the source of truth.

The current payload shape contains:

- `summary`
- `botStatus`
- `totals`
- `distribution`
- `topIssues`
- `topPages`
- `worstPages`
- `errors`

Example characteristics:

- summary metrics for domain, page counts, average score, best page, worst page
- a firewall / bot-access flag
- aggregated score buckets
- sitewide issue counts with percentages
- ranked top pages
- ranked worst pages with titles and failed checks
- an error list for unreachable pages

## Frontend Data Model

Add a dedicated GEO audit output type to the app model instead of reusing `MarkdownOutput`.

Suggested model:

- `GeoAuditOutput`
  - `type: 'geo-audit'`
  - `summary`
  - `botStatus`
  - `totals`
  - `distribution`
  - `topIssues`
  - `topPages`
  - `worstPages`
  - `errors`

Suggested supporting shapes:

- `GeoAuditSummary`
- `GeoAuditPageRef`
- `GeoAuditDistribution`
- `GeoAuditIssue`
- `GeoAuditPage`
- `GeoAuditError`
- `GeoAuditBotStatus`

`AgentOutput` should include `GeoAuditOutput`.

## Parsing Strategy

The GEO audit completion flow in the agent detail page should:

1. parse the webhook response as JSON
2. accept either:
   - an array whose first element is the audit payload
   - a direct object payload
3. validate that core sections exist before saving the run

If the payload is malformed:

- show the existing webhook error state
- do not save a broken run to history

The old `resultText` may be preserved as an optional fallback field if n8n still sends it, but it should no longer be the main rendering path.

## Result View Layout

The GEO audit result screen should use an executive-first layout.

### Header

Top row:

- back button
- agent title
- actions like copy/download

Primary result header:

- domain
- audit label
- pages processed

### KPI Cards

First block should show four compact KPI cards:

- average score
- pages processed
- best page score
- AI crawler / firewall status

### Status + Sitewide Issues

Second block should be a two-column section:

- left: bot / crawl status and score distribution
- right: top sitewide issues with counts and percentages

### Best / Worst Snapshot

Third block should compare:

- best page
- worst page

Each card should show:

- score
- path
- short problem summary

### Weakest Pages

Fourth block should show a compact list or table for `worstPages`.

Each row/card should contain:

- score
- path
- title
- failed check count
- failed checks as chips or a short wrapped list

### Recommendations

Final block should convert the highest-signal findings into simple action cards.

For version 1, recommendations can be derived in the frontend from:

- `botStatus`
- first items in `topIssues`
- the repeated failures in `worstPages`

No LLM-generated recommendation layer is needed yet.

## Visual Direction

Use the existing portal language and keep the result screen practical rather than flashy.

Principles:

- large score numerals
- strong visual hierarchy
- issue chips and status badges
- compact cards instead of long prose
- preserve mobile readability by stacking sections cleanly

## Copy / Download Behavior

Copy and download should still work.

For `GeoAuditOutput`:

- copy should produce a readable plain-text summary
- download can be JSON or text

Recommended first version:

- keep download as JSON for full fidelity
- keep copy as a concise text report

## Run History

Run history should continue to store the GEO audit under the agent’s SEO category.

Suggested summary format:

- `Geo Audit: eom.de (25 Seiten)`

This summary should be derived from `summary.domain` and `summary.totalProcessed`.

## Implementation Scope

In scope:

- new `GeoAuditOutput` model
- webhook parsing update for GEO audit
- dedicated result rendering branch
- basic recommendation cards
- copy/download support for the new output type

Out of scope:

- editing the entire result page architecture for all agents
- advanced sorting/filtering/pagination for all audited pages
- charts library integration
- production backend changes
- replacing other result types with JSON dashboards

## Verification

Implementation is complete when all of the following are true:

1. the webhook payload is stored as structured GEO audit data
2. the result page renders cards/lists instead of a monolithic text block
3. best/worst pages and top issues are visible without scrolling through raw text
4. copy and download still work
5. `npm run build` succeeds

## Migration Notes

The app can keep temporary support for both formats during the transition:

- `geo-audit` as the preferred structured result
- old markdown/text rendering as a fallback only

Once the new dashboard is stable, the GEO audit flow should stop producing markdown output entirely.
