import { Component, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AGENTS, AgentMeta } from '../../data/agents.data';

const MARKETING_CATS = new Set<AgentMeta['category']>(['Content', 'SEO', 'Ads']);
const MARKETING_ORDER: AgentMeta['category'][] = ['Content', 'SEO', 'Ads'];

export interface AgentGroup { label: string; agents: AgentMeta[]; }

@Component({
  selector: 'app-agents',
  imports: [],
  templateUrl: './agents.html',
})
export class AgentsPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly category = signal(
    this.route.snapshot.queryParamMap.get('category') ?? 'Marketing'
  );

  readonly label = computed(() => this.category());

  readonly agents = computed<AgentMeta[]>(() => {
    const cat = this.category();
    if (cat === 'Marketing') return AGENTS.filter(a => MARKETING_CATS.has(a.category));
    return AGENTS.filter(a => a.category === cat);
  });

  readonly groups = computed<AgentGroup[]>(() => {
    const cat = this.category();
    if (cat === 'Marketing') {
      return MARKETING_ORDER
        .map(sub => ({ label: sub, agents: AGENTS.filter(a => a.category === sub) }))
        .filter(g => g.agents.length > 0);
    }
    return [{ label: '', agents: this.agents() }];
  });

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      this.category.set(params.get('category') ?? 'Marketing');
    });
  }

  open(id: string): void {
    this.router.navigate(['/agents', id]);
  }
}
