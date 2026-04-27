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
  CsvProductTextOutput,
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
      case 'csv-produkttext-agent':
        return this.generateCsvProductTextPlaceholder(input.csvFileName || 'produkte.csv');
      default:
        return this.generateColdEmail(audience, url, tone);
    }
  }

  private generateColdEmail(audience: string, url: string, tone: string): EmailOutput {
    const companyLabel = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || 'Ihrem Team';

    return {
      type: 'email',
      subject: `Kurze Idee fuer effizientere Ablaeufe bei ${companyLabel}`,
      greeting: 'Hallo [Vorname],',
      body: [
        `ich habe mir ${url} angesehen. Gerade bei ${audience} sehen wir oft, dass wiederkehrende Aufgaben in Recherche, Follow-up und Datenpflege viel operative Zeit binden.`,
        `Wir setzen deshalb nicht bei noch mehr Tools an, sondern bei klar umrissenen Workflows: Vorqualifizierung, persoenliche Erstansprache und saubere Uebergabe ins CRM.`,
        `In vergleichbaren Setups sorgt das vor allem fuer mehr Verlaesslichkeit im Tagesgeschaeft und spuerenbar weniger manuellen Aufwand.`,
        `Falls das fuer Sie relevant ist, skizziere ich gern 2 bis 3 konkrete Einsatzfaelle fuer ${companyLabel}.`,
      ],
      cta: tone === 'Direkt & Provokant'
        ? 'Wenn das grundsaetzlich spannend klingt, schlage ich gern einen kurzen Termin fuer einen praxisnahen Austausch vor.'
        : 'Wenn das fuer Sie interessant ist, schlage ich gern einen kurzen Termin fuer einen praxisnahen Austausch vor.',
    };
  }

  private generateNetworkingEmail(audience: string, url: string, _tone: string): EmailOutput {
    return {
      type: 'email',
      subject: `Austausch zu operativen KI-Workflows im Bereich ${audience}`,
      greeting: 'Hallo [Vorname],',
      body: [
        `ich bin im Kontext von ${audience} auf Ihr Profil gestossen und fand den fachlichen Fokus sehr passend.`,
        `Bei Arcnode arbeiten wir daran, wiederkehrende Marketing- und Sales-Prozesse sauber in KI-gestuetzte Workflows zu ueberfuehren, ohne Teams mit zusaetzlicher Komplexitaet zu belasten.`,
        `Die Perspektive aus ${url.replace('https://', '').replace('http://', '').replace(/\/$/, '')} waere fuer mich spannend. Ich wuerde mich freuen, wenn wir uns vernetzen und Erfahrungen austauschen.`,
      ],
      cta: 'Wenn es fuer Sie passt, vernetzen wir uns gern und sprechen bei Gelegenheit ueber praktische Einsatzfaelle.',
    };
  }

  private generateLinkedInPost(audience: string, _url: string, tone: string): LinkedInPostOutput {
    const isProvocative = tone === 'Direkt & Provokant';
    return {
      type: 'linkedin-post',
      headline: isProvocative
        ? `Viele Teams sprechen ueber KI. Die wenigsten haben schon einen belastbaren Prozess.`
        : `Wo KI im Alltag von ${audience} zuerst echten Nutzen stiftet`,
      body: [
        isProvocative
          ? 'Viele Unternehmen verwechseln Tool-Kauf noch immer mit operativer Verbesserung. Der Effekt bleibt dann aus, weil kein klarer Workflow dahintersteht.'
          : `Die spannendsten KI-Projekte starten selten mit einem grossen Umbau. Sie starten dort, wo Prozesse heute wiederkehrend, manuell und messbar sind.`,
        `Bei ${audience} sind das oft drei Bereiche: Recherche, Aufbereitung und Follow-up. Genau dort laesst sich Qualitaet sichern und Zeit freispielen, ohne den Betrieb neu zu erfinden.`,
        `In laufenden Setups sehen wir vor allem diese Effekte:\n- kuerzere Durchlaufzeiten\n- weniger Medienbrueche\n- sauberere Uebergaben zwischen Marketing, Sales und Operations`,
        isProvocative
          ? 'Die eigentliche Frage ist deshalb nicht, ob KI relevant ist. Die Frage ist, welcher Prozess als Erstes sauber operationalisiert wird.'
          : 'Wer klein und sauber startet, baut schneller vertrauenswuerdige Systeme auf als Teams mit zu grossem Anspruch im ersten Schritt.',
      ],
      cta: 'Welcher wiederkehrende Prozess kostet Ihr Team aktuell am meisten Zeit?',
      hashtags: ['#KI', '#B2B', '#MarketingOperations', '#SalesOperations', '#Automatisierung'],
      estimatedEngagement: '3.1%',
      estimatedReach: '8.600',
    };
  }

  private generateVideoScript(audience: string, _url: string, _tone: string): VideoScriptOutput {
    return {
      type: 'video-script',
      title: `Drei Workflows, die ${audience} zuerst automatisieren sollten`,
      hook: `Wenn Teams ueber KI sprechen, denken viele zuerst an grosse Visionen. Im Alltag entsteht der Nutzen aber meist dort, wo Recherche, Aufbereitung und Follow-up heute noch manuell laufen.`,
      sections: [
        {
          heading: 'Ausgangslage',
          narration: `Viele Teams im Bereich ${audience} arbeiten mit guten Leuten, aber fragmentierten Ablaeufen. Informationen liegen verteilt, Follow-ups haengen an Einzelpersonen und Inhalte muessen mehrfach aufbereitet werden.`,
          visualNote: 'Ruhige Bildschirmaufnahmen mit CRM, Dokumenten und mehreren offenen Arbeitsschritten',
        },
        {
          heading: 'Ansatz',
          narration: 'Ein vernuenftiger Startpunkt ist nicht die Vollautomatisierung, sondern ein klar umrissener Workflow mit messbarem Nutzen. Zum Beispiel Erstansprache, Lead-Vorqualifizierung oder interne Content-Aufbereitung.',
          visualNote: 'UI-Ansichten mit Briefing, strukturierter Ausgabe und klaren Statusanzeigen',
        },
        {
          heading: 'Ergebnis',
          narration: 'Wenn Input, Qualitaetssicherung und Uebergabe sauber definiert sind, entstehen verlässlichere Prozesse. Teams gewinnen Zeit, reduzieren Reibung und koennen Entscheidungen auf besser aufbereitete Daten stuetzen.',
          visualNote: 'Zurueckhaltende Kennzahlen, saubere Vergleichsansichten und Ergebnisbausteine statt Effekthascherei',
        },
      ],
      cta: 'Wenn Sie dazu ein konkretes Beispiel aus Marketing, Sales oder SEO sehen moechten, kann daraus direkt ein Demo-Format fuer ein Gespraech entstehen.',
      hashtags: ['#KI', '#B2BMarketing', '#SalesOps', '#Automatisierung'],
      estimatedDuration: '1:20 Min.',
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
        { companyName: 'Nordlicht Digital GmbH', street: 'Lister Meile 21', city: `30161 ${city}`, fullAddress: `Lister Meile 21, 30161 ${city}`, phoneNumber: '0511 4287610', website: 'https://www.nordlicht-digital.de' },
        { companyName: 'Atlas Gewerbeservice', street: 'Vahrenwalder Strasse 87', city: `30165 ${city}`, fullAddress: `Vahrenwalder Strasse 87, 30165 ${city}`, phoneNumber: '0511 4287611', website: 'https://www.atlas-gewerbeservice.de' },
        { companyName: 'Hanse Datenwerk GmbH', street: 'Hildesheimer Strasse 54', city: `30169 ${city}`, fullAddress: `Hildesheimer Strasse 54, 30169 ${city}`, phoneNumber: '0511 4287612', website: 'https://www.hanse-datenwerk.de' },
        { companyName: 'Mittelstand Servicepartner', street: 'Bruehlstrasse 8', city: `30169 ${city}`, fullAddress: `Bruehlstrasse 8, 30169 ${city}`, phoneNumber: '0511 4287613', website: null },
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

  private generateCsvProductTextPlaceholder(inputFileName: string): CsvProductTextOutput {
    return {
      type: 'csv-product-text',
      inputFileName,
      rowCount: 0,
      columns: [],
      rows: [],
      downloadFileName: 'produkttexte-seo-export.csv',
      generatedAt: new Date().toISOString(),
    };
  }

  private generateSocialMediaPlaceholder(topic: string, brandVoice: string, targetAudience: string): SocialMediaOutput {
    const voiceLabel = brandVoice || 'ruhig, klar und fachlich';

    return {
      type: 'social-media',
      topic,
      brandVoice,
      targetAudience,
      twitter: `${topic}: Der groesste Hebel liegt oft nicht in neuen Tools, sondern in sauber definierten Workflows.\n\nGerade fuer ${targetAudience} lohnt es sich, zuerst wiederkehrende Aufgaben zu identifizieren.\n\n#KI #B2B #Operations`,
      linkedin: `Viele Teams sprechen ueber ${topic} vor allem auf strategischer Ebene.\n\nOperativ entsteht der Nutzen aber meistens dort, wo wiederkehrende Aufgaben heute noch manuell laufen.\n\nUnser Blick darauf: klein starten, Qualitaet sichern, erst dann skalieren.\n\nTonality: ${voiceLabel}.\n\nWelche Aufgabe wuerdet ihr zuerst systematisieren?\n\n#KI #MarketingOperations #SalesOps`,
      redditTitle: `${topic}: Wo wir im Alltag tatsaechlich Nutzen sehen`,
      redditBody: `Wir haben das Thema "${topic}" in mehreren B2B-Setups beobachtet. Das Muster ist oft aehnlich: Nicht die grossen Visionen bringen zuerst Ergebnisse, sondern sauber abgegrenzte Workflows mit klaren Eingaben und messbarer Ausgabe.\n\nMich wuerde interessieren, bei welchen Prozessen ihr aktuell den groessten Hebel seht.`,
      instagramCaption: `${topic}\n\nPremium entsteht nicht durch mehr Lautstaerke, sondern durch Klarheit im Prozess.\n\nGerade fuer ${targetAudience} ist das oft der Unterschied zwischen nettem Experiment und belastbarem System.\n\n#KI #B2B #Systeme #Operations`,
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
      brief: `## Executive Summary\n**Ziel:** Ein belastbares Content-Piece fuer ${targetAudience} rund um ${primaryTopic} mit klarer Suchintention, fachlicher Tiefe und direkter Anschlussfaehigkeit fuer Vertrieb oder Beratung.\n\n**Empfohlener Fokus:** Problemverstaendnis, operative Umsetzung und messbare Auswirkungen im Tagesgeschaeft.`,
      structuredAnalysis: `# Structured Analysis\n\n## Primary Opportunities\n- ${primaryTopic}\n- Operative Einfuehrung in Teams\n- Wirtschaftlicher Nutzen und Priorisierung\n\n## Editorial Angle\n- Weg von abstrakter KI-Rhetorik hin zu klaren, nachvollziehbaren Einsatzfaellen\n- Glaubwuerdigkeit ueber Beispiele, Prozesse und Entscheidungshilfen\n- Content so anlegen, dass Marketing, Sales und Geschaeftsfuehrung ihn intern weiterverwenden koennen`,
      primaryKeywords: [primaryTopic, 'ki prozesse im marketing', 'ki workflow automatisierung'],
      longTailKeywords: [
        { keyword: 'ki prozesse im marketing einfuehren', intent: 'informational' },
        { keyword: 'ki workflows fuer b2b teams', intent: 'commercial' },
        { keyword: 'ki systeme fuer marketing und sales', intent: 'transactional' },
      ],
      questionBasedKeywords: [
        'Welche Prozesse sollten Teams zuerst mit KI unterstuetzen?',
        'Wie fuehrt man KI-Systeme in Marketing und Sales sinnvoll ein?',
      ],
      relatedTopics: ['Revenue Operations', 'Marketing Automation', 'Content Operations'],
      competitorUrls: [],
      keywords: [
        {
          keyword: primaryTopic,
          searchVolume: 390,
          keywordDifficulty: 21,
          competition: 'MEDIUM',
          competitionIndex: 29,
          cpc: 7.2,
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
