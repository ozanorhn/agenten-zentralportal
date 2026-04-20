import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from 'chart.js';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
);

const WEBHOOK_KPI = 'https://n8n.eom.de/webhook/kpi-dashboard';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#06b6d4',
  '#8b5cf6', '#f43f5e', '#ec4899', '#14b8a6',
];

type Period = 'month' | 'last-month' | 'week' | 'last-week' | 'all';

interface RawRow {
  execution_timestamp: string;
  workflow_name?: string;
  time_saved_min?: string | number;
  net_time_saved_min?: string | number;
  net_value_eur?: string | number;
  value_created_eur?: string | number;
  ai_cost_eur?: string | number;
  trigger_type?: string;
  [key: string]: unknown;
}

interface ParsedRow {
  _date: Date;
  _timeSaved: number;
  _netTimeSaved: number;
  _netValue: number;
  _valueCreated: number;
  _aiCost: number;
  workflow_name: string;
  trigger_type: string;
}

interface ProcessStat {
  name: string;
  color: string;
  executions: number;
  timeSaved: number;
  netValue: number;
  share: number;
}

@Component({
  selector: 'app-kpi-dashboard',
  imports: [NgClass],
  templateUrl: './kpi-dashboard.html',
  styleUrl: './kpi-dashboard.scss',
})
export class KpiDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartExecDaily') chartExecDailyRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTimeSaved') chartTimeSavedRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartValueByProcess') chartValueByProcessRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTriggerTypes') chartTriggerTypesRef!: ElementRef<HTMLCanvasElement>;

  state = signal<'loading' | 'error' | 'ready'>('loading');
  errorMsg = signal('');
  statusText = signal('Daten werden geladen…');

  currentPeriod = signal<Period>('month');

  kpiExecutions = signal('0');
  kpiExecSub = signal('Prozesse ausgeführt');
  kpiTimeSaved = signal('0h');
  kpiTimeSub = signal('Netto Zeitersparnis');
  kpiValue = signal('0 €');
  kpiValueSub = signal('Netto Wertschöpfung');
  kpiAvg = signal('0 min');
  kpiAvgSub = signal('Zeit gespart je Lauf');

  kpiExecChange = signal<{ label: string; cls: string }>({ label: '—', cls: 'neutral' });
  kpiTimeChange = signal<{ label: string; cls: string }>({ label: '—', cls: 'neutral' });
  kpiValueChange = signal<{ label: string; cls: string }>({ label: '—', cls: 'neutral' });
  kpiAvgChange = signal<{ label: string; cls: string }>({ label: '—', cls: 'neutral' });

  processStats = signal<ProcessStat[]>([]);

  periods: { key: Period; label: string }[] = [
    { key: 'month', label: 'Aktueller Monat' },
    { key: 'last-month', label: 'Vormonat' },
    { key: 'week', label: 'Diese Woche' },
    { key: 'last-week', label: 'Letzte Woche' },
    { key: 'all', label: 'Gesamt' },
  ];

  private allData: ParsedRow[] = [];
  private charts: Chart[] = [];

  ngAfterViewInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  setPeriod(period: Period) {
    this.currentPeriod.set(period);
    this.renderDashboard();
  }

  retry() {
    this.loadData();
  }

  private async loadData() {
    this.state.set('loading');
    try {
      const resp = await fetch(WEBHOOK_KPI, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      const rows: RawRow[] = (Array.isArray(json) ? json : [json]).filter(
        (r: RawRow) => r && r.execution_timestamp,
      );

      this.allData = rows.map(r => ({
        _date: new Date(r.execution_timestamp),
        _timeSaved: parseFloat(String(r.time_saved_min)) || 0,
        _netTimeSaved: parseFloat(String(r.net_time_saved_min)) || 0,
        _netValue: parseFloat(String(r.net_value_eur)) || 0,
        _valueCreated: parseFloat(String(r.value_created_eur)) || 0,
        _aiCost: parseFloat(String(r.ai_cost_eur)) || 0,
        workflow_name: String(r['process_name'] || r.workflow_name || 'Unbekannt'),
        trigger_type: String(r.trigger_type || 'Unbekannt'),
      }));

      this.allData.sort((a, b) => a._date.getTime() - b._date.getTime());

      const last = this.allData[this.allData.length - 1];
      this.statusText.set(
        `Live · ${this.allData.length} Datensätze · Letzter Eintrag: ${this.formatDateTime(last._date)}`,
      );

      this.state.set('ready');
      setTimeout(() => this.renderDashboard(), 0);
    } catch (err) {
      this.errorMsg.set(`Fehler beim Laden: ${(err as Error).message}`);
      this.state.set('error');
    }
  }

  private renderDashboard() {
    const data = this.getFilteredData(this.currentPeriod());
    const prev = this.getPreviousData(this.currentPeriod());
    this.renderKpis(data, prev);
    this.renderCharts(data);
    this.renderTable(data);
  }

  private renderKpis(data: ParsedRow[], prev: ParsedRow[]) {
    const executions = data.length;
    const totalNetTime = data.reduce((s, r) => s + r._netTimeSaved, 0);
    const totalNetValue = data.reduce((s, r) => s + r._netValue, 0);
    const avg = executions > 0 ? totalNetTime / executions : 0;

    const prevExec = prev.length;
    const prevTime = prev.reduce((s, r) => s + r._netTimeSaved, 0);
    const prevValue = prev.reduce((s, r) => s + r._netValue, 0);

    this.kpiExecutions.set(String(executions));
    this.kpiTimeSaved.set(this.formatMinutes(totalNetTime));
    this.kpiTimeSub.set(`≈${(totalNetTime / 60).toFixed(1)}h Netto`);
    this.kpiValue.set(totalNetValue.toFixed(2).replace('.', ',') + ' €');
    this.kpiAvg.set(avg.toFixed(1).replace('.', ',') + ' min');

    this.kpiExecChange.set(this.changeLabel(executions, prevExec));
    this.kpiTimeChange.set(this.changeLabel(totalNetTime, prevTime));
    this.kpiValueChange.set(this.changeLabel(totalNetValue, prevValue));
    this.kpiAvgChange.set(this.changeLabel(avg, prevExec > 0 ? prevTime / prevExec : 0));
  }

  private renderCharts(data: ParsedRow[]) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const execByDay = this.groupByDay(data, () => 1);
    this.charts.push(
      this.createChart(this.chartExecDailyRef, {
        type: 'bar',
        data: {
          labels: execByDay.labels,
          datasets: [{
            data: execByDay.values,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          }],
        },
        options: this.barOptions(''),
      }),
    );

    const timeByDay = this.groupByDay(data, r => r._netTimeSaved);
    this.charts.push(
      this.createChart(this.chartTimeSavedRef, {
        type: 'line',
        data: {
          labels: timeByDay.labels,
          datasets: [{
            data: timeByDay.values,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            pointBackgroundColor: '#f59e0b',
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          }],
        },
        options: this.lineOptions('min'),
      }),
    );

    const byProcess = this.groupByField(data, 'workflow_name', r => r._netValue);
    const topProcesses = byProcess.slice(0, 8);
    this.charts.push(
      this.createChart(this.chartValueByProcessRef, {
        type: 'bar',
        data: {
          labels: topProcesses.map(p => p.label),
          datasets: [{
            data: topProcesses.map(p => p.value),
            backgroundColor: topProcesses.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderRadius: 4,
          }],
        },
        options: {
          ...this.barOptions('€'),
          indexAxis: 'y' as const,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: (ctx) => ` ${Number(ctx.raw).toFixed(2)} €`,
          }}},
        },
      }),
    );

    const byTrigger = this.groupByField(data, 'trigger_type', () => 1);
    this.charts.push(
      this.createChart(this.chartTriggerTypesRef, {
        type: 'doughnut',
        data: {
          labels: byTrigger.map(t => t.label),
          datasets: [{
            data: byTrigger.map(t => t.value),
            backgroundColor: byTrigger.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 2,
            borderColor: '#12121a',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8888a0', font: { size: 12 }, padding: 16, boxWidth: 12 },
            },
          },
        },
      } as ChartConfiguration<'doughnut'>),
    );
  }

  private renderTable(data: ParsedRow[]) {
    const byProcess: Record<string, { executions: number; timeSaved: number; netValue: number; colorIdx: number }> = {};

    data.forEach(r => {
      if (!byProcess[r.workflow_name]) {
        byProcess[r.workflow_name] = {
          executions: 0, timeSaved: 0, netValue: 0,
          colorIdx: Object.keys(byProcess).length % CHART_COLORS.length,
        };
      }
      byProcess[r.workflow_name].executions++;
      byProcess[r.workflow_name].timeSaved += r._netTimeSaved;
      byProcess[r.workflow_name].netValue += r._netValue;
    });

    const totalValue = Math.max(Object.values(byProcess).reduce((s, p) => s + p.netValue, 0), 1);
    const stats: ProcessStat[] = Object.entries(byProcess)
      .map(([name, p]) => ({
        name,
        color: CHART_COLORS[p.colorIdx],
        executions: p.executions,
        timeSaved: p.timeSaved,
        netValue: p.netValue,
        share: (p.netValue / totalValue) * 100,
      }))
      .sort((a, b) => b.netValue - a.netValue);

    this.processStats.set(stats);
  }

  private createChart(ref: ElementRef<HTMLCanvasElement>, config: ChartConfiguration): Chart {
    return new Chart(ref.nativeElement, config);
  }

  private groupByDay(data: ParsedRow[], valueFn: (r: ParsedRow) => number) {
    const map = new Map<string, number>();
    data.forEach(r => {
      const key = this.formatDay(r._date);
      map.set(key, (map.get(key) ?? 0) + valueFn(r));
    });
    return { labels: [...map.keys()], values: [...map.values()] };
  }

  private groupByField(data: ParsedRow[], field: keyof ParsedRow, valueFn: (r: ParsedRow) => number) {
    const map = new Map<string, number>();
    data.forEach(r => {
      const key = String(r[field]);
      map.set(key, (map.get(key) ?? 0) + valueFn(r));
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private barOptions(unit: string) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: { raw: unknown }) => ` ${ctx.raw}${unit ? ' ' + unit : ''}` } },
      },
      scales: {
        x: { ticks: { color: '#55556a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#55556a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    };
  }

  private lineOptions(unit: string) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: { raw: unknown }) => ` ${ctx.raw} ${unit}` } },
      },
      scales: {
        x: { ticks: { color: '#55556a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#55556a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    };
  }

  private getFilteredData(period: Period): ParsedRow[] {
    const now = new Date();
    switch (period) {
      case 'week': {
        const start = this.startOfWeek(now);
        return this.allData.filter(r => r._date >= start);
      }
      case 'last-week': {
        const thisWeek = this.startOfWeek(now);
        const lastWeek = new Date(thisWeek); lastWeek.setDate(lastWeek.getDate() - 7);
        return this.allData.filter(r => r._date >= lastWeek && r._date < thisWeek);
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.allData.filter(r => r._date >= start);
      }
      case 'last-month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.allData.filter(r => r._date >= start && r._date < end);
      }
      default:
        return [...this.allData];
    }
  }

  private getPreviousData(period: Period): ParsedRow[] {
    const now = new Date();
    switch (period) {
      case 'week': {
        const thisWeek = this.startOfWeek(now);
        const lastWeek = new Date(thisWeek); lastWeek.setDate(lastWeek.getDate() - 7);
        return this.allData.filter(r => r._date >= lastWeek && r._date < thisWeek);
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.allData.filter(r => r._date >= start && r._date < end);
      }
      default:
        return [];
    }
  }

  private startOfWeek(d: Date): Date {
    const result = new Date(d);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private changeLabel(current: number, previous: number): { label: string; cls: string } {
    if (previous === 0) return { label: '↑ Neu', cls: 'up' };
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.5) return { label: '— Gleich', cls: 'neutral' };
    return pct > 0
      ? { label: `↑ +${pct.toFixed(0)}%`, cls: 'up' }
      : { label: `↓ ${pct.toFixed(0)}%`, cls: 'down' };
  }

  private formatMinutes(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private formatDay(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatDateTime(d: Date): string {
    return `${d.toLocaleDateString('de-DE')}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  }

  formatNetValue(v: number): string {
    return v.toFixed(2).replace('.', ',') + ' €';
  }

  formatTime(min: number): string {
    if (min === 0) return '0 min';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  }
}
