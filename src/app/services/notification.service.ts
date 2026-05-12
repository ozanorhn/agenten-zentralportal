import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../core/supabase.client';
import { AppNotification } from '../models/interfaces';
import { AuthService } from './auth.service';

interface NotificationRow {
  id: string;
  created_at: string;
  created_by: string | null;
  title: string;
  body: string;
  icon: string | null;
  link: string | null;
  target_user_id: string | null;
}

interface NotificationReadRow {
  notification_id: string;
  user_id: string;
  read_at: string;
}

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (diffSec < 60) return 'Gerade eben';
  if (diffSec < 3600) return `Vor ${Math.floor(diffSec / 60)} Min.`;
  if (diffSec < 86400) return `Vor ${Math.floor(diffSec / 3600)} Std.`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Vor 1 Tag';
  if (days < 7) return `Vor ${days} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE');
}

function mapRow(row: NotificationRow, readIds: Set<string>): AppNotification {
  return {
    id: row.id,
    agentId: '',
    agentName: row.title,
    agentIcon: row.icon ?? 'campaign',
    message: row.body,
    time: formatRelativeTime(row.created_at),
    read: readIds.has(row.id),
    link: row.link ?? '',
    createdAt: row.created_at,
    targetUserId: row.target_user_id,
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);

  private readonly _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  private channel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.session()?.user?.id ?? null;
      if (userId && userId !== this.currentUserId) {
        this.currentUserId = userId;
        void this.loadNotifications();
        this.subscribeRealtime(userId);
      } else if (!userId && this.currentUserId) {
        this.currentUserId = null;
        this._notifications.set([]);
        this.unsubscribeRealtime();
      }
    });
  }

  async loadNotifications(): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const [notifsRes, readsRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('notification_reads').select('notification_id').eq('user_id', userId),
    ]);

    if (notifsRes.error) {
      console.error('[Notifications] load failed:', notifsRes.error.message);
      return;
    }

    const readIds = new Set<string>(
      (readsRes.data ?? []).map(r => (r as Pick<NotificationReadRow, 'notification_id'>).notification_id),
    );
    const rows = (notifsRes.data ?? []) as NotificationRow[];
    this._notifications.set(rows.map(r => mapRow(r, readIds)));
  }

  async markRead(id: string): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    this._notifications.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));

    if (id.startsWith('local-')) return;

    const { error } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: id, user_id: userId }, { onConflict: 'notification_id,user_id' });
    if (error) console.error('[Notifications] markRead failed:', error.message);
  }

  /**
   * Lokale, transiente Notification — wird NICHT in der DB persistiert.
   * Genutzt nach Agent-Abschluss, um den aktuellen User unmittelbar
   * im Glocken-Dropdown auf das Ergebnis hinzuweisen.
   * Verschwindet bei Reload (im Gegensatz zu DB-Notifications).
   */
  addNotification(n: Omit<AppNotification, 'id'>): void {
    const local: AppNotification = {
      ...n,
      id: `local-${Date.now()}`,
      read: false,
      time: n.time || 'Gerade eben',
    };
    this._notifications.update(list => [local, ...list].slice(0, 50));
  }

  async markAllRead(): Promise<void> {
    const userId = this.currentUserId;
    if (!userId) return;

    const unread = this._notifications().filter(n => !n.read);
    if (unread.length === 0) return;

    this._notifications.update(list => list.map(n => ({ ...n, read: true })));

    const rows = unread
      .filter(n => !n.id.startsWith('local-'))
      .map(n => ({ notification_id: n.id, user_id: userId }));
    if (rows.length === 0) return;

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'notification_id,user_id' });
    if (error) console.error('[Notifications] markAllRead failed:', error.message);
  }

  private subscribeRealtime(userId: string): void {
    this.unsubscribeRealtime();

    this.channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => {
          const row = payload.new as NotificationRow;
          if (row.target_user_id && row.target_user_id !== userId) return;
          this._notifications.update(list => {
            if (list.some(n => n.id === row.id)) return list;
            return [mapRow(row, new Set()), ...list].slice(0, 50);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        payload => {
          const oldRow = payload.old as { id?: string };
          if (!oldRow?.id) return;
          this._notifications.update(list => list.filter(n => n.id !== oldRow.id));
        },
      )
      .subscribe();
  }

  private unsubscribeRealtime(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
