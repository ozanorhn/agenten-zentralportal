import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface FeaturedAgent {
  id: string;
  icon: string;
  benefit: string;
  name: string;
  description: string;
}

interface Kpi {
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendDown: boolean;
  icon: string;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

const TODOS_KEY = 'dashboard_todos';
const WEBHOOK_KPI = 'https://n8n.eom.de/webhook/kpi-dashboardd';

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'SEO-Tagesbericht für heute starten', done: false },
  { id: '2', text: 'GEO-Report für Kundendomain erstellen', done: false },
  { id: '3', text: 'Content-Strategie aktualisieren', done: false },
  { id: '4', text: 'Verlinkungsplan für neue Seiten erstellen', done: false },
  { id: '5', text: 'Wochenbericht vorbereiten', done: false },
];

const FALLBACK_KPIS: Kpi[] = [
  {
    label: 'Aufgaben erledigt',
    value: '—',
    sub: 'Aktueller Monat',
    trend: 'Wird geladen …',
    trendDown: false,
    icon: 'bolt',
  },
  {
    label: 'Zeit gespart',
    value: '—',
    sub: 'Aktueller Monat',
    trend: 'Wird geladen …',
    trendDown: false,
    icon: 'schedule',
  },
  {
    label: 'Personalkosten gespart',
    value: '—',
    sub: 'Aktueller Monat',
    trend: 'Wird geladen …',
    trendDown: false,
    icon: 'payments',
  },
  {
    label: 'Ø Bearbeitungszeit',
    value: '—',
    sub: 'pro Aufgabe',
    trend: 'Wird geladen …',
    trendDown: false,
    icon: 'avg_pace',
  },
];

