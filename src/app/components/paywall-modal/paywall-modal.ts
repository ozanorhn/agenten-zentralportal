import { Component, inject } from '@angular/core';
import { CreditService } from '../../services/credit.service';

/**
 * Soft Paywall Modal (Feature 2)
 *
 * Shown automatically when credits reach 0 and the user tries to start another workflow.
 * Visibility is driven by CreditService.showPaywall signal — mount once in Shell.
 */
@Component({
  selector: 'app-paywall-modal',
  standalone: true,
  template: `
    @if (credit.showPaywall()) {
      <!-- Full-screen blur overlay -->
      <div
        class="fixed inset-0 z-[300] flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Credits aufgebraucht"
      >
        <div class="absolute inset-0 bg-surface/80 backdrop-blur-2xl"></div>

        <!-- Modal panel -->
        <div
          class="relative z-10 w-full max-w-md rounded-3xl overflow-hidden
                 bg-surface-container-low
                 shadow-[0_32px_80px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          (click)="$event.stopPropagation()"
        >
          <!-- Neon-orange top accent line -->
          <div class="h-[3px] w-full bg-gradient-to-r from-secondary/0 via-secondary to-secondary/0"></div>

          <!-- Ambient glow behind icon -->
          <div class="absolute top-8 left-1/2 -translate-x-1/2 w-40 h-40
                      bg-secondary/10 blur-[60px] rounded-full pointer-events-none"></div>

          <div class="px-8 pt-10 pb-8 relative">
            <!-- Icon -->
            <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary/15
                        flex items-center justify-center">
              <span
                class="material-symbols-outlined text-secondary text-3xl"
                style="font-variation-settings: 'FILL' 1;"
              >battery_alert</span>
            </div>

            <!-- Copy -->
            <h2 class="text-2xl font-headline font-black tracking-tight text-on-surface text-center mb-3">
              Credits aufgebraucht
            </h2>
            <p class="text-on-surface-variant text-sm text-center leading-relaxed mb-8">
              Ihre Test-Credits sind aufgebraucht. Da wir uns auf der&nbsp;
              <span class="text-secondary font-bold">OMR</span>&nbsp;getroffen haben: Buche Ihnen jetzt
              einen kurzen&nbsp;<span class="font-semibold text-on-surface">10-Minuten-Discovery-Call</span>&nbsp;
              und wir schalten Ihnen den Account für&nbsp;
              <span class="text-secondary font-bold">30&thinsp;Tage</span>&nbsp;frei.
            </p>

            <!-- Credit indicators -->
            <div class="flex justify-center gap-2 mb-8">
              @for (i of [0, 1, 2]; track i) {
                <div class="w-8 h-2 rounded-full bg-surface-container-highest"></div>
              }
            </div>

            <!-- CTA -->
            <button
              (click)="credit.dismissPaywall()"
              class="w-full py-4 rounded-2xl font-black text-base
                     bg-secondary text-on-secondary
                     shadow-[0_0_24px_rgba(255,120,50,0.35)]
                     hover:shadow-[0_0_36px_rgba(255,120,50,0.55)]
                     hover:-translate-y-0.5 active:translate-y-0
                     transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <span class="material-symbols-outlined"
                    style="font-variation-settings: 'FILL' 1;">event</span>
              Jetzt Discovery-Call buchen
              <!-- Shine sweep -->
              <span class="absolute inset-0 bg-white/10 translate-x-[-100%]
                           group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></span>
            </button>

            <!-- Dismiss link -->
            <button
              (click)="credit.dismissPaywall()"
              class="w-full mt-4 py-2 text-outline text-xs hover:text-on-surface-variant
                     transition-colors text-center"
            >
              Vielleicht später
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PaywallModal {
  protected readonly credit = inject(CreditService);

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.credit.dismissPaywall();
    }
  }
}
