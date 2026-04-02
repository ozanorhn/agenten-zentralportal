import { Injectable } from '@angular/core';
import {
  AgentOutput,
  CompanyListOutput,
  EmailOutput,
  LinkedInPostOutput,
  VideoScriptOutput,
  LeadTableOutput,
  KeywordTableOutput,
  SyncReportOutput,
  RunInputData,
} from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AgentOutputService {
  generateOutput(agentId: string, input: RunInputData): AgentOutput {
    const audience = input.targetAudience || 'SaaS-Entscheider';
    const url = input.websiteUrl || 'ihre-firma.de';
    const tone = input.toneOfVoice || 'Professionell & Sachlich';

    switch (agentId) {
      case 'cold-mail-cyborg':
        return this.generateColdEmail(audience, url, tone);
      case 'networking-ninja':
        return this.generateNetworkingEmail(audience, url, tone);
      case 'linkedin-ghostwriter':
        return this.generateLinkedInPost(audience, url, tone);
      case 'script-savant':
        return this.generateVideoScript(audience, url, tone);
      case 'lead-researcher':
        return this.generateLeadTable(input.companyName || audience, input.websiteUrl || url);
      case 'top-ranker-bot':
        return this.generateKeywordTable(audience, url);
      case 'sync-master':
        return this.generateSyncReport();
      case 'firmen-finder':
        return this.generateCompanyList(input.industry || 'Webagenturen', input.city || 'Hannover');
      default:
        return this.generateColdEmail(audience, url, tone);
    }
  }

  private generateColdEmail(audience: string, url: string, tone: string): EmailOutput {
    return {
      type: 'email',
      subject: `Wie ${audience.split(' ')[0] || 'Ihr Team'} 8h/Woche mit KI-Agenten einspart`,
      greeting: 'Hallo [Vorname],',
      body: [
        `Ich habe mir ${url} angesehen und eine spannende Parallele zu anderen ${audience} entdeckt, mit denen wir arbeiten.`,
        `Die meisten Teams in Ihrer Position verbringen noch immer 60–70 % der Zeit mit wiederkehrenden, manuellen Prozessen — dabei wäre genau das der Hebel für sofortiges Wachstum.`,
        `Unser ${tone === 'Direkt & Provokant' ? 'Battle-hardened' : 'intelligentes'} Agenten-Framework hat in vergleichbaren Setups durchschnittlich 8 Stunden pro Woche freigeschaufelt — ohne zusätzliche Headcount.`,
        `Konkret: Automatisiertes Outreach-Scoring, smarte Follow-up-Sequenzen und Live-Datenanalyse — alles in einem autonomen Loop.`,
      ],
      cta: 'Hätten Sie 15 Minuten diese Woche für ein kurzes Gespräch? Ich zeige Ihnen live, was in Ihrem konkreten Setup möglich wäre.',
    };
  }

  private generateNetworkingEmail(audience: string, url: string, _tone: string): EmailOutput {
    return {
      type: 'email',
      subject: `Verbindungsanfrage: KI-Strategien für ${audience}`,
      greeting: 'Hallo [Vorname],',
      body: [
        `Ich bin auf Ihr Profil gestoßen und war sofort begeistert von Ihrem Fokus auf Innovation im Bereich ${audience}.`,
        `Ich arbeite mit Arcnode an autonomen KI-Agenten, die speziell für Teams wie Ihres entwickelt wurden — mit Fokus auf messbare Effizienzgewinne ohne langen Implementierungsaufwand.`,
        `Ihre Arbeit bei ${url.replace('https://', '').replace('http://', '')} passt perfekt zu dem, was ich gerade aufbaue — ich würde mich freuen, mich zu vernetzen und Erfahrungen auszutauschen.`,
      ],
      cta: 'Darf ich eine kurze Verbindungsanfrage senden? Würde mich freuen, mehr über Ihre Perspektive zu erfahren.',
    };
  }

  private generateLinkedInPost(audience: string, _url: string, tone: string): LinkedInPostOutput {
    const isProvocative = tone === 'Direkt & Provokant';
    return {
      type: 'linkedin-post',
      headline: isProvocative
        ? `Warum 90 % der ${audience} KI falsch einsetzen — und was wirklich funktioniert`
        : `Die stille Revolution: Wie KI-Agenten die Arbeitsweise von ${audience} verändern`,
      body: [
        isProvocative
          ? `Harte Wahrheit: Die meisten Teams kaufen KI-Tools und nennen das "Transformation". Das ist kein Fortschritt — das ist teures Spielzeug.`
          : `Die Zukunft des Arbeitens ist nicht mehr manuell. Während andere noch debattieren, handeln die Besten bereits.`,
        `Was echte Automatisierung bedeutet: Nicht ein Tool, das dir Arbeit abnimmt. Sondern ein System, das selbstständig denkt, priorisiert und ausführt.`,
        `In unserem neuesten Deployment für ${audience} haben wir gesehen:\n✅ 8h gesparte Zeit pro Woche\n✅ 3x höhere Conversion-Rate im Outreach\n✅ 0 manuelle Follow-ups notwendig`,
        isProvocative
          ? `Die Frage ist nicht mehr OB ihr KI einsetzt. Die Frage ist, ob ihr es richtig macht.`
          : `Die Technologie ist bereit. Sind es Ihre Prozesse?`,
      ],
      cta: 'Was ist eure größte operative Herausforderung gerade? Schreibt es in die Kommentare — ich antworte auf jede Antwort. 👇',
      hashtags: ['#KI', '#Automatisierung', '#FutureOfWork', '#Produktivität', '#B2B'],
      estimatedEngagement: '4.2%',
      estimatedReach: '12.400',
    };
  }

  private generateVideoScript(audience: string, _url: string, _tone: string): VideoScriptOutput {
    return {
      type: 'video-script',
      title: `So spart dein Team 8h/Woche mit KI-Agenten`,
      hook: `Stop. Bevor du wieder manuell Leads recherchierst — schau dir das an. In 60 Sekunden zeige ich dir, wie ${audience} das komplett automatisieren.`,
      sections: [
        {
          heading: '📌 Das Problem',
          narration: `Die meisten Teams für ${audience} verbringen noch immer 70 % ihrer Zeit mit Aufgaben, die eine KI in Sekunden erledigen könnte. Outreach, Recherche, Follow-ups — alles manuell. Das ist nicht nur ineffizient. Das ist teuer.`,
          visualNote: 'Screen-Recording: überfüllte Inbox, manuelle Spreadsheets, viele offene Tabs',
        },
        {
          heading: '⚡ Die Lösung',
          narration: `Arcnode-Agenten analysieren deine Zielgruppe in Echtzeit, personalisieren jeden Touchpoint und triggern automatisch Follow-up-Aktionen — ohne dass du einen Finger rühren musst.`,
          visualNote: 'Animation: Agent-Dashboard mit laufenden Tasks, Statusbalken, Ergebnisse erscheinen in Echtzeit',
        },
        {
          heading: '📊 Die Ergebnisse',
          narration: `Unsere Kunden berichten von durchschnittlich 8 Stunden Zeitersparnis pro Woche, 3-fach höheren Antwortquoten und einem ROI, der sich in den ersten 30 Tagen rechnet.`,
          visualNote: 'Infografik: Vorher/Nachher-Vergleich, Zahlen animiert einblenden',
        },
      ],
      cta: `Willst du sehen, was das für dein Team bedeutet? Link in der Bio — buche einen 15-Minuten-Demo-Call. Kostenlos, unverbindlich.`,
      hashtags: ['#KI', '#VideoMarketing', '#B2BSales', '#Automatisierung'],
      estimatedDuration: '1:45 Min.',
    };
  }

  private generateLeadTable(companyName: string, websiteUrl: string): LeadTableOutput {
    const domain = websiteUrl.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '') || companyName.toLowerCase();
    const firstNames = ['Thomas', 'Julia', 'Markus', 'Sarah', 'Felix', 'Anna', 'David', 'Lisa'];
    const lastNames = ['Müller', 'Schmidt', 'Weber', 'Fischer', 'Becker', 'Wagner', 'Hoffmann', 'Schulz'];
    const roles = ['Head of Sales', 'Marketing Director', 'CEO', 'Head of Growth', 'VP Sales', 'CMO', 'Business Development Manager', 'Head of Digital'];

    const leads = Array.from({ length: 8 }, (_, i) => {
      const score = Math.floor(Math.random() * 40) + 60;
      return {
        name: `${firstNames[i]} ${lastNames[i]}`,
        company: companyName,
        role: roles[i],
        score,
        status: (score >= 80 ? 'Hot' : score >= 65 ? 'Warm' : 'Cold') as 'Hot' | 'Warm' | 'Cold',
        linkedinUrl: `https://linkedin.com/in/${firstNames[i].toLowerCase()}-${lastNames[i].toLowerCase()}`,
        sourceUrl: `https://${domain}`,
      };
    }).sort((a, b) => b.score - a.score);

    return {
      type: 'lead-table',
      leads,
      totalFound: Math.floor(Math.random() * 80) + 80,
      highScoreCount: leads.filter(l => l.score >= 80).length,
    };
  }

  private generateKeywordTable(audience: string, url: string): KeywordTableOutput {
    const base = audience.split(' ')[0]?.toLowerCase() || 'saas';
    const keywords: KeywordTableOutput['keywords'] = [
      { keyword: `${base} automatisierung software`, volume: 8400, difficulty: 42, currentPosition: 23, opportunity: 'Hoch' },
      { keyword: `ki agenten ${base}`, volume: 3200, difficulty: 31, currentPosition: null, opportunity: 'Hoch' },
      { keyword: `${base} prozesse optimieren`, volume: 5600, difficulty: 55, currentPosition: 18, opportunity: 'Mittel' },
      { keyword: `automatisierung tools vergleich`, volume: 12000, difficulty: 68, currentPosition: 47, opportunity: 'Niedrig' },
      { keyword: `${base} effizienz steigern`, volume: 2900, difficulty: 28, currentPosition: null, opportunity: 'Hoch' },
      { keyword: `ki workflow tool`, volume: 6700, difficulty: 44, currentPosition: 31, opportunity: 'Mittel' },
      { keyword: `agenten software kosten`, volume: 1800, difficulty: 22, currentPosition: null, opportunity: 'Hoch' },
      { keyword: `outreach automatisierung b2b`, volume: 4100, difficulty: 38, currentPosition: 12, opportunity: 'Mittel' },
    ];
    return {
      type: 'keyword-table',
      keywords,
      topOpportunity: `ki agenten ${base}`,
    };
  }

  private generateCompanyList(industry: string, city: string): CompanyListOutput {
    return {
      type: 'company-list',
      industry,
      city,
      companies: [
        { companyName: 'Beispiel GmbH', street: 'Musterstraße 1', city: `30159 ${city}`, fullAddress: `Musterstraße 1, 30159 ${city}`, phoneNumber: '0511 123456', website: 'https://www.beispiel.de' },
        { companyName: 'Demo AG', street: 'Testweg 5', city: `30169 ${city}`, fullAddress: `Testweg 5, 30169 ${city}`, phoneNumber: '0511 654321', website: null },
      ],
    };
  }

  private generateSyncReport(): SyncReportOutput {
    return {
      type: 'sync-report',
      totalRecords: 4823,
      synced: 4701,
      duplicatesRemoved: 87,
      enriched: 312,
      errors: 35,
      syncItems: [
        { source: 'HubSpot CRM', target: 'PostgreSQL DB', status: 'success', recordCount: 1842, lastSync: 'Vor 2 Min.' },
        { source: 'Salesforce', target: 'HubSpot CRM', status: 'success', recordCount: 1203, lastSync: 'Vor 5 Min.' },
        { source: 'LinkedIn Ads', target: 'Google Sheets', status: 'pending', recordCount: 891, lastSync: 'Läuft...' },
        { source: 'Notion DB', target: 'Airtable', status: 'success', recordCount: 456, lastSync: 'Vor 12 Min.' },
        { source: 'Stripe Events', target: 'Slack Webhook', status: 'error', recordCount: 35, lastSync: 'Fehler' },
      ],
    };
  }
}
