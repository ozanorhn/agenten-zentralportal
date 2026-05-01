import { Component, input, output } from '@angular/core';

/**
 * In-Context Booking Modal (Feature 1)
 *
 * Glassmorphism overlay with a Calendly/Cal.com iframe placeholder.
 * Configure CALENDLY_URL below once you have the real embed link.
 */
const CALENDLY_URL = ''; // e.g. 'https://calendly.com/your-handle/15min?embed_type=Inline'

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  template: `
    @if (visible()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Termin buchen"
      >
        <div class="absolute inset-0 bg-surface/70 backdrop-blur-xl"></div>

        <!-- Modal panel -->
        <div
          class="relative z-10 w-full max-w-lg rounded-3xl overflow-hidden
                 bg-surface-variant/60 backdrop-blur-xl
                 shadow-[0_32px_64px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          (click)="$event.stopPropagation()"
        >
          <!-- Header glow accent -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px
                      bg-gradient-to-r from-transparent via-secondary/60 to-transparent"></div>

          <div class="p-8 pb-6">
            <!-- Icon + headline -->
            <div class="flex items-start gap-4 mb-5">
              <div class="w-12 h-12 flex-shrink-0 rounded-2xl bg-secondary/15
                          flex items-center justify-center">
                <span
                  class="material-symbols-outlined text-secondary text-2xl"
                  style="font-variation-settings: 'FILL' 1;"
                >rocket_launch</span>
              </div>
              <div>
                <p class="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">
                  System einrichten
                </p>
                <h2 class="text-xl font-headline font-black tracking-tight text-on-surface leading-snug">
                  Stellen Sie sich vor, dieses System läuft rund um die Uhr automatisch in Ihrem CRM.
                </h2>
              </div>
            </div>

            <p class="text-on-surface-variant text-sm leading-relaxed mb-6">
              Wir setzen das in&nbsp;<span class="text-secondary font-bold">15&thinsp;Minuten</span>&nbsp;auf.
              Wählen Sie direkt Ihren Wunschtermin:
            </p>

            <!-- Calendly iframe / placeholder -->
            <div class="relative w-full h-[360px] rounded-2xl overflow-hidden
                        bg-surface-container
                        shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              @if (calendlyUrl) {
                <iframe
                  [src]="calendlyUrl"
                  title="Terminbuchung"
                  class="absolute inset-0 w-full h-full"
                  style="border:0"
                  loading="lazy"
                ></iframe>
              } @else {
                <!-- Placeholder UI -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
                  <div class="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-1">
                    <span
                      class="material-symbols-outlined text-secondary/50 text-4xl"
                      style="font-variation-settings: 'FILL' 1;"
                    >calendar_month</span>
                  </div>
                  <p class="text-on-surface-variant text-sm text-center leading-relaxed">
                    Calendly / Cal.com Widget
                  </p>
                  <p class="text-outline text-xs text-center">
                    Platzhalter: Setzen Sie <code class="text-secondary/70">CALENDLY_URL</code>
                    in <code class="text-secondary/70">booking-modal.ts</code>
                  </p>
                </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="px-8 pb-8 flex items-center justify-between">
            <p class="text-outline text-xs">Kein Risiko · Keine Kreditkarte nötig</p>
            <button
              (click)="close.emit()"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl
                     text-on-surface-variant/60 hover:text-on-surface text-sm
                     hover:bg-surface-container-high transition-all"
            >
              <span class="material-symbols-outlined text-base">close</span>
              Schließen
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingModal {
  visible = input<boolean>(false);
  close = output<void>();

  protected readonly calendlyUrl = CALENDLY_URL || null;

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
