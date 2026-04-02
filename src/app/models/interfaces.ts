// ─── Run History ──────────────────────────────────────────────────────────────

export interface RunInputData {
  targetAudience?: string;
  companyName?: string;
  websiteUrl?: string;
  toneOfVoice?: string;
  topic?: string;
  keyword?: string;
  industry?: string;
  city?: string;
}

export interface RunRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  agentCategory: 'Sales' | 'Content' | 'SEO' | 'Data';
  timestamp: number;
  inputData: RunInputData;
  outputSummary: string;
  fullOutput: AgentOutput;
  tokenCount: number;
}

// ─── Agent Output ─────────────────────────────────────────────────────────────

export type AgentOutput =
  | EmailOutput
  | LinkedInPostOutput
  | VideoScriptOutput
  | LeadTableOutput
  | KeywordTableOutput
  | SyncReportOutput
  | MarkdownOutput
  | CompanyListOutput;

export interface EmailOutput {
  type: 'email';
  subject: string;
  greeting: string;
  body: string[];
  cta: string;
}

export interface LinkedInPostOutput {
  type: 'linkedin-post';
  headline: string;
  body: string[];
  cta: string;
  hashtags: string[];
  estimatedEngagement: string;
  estimatedReach: string;
}

export interface VideoScriptOutput {
  type: 'video-script';
  title: string;
  hook: string;
  sections: ScriptSection[];
  cta: string;
  hashtags: string[];
  estimatedDuration: string;
}

export interface ScriptSection {
  heading: string;
  narration: string;
  visualNote: string;
}

export interface LeadTableOutput {
  type: 'lead-table';
  leads: LeadRow[];
  totalFound: number;
  highScoreCount: number;
}

export interface LeadRow {
  name: string;
  company: string;
  role?: string;
  score: number;
  status: 'Hot' | 'Warm' | 'Cold';
  linkedinUrl: string;
  sourceUrl?: string;
}

export interface KeywordTableOutput {
  type: 'keyword-table';
  keywords: KeywordRow[];
  topOpportunity: string;
}

export interface KeywordRow {
  keyword: string;
  volume: number;
  difficulty: number;
  currentPosition: number | null;
  opportunity: 'Hoch' | 'Mittel' | 'Niedrig';
}

export interface SyncReportOutput {
  type: 'sync-report';
  totalRecords: number;
  synced: number;
  duplicatesRemoved: number;
  enriched: number;
  errors: number;
  syncItems: SyncItem[];
}

export interface SyncItem {
  source: string;
  target: string;
  status: 'success' | 'pending' | 'error';
  recordCount: number;
  lastSync: string;
}

export interface MarkdownOutput {
  type: 'markdown';
  content: string;
  companyName?: string;
  websiteUrl?: string;
}

export interface CompanyRow {
  companyName: string;
  street: string;
  city: string;
  fullAddress: string;
  phoneNumber: string;
  website: string | null;
}

export interface CompanyListOutput {
  type: 'company-list';
  companies: CompanyRow[];
  industry: string;
  city: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}
