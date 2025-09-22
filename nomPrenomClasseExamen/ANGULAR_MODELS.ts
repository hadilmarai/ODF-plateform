// 📋 TypeScript Models for Angular Funding Analysis Application
// Based on Spring Boot entities and API responses

// ==================== ENUMS ====================

export enum AnalysisType {
  UK_FUNDING_OPPORTUNITIES = 'UK_FUNDING_OPPORTUNITIES',
  EU_FUNDING_OPPORTUNITIES = 'EU_FUNDING_OPPORTUNITIES'
}

export enum PertinenceStatus {
  YES = 'Yes',
  NO = 'No',
  OUI = 'Oui',
  NON = 'Non'
}

// ==================== MAIN ENTITIES ====================

export interface FundingAnalysis {
  id: number;                           // Always 1 for UK, 2 for EU
  analysisType: AnalysisType;           // UK_FUNDING_OPPORTUNITIES or EU_FUNDING_OPPORTUNITIES
  lastUpdate: string | null;            // ISO date string or null
  createdAt: string;                    // ISO date string
  status: string | null;                // Analysis status
  llmAnalyzedCount: number | null;      // Count of LLM analyzed opportunities
  projectsCount: number | null;         // Total number of projects
  relevantCount: number | null;         // Number of relevant projects
  opportunities?: FundingOpportunity[]; // Optional: included when fetching with details
}

export interface FundingOpportunity {
  id: number;                           // Unique opportunity ID
  
  // Titles (French/English)
  titre: string | null;                 // French title
  title: string | null;                 // English title
  mainTitle: string | null;             // Main title field
  
  // Links (French/English)
  lien: string | null;                  // French link
  url: string | null;                   // English URL
  
  // Content
  description: string | null;           // Project description
  
  // Dates (French/English)
  dateOuverture: string | null;         // French opening date
  startDate: string | null;             // English start date
  dateCloture: string | null;           // French closing date
  deadline: string | null;              // English deadline
  
  // Relevance Analysis
  pertinence: string | null;            // "Yes", "No", "Oui", "Non"
  matchingWords: string | null;         // Keywords that matched
  pertinenceLlm: string | null;         // LLM relevance assessment
  resumeLlm: string | null;             // LLM summary
  reponseBrute: string | null;          // Raw LLM response
  
  // Metadata
  status: string | null;                // Project status
  dataSource: string | null;           // Source segment name (e.g., "Final UK LLM Results")
}

// ==================== STATISTICS ====================

