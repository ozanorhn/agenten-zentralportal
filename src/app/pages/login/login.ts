import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type LoginMode = 'password' | 'magic-link';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#080A0E] font-body text-on-surface flex overflow-hidden">

      <!-- ─── Linke Spalte: Editorial Panel ─── -->
      <div class="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden">

        <!-- Hintergrund-Gradient -->
        <div class="absolute inset-0"
             style="background: linear-gradient(135deg, #0D1117 0%, #0a0f1a 50%, #060810 100%);">
        </div>

        <!-- Dot-Grid Pattern -->
        <div class="absolute inset-0 opacity-[0.03]"
             style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 32px 32px;">
        </div>

        <!-- Glow-Orbs -->
        <div class="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20"
             style="background: radial-gradient(circle, #0070FF 0%, transparent 70%); filter: blur(60px);"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-10"
             style="background: radial-gradient(circle, #6366f1 0%, transparent 70%); filter: blur(80px);"></div>

        <!-- Inhalt -->
        <div class="relative z-10 flex flex-col h-full p-12 xl:p-16">

          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-primary text-base">hub</span>
            </div>
            <span class="font-headline font-bold text-white text-lg tracking-tight">arcnode OS</span>
          </div>

          <!-- Headline-Block -->
          <div class="mt-auto mb-auto pt-16 space-y-8 max-w-md">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-2 text-[10px] font-label font-semibold uppercase tracking-[0.25em] text-primary">
                <span class="w-4 h-[1px] bg-primary"></span>
                KI-Portal für den Mittelstand
              </span>
              <h1 class="font-headline text-5xl xl:text-6xl font-black text-white leading-[0.95] tracking-tighter">
                Ihre KI-Systeme.<br>
                <span style="color: #0070FF;">Ihr Ergebnis.</span>
              </h1>
              <p class="text-[#8b9ab0] text-base leading-relaxed">
                Von der Idee zum fertigen Output in Minuten — nicht Wochen. Automatisiert, zuverlässig, für Ihr Team.
              </p>
            </div>

            <!-- Feature-Cards -->
            <div class="grid grid-cols-1 gap-3">
              @for (f of features; track f.label) {
                <div class="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                  <div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                       [style.background]="f.bg">
                    <span class="material-symbols-outlined text-base" [style.color]="f.color">{{ f.icon }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">{{ f.label }}</p>
                    <p class="text-xs text-[#8b9ab0] mt-0.5">{{ f.desc }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Status -->
          <div class="flex items-center gap-3 mt-auto">
            <div class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </div>
            <span class="text-[11px] text-[#8b9ab0] font-label uppercase tracking-widest">Alle Systeme stabil</span>
          </div>
        </div>
      </div>

      <!-- ─── Rechte Spalte: Login-Formular ─── -->
      <div class="flex-1 flex items-center justify-center p-6 lg:p-12 relative"
           style="background: #0D1117;">

        <!-- Mobile Logo -->
        <div class="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div class="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-sm">hub</span>
          </div>
          <span class="font-headline font-bold text-white text-base">arcnode OS</span>
        </div>

        <div class="w-full max-w-[420px] space-y-8">

          <!-- Kopf -->
          <div class="space-y-2">
            <h2 class="font-headline text-3xl font-bold text-white tracking-tight">
              @if (mode() === 'password') { Anmelden } @else { Link anfordern }
            </h2>
            <p class="text-[#8b9ab0] text-sm">
              @if (mode() === 'password') {
                Willkommen zurück. Geben Sie Ihre Zugangsdaten ein.
              } @else {
                Sie erhalten einen Einmal-Link per E-Mail — kein Passwort nötig.
              }
            </p>
          </div>

          <!-- Modus-Tabs -->
          <div class="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button type="button" (click)="mode.set('password')"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
              [class]="mode() === 'password'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-[#8b9ab0] hover:text-white'">
              Passwort
            </button>
            <button type="button" (click)="mode.set('magic-link')"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
              [class]="mode() === 'magic-link'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-[#8b9ab0] hover:text-white'">
              Magic Link
            </button>
          </div>

          <!-- Formular -->
          <form (ngSubmit)="submit()" class="space-y-4">

            <!-- E-Mail -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-[#8b9ab0] uppercase tracking-widest">E-Mail</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] text-[18px] pointer-events-none">
                  mail
                </span>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="ihre@email.de"
                  class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568]
                         bg-white/[0.04] border border-white/[0.08]
                         focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] focus:ring-0
                         transition-all duration-200"
                />
              </div>
            </div>

            <!-- Passwort -->
            @if (mode() === 'password') {
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[#8b9ab0] uppercase tracking-widest">Passwort</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] text-[18px] pointer-events-none">
                    lock
                  </span>
                  <input
                    type="password"
                    [(ngModel)]="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568]
                           bg-white/[0.04] border border-white/[0.08]
                           focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]
                           transition-all duration-200"
                  />
                </div>
              </div>
            }

            <!-- Hinweis nach Zugang-Anfrage -->
            @if (requestSent()) {
              <div class="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <span class="material-symbols-outlined text-emerald-400 text-base mt-0.5 flex-shrink-0">check_circle</span>
                <p class="text-sm text-emerald-300 leading-relaxed">
                  Ihre Zugangsanfrage ist bei uns angekommen. Wir melden uns am gleichen Werktag mit Ihren Anmeldedaten.
                </p>
              </div>
            }

            <!-- Fehlermeldung -->
            @if (errorMessage()) {
              <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <span class="material-symbols-outlined text-red-400 text-base mt-0.5 flex-shrink-0">error</span>
                <p class="text-sm text-red-400">{{ errorMessage() }}</p>
              </div>
            }

            <!-- Erfolg Magic Link -->
            @if (magicLinkSent()) {
              <div class="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <span class="material-symbols-outlined text-emerald-400 text-base mt-0.5 flex-shrink-0">check_circle</span>
                <p class="text-sm text-emerald-400">Link gesendet. Bitte prüfen Sie Ihr Postfach.</p>
              </div>
            }

            <!-- Absenden -->
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full relative flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                     text-sm font-bold text-white transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     active:scale-[0.99]"
              style="background: linear-gradient(135deg, #0070FF 0%, #0050CC 100%);
                     box-shadow: 0 4px 24px rgba(0,112,255,0.25);"
              [style.box-shadow]="loading() ? 'none' : '0 4px 24px rgba(0,112,255,0.25)'"
            >
              @if (loading()) {
                <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              }
              @if (mode() === 'password') { Anmelden } @else { Link anfordern }
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-4">
            <div class="flex-1 h-px bg-white/[0.06]"></div>
            <span class="text-[11px] text-[#4a5568] uppercase tracking-widest font-label">oder</span>
            <div class="flex-1 h-px bg-white/[0.06]"></div>
          </div>

          <!-- Registrierung -->
          <p class="text-center text-sm text-[#8b9ab0]">
            Noch kein Konto?
            <a routerLink="/registrieren"
               class="font-semibold text-white hover:text-primary transition-colors duration-150 ml-1">
              Jetzt registrieren →
            </a>
          </p>

        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode = signal<LoginMode>('password');
  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');
  magicLinkSent = signal(false);
  requestSent = signal(this.route.snapshot.queryParamMap.get('msg') === 'request-sent');

  features = [
    {
      icon: 'campaign',
      label: 'Marketing & SEO',
      desc: 'Texte, Strategien und Analysen automatisiert erstellen.',
      color: '#0070FF',
      bg: 'rgba(0,112,255,0.12)',
    },
    {
      icon: 'trending_up',
      label: 'Sales & Leadgenerierung',
      desc: 'Qualifizierte Kontakte recherchieren und ansprechen.',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
    },
    {
      icon: 'analytics',
      label: 'Daten & Reporting',
      desc: 'Kennzahlen auswerten und Berichte automatisch erstellen.',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
    },
  ];

  async submit(): Promise<void> {
    this.errorMessage.set('');
    this.magicLinkSent.set(false);
    this.loading.set(true);

    try {
      if (this.mode() === 'password') {
        const { error } = await this.auth.signInWithPassword(this.email, this.password);
        if (error) {
          this.errorMessage.set('E-Mail oder Passwort nicht korrekt.');
        } else {
          await this.router.navigate(['/dashboard']);
        }
      } else {
        const { error } = await this.auth.signInWithMagicLink(this.email);
        if (error) {
          this.errorMessage.set('Der Link konnte nicht gesendet werden. Bitte prüfen Sie die E-Mail-Adresse.');
        } else {
          this.magicLinkSent.set(true);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }
}
