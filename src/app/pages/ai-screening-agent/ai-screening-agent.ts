import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DemoCandidate {
  name: string;
  score: number;
  summary: string;
  strengths: string[];
  resumeSnapshot: {
    experience: string;
    lastRole: string;
    focus: string;
  };
}

interface DemoRoleResult {
  title: string;
  teamSignal: string;
  candidates: DemoCandidate[];
}

const ANALYSIS_STEPS = [
  'CV wird eingelesen ...',
  'Erfahrung und Skills werden extrahiert ...',
  'Rollenprofile werden parallel abgeglichen ...',
  'Top-Kandidat:innen werden priorisiert ...',
  'Management-Zusammenfassung wird erstellt ...',
];

const ROLE_RESULTS: DemoRoleResult[] = [
  {
    title: 'Projektmanager (m/w/d)',
    teamSignal: 'Stärkster Fit bei Delivery, Stakeholder-Steuerung und sauberer Priorisierung.',
    candidates: [
      {
        name: 'Anna Keller',
        score: 94,
        summary: 'Sehr starker Fit für Projektsteuerung mit belastbarer Erfahrung in Timelines, Kundenkommunikation und cross-funktionaler Abstimmung.',
        strengths: ['Stakeholder-Management', 'Delivery', 'Prozesssicherheit'],
        resumeSnapshot: {
          experience: '8 Jahre Berufserfahrung',
          lastRole: 'Senior Project Manager bei einer Digitalagentur',
          focus: 'Große Website-Relaunches, Sprintplanung, Kundensteuerung',
        },
      },
      {
        name: 'Jonas Richter',
        score: 88,
        summary: 'Guter Match für operative Projektkoordination, besonders in dynamischen Teams mit mehreren Gewerken und klaren Deadlines.',
        strengths: ['Ressourcenplanung', 'Kommunikation', 'Ownership'],
        resumeSnapshot: {
          experience: '6 Jahre Berufserfahrung',
          lastRole: 'Projektkoordinator in einem SaaS-Unternehmen',
          focus: 'Roadmaps, interne Abstimmung, Delivery-Controlling',
        },
      },
      {
        name: 'Miriam Scholz',
        score: 82,
        summary: 'Solider Projekt-Fit mit Fokus auf PMO-Strukturen, Reporting und sauberer Nachverfolgung offener Themen.',
        strengths: ['PMO', 'Reporting', 'Dokumentation'],
        resumeSnapshot: {
          experience: '5 Jahre Berufserfahrung',
          lastRole: 'PMO Specialist im E-Commerce',
          focus: 'Statusreports, Jira-Prozesse, Meeting- und Maßnahmensteuerung',
        },
      },
    ],
  },
  {
    title: 'SEO & GEO-Manager (m/w/d)',
    teamSignal: 'Beste Profile verbinden Content-Verständnis, technische SEO-Grundlage und GEO-Denke.',
    candidates: [
      {
        name: 'David Nguyen',
        score: 96,
        summary: 'Sehr hoher Fit durch Erfahrung in SEO-Strategie, Content-Optimierung und strukturierter Arbeit an AI- und GEO-Sichtbarkeit.',
        strengths: ['SEO-Strategie', 'Content Audits', 'GEO-Signale'],
        resumeSnapshot: {
          experience: '7 Jahre Berufserfahrung',
          lastRole: 'SEO Lead in einer B2B-Content-Agentur',
          focus: 'Content Audits, KI-SERP-Optimierung, technische SEO',
        },
      },
      {
        name: 'Leonie Hartmann',
        score: 89,
        summary: 'Starker Match für redaktionelle SEO-Rollen mit sauberem Blick auf Search Intent, Informationsarchitektur und Performance.',
        strengths: ['Onpage SEO', 'Search Intent', 'Briefings'],
        resumeSnapshot: {
          experience: '5 Jahre Berufserfahrung',
          lastRole: 'SEO Managerin bei einem Verlag',
          focus: 'Onpage-Optimierung, Briefings, Ranking-Verbesserung',
        },
      },
      {
        name: 'Tobias Meier',
        score: 84,
        summary: 'Guter Fit für datengetriebene SEO-Rollen, besonders wenn Reporting, Priorisierung und technische Checks wichtig sind.',
        strengths: ['SEO Reporting', 'Tech Checks', 'Priorisierung'],
        resumeSnapshot: {
          experience: '4 Jahre Berufserfahrung',
          lastRole: 'SEO Analyst in einer Inhouse-Marketingabteilung',
          focus: 'Dashboards, Crawls, Maßnahmen-Priorisierung',
        },
      },
    ],
  },
  {
    title: 'AI Automation Engineer (m/w/d)',
    teamSignal: 'Top-Profile kombinieren Workflow-Denke, API-Verständnis und pragmatische Automatisierung.',
    candidates: [
      {
        name: 'Maximilian Brandt',
        score: 97,
        summary: 'Exzellenter Fit für AI-Automation mit Erfahrung in Prozessdesign, Tool-Verkettung und produktionsnaher Workflow-Orchestrierung.',
        strengths: ['Workflow-Automation', 'APIs', 'Systemdenken'],
        resumeSnapshot: {
          experience: '6 Jahre Berufserfahrung',
          lastRole: 'Automation Engineer in einem Ops-Team',
          focus: 'n8n-Workflows, API-Anbindungen, Prozessdesign',
        },
      },
      {
        name: 'Sofia Yilmaz',
        score: 91,
        summary: 'Starker Match für operative Automatisierung und KI-gestützte Prozessketten mit gutem Verständnis für Business-Anforderungen.',
        strengths: ['Integrationen', 'Prompt-Flows', 'Business Fit'],
        resumeSnapshot: {
          experience: '5 Jahre Berufserfahrung',
          lastRole: 'Solutions Engineer in einer KI-Beratung',
          focus: 'Business-Automation, Prompt-Flows, CRM-Integrationen',
        },
      },
      {
        name: 'Niklas Berger',
        score: 86,
        summary: 'Solider Fit für Automation-Rollen mit Schwerpunkt auf Datenübergaben, Low-Code-Tools und Stabilisierung manueller Abläufe.',
        strengths: ['Low-Code', 'Ops', 'Datenflüsse'],
        resumeSnapshot: {
          experience: '4 Jahre Berufserfahrung',
          lastRole: 'Operations Automation Specialist',
          focus: 'Low-Code, Datenpipelines, manuelle Prozessablösung',
        },
      },
    ],
  },
  {
    title: 'Web-Analytics Specialist (m/w/d)',
    teamSignal: 'Die stärksten Kandidat:innen zeigen Sauberkeit in Tracking, Attribution und Reporting.',
    candidates: [
      {
        name: 'Sarah Hoffmann',
        score: 95,
        summary: 'Sehr hoher Fit für Analytics-Setups mit klarer Erfahrung in Tracking-Konzepten, Dashboards und datenbasierter Optimierung.',
        strengths: ['GA4', 'Tag Management', 'Dashboarding'],
        resumeSnapshot: {
          experience: '7 Jahre Berufserfahrung',
          lastRole: 'Senior Web Analyst in einem E-Commerce-Team',
          focus: 'GA4, Tag Manager, Funnel-Analysen',
        },
      },
      {
        name: 'Fabian Krüger',
        score: 90,
        summary: 'Starker Match für Performance-Analytics und kanalübergreifende Auswertung mit guter Verbindung aus Technik und Business-Fragen.',
        strengths: ['Attribution', 'Looker Studio', 'Analyse'],
        resumeSnapshot: {
          experience: '5 Jahre Berufserfahrung',
          lastRole: 'Digital Analytics Consultant',
          focus: 'Attribution, Dashboards, Performance-Reporting',
        },
      },
      {
        name: 'Clara Winter',
        score: 83,
        summary: 'Guter Fit für Reporting-nahe Analytics-Rollen mit Fokus auf KPI-Strukturen, QA und nachvollziehbare Datenauswertung.',
        strengths: ['KPI-Setups', 'QA', 'Reports'],
        resumeSnapshot: {
          experience: '4 Jahre Berufserfahrung',
          lastRole: 'Junior Web Analytics Managerin',
          focus: 'Tracking-QA, KPI-Strukturen, monatliche Reports',
        },
      },
    ],
  },
  {
    title: 'SEA- / Ads-Manager (m/w/d)',
    teamSignal: 'Die besten Matches verbinden Kampagnensteuerung, Zahlenverständnis und schnelle Optimierung.',
    candidates: [
      {
        name: 'Philipp Sommer',
        score: 93,
        summary: 'Sehr starker Fit für SEA mit Erfahrung in Kampagnenaufbau, Budgetsteuerung und performanceorientierter Optimierung.',
        strengths: ['Google Ads', 'Budgetsteuerung', 'Testing'],
        resumeSnapshot: {
          experience: '6 Jahre Berufserfahrung',
          lastRole: 'SEA Manager in einer Performance-Agentur',
          focus: 'Google Ads, Budgetsteuerung, Kampagnen-Testing',
        },
      },
      {
        name: 'Eva Lorenz',
        score: 87,
        summary: 'Guter Match für operative Ads-Rollen mit Fokus auf Anzeigentexte, Keyword-Management und Conversion-orientierte Maßnahmen.',
        strengths: ['Anzeigen', 'Keywords', 'Conversions'],
        resumeSnapshot: {
          experience: '5 Jahre Berufserfahrung',
          lastRole: 'Performance Marketing Managerin',
          focus: 'Keyword-Management, Anzeigenoptimierung, Conversions',
        },
      },
      {
        name: 'Daniel Vogt',
        score: 81,
        summary: 'Solider Fit für Accounts mit stabilem Optimierungsbedarf, besonders bei Reporting und laufender Kampagnenpflege.',
        strengths: ['Account Hygiene', 'Reporting', 'Optimierung'],
        resumeSnapshot: {
          experience: '3 Jahre Berufserfahrung',
          lastRole: 'Junior SEA Manager',
          focus: 'Kampagnenpflege, Reports, Account-Struktur',
        },
      },
    ],
  },
];

