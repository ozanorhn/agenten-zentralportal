import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { supabase } from '../../core/supabase.client';
import { AdminNotificationService } from '../../services/admin-notification.service';
import { Profile } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

type ManagementTab = 'systeme' | 'nutzer' | 'codes' | 'benachrichtigungen';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  grants_admin: boolean;
  created_at: string;
}

interface AgentRow {
  id: string;
  name: string;
  agentId: string;
  icon: string;
  model: string;
  core: string;
  status: 'operational' | 'standby' | 'error';
  lastActivity: string;
}

interface AgentStat {
  agent_id: string;
  agent_name: string | null;
  icon: string | null;
  category: string | null;
  model: string | null;
  last_run_at: string | null;
  run_count_30d: number;
  unique_users: number;
  failed_count: number;
}

// Kanonische System-Definitionen — Anzeige-Reihenfolge und Modell-Metadaten.
// Statuswerte werden zur Laufzeit aus agent_runs abgeleitet.
const AGENT_CATALOG: Array<{
  agent_id: string;
  name: string;
  sys_id: string;
  icon: string;
  model: string;
  core: string;
}> = [
  { agent_id: 'seo-intelligence-dashboard', name: 'SEO-Tagesbericht', sys_id: 'SYS-SEO-01', icon: 'query_stats', model: 'Claude Opus 4.7', core: 'Tägliche SEO-Prioritäten' },
  { agent_id: 'seo-geo-analyse-assistent-nollm', name: 'GEO-Audit', sys_id: 'SYS-GEO-02', icon: 'travel_explore', model: 'Claude Sonnet 4.6', core: 'KI-Sichtbarkeits-Analyse' },
  { agent_id: 'ad-copy-generator', name: 'Ad-Copy-Generator', sys_id: 'SYS-ADS-03', icon: 'campaign', model: 'Claude Sonnet 4.6', core: 'Anzeigentext für Google & Meta' },
  { agent_id: 'reporting-bot', name: 'Reporting-Assistent', sys_id: 'SYS-REP-04', icon: 'summarize', model: 'Claude Opus 4.7', core: 'Wochen- und Monatsberichte' },
  { agent_id: 'seo-content-strategie', name: 'Content-Strategie', sys_id: 'SYS-CON-05', icon: 'article', model: 'Claude Opus 4.7', core: 'Themen-Cluster & Briefings' },
  { agent_id: 'interne-verlinkung-vorschlaege', name: 'Verlinkungsplan', sys_id: 'SYS-LNK-06', icon: 'hub', model: 'Claude Sonnet 4.6', core: 'Interne Verlinkung optimieren' },
  { agent_id: 'produkttext-agent', name: 'Produkttext-Generator', sys_id: 'SYS-PRD-07', icon: 'inventory_2', model: 'Claude Sonnet 4.6', core: 'Shop-Texte aus Bild + Daten' },
  { agent_id: 'csv-produkttext-agent', name: 'CSV-Produkttexte', sys_id: 'SYS-CSV-08', icon: 'table', model: 'Claude Sonnet 4.6', core: 'Bulk-Texte aus CSV' },
];

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './management.html',
  styleUrl: './management.scss',
})
export class Management implements OnInit {
  private readonly toast = inject(ToastService);
  readonly adminNotif = inject(AdminNotificationService);

  activeTab = signal<ManagementTab>('systeme');

  users = signal<Profile[]>([]);
  usersLoading = signal(false);

  codes = signal<InviteCode[]>([]);
  codesLoading = signal(false);
  newCode = '';
  newCodeMaxUses = 10;
  newCodeGrantsAdmin = false;
  codeCreating = signal(false);

  // Systeme-Tab: Live-Statistik
  agentStats = signal<AgentStat[]>([]);
  agentStatsLoading = signal(false);
  debugInfo = signal<{ total: number; mine: number } | null>(null);

  // Notification-Formular
  notifTitle = '';
  notifBody = '';
  notifIcon = 'campaign';
  notifLink = '';
  notifTargetUserId: string | '' = '';
  notifSending = signal(false);

  // Wird aus AGENT_CATALOG + agentStats() berechnet
  // model kommt aus agent_runs (n8n schreibt es pro Lauf rein); Katalog-Modell ist nur Fallback.
  agents = computed<AgentRow[]>(() => {
    const stats = this.agentStats();
    const statsById = new Map(stats.map(s => [s.agent_id, s]));
    return AGENT_CATALOG.map(def => {
      const s = statsById.get(def.agent_id);
      return {
        id: def.agent_id,
        name: def.name,
        agentId: def.sys_id,
        icon: def.icon,
        model: s?.model ?? def.model,
        core: def.core,
        status: this.deriveStatus(s?.last_run_at ?? null),
        lastActivity: this.formatLastActivity(s?.last_run_at ?? null),
      };
    });
  });