export interface AnalysisStatistics {
  analysisId: number;                   // 1 for UK, 2 for EU
  analysisType: string;                 // "UK_FUNDING_OPPORTUNITIES" or "EU_FUNDING_OPPORTUNITIES"
  createdAt: string;                    // ISO date string
  lastUpdate: string | null;            // ISO date string or null
  status: string | null;                // Analysis status
  totalOpportunities: number;           // Total count of opportunities
  relevantOpportunities: number;        // Count of relevant opportunities
  relevancePercentage: number;          // Percentage of relevant opportunities
  byDataSource: { [key: string]: number }; // Count by data source
  byPertinence: { [key: string]: number }; // Count by pertinence status
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface FetchDataResponse {
  message: string;
  analysisId: number;
  opportunitiesCount: number;
  relevantCount: number;
}

export interface CleanupResponse {
  message: string;
  timestamp: string;
}

// ==================== SEARCH & FILTER ====================

export interface SearchParams {
  query: string;
  analysisType?: AnalysisType;
  pertinence?: PertinenceStatus;
  dataSource?: string;
}

export interface FilterOptions {
  analysisTypes: AnalysisType[];
  pertinenceStatuses: PertinenceStatus[];
  dataSources: string[];
}

// ==================== DISPLAY HELPERS ====================

export interface ProjectDisplayData {
  id: number;
  displayTitle: string;                 // titre || title || 'No Title'
  displayLink: string | null;           // lien || url
  displayDate: string | null;           // dateOuverture || startDate
  displayDeadline: string | null;       // dateCloture || deadline
  description: string | null;
  pertinence: string | null;
  isRelevant: boolean;                  // pertinence === 'Yes' || 'Oui'
  dataSource: string | null;
  analysisType: AnalysisType;
}

export interface DashboardData {
  ukStatistics: AnalysisStatistics;
  euStatistics: AnalysisStatistics;
  totalProjects: number;
  totalRelevant: number;
  overallRelevancePercentage: number;
  lastUpdated: string;
}

// ==================== UTILITY TYPES ====================

export type ProjectListType = 'all' | 'relevant';
export type AnalysisRegion = 'uk' | 'eu';

export interface TableColumn {
  key: keyof FundingOpportunity;
  label: string;
  sortable: boolean;
  filterable: boolean;
}

export interface SortConfig {
  key: keyof FundingOpportunity;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  size: number;
  total: number;
}

// ==================== FORM MODELS ====================

export interface SearchForm {
  query: string;
  region: AnalysisRegion | 'all';
  relevantOnly: boolean;
}

export interface FilterForm {
  analysisType: AnalysisType | 'all';
  pertinence: PertinenceStatus | 'all';
  dataSource: string | 'all';
  dateFrom: string | null;
  dateTo: string | null;
}

// ==================== CONSTANTS ====================

export const ANALYSIS_IDS = {
  UK: 1,
  EU: 2
} as const;

export const API_ENDPOINTS = {
  UK_PROJECTS: '/uk/projects',
  EU_PROJECTS: '/eu/projects',
  UK_RELEVANT: '/uk/projects/relevant',
  EU_RELEVANT: '/eu/projects/relevant',
  UK_STATISTICS: '/uk/statistics',
  EU_STATISTICS: '/eu/statistics',
  SEARCH: '/search',
  FETCH_UK: '/fetch/uk',
  FETCH_EU: '/fetch/eu',
  CLEANUP: '/cleanup/trigger'
} as const;

export const TABLE_COLUMNS: TableColumn[] = [
  { key: 'id', label: 'ID', sortable: true, filterable: false },
  { key: 'title', label: 'Title', sortable: true, filterable: true },
  { key: 'description', label: 'Description', sortable: false, filterable: true },
  { key: 'pertinence', label: 'Relevant', sortable: true, filterable: true },
  { key: 'dataSource', label: 'Source', sortable: true, filterable: true },
  { key: 'dateOuverture', label: 'Opening Date', sortable: true, filterable: false },
  { key: 'dateCloture', label: 'Closing Date', sortable: true, filterable: false }
];

// ==================== TYPE GUARDS ====================

export function isUkAnalysis(analysis: FundingAnalysis): boolean {
  return analysis.analysisType === AnalysisType.UK_FUNDING_OPPORTUNITIES;
}

export function isEuAnalysis(analysis: FundingAnalysis): boolean {
  return analysis.analysisType === AnalysisType.EU_FUNDING_OPPORTUNITIES;
}

export function isRelevantOpportunity(opportunity: FundingOpportunity): boolean {
  return opportunity.pertinence === 'Yes' || opportunity.pertinence === 'Oui';
}

export function hasValidLink(opportunity: FundingOpportunity): boolean {
  return !!(opportunity.lien || opportunity.url);
}

// ==================== UTILITY FUNCTIONS ====================

export function getDisplayTitle(opportunity: FundingOpportunity): string {
  // Since title is now consolidated, it should always have a value
  return opportunity.title || opportunity.mainTitle || 'No Title Available';
}

export function getDisplayLink(opportunity: FundingOpportunity): string | null {
  return opportunity.lien || opportunity.url || null;
}

export function getDisplayDate(opportunity: FundingOpportunity): string | null {
  return opportunity.dateOuverture || opportunity.startDate || null;
}

export function getDisplayDeadline(opportunity: FundingOpportunity): string | null {
  return opportunity.dateCloture || opportunity.deadline || null;
}

export function formatAnalysisType(type: AnalysisType): string {
  return type === AnalysisType.UK_FUNDING_OPPORTUNITIES ? 'UK' : 'EU';
}

export function getAnalysisId(type: AnalysisType): number {
  return type === AnalysisType.UK_FUNDING_OPPORTUNITIES ? ANALYSIS_IDS.UK : ANALYSIS_IDS.EU;
}
