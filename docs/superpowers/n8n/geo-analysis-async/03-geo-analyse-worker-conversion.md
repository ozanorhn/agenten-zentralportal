# Existing GEO Workflow -> Async Worker Conversion

Nutze deinen aktuellen `geo-analyse` Workflow als eigentlichen Worker. Du musst ihn nicht neu erfinden, sondern nur vom synchronen Webhook auf einen Sub-Workflow umbauen.

## 1. Trigger tauschen

Entferne diese beiden Knoten aus dem bestehenden Workflow:

- `Webhook1`
- `Respond to Webhook`

Fuege stattdessen als ersten Knoten ein:

- `When Executed by Another Workflow`
- Typ: `Execute Sub-workflow Trigger`
- Node-Typ intern: `n8n-nodes-base.executeWorkflowTrigger`

Definiere diese Workflow Inputs:

- `jobId` als `string`
- `url` als `string`
- `brand` als `string`
- `industry` als `string`
- `location` als `string`

## 2. Set Variables anpassen

Dein bisheriger `Set Variables` Knoten liest aus `$json.body.*`.

Stelle ihn um auf die Inputs des Sub-Workflows:

```text
url      = {{ $json.url.replace(/\\/+$/, '') }}
domain   = {{ $json.url.split('/').slice(0, 3).join('/') }}
brand    = {{ $json.brand || (new URL($json.url).hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() + new URL($json.url).hostname.replace('www.', '').split('.')[0].slice(1)) }}
industry = {{ $json.industry || 'Unternehmen' }}
location = {{ $json.location || 'Deutschland' }}
jobId    = {{ $json.jobId }}
```

## 3. Status-Update Node anlegen

Lege einmal einen `Data Table` Knoten an, dupliziere ihn danach fuer die einzelnen Meilensteine.

Empfohlene Grundeinstellungen:

- Operation: `upsert`
- Data table: `geo_analysis_jobs` per Name
- Match type: `allConditions`
- Filter: `jobId = {{ $('Set Variables').first().json.jobId }}`

Die Columns sollten immer diese Felder schreiben:

- `jobId`
- `status`
- `progress`
- `step`
- `updatedAt`
- optional `resultJson`
- optional `errorJson`

## 4. Progress-Punkte verdrahten

Fuege diese Upsert-Knoten in den bestehenden Flow ein:

### Nach `Set Variables`

- `status = running`
- `progress = 10`
- `step = Eingaben aufbereitet`

### Nach `Merge SEO Data`

- `status = running`
- `progress = 35`
- `step = Seiten und SEO-Daten analysiert`

### Nach `Collect Bot Results`

- `status = running`
- `progress = 55`
- `step = Bot- und Crawl-Signale geprueft`

### Nach `Code in JavaScript1`

- `status = running`
- `progress = 70`
- `step = GEO-Scores berechnet`

### Nach `Claude Report Generator`

- `status = running`
- `progress = 85`
- `step = Report wird erstellt`

## 5. Finale Antwort nicht mehr an Webhook senden

Dein `Build Final Response` Knoten bleibt bestehen.

Direkt danach:

1. `Code` Knoten `Serialize Final Result`
2. `Data Table` Knoten `Save Finished Job`

### Code fuer `Serialize Final Result`

```javascript
const result = $input.first().json;
const jobId = $('Set Variables').first().json.jobId;
const now = new Date().toISOString();

return [{
  json: {
    jobId,
    status: 'done',
    progress: 100,
    step: 'Analyse abgeschlossen',
    updatedAt: now,
    resultJson: JSON.stringify(result),
    errorJson: '',
  },
}];
```

### Werte fuer `Save Finished Job`

- `status = {{ $json.status }}`
- `progress = {{ $json.progress }}`
- `step = {{ $json.step }}`
- `updatedAt = {{ $json.updatedAt }}`
- `resultJson = {{ $json.resultJson }}`
- `errorJson = {{ $json.errorJson }}`

## 6. Fehlerfall fuer V1

Dein aktueller Workflow hat schon mehrere `continueRegularOutput` Stellen. Das ist fuer den ersten Async-Umbau okay.

Wenn du explizit `failed` speichern willst, fuege spaeter einen separaten Error-Workflow hinzu, der dieselbe `jobId` auf:

- `status = failed`
- `progress = 100`
- `step = Analyse fehlgeschlagen`
- `errorJson = ...`

setzt.

## 7. Ahrefs Token nicht im Workflow lassen

In deinem geposteten Export steckt ein Bearer-Token im Klartext. Packe den unbedingt in ein Credential oder mindestens in ein Secret/Env-Setup und nicht in die JSON-Datei.

## 8. Danach

Wenn der Worker so umgestellt ist, ruft dein Frontend nur noch:

- `POST /webhook-test/geo-analyse-start`
- `GET /webhook-test/geo-analyse-status?jobId=...`

auf.
