import { Component, EventEmitter, inject, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-paywall-modal',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Overlay -->
    <div class="fixed inset-0 z-[500] flex items-center justify-center p-4"
         style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);"
         (click)="close.emit()">

      <div class="relative w-full max-w-md rounded-2xl border border-white/10 p-8 text-center space-y-6"
           style="background: rgba(26, 28, 32, 0.95);"
           (click)="$event.stopPropagation()">

        <!-- Close -->
        <button
          (click)="close.emit()"
          class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center
                 text-on-surface-variant hover:bg-surface-container-high transition-all">
          <span class="material-symbols-outlined text-base">close</span>
        </button>

        <!-- Icon -->
        <div class="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-primary text-2xl">lock</span>
        </div>

        <!-- Text -->
        <div class="space-y-2">
          <h3 class="font-headline text-xl font-bold text-white">Kein Zugang</h3>
          <p class="text-on-surface-variant text-sm leading-relaxed">
            Diese Funktion ist nur für freigeschaltete Konten verfügbar.
            Nehmen Sie Kontakt auf, um einen Einladungscode zu erhalten.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <a routerLink="/kontakt" (click)="close.emit()"
             class="w-full bg-primary text-white py-3 rounded-lg font-bold text-sm
                    hover:bg-primary/90 transition-all duration-150">
            Kontakt aufnehmen
          </a>
          <button
            (click)="signOut()"
            class="w-full bg-surface-container-high/50 border border-white/10 text-on-surface-variant py-3 rounded-lg text-sm font-medium
                   hover:text-on-surface transition-all duration-150">
            Abmelden
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PaywallModal {
  @Output() close = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.close.emit();
    await this.router.navigate(['/login']);
  }
}
