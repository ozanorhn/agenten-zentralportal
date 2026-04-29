# GEO Quick Wins Tab Layout Design

## Goal

Improve the GEO result page so that webhook-driven `quick_wins` are shown only in the matching frontend tab and no longer repeat across all tabs.

The page should preserve the current behavior that already feels right to the user:

- the `Quick Wins` section stays at the very bottom of the tab content
- the loading state for the second webhook stays visible there until the webhook responds

At the same time, the tab content should feel less fragmented by reducing the current split between multiple separate cards inside each tab.

## Scope

This change is limited to the GEO result page:

- `src/app/pages/seo-geo-assistant/seo-geo-assistant.models.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.html`

This design does not include:

- changes to the webhook payload shape
- changes to the second webhook timing
- changes to top-level score boxes or GEO dimension cards
- a full redesign of the report page

## Problem

The second webhook now returns `quick_wins` entries that include a `category` field such as:

- `onpage`
- `technik`
- `offpage`

The current frontend treats `secondaryQuickWins` as one flat list. Because of that:

- the same quick wins appear in every tab
- the category information from the webhook is ignored
- tab content is split across multiple cards instead of reading like one coherent section

## Chosen Approach

Keep the existing tab system and bottom-of-tab quick wins placement, but make the quick wins category-aware.

The page should work like this:

1. the second webhook response is parsed as before
2. each quick win keeps its webhook `category`
3. the active tab only renders quick wins whose category matches that tab
4. if no categorized quick wins exist, the page may fall back to the legacy per-report `quickWins`
5. the loading card for the second webhook remains at the bottom of the tab section exactly where it is today

## Payload Support

The frontend quick win model should explicitly support:

- `category?: string`
- `titel`
- `loesung`
- `beispiel`
- `aufwand`
- `scoreImpact`

The parser for the second webhook should keep reading both:

- `quickWins`
- `quick_wins`

and should also extract `category` when present.

Unknown categories should not break rendering. They may simply be ignored by the tab filter.

## Tab Mapping

Quick wins should be mapped directly by category:

- `onpage` -> `Content & Onpage`
- `technik` -> `Technische Basis`
- `offpage` -> `Autoritaet & Offpage`

The mapping should be key-based and case-insensitive where practical.

The currently active tab determines which quick wins are rendered.

Examples:

- in the `onpage` tab, only quick wins with `category: "onpage"` are shown
- in the `technik` tab, only quick wins with `category: "technik"` are shown
- in the `offpage` tab, only quick wins with `category: "offpage"` are shown

## Layout Behavior

The current page structure above the tabs stays unchanged:

- header
- score cards
- GEO dimensions

Inside the tab area, the content should be made more coherent.

### Required ordering within a tab

Within each tab, content should render in this order:

1. tab heading and status items
2. findings
3. tab-specific detail content
4. quick wins section at the very bottom

This preserves the current expectation that quick wins are the last block in the tab.

## Tab-Specific Detail Areas

The tab-specific detail content remains aligned with the current data model:

- `onpage`
  - content and E-E-A-T details
- `technik`
  - bot accessibility
  - technical details
- `offpage`
  - authority details

These details do not move outside their matching tab.

## Quick Wins Section Rules

The `Quick Wins` section keeps its current loading and response behavior:

- while the second webhook is still running, the loading card remains visible at the bottom
- when the webhook responds, the loading card is replaced by the matching quick wins for the current tab
- if the active tab has no matching quick wins and loading is complete, show the existing empty-state style

The section title can stay `Quick Wins`.

The quick win cards themselves should keep the current information density:

- title
- effort badge
- action steps
- example
- score impact

## Legacy Compatibility

Some older reports may still contain:

- uncategorized `secondaryQuickWins`
- only `report.*.quickWins`

Fallback behavior:

- if categorized `secondaryQuickWins` exist, prefer them
- otherwise fall back to the current tab's legacy report quick wins
- do not duplicate categorized and legacy quick wins together

## Implementation Notes

- extend the `QuickWin` type with optional `category`
- update the second webhook response normalizer to keep `category`
- replace the current flat `currentQuickWins()` behavior with tab-aware filtering
- keep `shouldShowQuickWinsCard()` compatible with the current loading state
- simplify the tab template so it reads as one continuous tab section instead of several isolated cards where possible

## Testing

- confirm that `onpage` quick wins appear only in the `Content & Onpage` tab
- confirm that `technik` quick wins appear only in the `Technische Basis` tab
- confirm that `offpage` quick wins appear only in the `Autoritaet & Offpage` tab
- confirm that the loading card still appears at the bottom before the second webhook returns
- confirm that legacy reports without categorized quick wins still render usable fallback quick wins
- run the production build to catch Angular template and type errors