  // Liefert die Modell-Quelle (DB-live oder Fallback-Katalog) für die UI
  modelSource(agentIdInternal: string): 'live' | 'fallback' {
    const s = this.agentStats().find(x => x.agent_id === agentIdInternal);
    return s?.model ? 'live' : 'fallback';
  }

  // Aufrufe der letzten 30 Tage, je Agent
  runCountFor(agentIdInternal: string): number {
    const s = this.agentStats().find(x => x.agent_id === agentIdInternal);
    return s?.run_count_30d ?? 0;
  }

  totalRuns30d = computed(() => this.agentStats().reduce((sum, s) => sum + Number(s.run_count_30d ?? 0), 0));
  activeCount = computed(() => this.agents().filter(a => a.status === 'operational').length);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadUsers(), this.loadCodes(), this.adminNotif.load(), this.loadAgentStats()]);
  }

  async loadAgentStats(): Promise<void> {
    this.agentStatsLoading.set(true);
    const [statsRes, debugRes] = await Promise.all([
      supabase.rpc('admin_agent_stats', { p_days: 30 }),
      supabase.rpc('debug_agent_runs_count'),
    ]);
    this.agentStatsLoading.set(false);

    if (statsRes.error) {
      this.toast.show(`Agent-Statistik fehlgeschlagen: ${statsRes.error.message}`, 'error');
    } else {
      this.agentStats.set((statsRes.data ?? []) as AgentStat[]);
    }

    if (!debugRes.error && debugRes.data) {
      const row = (debugRes.data as Array<{ total: number; mine: number }>)[0];
      if (row) this.debugInfo.set({ total: Number(row.total), mine: Number(row.mine) });
    }
  }

  private deriveStatus(lastRunIso: string | null): 'operational' | 'standby' | 'error' {
    if (!lastRunIso) return 'standby';
    const diffDays = (Date.now() - new Date(lastRunIso).getTime()) / 86_400_000;
    if (diffDays <= 7) return 'operational';
    return 'standby';
  }

  private formatLastActivity(iso: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    const diffMin = (Date.now() - date.getTime()) / 60_000;
    if (diffMin < 1) return 'Gerade eben';
    if (diffMin < 60) return `Vor ${Math.floor(diffMin)} Min.`;
    if (diffMin < 1440) return `Vor ${Math.floor(diffMin / 60)} Std.`;
    return date.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  setTab(tab: ManagementTab): void {
    this.activeTab.set(tab);
  }

  async sendNotification(): Promise<void> {
    const title = this.notifTitle.trim();
    const body = this.notifBody.trim();
    if (!title || !body) {
      this.toast.show('Bitte Titel und Text ausfüllen.', 'error');
      return;
    }
    this.notifSending.set(true);
    const { error } = await this.adminNotif.create({
      title,
      body,
      icon: this.notifIcon.trim() || 'campaign',
      link: this.notifLink.trim() || null,
      targetUserId: this.notifTargetUserId || null,
    });
    this.notifSending.set(false);

    if (error) {
      this.toast.show(`Senden fehlgeschlagen: ${error}`, 'error');
      return;
    }
    this.toast.show('Benachrichtigung gesendet.', 'success');
    this.notifTitle = '';
    this.notifBody = '';
    this.notifLink = '';
    this.notifTargetUserId = '';
  }

  async deleteNotification(id: string): Promise<void> {
    const { error } = await this.adminNotif.remove(id);
    if (error) this.toast.show(`Löschen fehlgeschlagen: ${error}`, 'error');
    else this.toast.show('Benachrichtigung gelöscht.', 'success');
  }

  userLabel(id: string | null): string {
    if (!id) return 'Alle Nutzer';
    const u = this.users().find(u => u.id === id);
    return u?.full_name || u?.email || id.slice(0, 8);
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      this.toast.show('Nutzer konnten nicht geladen werden.', 'error');
    } else if (data) {
      this.users.set(data as Profile[]);
    }
    this.usersLoading.set(false);
  }

  async togglePaid(user: Profile): Promise<void> {
    const { error } = await supabase.rpc('admin_toggle_paid', {
      p_user_id: user.id,
      p_value: !user.is_paid,
    });
    if (error) {
      this.toast.show('Änderung fehlgeschlagen.', 'error');
    } else {
      this.toast.show(
        `${user.full_name ?? user.email}: Zugang ${!user.is_paid ? 'aktiviert' : 'deaktiviert'}.`,
        'success',
      );
      await this.loadUsers();
    }
  }

  /**
   * Abo-Status eines Nutzers ableiten — purely UI logic (parallel zu accessExpired in AuthService).
   */
  subscriptionStatus(user: Profile): 'active' | 'grace' | 'expired' | 'unlimited' {
    if (!user.subscription_expires_at) return 'unlimited';
    const expiry = new Date(user.subscription_expires_at).getTime();
    if (!Number.isFinite(expiry)) return 'unlimited';
    if (expiry > Date.now()) return 'active';
    const graceCutoff = Date.now() - 30 * 86_400_000;
    return expiry < graceCutoff ? 'expired' : 'grace';
  }

  subscriptionLabel(user: Profile): string {
    switch (this.subscriptionStatus(user)) {
      case 'unlimited': return 'Unbegrenzt';
      case 'active':    return 'Aktiv';
      case 'grace':     return 'Karenzfrist';
      case 'expired':   return 'Gesperrt';
    }
  }

  formatExpiry(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  /**
   * Sperrt einen Nutzer sofort: setzt expires_at auf vor 31 Tagen.
   * Dadurch ist die Karenzfrist überschritten und der paidGuard greift.
   */
  async lockUser(user: Profile): Promise<void> {
    if (user.is_admin) {
      this.toast.show('Admin-Accounts können nicht gesperrt werden.', 'error');
      return;
    }
    const past = new Date(Date.now() - 31 * 86_400_000).toISOString();
    const { error } = await supabase.rpc('admin_set_subscription_expires_at', {
      p_user_id: user.id,
      p_expires_at: past,
    });
    if (error) {
      this.toast.show(`Sperren fehlgeschlagen: ${error.message}`, 'error');
      return;
    }
    this.toast.show(`${user.full_name ?? user.email} wurde gesperrt.`, 'success');
    await this.loadUsers();
  }

  /**
   * Entsperrt einen Nutzer komplett: setzt expires_at auf NULL (= unbegrenzt).
   */
  async unlockUser(user: Profile): Promise<void> {
    const { error } = await supabase.rpc('admin_set_subscription_expires_at', {
      p_user_id: user.id,
      p_expires_at: null,
    });
    if (error) {
      this.toast.show(`Entsperren fehlgeschlagen: ${error.message}`, 'error');
      return;
    }
    this.toast.show(`${user.full_name ?? user.email} entsperrt.`, 'success');
    await this.loadUsers();
  }

  /**
   * Setzt expires_at auf ein konkretes Datum (z. B. nach Rechnungsstellung).
   */
  async setExpiryFromInput(user: Profile, value: string): Promise<void> {
    const iso = value ? new Date(value).toISOString() : null;
    const { error } = await supabase.rpc('admin_set_subscription_expires_at', {
      p_user_id: user.id,
      p_expires_at: iso,
    });
    if (error) {
      this.toast.show(`Speichern fehlgeschlagen: ${error.message}`, 'error');
      return;
    }
    this.toast.show('Ablaufdatum gespeichert.', 'success');
    await this.loadUsers();
  }

  async loadCodes(): Promise<void> {
    this.codesLoading.set(true);
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      this.toast.show('Zugangscodes konnten nicht geladen werden.', 'error');
    } else if (data) {
      this.codes.set(data as InviteCode[]);
    }
    this.codesLoading.set(false);
  }

  async createCode(): Promise<void> {
    if (!this.newCode.trim()) return;
    this.codeCreating.set(true);
    const { error } = await supabase.rpc('admin_create_invite_code', {
      p_code: this.newCode.trim().toUpperCase(),
      p_max_uses: this.newCodeMaxUses,
      p_grants_admin: this.newCodeGrantsAdmin,
    });
    if (error) {
      this.toast.show('Fehler: ' + error.message, 'error');
    } else {
      const label = this.newCodeGrantsAdmin ? ' (mit Admin-Rechten)' : '';
      this.toast.show(`Code „${this.newCode.trim().toUpperCase()}"${label} erstellt.`, 'success');
      this.newCode = '';
      this.newCodeMaxUses = 10;
      this.newCodeGrantsAdmin = false;
      await this.loadCodes();
    }
    this.codeCreating.set(false);
  }

  async toggleCode(code: InviteCode): Promise<void> {
    const { error } = await supabase.rpc('admin_toggle_invite_code', {
      p_id: code.id,
      p_active: !code.is_active,
    });
    if (error) {
      this.toast.show('Änderung fehlgeschlagen.', 'error');
    } else {
      await this.loadCodes();
    }
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'operational':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'standby':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'error':
        return 'bg-error-container/20 text-error border border-error/20';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'operational':
        return 'Aktiv';
      case 'standby':
        return 'Pausiert';
      case 'error':
        return 'Fehler';
      default:
        return status;
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
