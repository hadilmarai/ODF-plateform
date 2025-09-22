# 🚀 Funding Analysis API - Angular Integration Guide

## 📋 **Base URL**: `http://localhost:8080/api/funding-analysis`

---

## 🎯 **Core Project Endpoints (Fixed IDs)**

### **UK Funding Projects (Analysis ID = 1)**

#### **GET** `/uk/projects`
- **Purpose**: Get all UK funding opportunities
- **Response**: Array of `FundingOpportunity` objects
- **Example**: `GET /api/funding-analysis/uk/projects`

#### **GET** `/uk/projects/relevant`
- **Purpose**: Get only relevant UK funding opportunities (Pertinence = "Yes")
- **Response**: Array of relevant `FundingOpportunity` objects
- **Example**: `GET /api/funding-analysis/uk/projects/relevant`

#### **GET** `/uk/statistics`
- **Purpose**: Get UK funding analysis statistics
- **Response**: Statistics object with counts and percentages
- **Example**: `GET /api/funding-analysis/uk/statistics`

### **EU Funding Projects (Analysis ID = 2)**

#### **GET** `/eu/projects`
- **Purpose**: Get all EU funding opportunities
- **Response**: Array of `FundingOpportunity` objects
- **Example**: `GET /api/funding-analysis/eu/projects`

#### **GET** `/eu/projects/relevant`
- **Purpose**: Get only relevant EU funding opportunities (Pertinence = "Yes")
- **Response**: Array of relevant `FundingOpportunity` objects
- **Example**: `GET /api/funding-analysis/eu/projects/relevant`

#### **GET** `/eu/statistics`
- **Purpose**: Get EU funding analysis statistics
- **Response**: Statistics object with counts and percentages
- **Example**: `GET /api/funding-analysis/eu/statistics`

---

## 🔍 **Search & Utility Endpoints**

#### **GET** `/search?q={searchTerm}`
- **Purpose**: Search all funding opportunities by title or description
- **Parameters**: `q` - search term
- **Response**: Array of matching `FundingOpportunity` objects
- **Example**: `GET /api/funding-analysis/search?q=artificial%20intelligence`

#### **GET** `/`
- **Purpose**: Get all funding analyses (both UK and EU)
- **Response**: Array of `FundingAnalysis` objects
- **Example**: `GET /api/funding-analysis`

---

## 🔄 **Data Management Endpoints**

#### **POST** `/fetch/uk`
- **Purpose**: Manually fetch fresh UK data from Flask API
- **Response**: Success message with analysis details
- **Example**: `POST /api/funding-analysis/fetch/uk`

#### **POST** `/fetch/eu`
- **Purpose**: Manually fetch fresh EU data from Flask API
- **Response**: Success message with analysis details
- **Example**: `POST /api/funding-analysis/fetch/eu`

#### **POST** `/cleanup/trigger`
- **Purpose**: Manually clean database and fetch fresh data
- **Response**: Success message
- **Example**: `POST /api/funding-analysis/cleanup/trigger`

---

## 📊 **Data Models for TypeScript**

### **FundingOpportunity**
```typescript
interface FundingOpportunity {
  id: number;
  titre: string;           // French title
  title: string;           // English title
  lien: string;            // French link
  url: string;             // English URL
  description: string;
  dateOuverture: string;   // French opening date
  startDate: string;       // English start date
  dateCloture: string;     // French closing date
  deadline: string;        // English deadline
  pertinence: string;      // "Yes"/"No"/"Oui"/"Non"
  matchingWords: string;
  pertinenceLlm: string;
  resumeLlm: string;
  reponseBrute: string;
  status: string;
  dataSource: string;      // Source segment name
}
```

### **Statistics Response**
```typescript
interface AnalysisStatistics {
  analysisId: number;
  analysisType: string;
  createdAt: string;
  lastUpdate: string;
  status: string;
  totalOpportunities: number;
  relevantOpportunities: number;
  relevancePercentage: number;
  byDataSource: { [key: string]: number };
  byPertinence: { [key: string]: number };
}
```

---

## 🎨 **Angular Service Example**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FundingAnalysisService {
  private baseUrl = 'http://localhost:8080/api/funding-analysis';

  constructor(private http: HttpClient) {}

  // UK Projects
  getUkProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}/uk/projects`);
  }

  getUkRelevantProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}/uk/projects/relevant`);
  }

  getUkStatistics(): Observable<AnalysisStatistics> {
    return this.http.get<AnalysisStatistics>(`${this.baseUrl}/uk/statistics`);
  }

  // EU Projects
  getEuProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}/eu/projects`);
  }

  getEuRelevantProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}/eu/projects/relevant`);
  }

  getEuStatistics(): Observable<AnalysisStatistics> {
    return this.http.get<AnalysisStatistics>(`${this.baseUrl}/eu/statistics`);
  }

  // Search
  searchProjects(query: string): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
  }

  // Data Management
  fetchUkData(): Observable<any> {
    return this.http.post(`${this.baseUrl}/fetch/uk`, {});
  }

  fetchEuData(): Observable<any> {
    return this.http.post(`${this.baseUrl}/fetch/eu`, {});
  }
}
```

---

## 🎯 **Suggested Angular Features**

### **1. Dashboard Component**
- Display UK and EU statistics side by side
- Show total opportunities, relevant count, percentages
- Use charts for visual representation

### **2. Projects List Component**
- Tabbed interface: "UK Projects" and "EU Projects"
- Data table with pagination, sorting, filtering
- Toggle between "All Projects" and "Relevant Only"

### **3. Search Component**
- Global search across all opportunities
- Real-time search as user types
- Highlight matching terms in results

### **4. Project Detail Component**
- Show full details of individual opportunities
- Display all fields including LLM analysis
- Links to original funding sources

### **5. Admin Panel**
- Manual data refresh buttons
- Database cleanup controls
- System status monitoring

---

## 🔧 **Key Features**

- ✅ **Fixed IDs**: UK = 1, EU = 2 (always consistent)
- ✅ **Automatic Data**: Fresh data loaded on app startup
- ✅ **Search**: Full-text search across all opportunities
- ✅ **Statistics**: Ready-made analytics for dashboards
- ✅ **Filtering**: Relevant vs all opportunities
- ✅ **Real-time**: Manual refresh capabilities

---

## 🚀 **Quick Start URLs**

```bash
# Get UK projects
GET http://localhost:8080/api/funding-analysis/uk/projects

# Get EU projects  
GET http://localhost:8080/api/funding-analysis/eu/projects

# Get UK statistics
GET http://localhost:8080/api/funding-analysis/uk/statistics

# Search projects
GET http://localhost:8080/api/funding-analysis/search?q=innovation
```

**All endpoints are ready for Angular integration! 🎉**
