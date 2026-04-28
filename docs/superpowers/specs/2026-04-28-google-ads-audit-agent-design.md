# Google Ads Audit Agent Design

## Ziel

Ein neuer Agent `google-ads-audit` wird in das bestehende KI-Portal integriert. Der Agent nutzt die vorhandene Standard-Logik mit `AgentDetail` als Startseite und `AgentResult` als Ergebnisseite.

Der Ablauf ist bewusst simuliert:

- keine Eingabefelder
- ein primärer Button `Jetzt starten`
- nach Klick erscheint der bestehende Lade-Overlay
- nach exakt 5 Sekunden wird ein fester Audit-Output erzeugt
- der Nutzer landet anschließend auf einer individuell gestalteten Result-Seite im Stil des Projekts

Der Audit bewertet ein Google-Ads-Setup und zeigt Score, kritische Befunde, Warnungen, positives Setup sowie einen priorisierten Maßnahmenplan.

## Nutzerfluss

1. Der Nutzer öffnet den neuen Agenten über Dashboard oder Agentenliste.
2. Auf der Detailseite sieht der Nutzer nur die Agentenbeschreibung und den CTA `Jetzt starten`.
3. Nach Klick startet ein 5-Sekunden-Ladezustand mit bestehendem Overlay und Fortschrittsanzeige.
4. Nach Ablauf der Zeit wird ein statischer Google-Ads-Audit-Output in die Run-History geschrieben.
5. Die App navigiert auf `/agents/google-ads-audit/result`.
6. Die Ergebnisseite zeigt den Audit im Projektstil mit KPI-Header, Befund-Sektionen, Maßnahmenplan und Abschlusskarte.

## Integration in bestehende Struktur

### Agent Registry

Der Agent wird als neuer Eintrag in `src/app/data/agents.data.ts` ergänzt:

- `id`: `google-ads-audit`
- eigener Name, Beschreibung, Kategorie und Icon
- Einbindung in die bestehende Dashboard-/Agentenübersicht

### Detailseite

`AgentDetail` erhält einen neuen Agent-Fall:

- Erkennung über `agentId === 'google-ads-audit'`
- keine Formulareingaben
- kein externer Webhook
- eigener Start-Handler mit lokalem Timeout von 5 Sekunden
- Speicherung eines festen Outputs über die vorhandene Run-History-/Output-Mechanik

Die UI bleibt im bekannten Stil der Seite und verwendet den vorhandenen Loading-Overlay.

### Ergebnisseite

`AgentResult` erhält einen neuen Output-Typ `google-ads-audit`.

Für diesen Typ wird eine eigene Ergebnisdarstellung ergänzt, die nicht generisch als Markdown rendert, sondern als strukturierter Audit-Report mit:

- Header mit Titel, Firmenkontext, Datum und Auditor
- KPI-Karten für Gesamtscore, Kritisch, Warnungen und Potenzial
- Fortschritts-/Score-Leiste
- drei Audit-Sektionen
- Befund-Karten mit Status-Badges
- priorisiertem Maßnahmenplan als Tabelle
- Abschluss-CTA mit Zusammenfassung

## Datenmodell

Es wird ein neues strukturiertes Output-Modell eingeführt:

- Meta-Informationen zum Audit
- Gesamtscore
- Anzahl kritischer Befunde
- Anzahl Warnungen
- Potenzialwert
- Sektionen mit Titel, Score und Befund-Liste
- Maßnahmenplan mit sieben Schritten
- Abschlusszusammenfassung

Alle Inhalte sind statisch und entsprechen exakt dem vom Nutzer vorgegebenen Audit-Text.

## Inhalt des statischen Audits

Der feste Audit enthält diese Befunde:

- Brand-Kampagne fehlt vollständig
- Zu breite Anzeigengruppen-Struktur
- Geo-Targeting Hannover korrekt gesetzt
- HubSpot-Formular-Conversions nicht in Ads importiert
- Telefon-Klick-Tracking fehlt
- GA4 verknüpft, aber Conversion-Modellierung nicht aktiviert
- Konkurrenz bietet auf `EOM` als Keyword
- RSA-Anzeigen ohne Pinning bei USPs
- Sitelink-Extensions vorhanden und relevant

Der Maßnahmenplan enthält diese sieben Punkte:

1. Brand-Kampagne aufsetzen
2. HubSpot-Formular-Conversions in Google Ads importieren
3. Telefon Click-to-Call Tracking aktivieren
4. Consent Mode v2 implementieren und GA4-Modellierung aktivieren
5. Kampagnen nach Leistungsbereichen aufsplitten
6. RSA-Headlines mit Trust-Signalen pinnen
7. Geo-Targeting auf überregionale Märkte prüfen und ggf. erweitern

Die Abschlusskarte zeigt:

- 3 kritische Befunde
- 4 Warnungen
- Potenzial von `+31 % niedrigerer CPA`
- Hinweis auf Roxeanne Rieck als Ansprechpartnerin

## Visuelles Design

Das Ergebnis orientiert sich am gelieferten Referenzbild, bleibt aber klar im Stil des bestehenden Projekts:

- Nutzung vorhandener Farben, Panels, Abstände und Typografie
- dunkle, hochwertige Audit-Karten statt generischer Textblöcke
- klare Badges für `Kritisch`, `Warnung` und `Gut`
- prominente KPI-Zahlen im oberen Bereich
- übersichtliche Tabellen- und Kartenstruktur

Es wird kein exakter Screenshot-Nachbau angestrebt. Ziel ist ein glaubwürdiger, integrierter Portal-Report im bestehenden Designsystem.

## Fehlerverhalten

Da kein API-Call erfolgt, gibt es für diesen Agenten keinen Webhook-Fehlerzustand. Relevante Fehlerfälle beschränken sich auf interne Routing- oder Rendering-Probleme und werden durch die bestehende App-Struktur abgefangen.

## Teststrategie

- prüfen, dass der neue Agent in der Übersicht sichtbar ist
- prüfen, dass `AgentDetail` ohne Eingabefelder rendert
- prüfen, dass der `Jetzt starten`-Button den 5-Sekunden-Ladezustand startet
- prüfen, dass nach Ablauf korrekt auf die Result-Seite navigiert wird
- prüfen, dass der neue Output-Typ vollständig gerendert wird
- prüfen, dass bestehende Agenten-Flows unverändert funktionieren

## Abgrenzung

Nicht Bestandteil dieser Umsetzung:

- echter Google-Ads-API-Zugriff
- Analyse realer Konten
- dynamische Audit-Ergebnisse
- Akkordeon-Interaktion pro Befund
- Backend- oder n8n-Integration
