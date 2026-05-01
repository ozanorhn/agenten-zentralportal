import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

interface AgentRow {
  id: string;
  name: string;
  agentId: string;
  icon: string;
  iconColor: string;
  model: string;
  core: string;
  status: 'operational' | 'standby' | 'error';
  lastActivity: string;
}

@Component({
  selector: 'app-management',
  imports: [RouterLink],
  templateUrl: './management.html',
  styleUrl: './management.scss',
})
export class Management {
  private readonly toast = inject(ToastService);

  agents: AgentRow[] = [
    {
      id: 'seo-tagesbericht',
      name: 'SEO-Tagesbericht',
      agentId: 'SYS-SEO-01',
      icon: 'query_stats',
      iconColor: 'text-primary',
      model: 'Claude Opus 4.7',
      core: 'Tägliche SEO-Prioritäten',
      status: 'operational',
      lastActivity: 'Heute, 06:00 Uhr',
    },
    {
      id: 'geo-audit',
      name: 'GEO-Audit',
      agentId: 'SYS-GEO-02',
      icon: 'travel_explore',
      iconColor: 'text-primary',
      model: 'Claude Sonnet 4.6',
      core: 'KI-Sichtbarkeits-Analyse',
      status: 'operational',
      lastActivity: 'Vor 2 Stunden',
    },
    {
      id: 'ad-copy',
      name: 'Ad-Copy-Generator',
      agentId: 'SYS-ADS-03',
      icon: 'campaign',
      iconColor: 'text-primary',
      model: 'Claude Sonnet 4.6',
      core: 'Anzeigentext für Google & Meta',
      status: 'standby',
      lastActivity: 'Gestern, 16:45 Uhr',
    },
    {
      id: 'reporting-assistent',
      name: 'Reporting-Assistent',
      agentId: 'SYS-REP-04',
      icon: 'summarize',
      iconColor: 'text-primary',
      model: 'Claude Opus 4.7',
      core: 'Wochen- und Monatsberichte',
      status: 'operational',
      lastActivity: 'Vor 35 Minuten',
    },
  ];

  editAgent(agent: AgentRow): void {
    this.toast.show(`System „${agent.name}" wird bearbeitet …`, 'info');
  }

  duplicateAgent(agent: AgentRow): void {
    this.toast.show(`System „${agent.name}" wurde dupliziert.`, 'success');
  }

  deleteAgent(agent: AgentRow): void {
    this.toast.show(`System „${agent.name}" wurde gelöscht.`, 'error');
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
}
