import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Liefert das Standard-Kontextobjekt, das jedem n8n-Webhook-Aufruf
 * mitgegeben wird. n8n nutzt diese Felder, um nach Workflow-Ende eine
 * Zeile in agent_runs zu schreiben.
 *
 * Verwendung im Agent-Trigger:
 *
 *   const body = {
 *     ...userInputs,
 *     ...this.runCtx.buildContext('seo-geo-analyse-assistent-nollm'),
 *   };
 *   fetch(webhookUrl, { method: 'POST', body: JSON.stringify(body) });
 *
 * Auf n8n-Seite landen dann die Felder _run_user_id, _run_agent_id, _run_id
 * im Webhook-Body und werden im finalen Supabase-Insert-Node verwendet.
 */
export interface AgentRunContext {
  _run_user_id: string;
  _run_user_email: string | null;
  _run_agent_id: string;
  _run_id: string;
  _run_started_at: string;
}

@Injectable({ providedIn: 'root' })
export class AgentRunContextService {
  private readonly auth = inject(AuthService);

  buildContext(agentId: string): AgentRunContext {
    const userId = this.auth.session()?.user?.id ?? '';
    return {
      _run_user_id: userId,
      _run_user_email: this.auth.userEmail(),
      _run_agent_id: agentId,
      _run_id: this.uuid(),
      _run_started_at: new Date().toISOString(),
    };
  }

  private uuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