interface RawRow {
  execution_timestamp: string;
  net_time_saved_min?: string | number;
  net_value_eur?: string | number;
  [key: string]: unknown;
}

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  kpis = signal<Kpi[]>(FALLBACK_KPIS);

  readonly featuredAgents: FeaturedAgent[] = [
    {
      id: 'seo-intelligence-dashboard',
      icon: 'query_stats',
      benefit: 'Tägliches SEO-Briefing. In unter 2 Minuten.',
      name: 'SEO-Tagesbericht',
      description:
        'Aktuelle SEO-Prioritäten, SERP-Bewegungen und klare Maßnahmen für heute. Direkt aus dem Workflow, ohne manuelle Interpretation.',
    },
    {
      id: 'seo-geo-analyse-assistent-nollm',
      icon: 'forum',
      benefit: 'GEO-Audit für jede Domain. Strukturiert und verwertbar.',
      name: 'GEO-Audit',
      description:
        'URL, Marke und Branche eingeben. Vollständigen Sichtbarkeits-Report mit GEO-Anteil und konkreten Sofortmaßnahmen direkt erhalten.',
    },
    {
      id: 'interne-verlinkung-vorschlaege',
      icon: 'alt_route',
      benefit: 'Verlinkungsplan für jede Domain. Sofort umsetzbar.',
      name: 'Verlinkungsplan',
      description:
        'Sitemap, Zielseite und Hauptkeyword eingeben. Konkrete Verlinkungsempfehlungen zur internen Verlinkungsstrategie direkt erhalten.',
    },
  ];

  // ── Todos ──────────────────────────────────────────────────────────
  todos = signal<TodoItem[]>(this.loadTodos());
  newTodoText = signal('');
  readonly openCount = computed(() => this.todos().filter(t => !t.done).length);

  ngOnInit(): void {
    this.loadKpis();
  }

  private async loadKpis(): Promise<void> {
    try {
      const resp = await fetch(WEBHOOK_KPI, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = await resp.json();
      const rows: RawRow[] = (Array.isArray(json) ? json : [json]).filter(
        (r: RawRow) => r && r.execution_timestamp,
      );

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const current = rows.filter(r => new Date(r.execution_timestamp) >= monthStart);
      const prev = rows.filter(r => {
        const d = new Date(r.execution_timestamp);
        return d >= prevStart && d < monthStart;
      });

      const sumNetTime = (data: RawRow[]) =>
        data.reduce((s, r) => s + (parseFloat(String(r.net_time_saved_min)) || 0), 0);
      const sumNetValue = (data: RawRow[]) =>
        data.reduce((s, r) => s + (parseFloat(String(r.net_value_eur)) || 0), 0);

      const executions = current.length;
      const totalMin = sumNetTime(current);
      const totalValue = sumNetValue(current);
      const avg = executions > 0 ? totalMin / executions : 0;

      const prevExec = prev.length;
      const prevMin = sumNetTime(prev);
      const prevValue = sumNetValue(prev);

      const trendLabel = (cur: number, pre: number): { label: string; down: boolean } => {
        if (pre === 0) return { label: '↑ Neu', down: false };
        const pct = ((cur - pre) / pre) * 100;
        if (Math.abs(pct) < 0.5) return { label: '— Stabil', down: false };
        return pct > 0
          ? { label: `↑ +${pct.toFixed(0)} % vs. Vormonat`, down: false }
          : { label: `↓ ${pct.toFixed(0)} % vs. Vormonat`, down: true };
      };

      const fmtMin = (m: number) => {
        const h = Math.floor(m / 60);
        const rem = Math.round(m % 60);
        return h > 0 ? `${h}h ${rem}m` : `${rem} Min.`;
      };

      const execTrend = trendLabel(executions, prevExec);
      const timeTrend = trendLabel(totalMin, prevMin);
      const valueTrend = trendLabel(totalValue, prevValue);
      const avgCur = executions > 0 ? totalMin / executions : 0;
      const avgPrev = prevExec > 0 ? prevMin / prevExec : 0;
      const avgTrend = trendLabel(avgCur, avgPrev);

      this.kpis.set([
        {
          label: 'Aufgaben erledigt',
          value: String(executions),
          sub: 'Aktueller Monat',
          trend: execTrend.label,
          trendDown: execTrend.down,
          icon: 'bolt',
        },
        {
          label: 'Zeit gespart',
          value: fmtMin(totalMin),
          sub: `${(totalMin / 60).toFixed(1)} h × ${executions} Aufgaben`,
          trend: timeTrend.label,
          trendDown: timeTrend.down,
          icon: 'schedule',
        },
        {
          label: 'Personalkosten gespart',
          value: totalValue.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €',
          sub: 'Nettowert (nach KI-Kosten)',
          trend: valueTrend.label,
          trendDown: valueTrend.down,
          icon: 'payments',
        },
        {
          label: 'Ø Bearbeitungszeit',
          value: avg.toFixed(1).replace('.', ',') + ' Min.',
          sub: 'pro Aufgabe',
          trend: avgTrend.label,
          trendDown: avgTrend.down,
          icon: 'avg_pace',
        },
      ]);
    } catch {
      // Fallback-Werte bleiben sichtbar; keine Fehlermeldung für interne Nutzer
    }
  }

  private loadTodos(): TodoItem[] {
    try {
      const stored = localStorage.getItem(TODOS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_TODOS;
    } catch {
      return DEFAULT_TODOS;
    }
  }

  private saveTodos(items: TodoItem[]): void {
    localStorage.setItem(TODOS_KEY, JSON.stringify(items));
  }

  toggleTodo(id: string): void {
    this.todos.update(items => {
      const updated = items.map(t => t.id === id ? { ...t, done: !t.done } : t);
      this.saveTodos(updated);
      return updated;
    });
  }

  addTodo(): void {
    const text = this.newTodoText().trim();
    if (!text) return;
    this.todos.update(items => {
      const updated = [...items, { id: Date.now().toString(), text, done: false }];
      this.saveTodos(updated);
      return updated;
    });
    this.newTodoText.set('');
  }

  deleteTodo(id: string): void {
    this.todos.update(items => {
      const updated = items.filter(t => t.id !== id);
      this.saveTodos(updated);
      return updated;
    });
  }

  onNewTodoKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.addTodo();
  }

  startWorkflow(agentId: string): void {
    this.router.navigate(['/agents', agentId]);
  }
}
