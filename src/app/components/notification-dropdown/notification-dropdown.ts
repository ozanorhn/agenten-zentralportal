import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  template: `
    @if (visible()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 z-[60]" (click)="close.emit()"></div>

      <!-- Dropdown panel -->
      <div class="absolute top-full right-0 mt-2 w-[380px] z-[70]
                  bg-surface-container-low/95 backdrop-blur-2xl
                  border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-on-surface">Benachrichtigungen</span>
            @if (notifService.unreadCount() > 0) {
              <span class="px-2 py-0.5 text-[10px] font-black bg-[#0070FF] text-white rounded-full">
                {{ notifService.unreadCount() }}
              </span>
            }
          </div>
          <button
            (click)="notifService.markAllRead()"
            class="text-[11px] text-[#0070FF] hover:text-primary font-semibold transition-colors"
          >
            Alle gelesen
          </button>
        </div>

        <!-- Notification list -->
        <div class="max-h-[400px] overflow-y-auto divide-y divide-outline-variant/10">
          @for (n of notifService.notifications(); track n.id) {
            <div
              class="flex items-start gap-3 px-5 py-4 hover:bg-surface-container-high/50
                     cursor-pointer transition-colors group"
              [class.opacity-60]="n.read"
              (click)="onNotifClick(n.id, n.link)"
            >
              <!-- Agent icon -->
              <div class="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                   [class]="n.read ? 'bg-surface-container-highest' : 'bg-[#0070FF]/20'">
                <span class="material-symbols-outlined text-lg"
                      [style.color]="n.read ? '' : '#0070FF'"
                      style="font-variation-settings: 'FILL' 1;">{{ n.agentIcon }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-on-surface mb-0.5">{{ n.agentName }}</p>
                <p class="text-xs text-on-surface-variant leading-relaxed">{{ n.message }}</p>
                <p class="text-[10px] text-outline mt-1 uppercase tracking-widest">{{ n.time }}</p>
              </div>

              @if (!n.read) {
                <div class="w-2 h-2 rounded-full bg-[#0070FF] mt-1.5 flex-shrink-0"></div>
              }
            </div>
          } @empty {
            <div class="px-5 py-8 text-center text-sm text-on-surface-variant">
              <span class="material-symbols-outlined text-3xl block mb-2 opacity-30">notifications_off</span>
              Keine Benachrichtigungen
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="border-t border-outline-variant/20 px-5 py-3">
          <button
            class="w-full text-xs text-on-surface-variant hover:text-on-surface transition-colors text-center"
            (click)="close.emit()"
          >
            Alle anzeigen →
          </button>
        </div>
      </div>
    }
  `,
})
export class NotificationDropdown {
  visible = input.required<boolean>();
  close = output<void>();

  readonly notifService = inject(NotificationService);
  private readonly router = inject(Router);

  onNotifClick(id: string, link: string): void {
    this.notifService.markRead(id);
    this.router.navigateByUrl(link);
    this.close.emit();
  }
}
