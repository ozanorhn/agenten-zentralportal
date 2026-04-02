# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200
npm run build      # Production build
npm run watch      # Build in watch mode (development)
npm test           # Unit tests via Karma + Jasmine
```

No linting script is configured — TypeScript strict mode (`tsconfig.json`) provides type-level correctness.

## Architecture

**Angular 20 standalone SPA** — an AI agent marketplace ("KiPortal / AgentHub") with German localization, a credit-based soft paywall, and Material Design 3 theming.

### Key Patterns

- **Standalone components only** — no NgModules. All components use `standalone: true`.
- **Signals for state** — prefer `signal()`, `computed()`, `effect()` over RxJS for local and service state.
- **Functional DI** — use `inject()` inside component bodies/constructors, not constructor parameter injection.
- **Lazy-loaded routes** — all page components are loaded via `loadComponent()` in `app.routes.ts`.

### App Structure

```
src/app/
├── app.routes.ts          # All route definitions (lazy-loaded pages)
├── app.config.ts          # Angular providers (Router, etc.)
├── layout/shell/          # Sidebar nav shell wrapping all authenticated routes
├── pages/                 # One directory per route (login, dashboard, agent-detail, …)
├── components/            # Shared UI: paywall-modal, booking-modal
└── services/
    ├── credit.service.ts  # Credit balance + paywall state (signals, localStorage)
    └── theme.service.ts   # Dark/light mode (class on <html>, localStorage)
```

### Credit / Paywall System

`CreditService` manages 3 free credits stored in `localStorage`. Each agent action calls `useCredit()`. When credits hit 0, `paywallVisible` signal is set to `true`, triggering `<app-paywall-modal>` overlay. The paywall prompts booking a discovery call (OMR event context).

### Theming

Dark mode is class-based (`darkMode: 'class'` in `tailwind.config.js`). `ThemeService` toggles `dark` on `<html>`. All colors are Material Design 3 tokens defined as CSS custom properties in `styles.scss` and mapped into Tailwind via `tailwind.config.js`.

Fonts: **Space Grotesk** (headings) and **Inter** (body/labels) — loaded via `index.html`.

### No Backend

There is no HTTP client or API integration. All state is in-memory or `localStorage`.
