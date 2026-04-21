# GEO Result Main Evaluation Design

## Goal

Upgrade the SEO/GEO result page so it can fully render the new GEO payload structure with:

- a preserved `Onpage`, `Technik`, and `Offpage` tab flow
- a new `GEO Hauptauswertung` block below the existing tabs
- visible support for the new top-level GEO dimensions:
  - `Brand Retrieval`
  - `Page GEO Readiness`
- visible support for the nested breakdown groups delivered in the webhook payload

The result page should stop hiding meaningful webhook data that is already present in the JSON response.

## Scope

This design is limited to the Angular GEO result page:

- `src/app/pages/seo-geo-assistant/seo-geo-assistant.models.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.html`

This design does not include:

- webhook payload changes
- backend score calculation changes
- removal of the existing `Onpage`, `Technik`, and `Offpage` detail tabs
- replacing the current page with a fully different information architecture

## Chosen Approach

Keep the existing result page structure intact and append a new primary analysis section below the old tabs.

The page should work in two layers:

1. the existing detail layer remains unchanged in spirit:
   - `Onpage`
   - `Technik`
   - `Offpage`
2. a new GEO-native layer is added below those tabs:
   - balanced GEO summary
   - `Brand Retrieval`
   - `Page GEO Readiness`
   - nested breakdown groups such as `Entity Signals`, `Authority Signals`, `Answerability`, `Technical Access`, and related sections

This keeps the familiar report UI while exposing the richer webhook model instead of discarding it.

## Payload Model To Support

The frontend should explicitly support these new payload parts when present:

- `score.brandRetrieval`
- `score.pageGeoReadiness`
- `score.balancedGeoScore`
- `score.guardrailApplied`
- `score.guardrailReason`
- `dimensions[*].breakdown`
- `subscores`
- `report.brandRetrieval`
- `report.pageGeoReadiness`
- `report.geo.balancedGeoScore`
- `report.geo.brandRetrievalScore`
- `report.geo.pageGeoReadinessScore`
- `report.geo.guardrailApplied`
- `report.geo.guardrailReason`
- `report.geo.dimensionAnalysis`
- `report.geo.subscores`

The page should continue to support older payloads without these fields.

## Layout

### Existing Areas

Keep these areas in place:

- top header with URL and metadata
- top score boxes
- current GEO dimension cards
- the existing tabs:
  - `Content & Onpage`
  - `Technische Basis`
  - `Autoritaet & Offpage`

### New GEO Main Evaluation Block

Render a new section directly below the tabbed detail area titled `GEO Hauptauswertung`.

This block should contain:

1. a compact summary strip
2. a large `Brand Retrieval` card
3. a large `Page GEO Readiness` card

The new block should feel like the structured synthesis of the report, while the old tabs remain the tactical drill-down layer.

## Summary Strip

The summary strip should render compact metrics for:

- `Balanced GEO Score`
- `Brand Retrieval`
- `Page GEO Readiness`
- optional `Guardrail`

Preferred source priority:

1. `report.geo.balancedGeoScore`, `report.geo.brandRetrievalScore`, `report.geo.pageGeoReadinessScore`
2. `score.balancedGeoScore`, `score.brandRetrieval`, `score.pageGeoReadiness`
3. matching dimension scores from `dimensions`

Guardrail behavior:

- if `guardrailApplied` is `true`, show a visible status chip
- if a `guardrailReason` exists, show it as helper text
- if no guardrail data exists, omit the guardrail UI entirely

## Main Dimension Cards

Each of the two main cards should show:

- title
- score
- status
- summary
- explanation / rationale
- two fact columns:
  - `Vorhanden`
  - `Fehlt`
- nested breakdown cards underneath

### Card Data Sources

For `Brand Retrieval`:

1. use `report.brandRetrieval` for score/status/summary/explanation when available
2. fall back to the matching `dimensions` entry with `key === "brandRetrieval"`

For `Page GEO Readiness`:

1. use `report.pageGeoReadiness` for score/status/summary/explanation when available
2. fall back to the matching `dimensions` entry with `key === "pageGeoReadiness"`

Facts should prefer the matched `dimensions` entry:

- `present`
- `missing`

## Breakdown Rendering

Each main dimension card can include nested breakdown groups such as:

- `Entity Signals`
- `Authority Signals`
- `Brand Web Presence`
- `Knowledge Consistency`
- `Answerability`
- `Technical Access`
- `Structured Clarity`
- `Content Packaging`

Each breakdown group should render as its own compact card with:

- label
- score shown as `score / max`
- rationale
- `Vorhanden` list
- `Fehlt` list

### Breakdown Source Priority

For each main dimension:

1. `dimensions[*].breakdown`
2. top-level `subscores`
3. `report.geo.subscores`

The mapping must be based on keys, not fixed array positions.

## Fallback Rules

The page must remain resilient across old and new payloads.

### New Block Visibility

Render the `GEO Hauptauswertung` block only if at least one of these exists:

- a dimension with `key === "brandRetrieval"`
- a dimension with `key === "pageGeoReadiness"`
- `report.brandRetrieval`
- `report.pageGeoReadiness`

### Partial Data

- if only one of the two main dimensions exists, render only that card
- if a card has no `present` facts, show `Keine vorhandenen Signale gemeldet`
- if a card has no `missing` facts, show `Keine fehlenden Signale gemeldet`
- if a card has no breakdown groups, omit the breakdown area cleanly

### Backward Compatibility

If the payload follows the previous structure only:

- the existing result page continues to work
- the new `GEO Hauptauswertung` section stays hidden

## Mapping Model

Add typed support in the frontend model layer for:

- richer dimension entries with `breakdown`
- main report sections for `brandRetrieval` and `pageGeoReadiness`
- grouped subscore collections
- optional guardrail fields
- extended authority metrics such as `organicKeywords`, `organicTraffic`, and `sameAsLinks`

The frontend should avoid any assumptions that only the old dimension keys exist.

## Styling

The new block should match the current result page style:

- same rounded card language
- same dark surface tones
- subtle blue-accent metric styling
- compact but readable lists
- no white-box spreadsheet look

Breakdown cards should be visually lighter than the two main cards so the hierarchy remains clear.

## Testing

- verify the page still renders older GEO payloads without the new fields
- verify `Brand Retrieval` and `Page GEO Readiness` render when delivered in `dimensions`
- verify `Balanced GEO Score` resolves from the correct source priority
- verify `present` and `missing` facts render in the new main cards
- verify nested breakdown groups render from `dimensions[*].breakdown`
- verify fallback to `subscores` works when direct breakdown data is absent
- verify the old `Onpage`, `Technik`, and `Offpage` tabs remain available
- run a production build to catch template and typing regressions
