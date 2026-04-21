# NoLLM Loading Overlay Design

## Goal

Upgrade the existing `SEO/GEO Analyse Assistent NoLLM` form flow with a focused loading overlay that appears immediately after the user clicks `Report erstellen`.

The overlay should:

- visually shift the page into an active analysis state
- present the five SEO/GEO analysis phases as a guided progress experience
- keep the current webhook contract unchanged
- preserve the current success path of navigating to the dedicated result page once the webhook response is available

## Scope

This design is limited to the Angular frontend behavior of:

- `src/app/pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm.ts`
- `src/app/pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm.html`
- optional shared styling hooks only if needed through existing app styles

This design does not include:

- changes to the NoLLM webhook payload or response format
- backend polling or real step-by-step progress updates from n8n
- changes to the dedicated NoLLM result page

## Chosen Approach

Implement a fullscreen-style focus overlay on top of the existing form page.

The overlay is time-driven, not backend-driven, but it should feel intentional rather than fake:

1. it appears immediately after successful client-side validation
2. it advances through five named analysis stages on a controlled timer
3. it keeps a visual progress bar in sync with the currently active stage
4. when the webhook returns, the overlay moves into a completed state and the app navigates away as it already does today
5. if the request fails, the overlay disappears and the current inline error handling remains visible on the form

## UX Behavior

### Trigger

- the overlay starts only after `websiteUrl` passes normalization and validation
- invalid input should keep the current behavior: no overlay, just the inline validation error

### Overlay Presentation

The chosen visual direction is the previously approved `B` concept:

- darkened, high-focus overlay above the full form page
- centered analysis card with stronger visual emphasis than the current button spinner
- animated horizontal progress bar
- five stacked steps with distinct states:
  - completed
  - active
  - upcoming

### Step Copy

Use these exact UI labels in the overlay:

1. `Analysiere Website-Struktur und Crawler-Zugriff...`
2. `Pruefe Marken-Autoritaet und E-E-A-T Signale...`
3. `Extrahiere strukturierte Daten und FAQ-Sektionen...`
4. `Berechne GEO-Score fuer KI-Plattformen...`
5. `Generiere finalen Optimierungs-Bericht...`

### Success Flow

- once the fetch resolves successfully and a valid payload is extracted, the UI should briefly show the overlay in its finished state
- the finished state should be short and intentional, roughly `200ms` to `400ms`, so users can register completion without adding noticeable delay
- immediately after that, the current storage-and-navigation flow continues unchanged
- the user should still land on `/agents/seo-geo-analyse-assistent-nollm/result?reportId=...`

### Error Flow

- if the request errors, times out, or returns unusable data, the overlay must close
- the form inputs remain untouched
- the existing user-facing error message is shown in the form
- the user can immediately retry

## Progress Model

Because the current NoLLM flow is a single blocking request, progress is perceived progress rather than real backend telemetry.

Use a staged timer model:

- define five ordered analysis steps in component state
- define one active step index
- define one overall progress value from `0` to `100`
- move the active step forward on fixed intervals while the request is pending

Recommended timing behavior:

- show step 1 immediately
- advance through steps every `1200ms` to `1800ms`
- cap the automatic progress below `100` while the request is still pending
- reserve the final jump to `100` for the moment the webhook response is confirmed usable

This allows the overlay to feel alive during slower requests while avoiding a misleading "100%" state before the real result exists.

## Component Model

### State

Add state for:

- `showLoadingOverlay`
- `analysisSteps`
- `activeStepIndex`
- `overlayProgress`
- timer IDs used to advance the staged progress

The existing `isSubmitting` signal should remain the source of truth for request in-flight behavior.

### Lifecycle Rules

- starting a submit clears any previous overlay timers
- success clears timers before navigation
- failure clears timers and resets overlay state
- component teardown should also clear timers if Angular destroys the page mid-request

### Template Structure

Keep the existing page layout intact and layer the overlay above it using conditional rendering in the page template.

The overlay content should include:

- a compact eyebrow such as `NoLLM Analyse laeuft`
- a strong title such as `SEO/GEO Analyse wird erstellt`
- one animated progress bar
- a list of the five phases with visual state markers
- one short helper sentence explaining that the report opens automatically when ready

The current button-level spinner can stay minimal or be visually secondary once the overlay is present.

## Accessibility and Interaction

- the overlay should prevent duplicate submissions
- the overlay should not expose extra dismiss controls during an active request
- text contrast must stay high on the dark overlay
- motion should remain subtle and not depend on rapid flashing

## Files

- update `src/app/pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm.ts`
- update `src/app/pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm.html`

## Testing

- verify invalid URLs still block submission without opening the overlay
- verify clicking `Report erstellen` opens the overlay immediately
- verify the active step and progress bar advance while waiting for the webhook
- verify successful responses still save the report and navigate to the existing result route
- verify timeout, network, API, and empty-response failures close the overlay and surface the correct existing error message
- run a production build to catch Angular typing and template errors
