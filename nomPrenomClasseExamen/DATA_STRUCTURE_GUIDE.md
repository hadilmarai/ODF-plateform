# 📊 Complete Data Structure Guide for Angular

## 🎯 **Main Data Models**

### **1. FundingOpportunity (Main Project Data)**
```typescript
interface FundingOpportunity {
  id: number;                           // Unique project ID
  
  // Title (Consolidated from French/English sources)
  title: string | null;                 // Consolidated title (from Titre or Title)
  titre: string | null;                 // Legacy field (same as title)
  mainTitle: string | null;             // Main title field (same as title)
  
  // Links (Bilingual Support)
  lien: string | null;                  // French link
  url: string | null;                   // English URL
  
  // Content
  description: string | null;           // Project description (can be long text)
  
  // Dates (Bilingual Support)
  dateOuverture: string | null;         // French opening date
  startDate: string | null;             // English start date
  dateCloture: string | null;           // French closing date
  deadline: string | null;              // English deadline
  
  // AI Analysis Results
  pertinence: string | null;            // "Yes", "No", "Oui", "Non"
  matchingWords: string | null;         // Keywords that matched search criteria
  pertinenceLlm: string | null;         // LLM relevance assessment
  resumeLlm: string | null;             // LLM-generated summary
  reponseBrute: string | null;          // Raw LLM response (full text)
  
  // Metadata
  status: string | null;                // Project status
  dataSource: string | null;           // Source name (e.g., "Final UK LLM Results")
}
```

### **2. FundingAnalysis (Analysis Metadata)**
```typescript
interface FundingAnalysis {
  id: number;                           // Always 1 for UK, 2 for EU
  analysisType: AnalysisType;           // UK_FUNDING_OPPORTUNITIES or EU_FUNDING_OPPORTUNITIES
  lastUpdate: string | null;            // ISO date string when last updated
  createdAt: string;                    // ISO date string when created
  status: string | null;                // Analysis status ("completed", "running", etc.)
  llmAnalyzedCount: number | null;      // How many projects were analyzed by LLM
  projectsCount: number | null;         // Total number of projects found
  relevantCount: number | null;         // Number of relevant projects found
  opportunities?: FundingOpportunity[]; // Optional: full project list
}
```

### **3. AnalysisStatistics (Dashboard Data)**
```typescript
interface AnalysisStatistics {
  analysisId: number;                   // 1 for UK, 2 for EU
  analysisType: string;                 // "UK_FUNDING_OPPORTUNITIES" or "EU_FUNDING_OPPORTUNITIES"
  createdAt: string;                    // When analysis was created
  lastUpdate: string | null;            // When last updated
  status: string | null;                // Current status
  totalOpportunities: number;           // Total count of opportunities
  relevantOpportunities: number;        // Count of relevant opportunities
  relevancePercentage: number;          // Percentage (0-100)
  byDataSource: {                       // Breakdown by source
    [sourceName: string]: number;      // e.g., "Final UK LLM Results": 5
  };
  byPertinence: {                       // Breakdown by relevance
    [status: string]: number;          // e.g., "Yes": 5, "No": 104
  };
}
```

## 🔧 **Enums & Constants**

### **AnalysisType Enum**
```typescript
enum AnalysisType {
  UK_FUNDING_OPPORTUNITIES = 'UK_FUNDING_OPPORTUNITIES',
  EU_FUNDING_OPPORTUNITIES = 'EU_FUNDING_OPPORTUNITIES'
}
```

### **Fixed Analysis IDs**
```typescript
const ANALYSIS_IDS = {
  UK: 1,    // UK funding analysis always has ID = 1
  EU: 2     // EU funding analysis always has ID = 2
} as const;
```

### **API Endpoints**
```typescript
const API_ENDPOINTS = {
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
```

## 📋 **Sample Data Examples**

### **UK Funding Opportunity Example**
```json
{
  "id": 123,
  "titre": "Innovation in Artificial Intelligence",
  "title": null,
  "lien": "https://www.ukri.org/opportunity/innovation-ai",
  "url": null,
  "description": "This funding opportunity supports innovative research in artificial intelligence...",
  "dateOuverture": "2024-01-15",
  "startDate": null,
  "dateCloture": "2024-06-30",
  "deadline": null,
  "pertinence": "Yes",
  "matchingWords": "artificial intelligence, innovation, research",
  "pertinenceLlm": "High",
  "resumeLlm": "This opportunity is highly relevant for AI research projects...",
  "reponseBrute": "Based on the analysis of the funding opportunity...",
  "status": "Open",
  "dataSource": "Final UK LLM Results"
}
```

