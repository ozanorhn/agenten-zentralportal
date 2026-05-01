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

## Tonalität & Sprache (Pflicht)

arcnode OS richtet sich an den **deutschen Mittelstand**. Jeder neue UI-Text, jedes Label, jede Subline, jede Modal-Copy hält sich kompromisslos an folgende Regeln. Diese Regeln gelten auch für Platzhalter (`placeholder`), `aria-label`, Toasts, Fehlermeldungen und Bot-Antworten.

### 1. Sprache: Deutsch, kein Englisch, kein Sci-Fi-Vokabular

- **Alles, was kein etablierter Tech-Begriff ist, wird übersetzt.** Erlaubt sind nur: `Dashboard`, `KPI`, `ROAS`, `CPA`, `CTR`, `Token`, `Webhook`, `URL`, `API`, `KI`, `SEO`, `GEO`, `CRM`. Markennamen (z. B. `arcnode OS`, `n8n`, `Calendly`) bleiben unverändert.
- **Verboten** (Sci-Fi-/Bro-Vokabular): „autonome Einheiten", „Deploy Agent", „Workflow History", „Reporting Bot", „Quick Wins", „Content Gaps", „Top Competitors", „Market Position", „Recommended Positioning", „Advantages", „Live KPIs" als Headline (als Nav-Label ok, weil etabliert).
- **Übersetzungen-Referenz** (nicht erschöpfend, sondern Beispiele für Tonalität):
  | Englisch / Sci-Fi             | Deutsch                          |
  |-------------------------------|----------------------------------|
  | Agent Management              | Systemverwaltung / Verwaltung    |
  | Workflow History              | Verlauf                          |
  | Reporting Bot                 | Reporting-Assistent              |
  | Content Gaps                  | Inhaltliche Lücken               |
  | Keyword Opportunities         | Keyword-Potenziale               |
  | Quick Wins                    | Sofortmaßnahmen                  |
  | Top Competitors               | Wettbewerber                     |
  | Market Position               | Marktposition                    |
  | Recommended Positioning       | Empfohlene Positionierung        |
  | Advantages                    | Stärken                          |
  | Deploy Agent                  | System einrichten                |
  | autonome Einheiten            | KI-Systeme                       |

### 2. Anrede: Sie, durchgängig

- **Immer Sie, niemals Du.** Auch nicht in Chatbot-Antworten, auch nicht in Sublines, auch nicht in Platzhaltern.
- Globale Pronomen-Regeln:
  | Du-Form        | Sie-Form          |
  |----------------|-------------------|
  | du / Du        | Sie               |
  | dich / Dich    | Sie               |
  | dir / Dir      | Ihnen             |
  | dein / Dein    | Ihr               |
  | deine / Deine  | Ihre              |
  | deinen / Deinen| Ihren             |
  | deiner / Deiner| Ihrer             |
  | deinem / Deinem| Ihrem             |
- **Imperative immer auf Sie-Form.** „Klicke" → „Klicken Sie", „Nutze" → „Nutzen Sie", „Beschreibe" → „Beschreiben Sie", „Gib ein" → „Geben Sie ein", „Stell vor" → „Stellen Sie sich vor", „Lass uns" → „Wir setzen / Wir bauen".
- **Verbformen** auf 2. Pers. Sg. werden umgeschrieben: „erhältst du" → „erhalten Sie", „möchtest du" → „möchten Sie", „findest du" → „finden Sie".

### 3. Groß-/Kleinschreibung: Title Case ist falsch

- Deutsche Überschriften und Buttons schreiben **nur das erste Wort und Substantive** groß. Adjektive bleiben klein.
- ✅ richtig: „Die stärksten Hebel.", „Ihre KI-Systeme im Überblick.", „Empfohlene Systeme"
- ❌ falsch: „Die Stärksten Hebel", „Ihre Ki-Systeme Im Überblick", „Empfohlene Systeme Verfügbar"

### 4. Stil: weniger ist mehr