@Component({
  selector: 'app-ai-screening-agent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-screening-agent.html',
  styleUrl: './ai-screening-agent.scss',
})
export class AiScreeningAgentComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly roles = signal<DemoRoleResult[]>([]);

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly totalCandidates = computed(() =>
    this.roles().reduce((sum, role) => sum + role.candidates.length, 0)
  );

  readonly averageTopScore = computed(() => {
    const topScores = this.roles().map((role) => role.candidates[0]?.score ?? 0);
    if (!topScores.length) return 0;
    return Math.round(topScores.reduce((sum, score) => sum + score, 0) / topScores.length);
  });

  startAnalysis(): void {
    if (this.isAnalyzing()) {
      return;
    }

    this.clearTimers();
    this.isAnalyzing.set(true);
    this.hasCompleted.set(false);
    this.roles.set([]);
    this.progress.set(0);
    this.progressLabel.set(ANALYSIS_STEPS[0]);

    let currentStep = 0;

    this.progressIntervalId = setInterval(() => {
      currentStep += 1;
      this.progress.set(Math.min(currentStep * 20, 100));
      this.progressLabel.set(ANALYSIS_STEPS[Math.min(currentStep, ANALYSIS_STEPS.length - 1)]);
    }, 1000);

    this.finishTimeoutId = setTimeout(() => {
      this.clearTimers();
      this.progress.set(100);
      this.progressLabel.set(ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1]);
      this.roles.set(ROLE_RESULTS);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  trackRole(_: number, role: DemoRoleResult): string {
    return role.title;
  }

  trackCandidate(_: number, candidate: DemoCandidate): string {
    return candidate.name;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }

    if (this.finishTimeoutId) {
      clearTimeout(this.finishTimeoutId);
      this.finishTimeoutId = null;
    }
  }
}
