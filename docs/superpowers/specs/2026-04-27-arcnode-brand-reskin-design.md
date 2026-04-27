# Arcnode Brand Reskin Design

## Goal

Reskin the existing Angular portal so the full website aligns with the `arcnode` brand without changing core page structure or feature behavior.

The new visual system should apply across the shell and existing pages with these rules:

- dark-mode-first
- blue-only accent system
- no red, green, or orange brand accents
- `Space Grotesk` for headlines and buttons
- `Inter` for body copy at regular weight
- pill-shaped buttons and CTA elements
- `arcnode` site title in lowercase

## Scope

This work is intentionally limited to a visual reskin.

Included:

- global color tokens
- typography rules
- border radius defaults for buttons and pills
- shell layout styling
- cleanup of hardcoded accent colors that conflict with the new brand
- targeted page-level updates where hardcoded colors would otherwise break consistency

Not included:

- route changes
- component behavior changes
- new imagery
- new page structure
- copy rewrites except where styling hooks require small text-class adjustments

## Brand Tokens

Primary palette:

- `Accent Blue`: `#3b82f6`
- `Accent Blue Light`: `#60a5fa`
- `Light Slate`: `#f1f5f9`
- `Ice Blue`: `#E7F6FF`
- `Near Black`: `#111827`
- `Deep Dark`: `#080c18`

Token mapping:

- page background uses `Deep Dark`
- elevated navigation and header surfaces use `Near Black`
- primary CTA, link, active state, and focus color use `Accent Blue`
- hover and soft highlight states use `Accent Blue Light`
- headings and key navigation labels use `Light Slate`
- body text, muted text, and footer text derive from `Ice Blue` with opacity variation

No semantic accent should rely on red, green, orange, cyan, or purple. Where status differentiation is required, use blue intensity, outline treatment, opacity, or iconography instead of multi-color semantics.

## Chosen Approach

Apply a global theme-token replacement first, then perform a focused hardcoded-color cleanup in the shell and the highest-visibility pages.

Why this approach:

- it preserves the current information architecture
- it keeps the implementation bounded to styling and presentational markup
- it avoids a misleading partial reskin where global surfaces look updated but many buttons and highlights still use old accent colors

## Files

Primary implementation targets:

- `src/styles.scss`
- `tailwind.config.js`
- `src/app/layout/shell/shell.html`
- `src/app/layout/shell/shell.scss`

Secondary targeted cleanup:

- page templates and page-local styles containing hardcoded non-brand accents
- inline template strings in `.ts` page components where visual classes are constructed dynamically

Likely high-visibility areas to review after the token swap:

- `src/app/pages/dashboard/*`
- `src/app/pages/agent-result/*`
- `src/app/pages/seo-geo-assistant*`
- `src/app/pages/content-seo-analyzer/*`
- `src/app/pages/geo-report-alternative/*`
- `src/app/pages/product-text-agent/*`
- `src/app/pages/product-text-result/*`
- `src/app/pages/contact/*`
- `src/app/pages/success/*`

## Visual Rules

### Theme Foundation

- keep `.dark` as the default operating mode for the product experience
- maintain a functional light mode fallback, but tune it as a derivative of the new palette rather than as a separate design language
- update utility variables such as glass overlays, borders, canvas dots, and scrollbars to match the blue-dark system

### Typography

- body text uses `Inter`, `400`, base size `16px`, line height `1.6`
- headings use `Space Grotesk`, `700`
- button labels use `Space Grotesk`, `700`
- the site title remains lowercase `arcnode`
- uppercase utility labels may remain uppercase where already part of the UI language, but should use the new palette and spacing consistently

### Shape Language

- CTA buttons use pill radius
- chip-like badges and segmented toggles should move toward pill treatment where practical
- cards may keep softer rounded corners, but should avoid mismatching sharp and pill-heavy combinations on the same screen

### Shell Layout

- header becomes visually anchored by `Near Black`
- page canvas and main app backdrop use `Deep Dark`
- active nav states use `Accent Blue` with subtle glow or tinted fill
- hover states use `Accent Blue Light` rather than introducing alternate hues
- ambient background glows should stay blue-only and low contrast

## Hardcoded Color Cleanup

The codebase currently contains many direct hex values in templates and some component `.ts` files. The cleanup should prioritize:

1. replacing direct `#0070FF` variants with the new primary token family
2. removing orange, cyan, green, purple, and red accents from decorative UI
3. replacing status chips and highlights that currently depend on traffic-light semantics with blue-only alternatives
4. aligning inline shadows and glow effects with the new blue palette

This cleanup is intentionally selective rather than exhaustive. The goal is visible brand consistency across the live product, not a full class-architecture rewrite.

## Imagery Constraints

- do not add stock photos with business people
- do not introduce robot, AI brain, or chip-board motifs
- existing user-provided image previews in workflows remain functional because they are product data, not decorative brand imagery

## Testing

- run a production build after the reskin
- visually inspect the shell, dashboard, at least one form page, and at least one result page
- verify hover, focus, and active states remain legible in dark mode
- verify buttons and links still meet contrast expectations against dark surfaces
- verify no obvious non-brand accent colors remain in the highest-traffic views

## Risks And Boundaries

- some pages construct classes inside `.ts` files, so token replacement in SCSS alone will not fully reskin the app
- traffic-light semantic states may lose some instant recognizability when converted to blue-only styling; the implementation should compensate with wording, icons, or intensity shifts
- because the repo already has unrelated uncommitted changes, implementation should avoid broad mechanical replacements that could collide with ongoing work

## Success Criteria

The reskin is successful when:

- the shell and major pages read as one coherent `arcnode` brand
- the app feels dark-mode-first
- CTA and navigation emphasis are consistently blue-only
- typography matches the requested brand rules
- old conflicting accent colors are no longer prominent in primary user flows
