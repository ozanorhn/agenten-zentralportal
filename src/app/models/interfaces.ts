// ─── Run History ──────────────────────────────────────────────────────────────

export interface RunInputData {
  targetAudience?: string;
  companyName?: string;
  websiteUrl?: string;
  toneOfVoice?: string;
  topic?: string;
  keyword?: string;
  primaryKeyword?: string;
  industry?: string;
  city?: string;
  domain?: string;
  maxPages?: string;
  brandVoice?: string;
  primaryTopic?: string;
  contentType?: string;
  wordCount?: number;
  outline?: string;
  productImageName?: string;
  productReference?: string;
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
  | GeoAuditOutput
  | MarkdownOutput
  | CompanyListOutput
  | SocialMediaOutput
  | ContentStrategyOutput
  | BlogEditorOutput
  | ProductTextOutput;

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

export interface GeoAuditOutput {
  type: 'geo-audit';
  summary: GeoAuditSummary;
  botStatus: GeoAuditBotStatus;
  totals: GeoAuditTotals;
  distribution: GeoAuditDistribution;
  topIssues: GeoAuditIssue[];
  topPages: GeoAuditPage[];
  worstPages: GeoAuditPage[];
  errors: GeoAuditError[];
}

export interface GeoAuditSummary {
  domain: string;
  totalFound: number;
  totalProcessed: number;
  averageScore: number;
  bestPage?: GeoAuditPageRef | null;
  worstPage?: GeoAuditPageRef | null;
}

export interface GeoAuditPageRef {
  path: string;
  score: number;
  title?: string;
}

export interface GeoAuditBotStatus {
  firewallBlocked: boolean;
  cloudflareDetected?: boolean;
  cloudflareBlocksAll?: boolean;
  aiBotStatus?: number | null;
}

export interface GeoAuditTotals {
  totalFound: number;
  totalProcessed: number;
  averageScore: number;
}

export interface GeoAuditDistribution {
  green: number;
  yellow: number;
  orange: number;
  red: number;
}

export interface GeoAuditIssue {
  issue: string;
  count: number;
  percent: number;
}

export interface GeoAuditPage {
  path: string;
  score: number;
  title?: string;
  failedCount: number;
  failed: string[];
}

export interface GeoAuditError {
  pageUrl?: string;
  errorMsg: string;
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

export interface SocialMediaOutput {
  type: 'social-media';
  topic: string;
  brandVoice: string;
  targetAudience: string;
  twitter: string;
  linkedin: string;
  redditTitle: string;
  redditBody: string;
  instagramCaption: string;
}

export interface MonthlySearch {
  year: number;
  month: number;
  searchVolume: number;
}

export interface KeywordDataRow {
  keyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  competition: string | null;
  competitionIndex: number | null;
  cpc: number | null;
  monthlySearches: MonthlySearch[];
}

export interface ContentStrategyIntentKeyword {
  keyword: string;
  intent: string;
}

export interface ContentStrategyOutput {
  type: 'content-strategy';
  primaryTopic: string;
  targetAudience: string;
  contentType: string;
  brief: string;
  structuredAnalysis: string;
  primaryKeywords: string[];
  longTailKeywords: ContentStrategyIntentKeyword[];
  questionBasedKeywords: string[];
  relatedTopics: string[];
  competitorUrls: string[];
  keywords: KeywordDataRow[];
}

export interface BlogEditorSerpResult {
  rank: number;
  url: string;
  title: string;
  description: string;
}

export interface BlogEditorKeyword {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: string | null;
}

export interface BlogEditorOutput {
  type: 'blog-editor';
  topic: string;
  primaryKeyword: string;
  audience: string;
  wordCount: number | null;
  outline: string;
  score: number | null;
  verdict?: string;
  articleTitle?: string;
  report: string;
  article: string;
  serpResults: BlogEditorSerpResult[];
  peopleAlsoAsk: string[];
  keywords: BlogEditorKeyword[];
}

export interface ProductTextFileReference {
  fileName: string;
  mimeType: string;
  size: number;
  base64?: string;
  persisted: boolean;
}

export interface ProductTextContentOutlineItem {
  h2: string;
  h3s: string[];
  keyFocus: string | null;
}

export interface ProductTextInternalLinkOpportunity {
  anchorText: string;
  targetTopic: string;
}

export interface ProductTextSeoData {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  focusKeyword: string | null;
  secondaryKeywords: string[];
  lsiKeywords: string[];
  longTailKeywords: string[];
  slug: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  readabilityLevel: string | null;
  keywordDensityTarget: string | null;
}

export interface ProductTextTagsData {
  productTags: string[];
  categoryPath: string[];
  breadcrumb: string[];
  cmsTags: string[];
}

export interface ProductTextContentData {
  intro: string | null;
  productDescription: string | null;
  contentOutline: ProductTextContentOutlineItem[];
  features: string[];
  benefits: string[];
  specifications: Record<string, unknown>;
  callToAction: string | null;
  socialProofHook: string | null;
  imageAltTexts: string[];
}

export interface ProductTextSchemaData {
  product: Record<string, unknown> | null;
  breadcrumb: Record<string, unknown> | null;
  faqPage: Record<string, unknown> | null;
}

export interface ProductTextDataflowSeoData {
  primaryIntent: string | null;
  keywordStrategy: string | null;
  contentScore: string | null;
  eeatSignals: string[];
  internalLinkOpportunities: ProductTextInternalLinkOpportunity[];
  competitorDifferentiators: string[];
  topicalClusters: string[];
}

export interface ProductTextStructuredResult {
  success: boolean | null;
  generatedAt: string | null;
  model: string | null;
  tokensUsed: number | null;
  seo: ProductTextSeoData | null;
  tags: ProductTextTagsData | null;
  content: ProductTextContentData | null;
  schema: ProductTextSchemaData | null;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  dataflowSeo: ProductTextDataflowSeoData | null;
}

export type ProductTextResponseMode = 'binary' | 'json' | 'text' | 'multipart' | 'empty';
export type ProductTextDescriptionSource = 'header' | 'payload' | 'text-body' | 'multipart-field' | 'none';
export type ProductTextFileSource = 'response-body' | 'payload-base64' | 'multipart-part' | 'none';

export interface ProductTextResponseMeta {
  mode: ProductTextResponseMode;
  mimeType: string | null;
  descriptionSource: ProductTextDescriptionSource;
  descriptionHeaderName: string | null;
  fileSource: ProductTextFileSource;
}

export interface ProductTextAmazonData {
  [key: string]: string;
  item_sku: string;
  item_name: string;
  item_description: string;
  bullet_point1: string;
  bullet_point2: string;
  bullet_point3: string;
  bullet_point4: string;
  bullet_point5: string;
  generic_keywords: string;
  product_type: string;
}

export interface ProductTextShopifyData {
  Handle: string;
  Title: string;
  'Body (HTML)': string;
  Vendor: string;
  Type: string;
  Tags: string;
  Published: string;
  'SEO Title': string;
  'SEO Description': string;
}

export interface ProductTextEbayItemSpecifics {
  Marke?: string;
  Material?: string;
  Farbe?: string;
  Groesse?: string;
  [key: string]: string | undefined;
}

export interface ProductTextEbayData {
  Title: string;
  Description: string;
  ConditionDescription: string;
  ItemSpecifics: ProductTextEbayItemSpecifics;
}

export interface ProductTextShopwareData {
  name: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  tags: string;
  customSearchKeywords: string;
}

export interface ProductTextWooCommerceData {
  post_title: string;
  post_content: string;
  post_excerpt: string;
  tags: string;
  categories: string;
  _yoast_wpseo_title: string;
  _yoast_wpseo_metadesc: string;
  _yoast_wpseo_focuskw: string;
}

export interface ProductTextPlatformResult {
  success: boolean;
  amazon?: ProductTextAmazonData;
  shopify?: ProductTextShopifyData;
  ebay?: ProductTextEbayData;
  shopware?: ProductTextShopwareData;
  woocommerce?: ProductTextWooCommerceData;
}

export interface ProductTextOutput {
  type: 'product-text';
  description: string;
  inputReference: string;
  uploadedImageName: string;
  generatedFile: ProductTextFileReference | null;
  structuredResult: ProductTextStructuredResult | null;
  responseMeta: ProductTextResponseMeta;
  platformResult?: ProductTextPlatformResult | ProductTextPlatformResult[] | null;
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
