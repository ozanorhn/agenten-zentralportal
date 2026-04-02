export interface AgentMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Sales' | 'Content' | 'SEO' | 'Data';
  badgeLabel?: string;
  badgeVariant?: 'primary' | 'secondary';
  skills: { label: string; value: number }[];
  tip: string;
  inputLabel: string;
  inputPlaceholder: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: 'networking-ninja',
    name: 'Networking-Ninja',
    description: 'Analysiert LinkedIn-Profile deiner Zielgruppe und generiert hyper-personalisierte Vernetzungsnachrichten — automatisiert und in Sekunden.',
    icon: 'contact_mail',
    category: 'Sales',
    badgeLabel: 'EVENT SPECIAL',
    badgeVariant: 'secondary',
    skills: [
      { label: 'Personalisierung', value: 97 },
      { label: 'Gesprächsöffnung', value: 91 },
      { label: 'Tonanalyse', value: 88 },
      { label: 'Conversion Rate', value: 85 },
    ],
    tip: 'Tipp: Je spezifischer deine Zielgruppe, desto höher die Vernetzungsrate. Probiere Nischen-Titel wie "Head of Growth in SaaS-Startups mit 10–50 MA".',
    inputLabel: 'Zielgruppe',
    inputPlaceholder: 'z.B. Head of Growth in deutschen SaaS-Startups',
  },
  {
    id: 'cold-mail-cyborg',
    name: 'Cold-Mail-Cyborg',
    description: 'Generiert hochkonvertierende Kaltakquise-E-Mails basierend auf der Website deiner Zielkunden. Personalisiert, präzise, profitabel.',
    icon: 'alternate_email',
    category: 'Sales',
    skills: [
      { label: 'Copywriting', value: 95 },
      { label: 'Personalisierung', value: 88 },
      { label: 'Tonanalyse', value: 82 },
      { label: 'Conversion Rate', value: 91 },
    ],
    tip: 'Füge spezifische Pain Points hinzu, um die Resonanz bei deiner Zielgruppe um bis zu 40% zu steigern.',
    inputLabel: 'Zielgruppe',
    inputPlaceholder: 'z.B. CTOs in deutschen SaaS-Unternehmen',
  },
  {
    id: 'linkedin-ghostwriter',
    name: 'LinkedIn-Ghostwriter',
    description: 'Erstellt reichweitenstarke LinkedIn-Posts in deinem persönlichen Stil. Von Thought-Leadership bis Story-Telling — alles automatisch.',
    icon: 'history_edu',
    category: 'Content',
    skills: [
      { label: 'Storytelling', value: 96 },
      { label: 'Engagement-Hook', value: 92 },
      { label: 'Hashtag-Strategie', value: 79 },
      { label: 'Tone of Voice', value: 94 },
    ],
    tip: 'Posts mit einer persönlichen Geschichte in den ersten 2 Zeilen erzielen 3x mehr Impressionen. Starte mit einem Erlebnis!',
    inputLabel: 'Thema / Kontext',
    inputPlaceholder: 'z.B. Wie KI unsere Conversion-Rate verdoppelt hat',
  },
  {
    id: 'lead-researcher',
    name: 'Lead-Researcher',
    description: 'Durchsucht das Web und LinkedIn-Daten nach qualifizierten Leads — inklusive Scoring, Kontaktdaten und Kaufbereitschafts-Analyse.',
    icon: 'biotech',
    category: 'Data',
    skills: [
      { label: 'Datenqualität', value: 94 },
      { label: 'Lead-Scoring', value: 89 },
      { label: 'Recherche-Tiefe', value: 97 },
      { label: 'Datenschutz', value: 100 },
    ],
    tip: 'Je präziser der Firmenname und die URL, desto genauer das Lead-Scoring. Probiere auch Tochterunternehmen oder Marken.',
    inputLabel: 'Firmenname',
    inputPlaceholder: 'z.B. EOM',
  },
  {
    id: 'top-ranker-bot',
    name: 'Top-Ranker Bot',
    description: 'Analysiert deine Konkurrenz und findet Low-Hanging-Fruit-Keywords mit dem höchsten Traffic-Potenzial für deine Website.',
    icon: 'manage_search',
    category: 'SEO',
    skills: [
      { label: 'Keyword-Research', value: 98 },
      { label: 'SERP-Analyse', value: 93 },
      { label: 'Content-Gaps', value: 87 },
      { label: 'Backlink-Audit', value: 81 },
    ],
    tip: 'Keywords mit Difficulty unter 40 und Volume über 1.000 sind deine schnellsten Wins. Der Bot filtert diese automatisch.',
    inputLabel: 'Website / Nische',
    inputPlaceholder: 'z.B. SaaS-Tool für Projektmanagement',
  },
  {
    id: 'sync-master',
    name: 'Sync-Master 3000',
    description: 'Synchronisiert und bereinigt deine Daten zwischen CRM, Spreadsheets und Marketing-Tools — in Echtzeit, ohne Datenverlust.',
    icon: 'schema',
    category: 'Data',
    skills: [
      { label: 'Daten-Mapping', value: 99 },
      { label: 'Fehlerbehandlung', value: 95 },
      { label: 'Sync-Geschwindigkeit', value: 91 },
      { label: 'Deduplizierung', value: 98 },
    ],
    tip: 'Richte zunächst einen Test-Sync mit 100 Records durch. So erkennst du Mapping-Fehler bevor sie sich multiplizieren.',
    inputLabel: 'Primäre Datenquelle',
    inputPlaceholder: 'z.B. HubSpot CRM',
  },
  {
    id: 'script-savant',
    name: 'Script-Savant',
    description: 'Schreibt professionelle Video-Skripte für YouTube, LinkedIn oder Präsentationen — optimiert für maximale Zuschauer-Retention.',
    icon: 'video_chat',
    category: 'Content',
    skills: [
      { label: 'Hook-Stärke', value: 97 },
      { label: 'Skript-Struktur', value: 93 },
      { label: 'CTA-Conversion', value: 88 },
      { label: 'Retention-Optimierung', value: 91 },
    ],
    tip: 'Die ersten 3 Sekunden entscheiden über alles. Starte immer mit einem konkreten Versprechen oder einer provokanten Frage.',
    inputLabel: 'Video-Thema',
    inputPlaceholder: 'z.B. Wie ich 10h/Woche mit KI gespart habe',
  },
];

export const AGENTS_MAP: Record<string, AgentMeta> = Object.fromEntries(
  AGENTS.map(a => [a.id, a])
);
