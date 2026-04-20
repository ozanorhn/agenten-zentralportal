import { Injectable } from '@angular/core';
import {
  AgentOutput,
  BlogEditorOutput,
  CompanyListOutput,
  EmailOutput,
  GeoAuditOutput,
  LinkedInPostOutput,
  MarkdownOutput,
  VideoScriptOutput,
  LeadTableOutput,
  KeywordTableOutput,
  SyncReportOutput,
  SocialMediaOutput,
  ContentStrategyOutput,
  ProductTextOutput,
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
      case 'geo-site-audit':
        return this.generateGeoSiteAuditPlaceholder(input.domain || input.websiteUrl || 'beispiel.de');
      case 'sync-master':
        return this.generateSyncReport();
      case 'firmen-finder':
        return this.generateCompanyList(input.industry || 'Webagenturen', input.city || 'Hannover');
      case 'social-media-wizard':
        return this.generateSocialMediaPlaceholder(input.topic || 'KI im Vertrieb', input.brandVoice || '', input.targetAudience || audience);
      case 'content-strategy-bot':
        return this.generateContentStrategyPlaceholder(
          input.primaryTopic || 'KI im Marketing',
          input.targetAudience || audience,
          input.contentType || 'Insight',
        );
      case 'blog-redakteur':
        return this.generateBlogEditorPlaceholder(
          input.topic || 'Content Marketing für B2B SaaS',
          input.primaryKeyword || input.keyword || 'content marketing b2b',
          input.targetAudience || audience,
          input.wordCount ?? 2500,
          input.outline || '## Was ist Content Marketing im B2B?\n## Wie unterscheidet sich B2B von B2C?\n## Welche Formate funktionieren?\n## FAQ',
        );
      case 'produkttext-agent':
        return this.generateProductTextPlaceholder(input.productReference || input.productImageName || 'shop.example.com/produkt');
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

  private generateGeoSiteAuditPlaceholder(domain: string): GeoAuditOutput {
    const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'beispiel.de';

    return {
      type: 'geo-audit',
      summary: {
        domain: `https://${normalizedDomain}`,
        totalFound: 0,
        totalProcessed: 0,
        averageScore: 0,
        bestPage: null,
        worstPage: null,
      },
      botStatus: {
        firewallBlocked: false,
      },
      totals: {
        totalFound: 0,
        totalProcessed: 0,
        averageScore: 0,
      },
      distribution: {
        green: 0,
        yellow: 0,
        orange: 0,
        red: 0,
      },
      topIssues: [],
      topPages: [],
      worstPages: [],
      errors: [],
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

  private generateProductTextPlaceholder(inputReference: string): ProductTextOutput {
    return {
      type: 'product-text',
      description: 'Sende eine Produkt-URL oder ein Bild, um hier automatisch die erzeugte Produktbeschreibung zu sehen.',
      inputReference,
      uploadedImageName: inputReference,
      generatedFile: null,
      structuredResult: null,
      responseMeta: {
        mode: 'empty',
        mimeType: null,
        descriptionSource: 'none',
        descriptionHeaderName: null,
        fileSource: 'none',
      },
    };
  }

  private generateSocialMediaPlaceholder(topic: string, brandVoice: string, targetAudience: string): SocialMediaOutput {
    return {
      type: 'social-media',
      topic,
      brandVoice,
      targetAudience,
      twitter: `🚀 ${topic} — Das verändert alles.\n\nWer jetzt nicht handelt, verliert den Anschluss.\n\n#KI #Automation #Growth`,
      linkedin: `Ich habe etwas gelernt, das ich sofort teilen möchte:\n\n${topic}\n\nDas ist kein Hype. Das ist Realität.\n\nWie geht ihr damit um? Schreibt es in die Kommentare.\n\n#KI #Innovation #Vertrieb`,
      redditTitle: `${topic} — meine ehrlichen Erfahrungen nach 3 Monaten`,
      redditBody: `Ich wollte hier mal transparent teilen, was ich in den letzten Monaten mit dem Thema "${topic}" erlebt habe...\n\nEs gibt viel Hype, aber auch echte Substanz. Fragt mich gerne alles.`,
      instagramCaption: `${topic} ✨\n\nDas Spiel hat sich verändert — bist du bereit?\n\nSave this post für später 👇\n\n#KI #Business #Wachstum #Automation #Erfolg`,
    };
  }

  private generateContentStrategyPlaceholder(
    primaryTopic: string,
    targetAudience: string,
    contentType: string,
  ): ContentStrategyOutput {
    return {
      type: 'content-strategy',
      primaryTopic,
      targetAudience,
      contentType,
      brief: `## Executive Summary\n**Ziel:** Ein strategisches Content-Piece für ${targetAudience} rund um ${primaryTopic}.`,
      structuredAnalysis: `# Structured Analysis\n\n## Primary Opportunities\n- ${primaryTopic}\n- Praxisbeispiele\n- ROI und Umsetzung`,
      primaryKeywords: [primaryTopic, 'Marketing Automation', 'Künstliche Intelligenz im Marketing'],
      longTailKeywords: [
        { keyword: 'Wie KI den ROI im Marketing steigert', intent: 'informational' },
        { keyword: 'KI Marketing Software vergleichen', intent: 'commercial' },
        { keyword: 'Agentur für KI Marketing beauftragen', intent: 'transactional' },
      ],
      questionBasedKeywords: [
        'Wie verbessert KI meine Marketingstrategie?',
        'Welche Tools eignen sich für kleine Teams?',
      ],
      relatedTopics: ['Customer Journey', 'Marketing Automation', 'Programmatic Advertising'],
      competitorUrls: [],
      keywords: [
        {
          keyword: primaryTopic,
          searchVolume: 480,
          keywordDifficulty: 24,
          competition: 'MEDIUM',
          competitionIndex: 34,
          cpc: 8.51,
          monthlySearches: [],
        },
      ],
    };
  }

  private generateBlogEditorPlaceholder(
    topic: string,
    primaryKeyword: string,
    audience: string,
    wordCount: number,
    outline: string,
  ): BlogEditorOutput {
    return {
      type: 'blog-editor',
      topic,
      primaryKeyword,
      audience,
      wordCount,
      outline,
      score: 78,
      verdict: 'Mit Korrekturen',
      articleTitle: `${topic}: Leitfaden für Teams mit messbarem Wachstumsdruck`,
      report: `## Chefredakteurs-Check

**Score: 78/100**
**Urteil: Mit Korrekturen**

### Was überzeugt

1. Die Zielgruppe ist klar umrissen und bleibt über den Text hinweg konsistent.
2. Der Artikel verbindet Strategie mit konkreten Formaten statt nur generische Definitionen zu wiederholen.
3. Die Struktur eignet sich gut für Suchintention, weil Grundlagen, Vergleich, Formate und FAQ sauber getrennt sind.

### Wo noch Luft ist

1. Einige Abschnitte bleiben noch zu abstrakt und brauchen mehr operative Beispiele.
2. Der Einstieg kann stärker auf ein reales SaaS-Problem einzahlen.
3. CTAs und Übergänge zwischen den Hauptkapiteln dürfen prägnanter werden.`,
      article: `# ${topic}: Der vollständige Leitfaden

${primaryKeyword} hilft Teams nicht nur bei Sichtbarkeit, sondern vor allem dabei, Vertrauen vor dem Erstgespräch aufzubauen.

## Was ist Content Marketing im B2B?

Im B2B geht es darum, relevante Inhalte so aufzubauen, dass sie Kaufprozesse mit mehreren Beteiligten unterstützen.

## Wie unterscheidet sich B2B von B2C?

B2B-Content muss meist fachlicher, belegbarer und stärker auf interne Abstimmung im Buying Center ausgerichtet sein.

## Welche Formate funktionieren?

Blogartikel, Case Studies, Whitepaper, Webinare und E-Mail-Nurturing greifen am besten ineinander, wenn sie entlang der Customer Journey geplant werden.

## FAQ

Gute FAQ-Abschnitte helfen sowohl Lesern als auch Suchsystemen, schnelle Antworten auf Kernfragen zu finden.`,
      serpResults: [
        {
          rank: 1,
          url: 'https://clicks.digital/knowledge-hub/b2b-content-marketing',
          title: 'B2B Content Marketing – Erklärung, Strategien, Beispiele',
          description: 'Mit B2B Marketing durch Content bauen Sie Beziehungen zu potenziellen Kunden auf, noch bevor diese einen Vertrag unterschreiben.',
        },
        {
          rank: 2,
          url: 'https://www.evergreen.media/ratgeber/b2b-content-marketing/',
          title: 'B2B-Content-Marketing: Die Anleitung inkl. Beispiele',
          description: 'Ein praxisnaher Leitfaden mit Definition, Prozess und Beispielen für B2B-Content-Marketing.',
        },
      ],
      peopleAlsoAsk: [
        'Was ist Content Marketing im B2B?',
        'Welche Formate funktionieren für SaaS-Unternehmen?',
      ],
      keywords: [
        {
          keyword: primaryKeyword,
          search_volume: 170,
          cpc: 0,
          competition: 'LOW',
        },
      ],
    };
  }
}
