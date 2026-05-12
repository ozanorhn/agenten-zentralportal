import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { RunHistoryService } from '../../services/run-history.service';

const WEBHOOK_URL = 'https://n8n.eom.de/webhook/74cb760b-813e-4007-8c2b-4a4e3bbfc0d6';

interface SeoItem {
  url: string;
  fokus: 'CTR' | 'Ranking';
  prioritaet: number;
  analyse: string;
  empfehlung: string;
}

function buildTimestampPayload(): object[] {
  const now = new Date();

  const berlinLocal = now.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' });
  const utcLocal = now.toLocaleString('sv-SE', { timeZone: 'UTC' });
  const offsetMs = new Date(berlinLocal).getTime() - new Date(utcLocal).getTime();
  const offsetH = Math.floor(Math.abs(offsetMs) / 3600000);
  const sign = offsetMs >= 0 ? '+' : '-';
  const offsetStr = `${sign}${String(offsetH).padStart(2, '0')}:00`;

  const [datePart, timePart] = berlinLocal.split(' ');
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  const isoTimestamp = `${datePart}T${timePart}.${millis}${offsetStr}`;

  const fmtParts = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', ...opts }).formatToParts(now);

  const p24 = fmtParts({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const get24 = (t: string) => p24.find(p => p.type === t)?.value ?? '00';

  const p12 = fmtParts({ hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const get12 = (t: string) => p12.find(p => p.type === t)?.value ?? '';
  const readableTime = `${get12('hour')}:${get12('minute')}:${get12('second')} ${get12('dayPeriod').toLowerCase()}`;

  const monthName = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', month: 'long' }).format(now);
  const dayNum = parseInt(datePart.split('-')[2]);
  const yearNum = datePart.split('-')[0];
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'long' }).format(now);
  const ordinal = [1, 21, 31].includes(dayNum) ? 'st' : [2, 22].includes(dayNum) ? 'nd' : [3, 23].includes(dayNum) ? 'rd' : 'th';
  const readableDate = `${monthName} ${dayNum}${ordinal} ${yearNum}, ${readableTime}`;

  return [{
    timestamp: isoTimestamp,
    'Readable date': readableDate,
    'Readable time': readableTime,
    'Day of week': weekday,
    'Year': yearNum,
    'Month': monthName,
    'Day of month': String(dayNum),
    'Hour': get24('hour'),
    'Minute': get24('minute'),
    'Second': get24('second'),
    'Timezone': `Europe/Berlin (UTC${offsetStr})`,
  }];
}

@Component({
  selector: 'app-seo-intelligence-dashboard',
  imports: [NgClass, RouterLink],
  templateUrl: './seo-intelligence-dashboard.html',
})
export class SeoIntelligenceDashboard {
  private readonly runHistory = inject(RunHistoryService);
  state = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  errorMsg = signal('');
  responseItems = signal<SeoItem[]>([]);

  get ctrCount() { return this.responseItems().filter(i => i.fokus === 'CTR').length; }
  get rankingCount() { return this.responseItems().filter(i => i.fokus === 'Ranking').length; }

  async trigger() {
    if (this.state() === 'loading') return;
    this.state.set('loading');
    this.errorMsg.set('');
    try {
      const payload = buildTimestampPayload();
      const resp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Kein JSON: ${text.slice(0, 120)}`);
      }
      let items: SeoItem[] = [];
      if (Array.isArray(data)) {
        const first = data[0];
        if (first && first.url) {
          items = data as SeoItem[];
        } else if (first && first.json && first.json.url) {
          items = data.map((d: any) => d.json);
        } else if (first && Array.isArray(first)) {
          items = first;
        }
      } else if (data && data.url) {
        items = [data];
      }
      if (items.length === 0) throw new Error(`Struktur nicht erkannt: ${JSON.stringify(data).slice(0, 150)}`);
      this.responseItems.set(items);
      this.state.set('success');
      this.runHistory.addRun({
        id: `run-${Date.now()}`,
        agentId: 'seo-intelligence-dashboard',
        agentName: 'SEO-Tagesbericht',
        agentIcon: 'query_stats',
        agentCategory: 'SEO',
        timestamp: Date.now(),
        inputData: {},
        outputSummary: `${items.length} SEO-Maßnahmen — ${items.filter(i => i.fokus === 'CTR').length}× CTR, ${items.filter(i => i.fokus === 'Ranking').length}× Ranking`,
        fullOutput: { type: 'markdown', content: JSON.stringify(items) },
        tokenCount: 0,
      });
    } catch (err) {
      this.errorMsg.set((err as Error).message);
      this.state.set('error');
    }
  }

  reset() {
    this.state.set('idle');
    this.responseItems.set([]);
  }
}
