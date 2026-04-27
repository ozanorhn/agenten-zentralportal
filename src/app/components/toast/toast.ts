import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl
                 backdrop-blur-xl border text-sm font-semibold min-w-[280px] max-w-[400px]
                 animate-[slideInRight_0.3s_ease-out]"
          [class]="toastClasses(toast.type)"
          (click)="toastService.remove(toast.id)"
        >
          <span class="material-symbols-outlined text-xl flex-shrink-0" style="font-variation-settings: 'FILL' 1;">
            {{ toastIcon(toast.type) }}
          </span>
          <span class="flex-1">{{ toast.message }}</span>
          <button class="opacity-50 hover:opacity-100 transition-opacity ml-2" aria-label="Hinweis schließen">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
})
export class Toast {
  readonly toastService = inject(ToastService);

  toastClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
      case 'error':
        return 'bg-red-500/20 border-red-500/30 text-red-300';
      default:
        return 'bg-[#0070FF]/20 border-[#0070FF]/30 text-[#7db8ff]';
    }
  }

  toastIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return 'info';
    }
  }
}
