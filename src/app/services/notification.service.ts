import { Injectable, signal, computed } from '@angular/core';
import { AppNotification } from '../models/interfaces';

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-1',
    agentId: 'linkedin-ghostwriter',
    agentName: 'LinkedIn-Ghostwriter',
    agentIcon: 'history_edu',
    message: 'LinkedIn-Ghostwriter hat deinen Post fertig. Bereit zum Veröffentlichen!',
    time: 'Vor 3 Min.',
    read: false,
    link: '/agents/linkedin-ghostwriter/result',
  },
  {
    id: 'seed-2',
    agentId: 'top-ranker-bot',
    agentName: 'Top-Ranker Bot',
    agentIcon: 'manage_search',
    message: 'Top-Ranker Bot hat 8 neue Keyword-Chancen gefunden.',
    time: 'Vor 15 Min.',
    read: false,
    link: '/agents/top-ranker-bot/result',
  },
  {
    id: 'seed-3',
    agentId: 'cold-mail-cyborg',
    agentName: 'Cold-Mail-Cyborg',
    agentIcon: 'alternate_email',
    message: 'Cold-Mail-Cyborg: E-Mail-Sequenz für 12 neue Leads bereit.',
    time: 'Vor 1 Std.',
    read: true,
    link: '/agents/cold-mail-cyborg/result',
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<AppNotification[]>(SEED_NOTIFICATIONS);

  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length
  );

  addNotification(n: Omit<AppNotification, 'id'>): void {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}`,
    };
    this._notifications.update(list => [notification, ...list]);
  }

  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllRead(): void {
    this._notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
  }
}
