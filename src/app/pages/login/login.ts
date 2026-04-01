import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-[#0F1115] font-body text-on-surface flex items-center justify-center overflow-hidden relative">

      <!-- Ambient glow orbs -->
      <div class="fixed inset-0 pointer-events-none">
        <div class="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]"></div>
      </div>

      <!-- Decorative bottom gradient -->
      <div class="fixed bottom-0 left-0 w-full h-72 bg-gradient-to-t from-[#0070FF]/10 to-transparent pointer-events-none opacity-40"></div>

      <!-- Content -->
      <main class="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        <!-- Left: Editorial Branding -->
        <div class="lg:col-span-5 space-y-8">
          <div class="space-y-2">
            <span class="font-label text-primary tracking-[0.2em] text-[10px] uppercase font-bold">
              Intelligence Orchestration
            </span>
            <h1 class="font-headline text-5xl md:text-7xl font-black text-on-surface leading-[0.9] tracking-tighter">
              AgentHub<span class="text-[#0070FF]">.</span>
            </h1>
          </div>
          <p class="text-on-surface-variant text-lg leading-relaxed max-w-sm">
            Unlock the potential of autonomous intelligence. Design, deploy, and scale with frictionless precision.
          </p>
          <div class="flex gap-4 items-center">
            <div class="w-12 h-[1px] bg-outline-variant/30"></div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-[#0070FF]/20 border border-[#0070FF]/30 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-sm">person</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center -ml-2">
                <span class="material-symbols-outlined text-secondary text-sm">person</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-tertiary/20 border border-tertiary/30 flex items-center justify-center -ml-2">
                <span class="material-symbols-outlined text-tertiary text-sm">person</span>
              </div>
            </div>
            <span class="text-xs font-label text-outline uppercase tracking-widest">+2.4k Active Agents</span>
          </div>

          <!-- Step Indicators -->
          <div class="space-y-4 pt-4">
            @for (step of steps; track step.title; let i = $index) {
              <div class="flex items-start gap-4 opacity-{{ i === 0 ? '100' : '40' }}">
                <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                     [class]="i === 0 ? 'bg-[#0070FF]/20' : 'bg-surface-container-highest'">
                  <span class="material-symbols-outlined text-sm" [class]="i === 0 ? 'text-[#0070FF]' : 'text-on-surface-variant'">{{ step.icon }}</span>
                </div>
                <div>
                  <p class="font-bold text-sm text-on-surface">{{ step.title }}</p>
                  <p class="text-xs text-on-surface-variant mt-0.5">{{ step.description }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right: Glass Login Modal -->
        <div class="lg:col-span-7 flex justify-center lg:justify-end">
          <div class="w-full max-w-[480px] rounded-xl shadow-2xl overflow-hidden p-8 md:p-12 space-y-10
                      border border-white/5 glow-border"
               style="background: rgba(26, 28, 32, 0.6); backdrop-filter: blur(40px);">

            <!-- Step Progress -->
            <div class="space-y-6">
              <div class="flex gap-2">
                <div class="h-1 w-8 bg-[#0070FF] rounded-full"></div>
                <div class="h-1 w-8 bg-surface-container-highest rounded-full"></div>
                <div class="h-1 w-8 bg-surface-container-highest rounded-full"></div>
              </div>
              <div class="space-y-3">
                <h2 class="font-headline text-3xl font-bold text-white tracking-tight leading-tight">
                  Wähle deinen Agenten.
                </h2>
                <p class="text-on-surface-variant/80 font-body text-base">
                  Starte mit einem spezialisierten Kernmodul für Sales, SEO oder Datenanalyse.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="bg-surface-container-high/50 p-4 rounded-lg border border-white/5 flex items-center gap-3">
                  <span class="material-symbols-outlined text-[#0070FF]">trending_up</span>
                  <span class="text-xs font-label uppercase tracking-wider">Sales</span>
                </div>
                <div class="bg-surface-container-high/50 p-4 rounded-lg border border-white/5 flex items-center gap-3">
                  <span class="material-symbols-outlined text-secondary">database</span>
                  <span class="text-xs font-label uppercase tracking-wider">Data</span>
                </div>
              </div>
            </div>

            <!-- Login Options -->
            <div class="space-y-6 pt-6 border-t border-white/5">
              <div class="space-y-4">
                <!-- Google Login -->
                <a routerLink="/dashboard"
                   class="w-full flex items-center justify-center gap-4 bg-white text-surface py-4 px-6
                          rounded-lg font-bold hover:bg-slate-200 transition-all active:scale-95 duration-200">
                  <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Google Workspace</span>
                </a>

                <!-- LinkedIn Login -->
                <a routerLink="/dashboard"
                   class="w-full flex items-center justify-center gap-4 bg-[#0077b5] text-white py-4 px-6
                          rounded-lg font-bold hover:opacity-90 transition-all active:scale-95 duration-200">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span>LinkedIn Identity</span>
                </a>
              </div>

              <div class="relative flex items-center py-2">
                <div class="flex-grow border-t border-white/5"></div>
                <span class="flex-shrink mx-4 text-outline text-[10px] font-label uppercase tracking-widest">Enterprise Access</span>
                <div class="flex-grow border-t border-white/5"></div>
              </div>

              <p class="text-center text-on-surface-variant/40 text-[11px] leading-snug">
                By continuing, you agree to AgentHub's
                <a href="#" class="underline hover:text-primary transition-colors">Terms of Service</a>
                and
                <a href="#" class="underline hover:text-primary transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

      </main>

      <!-- Live status badge -->
      <div class="fixed bottom-10 right-10 flex items-center gap-3 py-2 px-4 rounded-full border border-white/5"
           style="background: rgba(26, 28, 32, 0.6); backdrop-filter: blur(40px);">
        <div class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
        </div>
        <span class="text-[10px] font-label text-on-surface-variant uppercase tracking-widest">Nodes Operational</span>
      </div>

    </div>
  `,
})
export class Login {
  steps = [
    {
      icon: 'smart_toy',
      title: 'Agenten auswählen',
      description: 'Wähle aus Sales, Content, SEO oder Data Agents.',
    },
    {
      icon: 'tune',
      title: 'Workflow konfigurieren',
      description: 'Parameter, Zielgruppe und Tonalität einstellen.',
    },
    {
      icon: 'rocket_launch',
      title: 'Automatisierung starten',
      description: 'Output direkt in HubSpot, Notion oder Slack pushen.',
    },
  ];
}
