import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
  delta: string;
  deltaUp: boolean;
}

interface AgentRow {
  name: string;
  category: string;
  timeSaved: string;
  tasks: number;
  status: 'active' | 'standby';
}

@Component({
  standalone: true,
  selector: 'app-ceo-dashboard',
  imports: [DecimalPipe],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10">

      <!-- Hero -->
      <div class="mb-12 max-w-4xl">
        <span class="text-secondary font-headline font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
          Admin / CEO
        </span>
        <h1 class="text-5xl md:text-7xl font-black font-headline tracking-tighter text-on-surface mb-6 leading-none">
          CEO <span class="text-[#0070FF]">Dashboard</span>
        </h1>
        <p class="text-on-surface-variant text-xl max-w-2xl font-light leading-relaxed">
          Echtzeit-Übersicht über den ROI deiner KI-Automatisierung — Zeit, Kosten und Kapazität auf einen Blick.
        </p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        @for (kpi of kpiCards; track kpi.label) {
          <div class="glass-panel rounded-xl p-6 relative overflow-hidden group border border-outline-variant/10
                      hover:border-[#0070FF]/20 transition-all duration-300">
            <div class="flex items-start justify-between mb-6">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center"
                   [style.background]="kpi.color + '18'">
                <span class="material-symbols-outlined text-2xl"
                      [style.color]="kpi.color"
                      style="font-variation-settings: 'FILL' 1;">{{ kpi.icon }}</span>
              </div>
              <span class="text-xs font-bold px-2 py-1 rounded-full"
                    [class]="kpi.deltaUp
                      ? 'bg-[#00C48C]/10 text-[#00C48C]'
                      : 'bg-error/10 text-error'">
                {{ kpi.deltaUp ? '▲' : '▼' }} {{ kpi.delta }}
              </span>
            </div>
            <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-2">
              {{ kpi.label }}
            </p>
            <p class="font-headline text-3xl font-black text-on-surface leading-none mb-1">{{ kpi.value }}</p>
            <p class="text-xs text-on-surface-variant/60">{{ kpi.sub }}</p>
            <div class="absolute bottom-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                 [style.background]="kpi.color + '14'"></div>
          </div>
        }
      </div>

      <!-- Savings Breakdown + Agent Table -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">

        <!-- Weekly Savings Bar Chart -->
        <div class="lg:col-span-8 glass-panel rounded-xl p-8 border border-outline-variant/10">
          <div class="flex items-center justify-between mb-8">
            <div>
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-1">
                Eingesparte Stunden
              </p>
              <p class="font-headline text-2xl font-black text-on-surface">Wochenübersicht</p>
            </div>
            <span class="text-xs text-on-surface-variant/50 glass-panel px-3 py-1 rounded-full border border-outline-variant/10">
              KW 13 / 2025
            </span>
          </div>

          <!-- Bar Chart -->
          <div class="flex items-end gap-3 h-40">
            @for (bar of weeklyBars; track bar.day) {
              <div class="flex-1 flex flex-col items-center gap-2">
                <span class="text-[10px] font-bold text-[#0070FF]">{{ bar.hours }}h</span>
                <div class="w-full rounded-t-md transition-all duration-500 relative overflow-hidden"
                     [style.height]="(bar.hours / 12 * 100) + '%'"
                     [class]="bar.highlight
                       ? 'bg-gradient-to-t from-[#0070FF] to-[#0070FF]/60 shadow-[0_0_12px_rgba(0,112,255,0.4)]'
                       : 'bg-surface-container-highest'">
                </div>
                <span class="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{{ bar.day }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Cost Breakdown -->
        <div class="lg:col-span-4 glass-panel rounded-xl p-8 border border-outline-variant/10">
          <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-6">
            Kostenersparnis
          </p>
          <div class="space-y-5">
            @for (item of costItems; track item.label) {
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-on-surface-variant">{{ item.label }}</span>
                  <span class="text-sm font-bold text-on-surface">{{ item.value }}</span>
                </div>
                <div class="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       [style.width]="item.pct + '%'"
                       [style.background]="item.color"></div>
                </div>
              </div>
            }
          </div>

          <div class="mt-8 pt-6 border-t border-outline-variant/20">
            <p class="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold mb-1">Gesamt gespart</p>
            <p class="font-headline text-4xl font-black text-[#00C48C]">€ 4.820</p>
            <p class="text-xs text-on-surface-variant/50 mt-1">ggü. manuellem Aufwand diesen Monat</p>
          </div>
        </div>

      </div>

      <!-- Agent Performance Table -->
      <div class="glass-panel rounded-xl border border-outline-variant/10 overflow-hidden">
        <div class="px-8 py-6 border-b border-outline-variant/10">
          <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-1">Agent-Leistung</p>
          <p class="font-headline text-xl font-black text-on-surface">Top Performer diesen Monat</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-outline-variant/10">
                <th class="text-left px-8 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Agent</th>
                <th class="text-left px-4 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Kategorie</th>
                <th class="text-left px-4 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Zeit gespart</th>
                <th class="text-left px-4 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Tasks</th>
                <th class="text-left px-4 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (agent of agentRows; track agent.name) {
                <tr class="border-b border-outline-variant/10 hover:bg-surface-container-highest/20 transition-colors">
                  <td class="px-8 py-5">
                    <span class="font-headline font-bold text-on-surface text-sm">{{ agent.name }}</span>
                  </td>
                  <td class="px-4 py-5">
                    <span class="text-xs px-2 py-1 glass-panel rounded-full border border-outline-variant/10 text-on-surface-variant">
                      {{ agent.category }}
                    </span>
                  </td>
                  <td class="px-4 py-5 font-bold text-[#0070FF] text-sm">{{ agent.timeSaved }}</td>
                  <td class="px-4 py-5 text-sm text-on-surface">{{ agent.tasks | number }}</td>
                  <td class="px-4 py-5">
                    <span class="text-xs px-2 py-1 rounded-full font-bold"
                          [class]="agent.status === 'active'
                            ? 'bg-[#00C48C]/10 text-[#00C48C]'
                            : 'bg-surface-container-highest text-on-surface-variant'">
                      {{ agent.status === 'active' ? 'Aktiv' : 'Standby' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
})
export class CeoDashboard {
  kpiCards: KpiCard[] = [
    {
      label: 'Zeit gespart',
      value: '312 Std',
      sub: 'diesen Monat',
      icon: 'schedule',
      color: '#0070FF',
      delta: '18%',
      deltaUp: true,
    },
    {
      label: 'Kosten gespart',
      value: '€ 4.820',
      sub: 'ggü. manuell',
      icon: 'euro',
      color: '#00C48C',
      delta: '22%',
      deltaUp: true,
    },
    {
      label: 'Mitarbeiter-Äquiv.',
      value: '2,1 FTE',
      sub: 'durch Automatisierung',
      icon: 'groups',
      color: '#FF5F1F',
      delta: '0,3 FTE',
      deltaUp: true,
    },
    {
      label: 'Erledigte Tasks',
      value: '1.847',
      sub: 'automatisch diesen Monat',
      icon: 'task_alt',
      color: '#A855F7',
      delta: '34%',
      deltaUp: true,
    },
  ];

  weeklyBars = [
    { day: 'Mo', hours: 8, highlight: false },
    { day: 'Di', hours: 11, highlight: false },
    { day: 'Mi', hours: 9, highlight: false },
    { day: 'Do', hours: 12, highlight: true },
    { day: 'Fr', hours: 10, highlight: false },
    { day: 'Sa', hours: 4, highlight: false },
    { day: 'So', hours: 2, highlight: false },
  ];

  costItems = [
    { label: 'Sales-Automatisierung', value: '€ 2.100', pct: 90, color: '#0070FF' },
    { label: 'Content-Erstellung', value: '€ 1.340', pct: 62, color: '#A855F7' },
    { label: 'SEO & Research', value: '€ 890', pct: 42, color: '#FF5F1F' },
    { label: 'Daten & Reporting', value: '€ 490', pct: 24, color: '#00C48C' },
  ];

  agentRows: AgentRow[] = [
    { name: 'Cold-Mail-Cyborg', category: 'Sales', timeSaved: '96 Std', tasks: 480, status: 'active' },
    { name: 'LinkedIn-Ghostwriter', category: 'Content', timeSaved: '72 Std', tasks: 312, status: 'active' },
    { name: 'Lead-Researcher', category: 'Data', timeSaved: '58 Std', tasks: 890, status: 'active' },
    { name: 'Top-Ranker Bot', category: 'SEO', timeSaved: '44 Std', tasks: 127, status: 'standby' },
    { name: 'Script-Savant', category: 'Content', timeSaved: '42 Std', tasks: 38, status: 'standby' },
  ];
}
