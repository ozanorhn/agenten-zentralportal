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
  GoogleAdsAuditOutput,
  AdsHealthCheckerOutput,
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
      case 'google-ads-audit':
        return this.generateGoogleAdsAuditOutput();
      case 'ads-health-checker':
        return this.generateAdsHealthCheckerOutput();
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

  private generateGoogleAdsAuditOutput(): GoogleAdsAuditOutput {
    return {
      type: 'google-ads-audit',
      title: 'eom.de: Google Ads Audit',
      domain: 'eom.de',
      companyName: 'Effektiv Online-Marketing GmbH',
      companyContext: 'Hannover · Google Premium Partner',
      createdAt: '28. April 2026',
      auditedBy: 'EOM Audit System',
      overallScore: 67,
      criticalCount: 3,
      warningCount: 4,
      potentialLift: '+31%',
      progressLabel: '67 / 100 · Optimierungsbedarf',
      sections: [
        {
          title: 'Kontostruktur',
          icon: 'dashboard_customize',
          score: 62,
          findings: [
            {
              title: 'Brand-Kampagne fehlt vollständig',
              description: 'Kein Schutz für Suchanfragen wie „EOM Agentur Hannover" oder „EOM Online Marketing". Wettbewerber können auf den Markennamen bieten.',
              status: 'Kritisch',
              tone: 'critical',
            },
            {
              title: 'Zu breite Anzeigengruppen-Struktur',
              description: 'Leistungskampagnen bündeln verschiedene Dienstleistungen (SEO, SEA, Employer Branding) in gemeinsamen Anzeigengruppen. Relevance leidet.',
              status: 'Warnung',
              tone: 'warning',
            },
            {
              title: 'Geo-Targeting Hannover korrekt gesetzt',
              description: 'Lokale Ausrichtung auf Hannover und Niedersachsen sauber konfiguriert. Kein Streuverlust in nicht-relevante Regionen.',
              status: 'Gut',
              tone: 'good',
            },
          ],
        },
        {
          title: 'Tracking & Conversions',
          icon: 'conversion_path',
          score: 54,
          findings: [
            {
              title: 'HubSpot-Formular-Conversions nicht in Ads importiert',
              description: 'Kontaktanfragen über HubSpot Meetings und Formulare werden nicht als Conversions in Google Ads gezählt. Kampagnen optimieren blind.',
              status: 'Kritisch',
              tone: 'critical',
            },
            {
              title: 'Telefon-Klick-Tracking fehlt',
              description: 'Die Nummer 0511 / 390 60 100 ist als reiner Text auf der Website eingebunden. Click-to-Call-Anrufe aus Ads werden nicht gemessen.',
              status: 'Kritisch',
              tone: 'critical',
            },
            {
              title: 'GA4 verknüpft, aber Conversion-Modellierung nicht aktiviert',
              description: 'GA4-Verknüpfung ist vorhanden, jedoch wird Conversion-Modellierung für cookieless-Nutzer (Brevo, reCAPTCHA-Blocker) nicht genutzt.',
              status: 'Warnung',
              tone: 'warning',
            },
          ],
        },
        {
          title: 'Anzeigen & Keywords',
          icon: 'timeline',
          score: 71,
          findings: [
            {
              title: 'Konkurrenz bietet auf „EOM" als Keyword',
              description: 'Wettbewerber-Domains belegen bezahlte Ergebnisse bei Suche nach Markentermen. Ohne Brand-Kampagne ist kein Gegenangebot möglich.',
              status: 'Warnung',
              tone: 'warning',
            },
            {
              title: 'RSA-Anzeigen ohne Pinning bei USPs',
              description: '„Google Premium Partner seit 2009" und „Seit 2009" erscheinen nicht garantiert in Anzeigen. Google rotiert Assets nach eigenem Ermessen.',
              status: 'Warnung',
              tone: 'warning',
            },
            {
              title: 'Sitelink-Extensions vorhanden und relevant',
              description: 'Sitelinks zu Academy, Kontakt und Leistungsseiten sind konfiguriert und erhöhen die Anzeigenfläche sinnvoll.',
              status: 'Gut',
              tone: 'good',
            },
          ],
        },
      ],
      actionPlan: [
        {
          id: '01',
          title: 'Brand-Kampagne aufsetzen (EOM, eom.de, Effektiv Online Marketing)',
          effort: 'Niedrig',
          leverage: 'Sehr hoch',
        },
        {
          id: '02',
          title: 'HubSpot-Formular-Conversions in Google Ads importieren',
          effort: 'Niedrig',
          leverage: 'Sehr hoch',
        },
        {
          id: '03',
          title: 'Telefon Click-to-Call Tracking aktivieren',
          effort: 'Niedrig',
          leverage: 'Hoch',
        },
        {
          id: '04',
          title: 'Consent Mode v2 implementieren & GA4-Modellierung aktivieren',
          effort: 'Mittel',
          leverage: 'Hoch',
        },
        {
          id: '05',
          title: 'Kampagnen nach Leistungsbereichen aufsplitten',
          effort: 'Mittel',
          leverage: 'Mittel',
        },
        {
          id: '06',
          title: 'RSA-Headlines mit Trust-Signalen pinnen',
          effort: 'Niedrig',
          leverage: 'Mittel',
        },
        {
          id: '07',
          title: 'Geo-Targeting auf überregionale Märkte prüfen & ggf. erweitern',
          effort: 'Niedrig',
          leverage: 'Niedrig',
        },
      ],
      footerTitle: 'Audit abgeschlossen. Nächsten Schritt gehen.',
      footerSummary: '3 kritische Befunde, 4 Warnungen. Geschätztes Potenzial bei konsequenter Umsetzung: +31 % niedrigerer CPA.',
      footerContact: 'Roxeanne Rieck, Head of Operations, bespricht den Report gern persönlich.',
      footerCtaLabel: 'Jetzt umsetzen',
    };
  }

  private generateAdsHealthCheckerOutput(): AdsHealthCheckerOutput {
    return {
      type: 'ads-health-checker',
      brand: 'eom',
      title: 'Campaign Health Check: Stellenanzeigen',
      subtitle: 'Effektiv Online-Marketing GmbH · Hannover · eom.de/jobs',
      periodLabel: 'Letzte 7 Tage',
      comparisonLabel: 'Vorperiode',
      syncLabel: 'Live-Sync',
      summarySignals: [
        { label: 'CPL +52%: SEA/Ads Manager', tone: 'critical' },
        { label: 'CTR −41%: AI Engineer (Google)', tone: 'critical' },
        { label: 'Frequenz 8,1: Meta Awareness', tone: 'warning' },
        { label: 'Bewerbungen −28% diese Woche', tone: 'critical' },
        { label: 'SEO Manager: stabil', tone: 'good' },
        { label: 'Projektmanager: OK', tone: 'good' },
      ],
      channels: [
        {
          channelKey: 'google',
          channelLabel: 'Google Ads',
          channelBadge: 'G',
          icon: 'ads_click',
          activeCampaignsLabel: '4 Stellenanzeigen-Kampagnen aktiv',
          metrics: [
            { label: 'Spend', value: '€2.840', delta: '▲ +38% vs. VW', tone: 'warning' },
            { label: 'CTR', value: '2,1%', delta: '▼ −41% vs. VW', tone: 'critical' },
            { label: 'CPL (Bew.)', value: '€64', delta: '▲ Ziel €42', tone: 'critical' },
            { label: 'Bewerbungen', value: '44', delta: '▼ −28% vs. VW', tone: 'critical' },
          ],
          spendSeries: [
            { day: 'Mo', value: 52 },
            { day: 'Di', value: 61 },
            { day: 'Mi', value: 68 },
            { day: 'Do', value: 78 },
            { day: 'Fr', value: 73 },
            { day: 'Sa', value: 46 },
            { day: 'So⚠', value: 39, highlighted: true },
          ],
          campaigns: [
            { role: 'Projektmanager', spend: '€520', ctr: '3,8%', cpl: '€38' },
            { role: 'SEO Manager', spend: '€490', ctr: '3,2%', cpl: '€41' },
            { role: 'SEA/Ads Manager', spend: '€1.140', ctr: '1,1%', cpl: '€88', spendTrend: 'up', ctrTrend: 'down' },
            { role: 'AI Engineer', spend: '€690', ctr: '0,8%', cpl: '€61', ctrTrend: 'down' },
          ],
          alerts: [
            {
              icon: 'trending_up',
              title: 'CPL-Explosion: SEA/Ads Manager',
              summary: '€88 CPL vs. Ziel €42 · Spend +109% bei −71% Klicks',
              tone: 'critical',
              cause: 'Der starke Anstieg des CPL bei gleichzeitig eingebrochenem CTR deutet auf ein klassisches Keyword-Mismatch hin: Die Kampagne bietet vermutlich auf zu breite Suchbegriffe wie „Marketing Jobs Hannover" oder „Agentur Stelle", die viele Impressionen erzeugen, aber keine qualifizierten Bewerber anziehen. Da EOM speziell nach jemandem mit tiefem SEA-Know-how sucht, ist die Zielgruppe sehr eng. Breite Keywords vernichten hier das Budget ohne Gegenwert.',
              actions: [
                'Keywords auf exakte Treffer reduzieren: „SEA Manager Hannover", „Google Ads Spezialist Stelle". Broad Match pausieren, bis CTR wieder über 2,5% liegt.',
                'Anzeigentitel konkretisieren: EOM als Absender stärker platzieren. „SEA/Ads Manager bei EOM (Hannover) · 4-Tage-Woche möglich" hebt sich von generischen Jobanzeigen ab.',
                'Tagesbudget der SEA/Ads-Kampagne um 40% kürzen und freigewordenes Budget in die performante Projektmanager-Kampagne (CPL €38) umschichten, solange der CTR so niedrig ist.',
              ],
              footer: 'Analyse basierend auf EOM-Kampagnendaten · eom.de/jobs',
            },
            {
              icon: 'trending_down',
              title: 'CTR-Einbruch: AI Automation Engineer',
              summary: '0,8% CTR · 86 Klicks auf €690 Spend · CPL €61',
              tone: 'warning',
              cause: '„AI Automation Engineer" ist ein sehr junges Berufsbild. Google Ads hat für diesen Begriff noch wenig Suchvolumen in der DACH-Region, was dazu führt, dass die Kampagne auf verwandte, aber unpassende Begriffe ausgesteuert wird (z.B. „Automatisierung Techniker"). Gleichzeitig ist der Begriff für aktive Jobsuchende zu technisch: Kandidaten suchen eher nach „n8n Entwickler Jobs" oder „No-Code Automation Stelle".',
              actions: [
                'Keywords auf Tool-spezifische Begriffe ausrichten: „n8n Jobs", „Make Automatisierung Stelle", „AI Tools Spezialist". So erreicht man genau die Kandidaten, die EOM sucht.',
                'Google Jobs (organisch) als Ergänzung aktivieren: Stellenanzeige auf eom.de mit korrektem JobPosting-Schema auszeichnen. AI-Stellen performen organisch oft besser als paid für Nischen-Profile.',
                'Anzeigentext mit konkreten Tools bereichern: „n8n, Make, Zapier täglich" im Titel signalisiert sofort Relevanz. Das erhöht die Klickwahrscheinlichkeit bei der richtigen Zielgruppe messbar.',
              ],
              footer: 'Analyse basierend auf EOM-Kampagnendaten · eom.de/jobs',
            },
          ],
        },
        {
          channelKey: 'meta',
          channelLabel: 'Meta Ads',
          channelBadge: 'f',
          icon: 'campaign',
          activeCampaignsLabel: '3 Stellenanzeigen-Kampagnen aktiv',
          metrics: [
            { label: 'Spend', value: '€1.620', delta: '▲ +6% stabil', tone: 'neutral' },
            { label: 'CTR', value: '1,4%', delta: '▼ −18% vs. VW', tone: 'warning' },
            { label: 'CPL (Bew.)', value: '€71', delta: '▲ Ziel €50', tone: 'critical' },
            { label: 'Frequenz', value: '8,1', delta: '▲ Max. 5,0', tone: 'critical' },
          ],
          spendSeries: [
            { day: 'Mo', value: 41 },
            { day: 'Di', value: 45 },
            { day: 'Mi', value: 48 },
            { day: 'Do', value: 53 },
            { day: 'Fr', value: 51 },
            { day: 'Sa', value: 43 },
            { day: 'So⚠', value: 38, highlighted: true },
          ],
          campaigns: [
            { role: 'Sales Manager', spend: '€580', ctr: '2,1%', cpl: '€52' },
            { role: 'Employer Branding (Awareness für alle Jobs)', spend: '€720', ctr: '0,9%', cpl: '€96', ctrTrend: 'down' },
            { role: 'Junior Trainee', spend: '€320', ctr: '1,8%', cpl: '€48' },
          ],
          alerts: [
            {
              icon: 'priority_high',
              title: 'Audience-Fatigue — Employer Branding',
              summary: 'Frequenz 8,1 · CTR von 2,4% auf 0,9% · Zielgruppe erschöpft',
              tone: 'critical',
              cause: 'Die Employer-Branding-Kampagne spielt dieselbe Zielgruppe (Online-Marketing-Fachkräfte im Raum Hannover, 25–40 J.) seit Wochen mit identischen Creatives aus. Bei 8,1 Frequenz hat jede Person die Anzeige im Schnitt über achtmal gesehen — der Effekt kehrt sich um: Die Marke EOM wird nicht mehr positiv wahrgenommen, sondern als aufdringlich empfunden. Das erklärt den drastischen CTR-Rückgang trotz stabilem Spend.',
              actions: [
                'Frequency Cap auf 3 pro Woche begrenzen und Zielgruppe auf Lookalike-Audience (basierend auf bisherigen Bewerbern) ausweiten — damit neue Gesichter erreicht werden.',
                'Creative Rotation: Mindestens 3 neue Anzeigenmotive aufsetzen — EOM-Teamfotos, O-Töne von Mitarbeitenden, oder den „100% würden sich wieder bewerben"-Fact als Bild/Video-Ad.',
                'Kampagnen-Pause von 5–7 Tagen für die erschöpfte Zielgruppe erwägen, dann mit frischem Creative und erweiterter Audience neu starten — spart Budget und regeneriert die Wahrnehmung.',
              ],
              footer: 'Analyse basierend auf EOM-Kampagnendaten · eom.de/jobs',
            },
            {
              icon: 'error',
              title: 'CPL über Ziel — Junior Trainee',
              summary: '€48 CPL vs. Ziel €40 · +20% Abweichung · Bewerbungen rückläufig',
              tone: 'warning',
              cause: 'Trainee-Stellen konkurrieren auf Meta stark mit anderen Agenturen und Großunternehmen, die auf dieselbe junge Zielgruppe (18–26 J., Marketing-Interesse) bieten. Da EOM als inhabergeführte Agentur mit ~15 Mitarbeitenden geringere Markenbekanntheit als z.B. GroupM oder Accenture hat, müssen die Anzeigen stärker auf emotionale Differenzierung setzen, statt nur die Stelle zu beschreiben — sonst gewinnt immer das bekanntere Unternehmen den Klick.',
              actions: [
                'USPs von EOM vorne platzieren: „Kein Lebenslauf nötig", „4-Tage-Woche im Test", „100% würden sich wieder bewerben" — das sind echte Differenzierungsmerkmale gegenüber Großagenturen.',
                'Video-Ad mit kurzen Testimonials von aktuellen Trainees oder Teamkollegen: Authentizität schlägt auf Meta Hochglanz-Produktion — besonders bei der Zielgruppe unter 25.',
                'Landing-Page für Trainee-Bewerber optimieren: Der kurze Bewerbungsprozess bei EOM (kein Anschreiben, nur Fragebogen) ist ein echter Vorteil — dieser sollte auf der Zielseite prominenter kommuniziert werden, um Abbrüche zu reduzieren.',
              ],
              footer: 'Analyse basierend auf EOM-Kampagnendaten · eom.de/jobs',
            },
            {
              icon: 'check_circle',
              title: 'Sales Manager — performt im Zielbereich',
              summary: '€52 CPL · CTR 2,1% · 11 Bewerbungen diese Woche',
              tone: 'good',
              cause: 'Die Kampagne liegt im Zielbereich und zeigt aktuell keine strukturellen Warnsignale. Creative, Zielgruppe und Angebot greifen stabil ineinander.',
              actions: [
                'Budget nur behutsam erhöhen und auf saubere CPL-Stabilität achten.',
                'Winning Creative sichern und bei ähnlichen Rollen adaptieren.',
                'Bewerberqualität weiter mit Hiring-Team spiegeln, bevor skaliert wird.',
              ],
              footer: 'Analyse basierend auf EOM-Kampagnendaten · eom.de/jobs',
            },
          ],
        },
      ],
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