### **EU Funding Opportunity Example**
```json
{
  "id": 456,
  "titre": null,
  "title": "Horizon Europe Digital Innovation",
  "lien": null,
  "url": "https://ec.europa.eu/info/funding-tenders/opportunities",
  "description": "Supporting digital transformation across Europe...",
  "dateOuverture": null,
  "startDate": "2024-02-01",
  "dateCloture": null,
  "deadline": "2024-08-15",
  "pertinence": "Yes",
  "matchingWords": "digital innovation, transformation, technology",
  "pertinenceLlm": "Medium",
  "resumeLlm": "Relevant for digital innovation projects...",
  "reponseBrute": "The funding opportunity focuses on...",
  "status": "Active",
  "dataSource": "EU Horizon Results"
}
```

### **Statistics Example**
```json
{
  "analysisId": 1,
  "analysisType": "UK_FUNDING_OPPORTUNITIES",
  "createdAt": "2024-01-15T08:30:45",
  "lastUpdate": "2024-01-15T08:30:45",
  "status": "completed",
  "totalOpportunities": 109,
  "relevantOpportunities": 5,
  "relevancePercentage": 4.58,
  "byDataSource": {
    "Final UK LLM Results": 5,
    "UK Keyword Analysis": 104
  },
  "byPertinence": {
    "Yes": 5,
    "No": 104
  }
}
```

## 🎨 **Display Helper Functions**

### **Get Display Title**
```typescript
function getDisplayTitle(opportunity: FundingOpportunity): string {
  return opportunity.titre || opportunity.title || 'No Title Available';
}
```

### **Get Display Link**
```typescript
function getDisplayLink(opportunity: FundingOpportunity): string | null {
  return opportunity.lien || opportunity.url || null;
}
```

### **Check if Relevant**
```typescript
function isRelevant(opportunity: FundingOpportunity): boolean {
  return opportunity.pertinence === 'Yes' || opportunity.pertinence === 'Oui';
}
```

### **Format Analysis Type**
```typescript
function formatAnalysisType(type: AnalysisType): string {
  return type === AnalysisType.UK_FUNDING_OPPORTUNITIES ? 'UK' : 'EU';
}
```

## 📊 **Table Column Configuration**

### **Recommended Table Columns**
```typescript
const TABLE_COLUMNS = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'titre', label: 'Title (FR)', sortable: true },
  { key: 'title', label: 'Title (EN)', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'pertinence', label: 'Relevant', sortable: true },
  { key: 'dataSource', label: 'Source', sortable: true },
  { key: 'dateOuverture', label: 'Opening Date', sortable: true },
  { key: 'dateCloture', label: 'Closing Date', sortable: true }
];
```

## 🔍 **Search & Filter Models**

### **Search Parameters**
```typescript
interface SearchParams {
  query: string;                        // Search term
  analysisType?: AnalysisType;          // Filter by UK/EU
  pertinence?: 'Yes' | 'No' | 'all';   // Filter by relevance
  dataSource?: string;                  // Filter by source
}
```

### **Filter Options**
```typescript
interface FilterOptions {
  analysisTypes: AnalysisType[];        // Available analysis types
  pertinenceStatuses: string[];         // Available pertinence values
  dataSources: string[];                // Available data sources
}
```

## 🎯 **Key Points for Angular Development**

1. **Bilingual Support**: Always check both French and English fields (titre/title, lien/url, etc.)
2. **Null Handling**: All fields can be null, implement proper null checks
3. **Fixed IDs**: UK = 1, EU = 2 (never changes)
4. **Date Formats**: Dates come as strings, may need parsing for display
5. **Large Text**: Description, resumeLlm, reponseBrute can be very long
6. **Search**: Search works across titre, title, and description fields
7. **Relevance**: "Yes"/"Oui" = relevant, "No"/"Non" = not relevant

**All data structures are ready for Angular implementation! 🚀**
