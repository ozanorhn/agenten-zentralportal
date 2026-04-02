import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Sales' | 'Content' | 'SEO' | 'Data';
  badgeLabel?: string;
  badgeVariant?: 'primary' | 'secondary';
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  activeCategory = signal<string>('Alle');

  private paramSub!: Subscription;

  ngOnInit(): void {
    this.paramSub = this.route.queryParamMap.subscribe(params => {
      const cat = params.get('category');
      this.activeCategory.set(cat ?? 'Alle');
    });
  }

  ngOnDestroy(): void {
    this.paramSub.unsubscribe();
  }

  categories = ['Alle', 'Sales', 'Content', 'SEO', 'Data'];

  agents: Agent[] = [
    // ── OMR Special (pinned first) ──────────────────────────────────────
    {
      id: 'networking-ninja',
      name: 'Networking-Ninja (OMR Special)',
      description:
        'Generiert sofort personalisierte LinkedIn-Connect-Nachrichten für deine neu gesammelten OMR-Kontakte.',
      icon: 'contact_mail',
      category: 'Sales',
      badgeLabel: 'EVENT SPECIAL',
      badgeVariant: 'secondary',
    },
    // ── Standard agents ─────────────────────────────────────────────────
    {
      id: 'firmen-finder',
      name: 'Firmen-Finder',
      description:
        'Findet Unternehmen in deiner Zielstadt nach Branche — mit Kontaktdaten, Adresse und Website auf Knopfdruck.',
      icon: 'location_city',
      category: 'Sales',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'cold-mail-cyborg',
      name: 'Cold-Mail-Cyborg',
      description:
        'Generiert hochpersonalisierte Outreach-Kampagnen basierend auf LinkedIn-Profilen und Firmen-News. 98% Inbox-Rate.',
      icon: 'alternate_email',
      category: 'Sales',
    },
    {
      id: 'linkedin-ghostwriter',
      name: 'LinkedIn-Ghostwriter',
      description:
        'Analysiert deinen Schreibstil und erstellt täglich Thought-Leadership-Posts, die echtes Engagement erzielen.',
      icon: 'history_edu',
      category: 'Content',
    },
    {
      id: 'lead-researcher',
      name: 'Lead-Researcher',
      description:
        'Scrapt das Web nach Neukunden-Signalen: Finanzierungsrunden, Stellenanzeigen oder Technologiewechsel in Echtzeit.',
      icon: 'biotech',
      category: 'Data',
    },
    {
      id: 'top-ranker-bot',
      name: 'Top-Ranker Bot',
      description:
        'Analysiert die SERPs deiner Konkurrenz und optimiert bestehende Artikel für maximale Sichtbarkeit und Klickraten.',
      icon: 'manage_search',
      category: 'SEO',
    },
    {
      id: 'sync-master',
      name: 'Sync-Master 3000',
      description:
        'Hält dein CRM und deine Marketing-Tools synchron. Erkennt Duplikate und bereichert Profile automatisch an.',
      icon: 'schema',
      category: 'Data',
    },
    {
      id: 'script-savant',
      name: 'Script-Savant',
      description:
        'Verwandelt lange Blogposts in virale TikTok- und Reels-Scripts inklusive detaillierter visueller Anweisungen.',
      icon: 'video_chat',
      category: 'Content',
    },
  ];

  get filteredAgents(): Agent[] {
    if (this.activeCategory() === 'Alle') return this.agents;
    return this.agents.filter((a) => a.category === this.activeCategory());
  }

  setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  startWorkflow(agentId: string): void {
    this.router.navigate(['/agents', agentId]);
  }
}
