import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase.client';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_paid: boolean;
  is_admin: boolean;
  invite_code: string | null;
  created_at: string;
  subscription_expires_at: string | null;
}

const GRACE_PERIOD_DAYS = 30;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);

  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isPaid = computed(() => this.profile()?.is_paid === true);
  readonly isAdmin = computed(() => this.profile()?.is_admin === true);
  readonly userEmail = computed(() => this.session()?.user?.email ?? null);

  /**
   * Abgelaufen = subscription_expires_at gesetzt UND länger als 30 Tage vorbei.
   * Admins werden nicht gesperrt. Wer noch in der Karenzfrist ist oder kein
   * Ablaufdatum hat (NULL), behält Zugang.
   */
  readonly accessExpired = computed<boolean>(() => {
    const profile = this.profile();
    if (!profile || profile.is_admin) return false;
    if (!profile.subscription_expires_at) return false;
    const expiry = new Date(profile.subscription_expires_at).getTime();
    if (!Number.isFinite(expiry)) return false;
    const graceCutoff = Date.now() - GRACE_PERIOD_DAYS * 86_400_000;
    return expiry < graceCutoff;
  });

  // Zeigt full_name wenn vorhanden, sonst den Teil vor dem @ der E-Mail
  readonly displayName = computed(() => {
    const name = this.profile()?.full_name;
    if (name) return name;
    const email = this.userEmail();
    if (email) return email.split('@')[0];
    return null;
  });

  /**
   * Wird erfüllt, sobald die Session aus localStorage gelesen und (falls vorhanden)
   * das Profil geladen wurde. Guards warten darauf, damit sie nicht fälschlich
   * zu /login redirecten bevor die Hydratation durch ist.
   */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = supabase.auth.getSession().then(async ({ data }) => {
      this.session.set(data.session);
      if (data.session) await this.loadProfile();
    });

    supabase.auth.onAuthStateChange((_, session) => {
      this.session.set(session);
      if (session) {
        void this.loadProfile();
      } else {
        this.profile.set(null);
      }
    });
  }

  async loadProfile(): Promise<void> {
    const userId = this.session()?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[auth] loadProfile failed:', error.message, error);
      return;
    }
    if (data) this.profile.set(data as Profile);
  }

  async signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/dashboard' },
    });
    return { error: error?.message ?? null };
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  }

  async redeemInviteCode(code: string): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: code });
    if (error) return { success: false, message: error.message };
    const result = data as { success: boolean; message: string };
    if (result.success) await this.loadProfile();
    return result;
  }

  async updateFullName(name: string): Promise<{ error: string | null }> {
    const userId = this.session()?.user?.id;
    if (!userId) return { error: 'Nicht eingeloggt.' };

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', userId);

    if (!error) await this.loadProfile();
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
