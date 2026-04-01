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
      id: 'nexus-01',
      name: 'Nexus-01 Core',
      agentId: 'AE-99234-X',
      icon: 'neurology',
      iconColor: 'text-primary-fixed-dim',
      model: 'GPT-4 Omni',
      core: 'Cognitive Layer 7',
      status: 'operational',
      lastActivity: 'Vor 2 Min.',
    },
    {
      id: 'data-miner',
      name: 'Data-Miner Alpha',
      agentId: 'AE-11822-B',
      icon: 'database',
      iconColor: 'text-tertiary',
      model: 'Claude 3.5 Sonnet',
      core: 'Extraction Engine',
      status: 'standby',
      lastActivity: 'Gestern, 14:20',
    },
    {
      id: 'security-audit',
      name: 'Security-Audit Pro',
      agentId: 'AE-55410-Z',
      icon: 'security',
      iconColor: 'text-error',
      model: 'Llama 3 70B',
      core: 'Threat Analysis',
      status: 'error',
      lastActivity: 'Vor 12 Std.',
    },
    {
      id: 'customer-bot',
      name: 'Customer-Bot Beta',
      agentId: 'AE-22109-S',
      icon: 'chat',
      iconColor: 'text-primary',
      model: 'GPT-3.5 Turbo',
      core: 'NLU Response System',
      status: 'operational',
      lastActivity: 'Gerade eben',
    },
  ];

  editAgent(agent: AgentRow): void {
    this.toast.show(`Agent "${agent.name}" wird bearbeitet…`, 'info');
  }

  duplicateAgent(agent: AgentRow): void {
    this.toast.show(`Agent "${agent.name}" wurde dupliziert.`, 'success');
  }

  deleteAgent(agent: AgentRow): void {
    this.toast.show(`Agent "${agent.name}" wurde gelöscht.`, 'error');
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'operational':
        return 'bg-primary/10 text-primary border border-primary/20';
      case 'standby':
        return 'bg-secondary-container/30 text-secondary';
      case 'error':
        return 'bg-error-container/20 text-error border border-error/20';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'standby':
        return 'Standby';
      case 'error':
        return 'Error Log';
      default:
        return status;
    }
  }
}
