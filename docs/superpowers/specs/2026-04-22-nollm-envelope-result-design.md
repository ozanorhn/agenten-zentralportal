# NoLLM Envelope Result Design

## Goal

Ergaenze die bestehende Ergebnisansicht fuer `seo-geo-analyse-assistent-nollm`, sodass sie sowohl den bisherigen vollstaendigen GEO-Analyse-Report als auch den neuen n8n-Envelope-Output sauber darstellen kann.

Der neue Output enthaelt aktuell nur Transport- und Request-Daten wie:

- `headers`
- `body`
- `webhookUrl`
- `executionMode`

Die Seite soll in diesem Fall nicht mehr wie ein leerer Analyse-Report wirken, sondern eine gezielte NoLLM-Eingangsansicht zeigen.

## Scope

Diese Aenderung bleibt bewusst auf den bestehenden NoLLM-Result-Flow begrenzt.

Betroffene Dateien:

- `src/app/pages/seo-geo-assistant/seo-geo-assistant.models.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.ts`
- `src/app/pages/seo-geo-assistant/seo-geo-assistant-result.html`

Nicht Teil dieses Designs:

- globale SEO-Metadaten der App
- Routing-Aenderungen
- Aenderungen am Webhook selbst
- Redesign der normalen GEO-Ergebnisseite fuer den Standard-Agenten

## Problem

Die aktuelle Frontend-Logik erwartet im Wesentlichen einen `GeoWebhookResult` mit Analysefeldern wie:

- `score`
- `dimensions`
- `report`
- `botAccessibilityCheck`

Der neue NoLLM-Webhook liefert aber derzeit ein Envelope-Format, in dem die eigentlichen Eingabedaten nur unter `body` liegen. Die bestehende Ergebnisseite wuerde dadurch zwar rendern, aber groesstenteils leere KPI-, Dimension- und Analysebereiche zeigen.

## Chosen Approach

Die bestehende Seite bekommt zwei kompatible Darstellungsmodi:

1. `analysis`-Modus
   Dieser Modus bleibt fuer echte GEO-Reports unveraendert in seinem Grundverhalten.
2. `envelope`-Modus
   Dieser Modus greift, wenn nur der neue n8n-Envelope vorliegt und keine belastbaren Analysefelder vorhanden sind.

Die Seite wird also nicht ersetzt, sondern intelligent ergaenzt.

## Data Model

Das Model layer soll den Envelope explizit unterstuetzen, statt ihn implizit als normalen Report zu behandeln.

Neue optionale Typen im Frontend:

- `GeoWebhookEnvelope`
- `GeoWebhookEnvelopeHeaders`

Empfohlene Felder:

- `headers?: Record<string, string>`
- `params?: Record<string, string | number | boolean | null>`
- `query?: Record<string, string | number | boolean | null>`
- `body?: GeoWebhookInput`
- `webhookUrl?: string`
- `executionMode?: string`

`GeoWebhookResult` darf diese Envelope-Felder optional enthalten, damit bestehende Speicherung und Result-Lookups kompatibel bleiben.

## Payload Detection

Die Result-Seite soll einen Envelope-Modus erkennen, wenn alle folgenden Bedingungen gelten:

- es gibt `body` oder `headers` oder `webhookUrl`
- es gibt gleichzeitig keinen nutzbaren Analysekern wie:
  - `score`
  - `dimensions`
  - `report`
  - `botAccessibilityCheck`

Die Erkennung muss key-basiert und defensiv sein.

Wenn spaeter wieder ein voller GEO-Report vom Webhook kommt, soll automatisch wieder der normale Analysemodus greifen.

## Envelope UI

Im Envelope-Modus zeigt die Seite eine gezielte NoLLM-Eingangsansicht mit vier Bereichen.

### 1. Header Hero

Der obere Bereich zeigt:

- URL aus `body.url`
- Marke aus `body.brand`
- Branche aus `body.industry`
- Standort aus `body.location`
- Zeitstempel aus dem gespeicherten Report

Der Ton soll wie ein bestaetigter Eingang wirken, nicht wie ein Fehlerzustand.

### 2. Request Status Card

Eine kompakte Statuskarte fasst zusammen:

- `Request erhalten`
- `NoLLM Webhook erfolgreich beantwortet`
- `Execution Mode`, falls vorhanden

Wenn kein Analyse-Output vorhanden ist, soll das klar aber neutral kommuniziert werden, z. B.:

`Aktuell wurde ein Request-Envelope empfangen. Analysemetriken sind in dieser Antwort noch nicht enthalten.`

### 3. Input Snapshot

Die Eingabedaten aus `body` werden prominent und lesbar dargestellt:

- Website
- Marke
- Branche
- Land / Standort

Diese Karte ersetzt im Envelope-Modus die leeren GEO-Score-Boxen.

### 4. Transport / Request Diagnostics

Eine technische Diagnosekarte zeigt eine kuratierte Auswahl statt eines JSON-Dumps.

Anzuzeigende Felder:

- `webhookUrl`
- `executionMode`
- `origin`
- `referer`
- `host`
- `x-forwarded-proto`
- `user-agent`
- `content-type`

Wenn einzelne Header fehlen, werden sie einfach ausgelassen.

## Envelope Presentation Rules

Die Envelope-Ansicht soll bewusst geordnet und hochwertig wirken.

- keine rohe Volltextausgabe des kompletten Header-Objekts im Hauptlayout
- lange Werte wie `user-agent` duerfen umbrechen
- URLs sollen als lesbare Strings erscheinen
- technische Details kommen nach dem Input-Snapshot, nicht davor

## Existing Analysis UI Behavior

Im Envelope-Modus werden folgende Bereiche ausgeblendet:

- Score-Boxen
- Balanced-Score-Strip
- Guardrail-Hinweis
- GEO-Dimensionen
- Tabs fuer `Content & Onpage`, `Technische Basis`, `Autoritaet & Offpage`, `AI`
- Quick Wins
- AI Live Tests
- Bot Accessibility Analyse

Im normalen Analysemodus bleibt das bisherige Verhalten erhalten.

## Fallbacks

- Wenn `body.url` fehlt, wird im Hero `NoLLM Request` angezeigt.
- Wenn `body` fehlt, aber `headers` oder `webhookUrl` vorhanden sind, wird trotzdem Envelope-Modus verwendet.
- Wenn weder Envelope- noch Analyse-Daten vorhanden sind, bleibt die bestehende Fallback-Ansicht fuer fehlende Reports erhalten.

## Implementation Notes

- `extractGeoWebhookResult` soll das Envelope-Format weiterhin speichern koennen, statt es zu verwerfen.
- Die Result-Komponente braucht ein klares Computed-Signal wie `isEnvelopeOnlyResult`.
- Fuer die Darstellung sollte die NoLLM-Ansicht vorhandene Surface-, Border- und Card-Stile wiederverwenden, damit sie konsistent zur restlichen App bleibt.
- Die HTML-Struktur soll so aufgebaut sein, dass spaeter ein echter Analyseblock oberhalb oder unterhalb leicht wieder ergaenzt werden kann.

## Testing

- bestaetigen, dass ein bisheriger voller GEO-Report unveraendert dargestellt wird
- bestaetigen, dass der neue Envelope-Output nicht in leere Analyse-Karten faellt
- bestaetigen, dass fehlende optionale Header keine Template-Fehler ausloesen
- Production-Build laufen lassen, um Template- und Typfehler frueh zu sehen
