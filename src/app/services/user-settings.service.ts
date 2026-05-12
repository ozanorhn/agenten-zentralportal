import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { supabase } from '../core/supabase.client';
import { ThemePreference, UserSettings } from '../models/interfaces';
import { AuthService } from './auth.service';

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id' | 'updated_at'> = {
  theme: 'system',
  notify_in_app: true,
  notify_email: false,
};

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly auth = inject(AuthService);

  private readonly _settings = signal<UserSettings | null>(null);
  readonly settings = this._settings.asReadonly();

  readonly theme = computed<ThemePreference>(() => this._settings()?.theme ?? 'system');

  constructor() {
    effect(() => {
      const userId = this.auth.session()?.user?.id ?? null;
      if (userId) {
        void this.load(userId);
      } else {
        this._settings.set(null);
      }
    });
  }

  private async load(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[UserSettings] load failed:', error.message);
      return;
    }

    if (data) {
      this._settings.set(data as UserSettings);
      return;
    }

    const fresh: UserSettings = {
      user_id: userId,
      ...DEFAULT_SETTINGS,
      updated_at: new Date().toISOString(),
    };
    const { error: insertError } = await supabase.from('user_settings').insert(fresh);
    if (insertError) {
      console.error('[UserSettings] create failed:', insertError.message);
      this._settings.set(fresh);
      return;
    }
    this._settings.set(fresh);
  }

  async update(patch: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>): Promise<{ error: string | null }> {
    const userId = this.auth.session()?.user?.id;
    if (!userId) return { error: 'Nicht eingeloggt.' };

    const current = this._settings();
    const next: UserSettings = {
      user_id: userId,
      theme: patch.theme ?? current?.theme ?? DEFAULT_SETTINGS.theme,
      notify_in_app: patch.notify_in_app ?? current?.notify_in_app ?? DEFAULT_SETTINGS.notify_in_app,
      notify_email: patch.notify_email ?? current?.notify_email ?? DEFAULT_SETTINGS.notify_email,
      updated_at: new Date().toISOString(),
    };

    this._settings.set(next);

    const { error } = await supabase.from('user_settings').upsert(next, { onConflict: 'user_id' });
    if (error) {
      console.error('[UserSettings] update failed:', error.message);
      return { error: error.message };
    }
    return { error: null };
  }
}