- Headlines kurz und konkret. Kein Marketing-Bingo, keine Effekt-Adjektive („revolutionär", „bahnbrechend", „next-gen").
- Sublines beschreiben den **Nutzen** oder den **Zustand**, nicht das Feature („Was Ihre KI-Systeme heute geleistet haben." statt „Echtzeit-Telemetrie aus dezentralen Clustern.").
- Statusmeldungen sachlich: „Alle Systeme arbeiten stabil." statt „Alle Agenten laufen auf dezentralen Clustern. Latenz 42ms."

### 5. Vor jedem neuen UI-String: Self-Check

1. Steht da Englisch, das kein etablierter Tech-Begriff ist? → übersetzen.
2. Steht da „du / dein / dir / dich" oder eine 2.-Pers.-Sg.-Verbform? → auf Sie umstellen.
3. Ist die Headline in Title Case? → auf Satz-Großschreibung umstellen.
4. Klingt das nach Sci-Fi/Bro? → reduzieren auf Mittelstand-Klartext.

## Demo-Daten und Glaubwürdigkeit

UI-Beispieldaten werden für die KI-Portal-Demo wie echte Daten gelesen. Folgende Regeln verhindern Glaubwürdigkeitslecks:

- **Keine Sci-Fi-Agentennamen.** Verboten: „Nexus-01 Core", „Data-Miner Alpha", „Customer-Bot Beta". Stattdessen die echten Systemnamen aus diesem Portal verwenden: „SEO-Tagesbericht", „GEO-Audit", „Ad-Copy-Generator", „Reporting-Assistent" etc.
- **Modellnamen aktuell halten.** Stand 2026: `Claude Opus 4.7`, `Claude Sonnet 4.6`, `Claude Haiku 4.5`. Verboten: `Claude 3.5 Sonnet`, `GPT-3.5 Turbo`, `GPT-4 Omni`, `Llama 3 70B` (alle veraltet). Wenn ein Modellname auftaucht, prüfen, ob er aktuell ist.
- **Keine Lorem-Ipsum-Personen mit Initialen.** Verboten: „Anna K.", „Max B.", „Lisa M.". Stattdessen anonymisierte Bereiche („Marketing", „Vertrieb", „IT") oder vollständige Platzhalternamen aus existierenden Demo-Datensätzen.
- **Datumsangaben nicht hartkodieren.** Statt `'KW 13 / April 2025'` immer aus `new Date()` ableiten oder ein generisches Label verwenden, sonst altert die Demo.

## Metriken: Mittelstand-Sprache, kein Tech-Bro

Geschäftsführer interessieren sich nicht für Latenz, Tokens/h oder UTC-Wartungsfenster. Jede sichtbare Zahl muss eine Antwort auf „so what?" geben.

- **Verbotene Metriken im UI:** `Tokens/h`, `Latenz: Xms`, `UTC-Wartungsfenster`, `Cluster-Status`, `Threat Analysis`, `NLU Response System`, `Cognitive Layer 7`.
- **Erlaubte Metriken (mit Bezugsrahmen):**
  - „Aktive Systeme: 3 von 4"
  - „Letzte Ausführung: 06:00 Uhr"
  - „Aufgaben erledigt: 928 (in den letzten 30 Tagen)"
  - „Zeit gespart: 171,7 h (11,1 Min. × 928 Aufgaben)"
  - „Personalkosten gespart: 9.992 € (171,7 h × 58,20 €/h)"
- **Bezugsrahmen ist Pflicht.** „9.992 €" ohne Erklärung wirkt erfunden. Immer Berechnungsbasis als Subline oder Fußnote nennen.
- **Statusmeldungen freundlich formulieren:** „Alle Systeme arbeiten stabil. Sie werden bei Auffälligkeiten per E-Mail informiert." statt „Latenz 42ms, nächstes Wartungsfenster Sonntag 03:00 UTC".

## Hero-Header-Pattern (konsistent)

Jede Top-Level-Seite folgt demselben Muster:

```html
<span class="…uppercase tracking-[0.2em]">Eyebrow (Bereich, z. B. „Verwaltung", „Geschäftsleitung", „Archiv")</span>
<h1>Page Title (z. B. „Reporting-Assistent")</h1>
<p>Subline: was die Seite tut, kurz und nutzenorientiert.</p>
```

- **Eyebrow ≠ H1.** Wenn die H1 „Verlauf" heißt, darf der Eyebrow nicht ebenfalls „Verlauf" sein → wäre derselbe Begriff doppelt. Eyebrow ist Kategorie, H1 ist Seitenname.
- **Kein zweites Wort in Akzentfarbe.** Konstrukte wie „Reporting <span class='text-[#0070FF]'>Bot</span>" sind retro-Style und werden vermieden — H1 bleibt einfarbig.
- **Eyebrow auf Englisch verboten.** „HISTORY", „DATA", „ADMIN / CEO" sind raus. Auf Deutsch: „Archiv", „Verwaltung", „Geschäftsleitung".

## CSS-Stolperfallen

- **`text-transform: capitalize` ist verboten** auf `h1-h6` und Buttons. Es macht aus „eom.de" → „Eom.De" und zerschießt deutsche Satz-Großschreibung in Headlines (eingeführt für Title-Case-Look englischer Texte). Diese Regel ist in `src/styles.scss` bereits entfernt — nicht wieder einführen.
