import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ReportType {
  id: string;
  label: string;
  icon: string;
  period: string;
}

interface DataPoint {
  project: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'done';
  progress: number;
  lastUpdate: string;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

@Component({
  standalone: true,
  selector: 'app-reporting-bot',
  imports: [FormsModule],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10">

      <!-- Hero -->
      <div class="mb-12 max-w-4xl">
        <span class="text-secondary font-headline font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
          Admin / CEO
        </span>
        <h1 class="text-5xl md:text-7xl font-black font-headline tracking-tighter text-on-surface mb-6 leading-none">
          Reporting <span class="text-[#0070FF]">Bot</span>
        </h1>
        <p class="text-on-surface-variant text-xl max-w-2xl font-light leading-relaxed">
          Automatische Berichte aus deiner Datenbasis oder stell einfach eine Frage zum Stand deiner Projekte.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- Left: Report Generator -->
        <div class="lg:col-span-7 space-y-6">

          <!-- Report Type Selector -->
          <div class="glass-panel rounded-xl p-8 border border-outline-variant/10">
            <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-6">
              Bericht erstellen
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              @for (type of reportTypes; track type.id) {
                <button
                  (click)="selectedReport.set(type.id)"
                  class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200"
                  [class]="selectedReport() === type.id
                    ? 'border-[#0070FF] bg-[#0070FF]/10 text-[#0070FF]'
                    : 'border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40'">
                  <span class="material-symbols-outlined text-2xl"
                        style="font-variation-settings: 'FILL' 1;">{{ type.icon }}</span>
                  <span class="text-xs font-bold uppercase tracking-wider">{{ type.label }}</span>
                  <span class="text-[10px] opacity-60">{{ type.period }}</span>
                </button>
              }
            </div>

            <button
              (click)="generateReport()"
              class="w-full py-4 bg-gradient-to-r from-primary-container to-[#0070FF]
                     text-white font-black text-base rounded-xl hover:scale-[1.01]
                     active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
              {{ activeReportLabel() }} generieren
            </button>
          </div>

          <!-- Generated Report Preview -->
          @if (reportGenerated()) {
            <div class="glass-panel rounded-xl p-8 border border-[#0070FF]/20 animate-fade-in">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="w-2.5 h-2.5 bg-[#00C48C] rounded-full animate-pulse"></span>
                  <p class="text-[10px] uppercase tracking-[0.2em] text-[#00C48C] font-bold">
                    Bericht generiert
                  </p>
                </div>
                <div class="flex gap-2">
                  <button class="p-2 glass-panel rounded-lg border border-outline-variant/10 hover:border-[#0070FF]/30 transition-all">
                    <span class="material-symbols-outlined text-on-surface-variant text-lg">content_copy</span>
                  </button>
                  <button class="p-2 glass-panel rounded-lg border border-outline-variant/10 hover:border-[#0070FF]/30 transition-all">
                    <span class="material-symbols-outlined text-on-surface-variant text-lg">download</span>
                  </button>
                </div>
              </div>

              <div class="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                <h2 class="font-headline text-xl font-black text-on-surface">
                  {{ activeReportLabel() }} — KW 13 / April 2025
                </h2>
                <p>
                  <strong class="text-on-surface">Zusammenfassung:</strong>
                  Im Berichtszeitraum wurden <strong class="text-[#0070FF]">1.847 Tasks</strong> automatisch abgeschlossen.
                  Das Team konnte durch KI-Automatisierung <strong class="text-[#0070FF]">312 Arbeitsstunden</strong> einsparen,
                  was einem Gegenwert von <strong class="text-[#00C48C]">€ 4.820</strong> entspricht.
                </p>
                <p>
                  <strong class="text-on-surface">Sales:</strong>
                  Der Outreach-Agent hat 480 personalisierte Outreach-Sequenzen vorbereitet.
                  Conversion-Rate dieser Woche: <strong class="text-[#0070FF]">8,4 %</strong>.
                  3 neue Deals in der Pipeline (Gesamtwert: ~€ 24.000).
                </p>
                <p>
                  <strong class="text-on-surface">Content:</strong>
                  LinkedIn-Post-Agent hat 12 Beiträge zur Freigabe vorbereitet.
                  Durchschnittliche Engagement-Rate: <strong class="text-[#0070FF]">6,2 %</strong>.
                </p>
                <p>
                  <strong class="text-on-surface">Handlungsbedarf:</strong>
                  Projekt <em>„Website Relaunch"</em> liegt 5 Tage hinter dem Zeitplan —
                  <span class="text-error font-bold">Eskalation empfohlen</span>.
                </p>
              </div>
            </div>
          }

          <!-- Project Data Table -->
          <div class="glass-panel rounded-xl border border-outline-variant/10 overflow-hidden">
            <div class="px-8 py-5 border-b border-outline-variant/10">
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-1">
                Datenbasis
              </p>
              <p class="font-headline text-lg font-black text-on-surface">Aktuelle Projekte</p>
            </div>
            <table class="w-full">
              <thead>
                <tr class="border-b border-outline-variant/10">
                  <th class="text-left px-8 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Projekt</th>
                  <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold hidden sm:table-cell">Owner</th>
                  <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Fortschritt</th>
                  <th class="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of dataPoints; track row.project) {
                  <tr class="border-b border-outline-variant/10 hover:bg-surface-container-highest/20 transition-colors">
                    <td class="px-8 py-4">
                      <p class="font-bold text-sm text-on-surface">{{ row.project }}</p>
                      <p class="text-[10px] text-on-surface-variant/50">{{ row.lastUpdate }}</p>
                    </td>
                    <td class="px-4 py-4 text-sm text-on-surface-variant hidden sm:table-cell">{{ row.owner }}</td>
                    <td class="px-4 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                          <div class="h-full rounded-full"
                               [style.width]="row.progress + '%'"
                               [class]="row.status === 'done'
                                 ? 'bg-[#00C48C]'
                                 : row.status === 'at-risk'
                                   ? 'bg-error'
                                   : 'bg-[#0070FF]'"></div>
                        </div>
                        <span class="text-xs font-bold text-on-surface-variant">{{ row.progress }}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider"
                            [class]="row.status === 'done'
                              ? 'bg-[#00C48C]/10 text-[#00C48C]'
                              : row.status === 'at-risk'
                                ? 'bg-error/10 text-error'
                                : 'bg-[#0070FF]/10 text-[#0070FF]'">
                        {{ row.status === 'done' ? 'Fertig' : row.status === 'at-risk' ? 'Risiko' : 'On Track' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

        </div>

        <!-- Right: Ask the Bot -->
        <div class="lg:col-span-5">
          <div class="glass-panel rounded-xl border border-outline-variant/10 flex flex-col h-full min-h-[600px]">
            <div class="px-8 py-6 border-b border-outline-variant/10">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-[#0070FF]/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[#0070FF] text-xl"
                        style="font-variation-settings: 'FILL' 1;">smart_toy</span>
                </div>
                <div>
                  <p class="font-headline font-bold text-on-surface text-sm">Reporting Assistant</p>
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-[#00C48C] rounded-full animate-pulse"></span>
                    <p class="text-[10px] text-[#00C48C] font-bold uppercase tracking-wider">Online</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chat Messages -->
            <div class="flex-1 px-6 py-6 space-y-4 overflow-y-auto">
              @for (msg of chatMessages(); track $index) {
                <div class="flex" [class]="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                  <div class="max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed"
                       [class]="msg.role === 'user'
                         ? 'bg-[#0070FF] text-white rounded-br-none'
                         : 'glass-panel border border-outline-variant/10 text-on-surface-variant rounded-bl-none'">
                    {{ msg.text }}
                  </div>
                </div>
              }

              @if (isTyping()) {
                <div class="flex justify-start">
                  <div class="glass-panel border border-outline-variant/10 px-4 py-3 rounded-xl rounded-bl-none flex gap-1.5 items-center">
                    <span class="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0ms]"></span>
                    <span class="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:150ms]"></span>
                    <span class="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:300ms]"></span>
                  </div>
                </div>
              }
            </div>

            <!-- Prompt Suggestions -->
            <div class="px-6 pb-3 flex flex-wrap gap-2">
              @for (prompt of promptSuggestions; track prompt) {
                <button (click)="sendSuggestion(prompt)"
                        class="text-[10px] px-3 py-1.5 glass-panel border border-outline-variant/10
                               rounded-full text-on-surface-variant hover:border-[#0070FF]/30
                               hover:text-[#0070FF] transition-all duration-200 font-medium">
                  {{ prompt }}
                </button>
              }
            </div>

            <!-- Input -->
            <div class="px-6 pb-6">
              <div class="flex gap-3 glass-panel border border-outline-variant/20 rounded-xl p-2
                          focus-within:border-[#0070FF]/40 transition-all">
                <input
                  [(ngModel)]="userInput"
                  (keydown.enter)="sendMessage()"
                  placeholder="Frag mich etwas... z. B. Womit beschäftigt sich mein Team gerade?"
                  class="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40
                         outline-none px-3 py-2" />
                <button
                  (click)="sendMessage()"
                  [disabled]="!userInput.trim()"
                  class="w-10 h-10 bg-[#0070FF] rounded-lg flex items-center justify-center
                         hover:bg-[#0070FF]/80 active:scale-95 transition-all disabled:opacity-30">
                  <span class="material-symbols-outlined text-white text-lg"
                        style="font-variation-settings: 'FILL' 1;">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class ReportingBot {
  selectedReport = signal<string>('weekly');
  reportGenerated = signal(false);
  isTyping = signal(false);
  userInput = '';

  chatMessages = signal<ChatMessage[]>([
    {
      role: 'bot',
      text: 'Hallo! Ich bin dein Reporting-Assistent. Ich kann dir Berichte generieren oder Fragen zu deinen Projekten beantworten. Was möchtest du wissen?',
    },
  ]);

  reportTypes: ReportType[] = [
    { id: 'weekly', label: 'Woche', icon: 'calendar_view_week', period: 'KW 13' },
    { id: 'monthly', label: 'Monat', icon: 'calendar_month', period: 'März 2025' },
    { id: 'quarterly', label: 'Quartal', icon: 'date_range', period: 'Q1 2025' },
    { id: 'yearly', label: 'Jahr', icon: 'calendar_today', period: '2025' },
  ];

  promptSuggestions = [
    'Stand Projekt XYZ?',
    'Was macht mein Team?',
    'Wo gibt es Risiken?',
    'KPIs diese Woche?',
  ];

  dataPoints: DataPoint[] = [
    { project: 'Website Relaunch', owner: 'Anna K.', status: 'at-risk', progress: 45, lastUpdate: 'Vor 2 Std.' },
    { project: 'Q2 Sales-Kampagne', owner: 'Max B.', status: 'on-track', progress: 72, lastUpdate: 'Vor 30 Min.' },
    { project: 'CRM Migration', owner: 'Lisa M.', status: 'done', progress: 100, lastUpdate: 'Gestern' },
    { project: 'LinkedIn-Strategie', owner: 'Tom S.', status: 'on-track', progress: 60, lastUpdate: 'Heute' },
    { project: 'SEO Audit 2025', owner: 'Jana R.', status: 'on-track', progress: 33, lastUpdate: 'Vor 1 Tag' },
  ];

  get activeReportLabel(): () => string {
    return () => {
      const found = this.reportTypes.find((r) => r.id === this.selectedReport());
      return found ? `${found.label}sbericht` : 'Bericht';
    };
  }

  generateReport() {
    this.reportGenerated.set(false);
    setTimeout(() => this.reportGenerated.set(true), 300);
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;
    this.userInput = '';
    this.chatMessages.update((msgs) => [...msgs, { role: 'user', text }]);
    this.isTyping.set(true);

    setTimeout(() => {
      this.isTyping.set(false);
      this.chatMessages.update((msgs) => [
        ...msgs,
        { role: 'bot', text: this.getBotReply(text) },
      ]);
    }, 1200);
  }

  sendSuggestion(prompt: string) {
    this.userInput = prompt;
    this.sendMessage();
  }

  private getBotReply(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('team') || lower.includes('beschäftigt')) {
      return 'Dein Team arbeitet gerade an 5 aktiven Projekten. Anna K. fokussiert sich auf den Website Relaunch (Achtung: Risiko!), Max B. treibt die Q2 Sales-Kampagne voran, und Lisa M. hat die CRM-Migration erfolgreich abgeschlossen.';
    }
    if (lower.includes('risiko') || lower.includes('problem')) {
      return 'Es gibt aktuell ein Projekt mit erhöhtem Risiko: „Website Relaunch" liegt 5 Tage hinter dem Plan (45% Fortschritt). Empfehlung: Eskalation oder Ressourcen aufstocken.';
    }
    if (lower.includes('kpi') || lower.includes('kennzahl') || lower.includes('diese woche')) {
      return 'KPIs diese Woche: 312 eingesparte Stunden, €4.820 Kostenersparnis, 480 Outreach-Mails versendet (8,4% Conversion), 12 LinkedIn-Posts (6,2% Engagement). Sehr starke Woche!';
    }
    if (lower.includes('xyz') || lower.includes('projekt')) {
      return 'Ich habe 5 aktive Projekte in der Datenbank. Meinst du „Website Relaunch", „Q2 Sales-Kampagne", „CRM Migration", „LinkedIn-Strategie" oder „SEO Audit 2025"? Bitte präzisiere, zu welchem ich dir mehr Details geben soll.';
    }
    return 'Auf Basis der aktuellen Datenbasis konnte ich keine spezifische Antwort finden. Möchtest du einen vollständigen Bericht generieren oder die Frage präzisieren?';
  }
}
