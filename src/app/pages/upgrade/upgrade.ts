import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const WEBHOOK_ZUGANG_KONTAKT = 'https://n8n.eom.de/webhook/Kontaktformular';

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-[#0F1115] font-body text-on-surface flex items-center justify-center overflow-hidden relative py-12">

      <!-- Ambient glows -->
      <div class="fixed inset-0 pointer-events-none">
        <div class="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]"></div>
      </div>

      <main class="relative z-10 w-full max-w-2xl px-6 space-y-10">

        <!-- Header -->
        <div class="text-center space-y-6">
          <div class="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-primary text-4xl">lock</span>
          </div>

          <div class="space-y-4">
            <span class="font-label text-primary tracking-[0.2em] text-[10px] uppercase font-bold">Zahlung offen</span>
            <h1 class="font-headline text-4xl md:text-5xl font-black text-on-surface leading-tight">
              Zugang pausiert
            </h1>
            <p class="text-on-surface-variant text-lg leading-relaxed max-w-lg mx-auto">
              Ihr Abo ist seit mehr als 30 Tagen abgelaufen. Sobald Ihre Zahlung bei uns eingeht, wird Ihr Zugang automatisch wieder freigeschaltet.
            </p>
            @if (expiredOn()) {
              <p class="text-xs text-on-surface-variant/60 font-mono">
                Ablaufdatum: {{ expiredOn() }}
              </p>
            }
          </div>
        </div>

        <!-- Kontakt-Formular -->
        <div class="bg-surface-container-high/30 border border-white/5 rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <h2 class="text-lg font-bold text-on-surface">Schreiben Sie uns direkt</h2>
            <p class="text-xs text-on-surface-variant mt-1">
              Wir klären offene Zahlungen oder Fragen am gleichen Werktag.
            </p>
          </div>

          @if (sent()) {
            <div class="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <span class="material-symbols-outlined text-emerald-400 text-base mt-0.5 flex-shrink-0">check_circle</span>
              <p class="text-sm text-emerald-300">
                Ihre Nachricht ist bei uns angekommen. Wir melden uns am gleichen Werktag zurück.
              </p>
            </div>
          } @else {
            <form (ngSubmit)="submit()" class="space-y-4">
              <div>
                <label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Name</label>
                <input
                  type="text"
                  name="name"
                  [(ngModel)]="name"
                  required
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-on-surface
                         placeholder:text-[#4a5568] focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Ihr Name"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-on-surface
                         placeholder:text-[#4a5568] focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="ihre@email.de"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Firma (optional)</label>
                <input
                  type="text"
                  name="firma"
                  [(ngModel)]="firma"
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-on-surface
                         placeholder:text-[#4a5568] focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Firmenname"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Nachricht</label>
                <textarea
                  name="nachricht"
                  [(ngModel)]="nachricht"
                  required
                  rows="4"
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-on-surface
                         placeholder:text-[#4a5568] focus:outline-none focus:border-primary/50 transition-colors resize-y"
                  placeholder="Worum geht es?"
                ></textarea>
              </div>

              @if (errorMsg()) {
                <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <span class="material-symbols-outlined text-red-400 text-base mt-0.5 flex-shrink-0">error</span>
                  <p class="text-sm text-red-300">{{ errorMsg() }}</p>
                </div>
              }

              <button
                type="submit"
                [disabled]="sending() || !name || !email || !nachricht"
                class="w-full bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm
                       hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       inline-flex items-center justify-center gap-2">
                @if (sending()) {
                  <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                }
                Nachricht senden
              </button>
            </form>
          }
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            (click)="refresh()"
            [disabled]="refreshing()"
            class="bg-surface-container-high/50 border border-white/10 text-on-surface-variant px-6 py-3 rounded-lg font-bold text-sm
                   hover:text-on-surface hover:bg-surface-container-high transition-all duration-150 disabled:opacity-50
                   inline-flex items-center justify-center gap-2">
            @if (refreshing()) {
              <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
            }
            Status neu prüfen
          </button>
          <button
            (click)="signOut()"
            class="bg-surface-container-high/50 border border-white/10 text-on-surface-variant px-6 py-3 rounded-lg font-bold text-sm
                   hover:text-on-surface hover:bg-surface-container-high transition-all duration-150">
            Abmelden
          </button>
        </div>

      </main>
    </div>
  `,
})
export class Upgrade {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly refreshing = signal(false);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly errorMsg = signal<string | null>(null);

  name = '';
  email = '';
  firma = '';
  nachricht = '';

  readonly expiredOn = computed(() => {
    const raw = this.auth.profile()?.subscription_expires_at;
    if (!raw) return null;
    return new Date(raw).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  });

  constructor() {
    void this.checkAccessOnLoad();
    queueMicrotask(() => {
      this.email = this.auth.userEmail() ?? '';
      this.name = this.auth.profile()?.full_name ?? '';
    });
  }

  private async checkAccessOnLoad(): Promise<void> {
    await this.auth.ready;
    await this.auth.loadProfile();
    if (!this.auth.accessExpired()) {
      await this.router.navigate(['/dashboard']);
    }
  }

  async refresh(): Promise<void> {
    this.refreshing.set(true);
    await this.auth.loadProfile();
    this.refreshing.set(false);
    if (!this.auth.accessExpired()) {
      await this.router.navigate(['/dashboard']);
    }
  }

  async submit(): Promise<void> {
    if (!this.name || !this.email || !this.nachricht) return;
    this.sending.set(true);
    this.errorMsg.set(null);

    const payload = {
      'Name': this.name,
      'E-Mail': this.email,
      'Firma': this.firma,
      'Nachricht': this.nachricht,
      'Betreff': 'Zugang pausiert — Anfrage aus arcnode OS',
      'Quelle': 'zugang',
      'user_id': this.auth.session()?.user?.id ?? null,
      'subscription_expires_at': this.auth.profile()?.subscription_expires_at ?? null,
      'submittedAt': new Date().toISOString(),
    };

    try {
      const res = await fetch(WEBHOOK_ZUGANG_KONTAKT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.sent.set(true);
    } catch (err) {
      console.error('[upgrade] submit failed', err);
      this.errorMsg.set('Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder schreiben Sie an ki@eom.de.');
    } finally {
      this.sending.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/login']);
  }
}
