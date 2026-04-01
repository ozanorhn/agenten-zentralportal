import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

interface ConversationEntry {
  id: string;
  agent: string;
  icon: string;
  category: string;
  preview: string;
  time: string;
  tokens: number;
}

@Component({
  selector: 'app-conversations',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10">

      <!-- Hero -->
      <div class="mb-12 max-w-4xl">
        <span class="text-secondary font-headline font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
          Content
        </span>
        <h1 class="text-5xl md:text-7xl font-black font-headline tracking-tighter text-on-surface mb-6 leading-none">
          Content <span class="text-[#0070FF]">History</span>
        </h1>
        <p class="text-on-surface-variant text-xl max-w-2xl font-light leading-relaxed">
          Alle generierten Inhalte und Workflow-Historien deiner Content-Agenten.
        </p>
      </div>

      <!-- Conversation List -->
      <div class="space-y-4">
        @for (entry of entries; track entry.id) {
          <a [routerLink]="['/agents', entry.id]"
             class="glass-panel kinetic-border rounded-xl p-6 flex items-center gap-6
                    hover:bg-surface-variant/50 transition-all duration-300 group block">
            <div class="w-12 h-12 bg-surface-container-highest rounded-2xl flex items-center justify-center
                        text-[#0070FF] flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">{{ entry.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="font-headline font-bold text-on-surface">{{ entry.agent }}</h3>
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

      <!-- Empty state if no entries -->
      @if (entries.length === 0) {
        <div class="mt-16 flex flex-col items-center justify-center text-center opacity-40">
          <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">history_edu</span>
          <p class="text-on-surface-variant text-lg font-medium">Noch keine Workflows ausgeführt</p>
          <p class="text-on-surface-variant text-sm mt-2">Starte deinen ersten Agenten im Marketplace.</p>
        </div>
      }

    </div>
  `,
})
export class Conversations {
  entries: ConversationEntry[] = [
    {
      id: 'linkedin-ghostwriter',
      agent: 'LinkedIn-Ghostwriter',
      icon: 'history_edu',
      category: 'Content',
      preview: 'Revolutionieren Sie Ihre SaaS-Skalierung mit KI-Agenten 🚀 — Die Zukunft des Vertriebs...',
      time: 'Vor 12 Min.',
      tokens: 2400,
    },
    {
      id: 'script-savant',
      agent: 'Script-Savant',
      icon: 'video_chat',
      category: 'Content',
      preview: '5 Gründe warum KI-Agenten deinen Content-Workflow revolutionieren — Hook: Stell dir vor...',
      time: 'Vor 1 Std.',
      tokens: 1850,
    },
    {
      id: 'linkedin-ghostwriter',
      agent: 'LinkedIn-Ghostwriter',
      icon: 'history_edu',
      category: 'Content',
      preview: 'Warum manuelle Prozesse dein Wachstum limitieren — 3 Frameworks für skalierbare...',
      time: 'Gestern',
      tokens: 3100,
    },
  ];
}
