# Radar Chart Redesign Design

## Goal

Replace the current backend-provided radar chart image on the SEO/GEO report page with a frontend-native radar chart that matches the existing KI Portal visual language.

The new radar chart should:

- feel like a first-class part of the existing report UI
- be clearly readable on the dark frontend surfaces
- use the already available GEO dimension data from the report payload
- completely replace the current `visuals.radarChart` image rendering

## Scope

This design is limited to the Angular frontend report page:

- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.html`

This design does not include:

- changes to the webhook payload
- changes to backend chart generation
- keeping the old radar image as a fallback

## Chosen Approach

Implement the radar chart directly in the frontend as an inline `svg` that is computed from the existing `dimensions` array in the GEO report response.

The existing `img` element that renders `visuals.radarChart` will be removed entirely.

## Why This Approach

The current chart fails for two reasons:

- the bright embedded image visually clashes with the dark report interface
- label contrast and chart line visibility are too weak inside the current image

A frontend-native `svg` solves both:

- it can inherit the current dark card styling
- grid, fill, stroke, labels, and helper values can be tuned to the exact frontend palette
- it stays sharp on all screen sizes
- it removes dependence on the aesthetics of backend-generated image output

## UX Behavior

### Placement

Keep the radar chart in the current executive-summary area on the right side of the two-column layout.

The surrounding card should become a premium-looking insight panel:

- dark surface background
- subtle blue glow or gradient accent
- no white image background
- stronger visual hierarchy than the current plain bordered box

### Visual Direction

Use the approved `B` direction:

- frontend-native chart
- dark atmospheric card
- strong but controlled `#0070FF` / cyan accents
- legible labels around the chart
- clearer polygon fill and outline

### Information Density

The card should include:

- title
- short descriptive subtitle
- radar chart itself
- compact score chips or mini-metrics for the plotted dimensions

This keeps the chart readable even when users do not immediately decode the polygon shape.

## Data Source

Use `output()?.dimensions` as the only chart source.

Each plotted axis should come from one dimension entry:

- label from `dimension.label`
- value from `dimension.score`

Ignore `visuals.radarChart` completely in the new UI.

## Rendering Model

### Chart Primitive

Render the chart as inline `svg` inside the result template.

The `svg` should include:

- concentric radar grid polygons
- axis lines from center to outer points
- one filled value polygon
- one visible stroke around the value polygon
- one point marker per dimension
- label text around the outside

### Geometry

Compute chart coordinates in the component based on:

- number of valid dimensions
- normalized score values from `0` to `100`
- a fixed chart radius suited to the card width

The chart should support the report data dynamically instead of assuming a hard-coded number of axes.

### Empty State

If there are not enough valid dimensions to draw a meaningful radar chart, show a designed empty state in the same card instead of a broken or partial chart.

The empty state should explain that no GEO dimension data was available for visualization.

## Component Model

### New Derived State

Add computed frontend state for:

- validated chart dimensions
- chart center and radius
- polygon point list for the score shape
- optional helper collections for grid rings and label positions

### Data Validation

Only use dimension entries that have:

- a non-empty label
- a numeric score

Clamp scores to the `0` to `100` range before plotting.

## Template Structure

Replace the current image block in the executive-summary section with a purpose-built chart card.

The new card should include:

- header text
- subtitle text
- inline `svg`
- dimension score chips below or beside the chart

The current condition:

- `executiveSummary().length || radarChartUrl()`

should be updated so the section is driven by:

- `executiveSummary().length`
- or the availability of valid chart dimensions

## Styling

The chart card should align with the rest of the report UI:

- rounded corners consistent with the existing result cards
- dark surface tones from the current frontend
- subtle border treatment
- accent color based on the existing blue brand color
- labels and grid lines with enough contrast to stay readable

Recommended visual styling:

- grid lines in translucent slate/blue tones
- polygon fill in low-opacity cyan-blue
- polygon outline in stronger bright blue
- outer labels in light slate text
- score chips in semi-transparent surface capsules

## Accessibility

- keep sufficient contrast between labels and background
- avoid relying on color alone by also showing numeric dimension values
- preserve meaningful text in the card even if users do not interpret the chart shape

## Files

- update `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.ts`
- update `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.html`

## Testing

- verify reports with valid dimension data render the new frontend radar chart
- verify reports no longer render `visuals.radarChart`
- verify label readability on desktop and mobile widths
- verify long dimension labels do not visually break the card
- verify reports with missing or invalid dimensions show the designed empty state
- run a production build to catch Angular template and typing errors
