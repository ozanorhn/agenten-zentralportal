import { Component } from '@angular/core';

@Component({
  selector: 'app-analytics',
  imports: [],
  template: `
    <div class="px-8 py-10 pb-24 md:pb-10">

      <!-- Hero -->
      <header class="mb-10 max-w-3xl">
        <p class="text-[11px] font-bold tracking-[0.2em] uppercase text-on-surface-variant/50 mb-3">Operations</p>
        <h1 class="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-3">
          Operations <span class="text-primary">Monitor</span>
        </h1>
        <p class="text-on-surface-variant max-w-xl text-base leading-relaxed">
          Überblick über Agenten-Auslastung, Credits und operative Kapazität deiner KI-Workflows.
        </p>
      </header>

      <!-- Analytics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">

        <!-- ROI Meter Large Card -->
        <div class="md:col-span-8 bg-white border border-[#e3e8ee] p-8 rounded-xl shadow-[0_2px_4px_rgba(10,37,64,0.04)]">
          <p class="text-[11px] uppercase tracking-[0.16em] text-[#a3b1bf] font-bold mb-6">
            Efficiency ROI Overview
          </p>
          <div class="flex items-end gap-3 mb-8">
            <span class="font-headline text-6xl md:text-7xl font-black text-on-surface leading-none">4h 12m</span>
            <span class="text-on-surface-variant font-medium text-base pb-1.5">gespart / gesamt</span>
          </div>
          <div class="space-y-5">
            <div>
              <div class="flex justify-between mb-1.5">
                <span class="text-[13px] font-medium text-on-surface-variant">Agent Performance Index</span>
                <span class="text-[13px] font-bold text-primary">82%</span>
              </div>
              <div class="h-1.5 w-full bg-[#e3e8ee] rounded-full overflow-hidden">
                <div class="h-full bg-primary w-[82%] rounded-full"></div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-[#f6f9fc] border border-[#e3e8ee] p-4 rounded-lg">
                <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Tokens</p>
                <p class="text-xl font-bold text-on-surface">1.2M</p>
              </div>
              <div class="bg-[#f6f9fc] border border-[#e3e8ee] p-4 rounded-lg">
                <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Leads</p>
                <p class="text-xl font-bold text-on-surface">432</p>
              </div>
              <div class="bg-[#f6f9fc] border border-[#e3e8ee] p-4 rounded-lg">
                <p class="text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-1">Cost</p>
                <p class="text-xl font-bold text-on-surface">$14.20</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Agent Utilization -->
        <div class="md:col-span-4 bg-white border border-[#e3e8ee] p-6 rounded-xl shadow-[0_2px_4px_rgba(10,37,64,0.04)]">
          <p class="text-[11px] uppercase tracking-[0.16em] text-[#a3b1bf] font-bold mb-6">
            Utilization
          </p>
          <div class="space-y-6">
            @for (agent of utilization; track agent.name) {
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="font-medium text-[13px] text-on-surface">{{ agent.name }}</span>
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-bold"
                        [class]="agent.active ? 'bg-primary/8 text-primary' : 'bg-[#f6f9fc] text-on-surface-variant border border-[#e3e8ee]'">
                    {{ agent.active ? 'Active' : 'Standby' }}
                  </span>
                </div>
                <div class="h-2 bg-[#e3e8ee] rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                       [class]="agent.active ? 'bg-primary' : 'bg-[#c8d6e5]'"
                       [style.width]="agent.usage + '%'">
                  </div>
                </div>
                <p class="text-[11px] text-on-surface-variant/60 mt-1">{{ agent.usage }}%</p>
              </div>
            }
          </div>
        </div>

        <!-- Credits Notice -->
        <div class="md:col-span-12">
          <div class="bg-white border border-[#e3e8ee] p-5 rounded-xl
                      flex flex-col md:flex-row items-center justify-between gap-4
                      hover:border-[#c8d6e5] hover:shadow-[0_4px_12px_rgba(10,37,64,0.06)] transition-all cursor-pointer"
               (click)="openUpgrade()">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings: 'FILL' 1;">warning</span>
              </div>
              <div>
                <h3 class="font-headline text-[15px] font-bold text-on-surface">Kapazität fast erschöpft</h3>
                <p class="text-[13px] text-on-surface-variant">Deine freien Credits decken nur noch 5% deines Workflows.</p>
              </div>
            </div>
            <button class="px-6 py-2.5 bg-primary hover:bg-[#2563eb] text-white font-bold text-[13px]
                           shadow-[0_1px_3px_rgba(59,130,246,0.3)] transition-all whitespace-nowrap">
              Upgrade prüfen
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
