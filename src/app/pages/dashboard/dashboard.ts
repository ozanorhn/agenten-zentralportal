import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'SEO-Tagesbericht für heute starten', done: false },
  { id: '2', text: 'Google Ads Audit durchführen (ROAS prüfen)', done: false },
  { id: '3', text: 'GEO-Report für 3 neue Domains erstellen', done: false },
  { id: '4', text: 'Content-Strategie Q2 finalisieren', done: false },
  { id: '5', text: 'Wochenbericht vorbereiten', done: false },
];

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly router = inject(Router);

  readonly today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly kpis: Kpi[] = [
    {
      label: 'Aufgaben erledigt',
      value: '928',
      sub: 'in den letzten 30 Tagen',
      trend: '−4 % vs. Vormonat',
      trendDown: true,
      icon: 'bolt',
    },
    {
      label: 'Zeit gespart',
      value: '171,7 h',
      sub: '11,1 Min. × 928 Aufgaben',
      trend: '−4 % vs. Vormonat',
      trendDown: true,
      icon: 'schedule',
    },
    {
      label: 'Personalkosten gespart',
      value: '9.992 €',
      sub: '171,7 h × 58,20 €/h*',
      trend: '−4 % vs. Vormonat',
      trendDown: true,
      icon: 'payments',
    },
    {
      label: 'Ø Bearbeitungszeit',
      value: '11,1 Min.',
      sub: 'pro Aufgabe',
      trend: 'Stabil',
      trendDown: false,
      icon: 'avg_pace',
    },
  ];

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
      id: 'ad-copy-generator',
      icon: 'campaign',
      benefit: 'Ad-Copy für Google & Meta. Sofort testbereit.',
      name: 'Ad-Copy',
      description:
        'Drei Anzeigen-Varianten mit Tonalitätslabel und Qualitäts-Score. Kopieren und in Ihr Konto einfügen, keine Nachbearbeitung nötig.',
    },
  ];

  // ── Todos ──────────────────────────────────────────────────────────
  todos = signal<TodoItem[]>(this.loadTodos());
  newTodoText = signal('');
  readonly openCount = computed(() => this.todos().filter(t => !t.done).length);

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
