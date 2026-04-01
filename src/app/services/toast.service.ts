import { Injectable, signal } from '@angular/core';
import { ToastMessage } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);

  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastMessage['type'] = 'info', duration = 3500): void {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastMessage = { id, message, type, duration };
    this._toasts.update(list => [...list, toast]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
