import { Injectable, inject, signal } from '@angular/core';
import { supabase } from '../core/supabase.client';
import { AuthService } from './auth.service';

export interface AdminNotificationRow {
  id: string;
  created_at: string;
  created_by: string | null;
  title: string;
  body: string;
  icon: string;
  link: string | null;
  target_user_id: string | null;
}

export interface CreateNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  link?: string | null;
  targetUserId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private readonly auth = inject(AuthService);
  private readonly _items = signal<AdminNotificationRow[]>([]);
  readonly items = this._items.asReadonly();
  readonly loading = signal(false);

  async load(): Promise<void> {
    if (!this.auth.isAdmin()) return;
    this.loading.set(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    this.loading.set(false);

    if (error) {
      console.error('[AdminNotifications] load failed:', error.message);
      return;
    }
    this._items.set((data ?? []) as AdminNotificationRow[]);
  }

  async create(payload: CreateNotificationPayload): Promise<{ error: string | null }> {
    const { data, error } = await supabase.rpc('admin_create_notification', {
      p_title: payload.title,
      p_body: payload.body,
      p_icon: payload.icon ?? 'campaign',
      p_link: payload.link ?? null,
      p_target_user_id: payload.targetUserId ?? null,
    });

    if (error) return { error: error.message };

    if (data) {
      const row = data as AdminNotificationRow;
      this._items.update(list => [row, ...list]);
    }
    return { error: null };
  }

  async remove(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return { error: error.message };
    this._items.update(list => list.filter(n => n.id !== id));
    return { error: null };
  }
}
