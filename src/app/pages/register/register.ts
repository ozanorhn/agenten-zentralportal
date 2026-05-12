import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type RegisterStep = 'form' | 'verify-email';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#080A0E] font-body text-on-surface flex overflow-hidden">

      <!-- ─── Linke Spalte: Editorial Panel ─── -->
      <div class="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden">

        <div class="absolute inset-0"
             style="background: linear-gradient(135deg, #0D1117 0%, #0a0f1a 50%, #060810 100%);">
        </div>
        <div class="absolute inset-0 opacity-[0.03]"
             style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 32px 32px;">
        </div>
        <div class="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20"
             style="background: radial-gradient(circle, #0070FF 0%, transparent 70%); filter: blur(60px);"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-10"
             style="background: radial-gradient(circle, #10b981 0%, transparent 70%); filter: blur(80px);"></div>

        <div class="relative z-10 flex flex-col h-full p-12 xl:p-16">

          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-primary text-base">hub</span>
            </div>
            <span class="font-headline font-bold text-white text-lg tracking-tight">arcnode OS</span>
          </div>

          <!-- Headline -->
          <div class="mt-auto mb-auto pt-16 space-y-8 max-w-md">
            <div class="space-y-4">
              <span class="inline-flex items-center gap-2 text-[10px] font-label font-semibold uppercase tracking-[0.25em] text-primary">
                <span class="w-4 h-[1px] bg-primary"></span>
                Einladungscode erforderlich
              </span>
              <h1 class="font-headline text-5xl xl:text-6xl font-black text-white leading-[0.95] tracking-tighter">
                Jetzt<br>
                <span style="color: #0070FF;">starten.</span>
              </h1>
              <p class="text-[#8b9ab0] text-base leading-relaxed">
                Registrieren Sie sich mit Ihrer E-Mail-Adresse und dem persönlichen Einladungscode, den Sie erhalten haben.
              </p>
            </div>

            <!-- Info-Karte -->
            <div class="rounded-2xl border border-white/[0.06] p-6 space-y-5"
                 style="background: rgba(255,255,255,0.02);">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-primary text-base">key</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-white">Exklusiver Zugang</p>
                  <p class="text-xs text-[#8b9ab0] mt-0.5">Nur per Einladungscode</p>
                </div>
              </div>
              <div class="space-y-3">
                @for (item of infoItems; track item.text) {
                  <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-emerald-400 text-base mt-0.5 flex-shrink-0">check_circle</span>
                    <p class="text-xs text-[#8b9ab0] leading-relaxed">{{ item.text }}</p>
                  </div>
                }
              </div>
              <div class="pt-1 border-t border-white/[0.06]">
                <a routerLink="/zugang-anfragen"
                   class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-white transition-colors duration-150">
                  Keinen Code? Zugang anfragen
                  <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                </a>
              </div>
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

      <!-- ─── Rechte Spalte: Formular ─── -->
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

          @if (step() === 'form') {

            <!-- Kopf -->
            <div class="space-y-2">
              <h2 class="font-headline text-3xl font-bold text-white tracking-tight">Konto erstellen</h2>
              <p class="text-[#8b9ab0] text-sm">Alle Felder sind erforderlich.</p>
            </div>

            <!-- Fortschrittsanzeige -->
            <div class="flex items-center gap-2">
              @for (s of [1,2,3,4]; track s) {
                <div class="h-1 flex-1 rounded-full transition-all duration-300"
                     [style.background]="getStepProgress(s)"></div>
              }
            </div>

            <!-- Formular -->
            <form (ngSubmit)="submit()" class="space-y-4">

              <!-- Name -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[#8b9ab0] uppercase tracking-widest">Ihr Name</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] text-[18px] pointer-events-none">
                    person
                  </span>
                  <input
                    type="text"
                    [(ngModel)]="fullName"
                    name="fullName"
                    required
                    placeholder="Max Mustermann"
                    (input)="updateProgress()"
                    class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568]
                           bg-white/[0.04] border border-white/[0.08]
                           focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]
                           transition-all duration-200"
                  />
                </div>
              </div>

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
                    (input)="updateProgress()"
                    class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568]
                           bg-white/[0.04] border border-white/[0.08]
                           focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]
                           transition-all duration-200"
                  />
                </div>
              </div>

              <!-- Passwort -->
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
                    minlength="8"
                    placeholder="Mindestens 8 Zeichen"
                    (input)="updateProgress()"
                    class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568]
                           bg-white/[0.04] border border-white/[0.08]
                           focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]
                           transition-all duration-200"
                  />
                </div>
                @if (password.length > 0 && password.length < 8) {
                  <p class="text-xs text-amber-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[12px]">warning</span>
                    Noch {{ 8 - password.length }} Zeichen bis zum Minimum
                  </p>
                }
              </div>

              <!-- Einladungscode -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[#8b9ab0] uppercase tracking-widest">Einladungscode</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] text-[18px] pointer-events-none">
                    key
                  </span>
                  <input
                    type="text"
                    [(ngModel)]="inviteCode"
                    name="inviteCode"
                    required
                    placeholder="ARCNODE-2026"
                    autocomplete="off"
                    (input)="updateProgress()"
                    class="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-[#4a5568] font-mono
                           bg-white/[0.04] border border-white/[0.08]
                           focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]
                           transition-all duration-200 uppercase tracking-wider"
                  />
                </div>
              </div>

              <!-- Fehlermeldung -->
              @if (errorMessage()) {
                <div class="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <span class="material-symbols-outlined text-red-400 text-base mt-0.5 flex-shrink-0">error</span>
                  <p class="text-sm text-red-400">{{ errorMessage() }}</p>
                </div>
              }

              <!-- Submit -->
              <button
                type="submit"
                [disabled]="loading()"
                class="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                       text-sm font-bold text-white transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                style="background: linear-gradient(135deg, #0070FF 0%, #0050CC 100%);
                       box-shadow: 0 4px 24px rgba(0,112,255,0.25);"
              >
                @if (loading()) {
                  <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Konto wird erstellt…
                } @else {
                  Konto erstellen
                  <span class="material-symbols-outlined text-base">arrow_forward</span>
                }
              </button>
            </form>

            <!-- Bereits registriert -->
            <p class="text-center text-sm text-[#8b9ab0]">
              Bereits registriert?
              <a routerLink="/login"
                 class="font-semibold text-white hover:text-primary transition-colors duration-150 ml-1">
                Jetzt anmelden →
              </a>
            </p>

          } @else {

            <!-- ─── E-Mail-Bestätigung ─── -->
            <div class="text-center space-y-8">
              <div class="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <span class="material-symbols-outlined text-emerald-400 text-4xl">mark_email_read</span>
              </div>
              <div class="space-y-3">
                <h2 class="font-headline text-3xl font-bold text-white">Postfach prüfen</h2>
                <p class="text-[#8b9ab0] text-sm leading-relaxed max-w-xs mx-auto">
                  Wir haben eine Bestätigungs-E-Mail an
                  <strong class="text-white font-semibold">{{ email }}</strong>
                  gesendet. Bitte klicken Sie auf den Link in der E-Mail.
                </p>
              </div>
              <a routerLink="/login"
                 class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors duration-150">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                Zur Anmeldung
              </a>
            </div>

          }
        </div>
      </div>
    </div>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  step = signal<RegisterStep>('form');
  fullName = '';
  email = '';
  password = '';
  inviteCode = '';
  loading = signal(false);
  errorMessage = signal('');
  filledFields = signal(0);

  infoItems = [
    { text: 'Vollständiger Zugang zu allen KI-Systemen nach der Registrierung.' },
    { text: 'Keine versteckten Kosten — der Einladungscode regelt den Zugang.' },
    { text: 'Ihr Team kann jederzeit hinzugefügt werden.' },
  ];

  updateProgress(): void {
    let count = 0;
    if (this.fullName.trim()) count++;
    if (this.email.includes('@')) count++;
    if (this.password.length >= 8) count++;
    if (this.inviteCode.trim().length >= 4) count++;
    this.filledFields.set(count);
  }

  getStepProgress(step: number): string {
    return step <= this.filledFields() ? '#0070FF' : 'rgba(255,255,255,0.08)';
  }

  async submit(): Promise<void> {
    this.errorMessage.set('');

    if (!this.fullName.trim()) {
      this.errorMessage.set('Bitte geben Sie Ihren Namen ein.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }
    if (!this.inviteCode.trim()) {
      this.errorMessage.set('Bitte geben Sie Ihren Einladungscode ein.');
      return;
    }

    this.loading.set(true);

    try {
      const { error: signUpError } = await this.auth.signUp(this.email, this.password, this.fullName.trim());

      if (signUpError) {
        if (signUpError.includes('already registered') || signUpError.includes('already been registered')) {
          this.errorMessage.set('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.');
        } else {
          this.errorMessage.set('Registrierung fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.');
        }
        return;
      }

      const { success, message } = await this.auth.redeemInviteCode(this.inviteCode.trim());
      if (!success) {
        this.errorMessage.set(message || 'Dieser Einladungscode ist nicht gültig oder wurde bereits verwendet.');
        return;
      }

      if (this.auth.isLoggedIn()) {
        await this.router.navigate(['/dashboard']);
      } else {
        this.step.set('verify-email');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
