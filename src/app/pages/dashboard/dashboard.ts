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

interface HeroContent {
  eyebrow: string;
  titlePrefix: string;
  titleAccent: string;
  titleSuffix: string;
  description: string;
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
  private readonly heroContentByCategory: Record<string, HeroContent> = {
    Alle: {
      eyebrow: 'Marketplace',
      titlePrefix: 'Entfessle die ',
      titleAccent: 'Intelligenz',
      titleSuffix: '',
      description:
        'Wähle aus einer kuratierten Auswahl an spezialisierten KI-Agenten, die darauf trainiert sind, deine operativen Lasten zu automatisieren.',
    },
    Sales: {
      eyebrow: 'Sales Agents',
      titlePrefix: 'Mehr ',
      titleAccent: 'Pipeline',
      titleSuffix: ', weniger manuelle Arbeit',
      description:
        'Finde KI-Agenten für Recherche, Lead-Qualifizierung, Outreach und Vertriebsautomatisierung entlang deiner Pipeline.',
    },
    Content: {
      eyebrow: 'Content Agents',
      titlePrefix: '',
      titleAccent: 'Content',
      titleSuffix: ', der schneller live geht',
      description:
        'Wähle spezialisierte Agenten für Redaktionsplanung, Produkttexte, Social Media und skalierbare Content-Produktion.',
    },
    SEO: {
      eyebrow: 'SEO Agents',
      titlePrefix: '',
      titleAccent: 'Sichtbarkeit',
      titleSuffix: ' systematisch ausbauen',
      description:
        'Nutze Agenten für Audits, Keyword-Strategie, GEO-Analysen und priorisierte Optimierungen mit echtem Suchpotenzial.',
    },
    Data: {
      eyebrow: 'Data Agents',
      titlePrefix: 'Aus ',
      titleAccent: 'Daten',
      titleSuffix: ' wird operative Klarheit',
      description:
        'Entdecke Agenten für Recherche, Synchronisation, Reporting und datengetriebene Entscheidungen in deinen Kernprozessen.',
    },
  };

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
      id: 'blog-redakteur',
      name: 'Blog-Redakteur',
      description:
        'Erstellt vollständige Blogpakete mit Briefing, Artikel, Chefredakteurs-Check, Keywords und SERP-Auswertung.',
      icon: 'edit_note',
      category: 'Content',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'produkttext-agent',
      name: 'Produkttext-Agent',
      description:
        'Aus einer Produkt-URL oder einem Bild entsteht automatisch ein passender Produkttext.',
      icon: 'imagesmode',
      category: 'Content',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
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
      id: 'geo-site-audit',
      name: 'Geo Site Audit',
      description:
        'Crawlt deine Sitemap und erstellt einen GEO-Audit mit Rankings, KI-Signalen und den wichtigsten siteweiten Baustellen.',
      icon: 'travel_explore',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'seo-geo-analyse-assistent',
      name: 'SEO/GEO Analyse Assistent',
      description:
        'Nimmt URL, Marke, Branche und Standort als Formular entgegen, sendet den GEO-Webhook und zeigt die strukturierte Analyse direkt auf der Seite.',
      icon: 'forum',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'seo-geo-analyse-assistent-nollm',
      name: 'SEO/GEO Analyse Assistent NoLLM',
      description:
        'Kopie des SEO/GEO Analyse Assistenten, die dieselben Eingaben direkt an den NoLLM-Webhook sendet und den fertigen Report im Portal rendert.',
      icon: 'forum',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'geo-report-alternative',
      name: 'Geo Report Alternative',
      description:
        'Nimmt genau eine URL entgegen, sendet sie an einen separaten n8n-Testwebhook und rendert den gelieferten Markdown-Report auf einer eigenen Seite.',
      icon: 'description',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'content-strategy-bot',
      name: 'Content-Strategy-Bot',
      description:
        'Analysiert dein Thema, findet Suchvolumen und Keyword-Difficulty, identifiziert Wettbewerber-URLs und liefert einen vollständigen Content-Strategie-Plan.',
      icon: 'article',
      category: 'SEO',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
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
      id: 'social-media-wizard',
      name: 'Social-Media-Wizard',
      description:
        'Generiert plattformoptimierten Content für Twitter, LinkedIn, Reddit und Instagram — auf deine Brand Voice und Zielgruppe zugeschnitten.',
      icon: 'campaign',
      category: 'Content',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
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

  get heroContent(): HeroContent {
    return this.heroContentByCategory[this.activeCategory()] ?? this.heroContentByCategory['Alle'];
  }

  startWorkflow(agentId: string): void {
    this.router.navigate(['/agents', agentId]);
  }
}
