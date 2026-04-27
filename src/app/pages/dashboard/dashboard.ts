import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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

type AgentCategory = Agent['category'];

interface HeroContent {
  eyebrow: string;
  titlePrefix: string;
  titleAccent: string;
  titleSuffix: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [NgTemplateOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly categoryOrder: AgentCategory[] = ['Content', 'Sales', 'SEO', 'Data'];
  readonly categoryMeta: Record<AgentCategory, { label: string; description: string }> = {
    Content: {
      label: 'Content',
      description: 'Redaktion, Posts, Produkttexte und skalierbare Content-Produktion.',
    },
    Sales: {
      label: 'Sales',
      description: 'Outreach, Event-Nachbereitung und strukturierte Lead-Recherche.',
    },
    SEO: {
      label: 'SEO',
      description: 'Audits, SERP-Optimierung und Content-Analysen mit konkreten Maßnahmen.',
    },
    Data: {
      label: 'Data',
      description: 'Synchronisation, Recherche und operative Datenprozesse ohne manuelle Nachpflege.',
    },
  };

  activeCategory = signal<string>('Alle');
  private readonly heroContentByCategory: Record<string, HeroContent> = {
    Alle: {
      eyebrow: 'arcnode marketplace',
      titlePrefix: 'KI-Systeme für ',
      titleAccent: 'operative Exzellenz',
      titleSuffix: '',
      description:
        'Kuratierte KI-Systeme für Marketing, Sales, SEO und Datenprozesse. Klar im Nutzen, sauber im Output — gebaut für den operativen Alltag.',
    },
    Marketing: {
      eyebrow: 'marketing systeme',
      titlePrefix: 'Marketing mit ',
      titleAccent: 'messbarer Wirkung',
      titleSuffix: '',
      description:
        'Content-Produktion und SEO/GEO-Sichtbarkeit in einem System — von LinkedIn-Posts bis zum vollständigen SERP-Audit.',
    },
    Sales: {
      eyebrow: 'sales systeme',
      titlePrefix: 'Outreach mit ',
      titleAccent: 'konkreter Relevanz',
      titleSuffix: '',
      description:
        'Systeme für Lead-Recherche, Event-Nachbereitung und strukturierten Outreach — direkt einsetzbar entlang der Vertriebspipeline.',
    },
    Content: {
      eyebrow: 'content systeme',
      titlePrefix: 'Content, der ',
      titleAccent: 'schneller fertig wird',
      titleSuffix: '',
      description:
        'Systeme für Produkttexte, LinkedIn-Posts, Short-Form-Video und redaktionelle Produktion. Belastbarer Output, ohne Umwege.',
    },
    SEO: {
      eyebrow: 'seo systeme',
      titlePrefix: 'Sichtbarkeit mit ',
      titleAccent: 'klaren Prioritäten',
      titleSuffix: '',
      description:
        'Systeme für Audits, SERP-Optimierung, interne Verlinkung und Content-Analysen — mit konkreten nächsten Schritten, nicht mit abstrakten Empfehlungen.',
    },
    Data: {
      eyebrow: 'data systeme',
      titlePrefix: 'Aus Daten wird ',
      titleAccent: 'operative Klarheit',
      titleSuffix: '',
      description:
        'Systeme für Synchronisation, Recherche und Reporting. Operative Informationen dort, wo sie gebraucht werden — ohne manuelle Nachpflege.',
    },
  };

  readonly marketingGroups: { label: string; icon: string; description: string; ids: string[] }[] = [
    {
      label: 'Content',
      icon: 'edit_note',
      description: 'Social Posts, Blog-Artikel, Produkttexte und Short-Form-Video.',
      ids: ['linkedin-ghostwriter', 'blog-redakteur', 'social-media-wizard', 'script-savant'],
    },
    {
      label: 'SEO / GEO',
      icon: 'manage_search',
      description: 'Sichtbarkeit, SERP-Analyse, Content-Strategie und KI-Optimierung.',
      ids: ['top-ranker-bot', 'content-strategy-bot', 'omr-seo-content-strategie', 'seo-geo-analyse-assistent', 'geo-site-audit', 'interne-verlinkung-vorschlaege', 'content-seo-analyzer'],
    },
  ];

  getMarketingGroupAgents(ids: string[]): Agent[] {
    return ids.map(id => this.agents.find(a => a.id === id)).filter(Boolean) as Agent[];
  }

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
    {
      id: 'linkedin-ghostwriter',
      name: 'LinkedIn-Post-Agent',
      description:
        'Verdichtet Erfahrungen, Thesen oder Cases in veröffentlichungsreife LinkedIn-Posts mit klarem Ton und sauberer Struktur.',
      icon: 'history_edu',
      category: 'Content',
    },
    {
      id: 'blog-redakteur',
      name: 'Blog-Redakteur',
      description:
        'Erstellt ein vollständiges Blogpaket aus Thema, Keyword, Outline und redaktioneller Qualitätssicherung.',
      icon: 'edit_note',
      category: 'Content',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'produkttext-agent',
      name: 'Produkttext-Agent',
      description:
        'Erzeugt belastbare Produkttexte aus Produkt-URL, Bild oder Zusatzinformationen für Shop und Kampagne.',
      icon: 'imagesmode',
      category: 'Content',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'csv-produkttext-agent',
      name: 'CSV Produkttext-Agent',
      description:
        'Verarbeitet Produktlisten als CSV und liefert skalierbare SEO-Produkttexte als sauberen Batch-Output zurück.',
      icon: 'table_chart',
      category: 'Content',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'social-media-wizard',
      name: 'Social-Media-Wizard',
      description:
        'Erstellt plattformgerechten Social Content für LinkedIn, Instagram, Reddit und weitere Kanäle auf Basis deiner Brand Voice.',
      icon: 'campaign',
      category: 'Content',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'script-savant',
      name: 'Short-Form-Video-Agent',
      description:
        'Leitet aus Thema oder Content-Piece ein kompaktes Skript für Reels, Shorts und andere Social Clips ab.',
      icon: 'video_chat',
      category: 'Content',
    },
    {
      id: 'networking-ninja',
      name: 'Event-Follow-up-Agent',
      description:
        'Strukturiert Follow-up-Nachrichten für Event-Kontakte und bereitet den passenden nächsten Schritt im Vertrieb vor.',
      icon: 'contact_mail',
      category: 'Sales',
      badgeLabel: 'EVENT',
      badgeVariant: 'primary',
    },
    {
      id: 'firmen-finder',
      name: 'Local-Business-Scraper',
      description:
        'Recherchiert lokale Unternehmen nach Branche und Standort und liefert eine belastbare Ausgangsliste für Vertrieb und Marktanalyse.',
      icon: 'location_city',
      category: 'Sales',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'cold-mail-cyborg',
      name: 'Outreach-Agent',
      description:
        'Erstellt personalisierte Outreach-Nachrichten auf Basis von Zielkunde, Positionierung und Anlass.',
      icon: 'alternate_email',
      category: 'Sales',
    },
    {
      id: 'lead-researcher',
      name: 'Lead-Researcher',
      description:
        'Findet belastbare Neukunden-Signale aus Web, Jobmarkt und Unternehmenskommunikation für die Vertriebspriorisierung.',
      icon: 'biotech',
      category: 'Data',
    },
    {
      id: 'top-ranker-bot',
      name: 'SERP-Optimierungs-Agent',
      description:
        'Analysiert bestehende Rankings, Wettbewerber und SERP-Muster und priorisiert realistische Optimierungen.',
      icon: 'manage_search',
      category: 'SEO',
    },
    {
      id: 'geo-site-audit',
      name: 'Geo Site Audit',
      description:
        'Crawlt die Sitemap und erstellt einen priorisierten Audit zu Struktur, KI-Signalen und technischer Auffindbarkeit.',
      icon: 'travel_explore',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'seo-geo-analyse-assistent',
      name: 'SEO/GEO Analyse Assistent',
      description:
        'Erfasst URL, Marke, Branche und Standort und liefert daraus eine strukturierte SEO- und GEO-Auswertung.',
      icon: 'forum',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'seo-geo-analyse-assistent-nollm',
      name: 'SEO/GEO Analyse Assistent NoLLM',
      description:
        'Nutze denselben Analyse-Flow gegen den NoLLM-Webhook und vergleiche den Output direkt im Portal.',
      icon: 'forum',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'geo-report-alternative',
      name: 'Geo Report Alternative',
      description:
        'Sendet eine einzelne URL an den alternativen Webhook und zeigt den gelieferten Report direkt als Markdown-Ansicht an.',
      icon: 'description',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'content-seo-analyzer',
      name: 'Content & SEO Analyzer',
      description:
        'Startet eine strukturierte Content- und SEO-Analyse für eine einzelne Domain und bereitet den Workflow direkt im Portal vor.',
      icon: 'travel_explore',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'omr-seo-content-strategie',
      name: 'OMR SEO-Content-Strategie',
      description:
        'Leitet Thema, Zielgruppe und Offer an den OMR-Workflow weiter und zeigt die strategische Auswertung direkt im Portal an.',
      icon: 'campaign',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'interne-verlinkung-vorschlaege',
      name: 'Interne Verlinkung - Vorschlaege',
      description:
        'Ermittelt interne Verlinkungsansätze aus Sitemap, Zielseite und Hauptkeyword und liefert konkrete Vorschläge zurück.',
      icon: 'alt_route',
      category: 'SEO',
      badgeLabel: 'LIVE',
      badgeVariant: 'primary',
    },
    {
      id: 'content-strategy-bot',
      name: 'Content-Strategy-Bot',
      description:
        'Erarbeitet zu einem Thema einen belastbaren Content-Plan inklusive Suchvolumen, Difficulty und Wettbewerbsumfeld.',
      icon: 'article',
      category: 'SEO',
      badgeLabel: 'NEU',
      badgeVariant: 'primary',
    },
    {
      id: 'sync-master',
      name: 'CRM-Sync-Agent',
      description:
        'Hält CRM-, Spreadsheet- und Marketing-Daten konsistent und reduziert Dubletten, Lücken und manuelle Nachpflege.',
      icon: 'schema',
      category: 'Data',
    },
  ];

  readonly visibleCategories = () => {
    const active = this.activeCategory();
    return active === 'Alle'
      ? this.categoryOrder
      : this.categoryOrder.filter(category => category === active);
  };

  agentsForCategory(category: AgentCategory): Agent[] {
    return this.agents.filter(agent => agent.category === category);
  }

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
