import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { RunHistoryService } from '../../services/run-history.service';

@Component({
  selector: 'app-conversations',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10">

      <!-- Hero -->
      <div class="mb-12 max-w-4xl">
        <span class="text-secondary font-headline font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
          Archiv
        </span>
        <h1 class="text-5xl md:text-7xl font-black font-headline tracking-tighter text-on-surface mb-6 leading-none">
          Verlauf
        </h1>
        <p class="text-on-surface-variant text-xl max-w-2xl font-light leading-relaxed">
          Alle Berichte und Auswertungen, chronologisch.
        </p>
      </div>

      <!-- Conversation List -->
      <div class="space-y-4">
        @for (entry of entries(); track entry.id) {
          <a [routerLink]="['/agents', entry.agentId, 'result']"
             class="glass-panel kinetic-border rounded-xl p-6 flex items-center gap-6
                    hover:bg-surface-variant/50 transition-all duration-300 group block">
            <div class="w-12 h-12 bg-surface-container-highest rounded-2xl flex items-center justify-center
                        text-[#0070FF] flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">{{ entry.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="font-headline font-bold text-on-surface">{{ entry.agentName }}</h3>
                <span class="px-2 py-0.5 glass-panel kinetic-border text-[10px] font-bold tracking-widest uppercase rounded-full text-primary">
                  {{ entry.category }}
                </span>
              </div>
              <p class="text-on-surface-variant text-sm truncate">{{ entry.preview }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-on-surface-variant mb-1">{{ entry.time }}</p>
              <p class="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">{{ entry.tokens | number }} Tokens</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors flex-shrink-0">
              chevron_right
            </span>
          </a>
        }
      </div>

      <!-- Empty state -->
      @if (entries().length === 0) {
        <div class="mt-16 flex flex-col items-center justify-center text-center opacity-40">
          <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">history_edu</span>
          <p class="text-on-surface-variant text-lg font-medium">Noch keine Workflows ausgeführt</p>
          <p class="text-on-surface-variant text-sm mt-2">Starten Sie Ihr erstes System in der Übersicht.</p>
        </div>
      }

    </div>
  `,
})
export class Conversations {
  private readonly runHistory = inject(RunHistoryService);

  readonly entries = computed(() =>
    this.runHistory.runs().map(r => ({
      id: r.id,
      agentId: r.agentId,
      agentName: r.agentName,
      icon: r.agentIcon,
      category: r.agentCategory,
      preview: r.outputSummary,
      time: this.formatTime(r.timestamp),
      tokens: r.tokenCount,
    }))
  );

  private formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `Vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    return 'Gestern';
  }
}
