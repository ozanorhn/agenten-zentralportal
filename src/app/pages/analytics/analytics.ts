import { Component } from '@angular/core';

@Component({
  selector: 'app-analytics',
  imports: [],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10 relative">

      <!-- Hero -->
      <header class="mb-12 max-w-4xl">
        <h1 class="font-headline text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          Kinetic <span class="text-[#0070FF]" style="text-shadow: 0 0 15px rgba(0,112,255,0.4);">Efficiency</span>
        </h1>
        <p class="text-on-surface-variant max-w-xl text-lg leading-relaxed font-light">
          Your autonomous workforce has been operational for 12 days.
          Optimization is currently at 94.2% capacity.
        </p>
      </header>

      <!-- Bento Analytics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">

        <!-- ROI Meter Large Card -->
        <div class="md:col-span-8 bg-surface-container-low p-8 rounded-xl relative overflow-hidden group border border-outline-variant/10">
          <div class="relative z-10">
            <span class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-8 block">
              Efficiency ROI Overview
            </span>
            <div class="flex items-end gap-4 mb-10">
              <span class="font-headline text-7xl md:text-8xl font-black text-white leading-none">4h 12m</span>
              <span class="text-secondary font-bold text-xl pb-2">Saved / Total</span>
            </div>
            <div class="space-y-6">
              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-sm font-medium text-on-surface-variant">Agent Performance Index</span>
                  <span class="text-sm font-bold text-[#0070FF]">82%</span>
                </div>
                <div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div class="h-full bg-[#0070FF] w-[82%] shadow-[0_0_10px_rgba(0,112,255,0.5)]"></div>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-surface-container-lowest p-4 rounded-lg">
                  <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Tokens</p>
                  <p class="text-xl font-bold text-white">1.2M</p>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-lg">
                  <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Leads</p>
                  <p class="text-xl font-bold text-white">432</p>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-lg">
                  <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Cost</p>
                  <p class="text-xl font-bold text-white">$14.20</p>
                </div>
              </div>
            </div>
          </div>
          <div class="absolute top-0 right-0 w-64 h-64 bg-[#0070FF]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[#0070FF]/10 transition-all duration-700"></div>
        </div>

        <!-- Agent Utilization -->
        <div class="md:col-span-4 bg-surface-container-high p-8 rounded-xl border border-outline-variant/10">
          <span class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-8 block">
            Utilization
          </span>
          <div class="space-y-8">
            @for (agent of utilization; track agent.name) {
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="font-medium text-sm text-on-surface">{{ agent.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded"
                        [class]="agent.active ? 'bg-[#0070FF]/10 text-[#0070FF]' : 'bg-surface-container-highest text-on-surface-variant'">
                    {{ agent.active ? 'Active' : 'Standby' }}
                  </span>
                </div>
                <div class="h-8 bg-surface-container-lowest rounded-md overflow-hidden p-1">
                  <div class="h-full rounded flex items-center px-2"
                       [class]="agent.active ? 'bg-[#0070FF]/20' : 'bg-surface-container-highest/50'"
                       [style.width]="agent.usage + '%'">
                    <span class="text-[10px] font-bold"
                          [class]="agent.active ? 'text-[#0070FF]' : 'text-on-surface-variant'">
                      {{ agent.usage }}%
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Credits Warning -->
        <div class="md:col-span-12">
          <div class="bg-surface-container-lowest border border-error/20 p-6 rounded-xl
                      flex flex-col md:flex-row items-center justify-between gap-6
                      hover:border-error/40 transition-all cursor-pointer"
               (click)="openUpgrade()">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-error" style="font-variation-settings: 'FILL' 1;">warning</span>
              </div>
              <div>
                <h3 class="font-headline text-xl font-bold">Kapazität fast erschöpft</h3>
                <p class="text-sm text-on-surface-variant">Deine freien Credits decken nur noch 5% deines Workflows.</p>
              </div>
            </div>
            <button class="px-8 py-3 bg-secondary text-on-secondary-fixed font-bold rounded-md
                           shadow-[0_0_15px_rgba(255,95,31,0.2)] hover:shadow-[0_0_25px_rgba(255,95,31,0.4)]
                           transition-all whitespace-nowrap">
              Upgrade Prüfen
            </button>
          </div>
        </div>

      </div>

    </div>
  `,
})
export class Analytics {
  utilization = [
    { name: 'Lead Enricher', usage: 80, active: true },
    { name: 'Content Architect', usage: 12, active: false },
    { name: 'SEO Crawler', usage: 8, active: false },
  ];

  openUpgrade(): void {}
}
