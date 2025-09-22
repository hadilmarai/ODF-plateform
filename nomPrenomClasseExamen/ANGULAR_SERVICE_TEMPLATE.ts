// 🚀 Angular Service Template for Funding Analysis API
// Copy this to your Angular project: src/app/services/funding-analysis.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  FundingAnalysis, 
  FundingOpportunity, 
  AnalysisStatistics, 
  FetchDataResponse,
  CleanupResponse,
  DashboardData,
  AnalysisType,
  ANALYSIS_IDS,
  API_ENDPOINTS
} from '../models/funding-analysis.models';

@Injectable({
  providedIn: 'root'
})
export class FundingAnalysisService {
  private readonly baseUrl = 'http://localhost:8080/api/funding-analysis';
  
  // State management
  private ukProjectsSubject = new BehaviorSubject<FundingOpportunity[]>([]);
  private euProjectsSubject = new BehaviorSubject<FundingOpportunity[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  // Public observables
  public ukProjects$ = this.ukProjectsSubject.asObservable();
  public euProjects$ = this.euProjectsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== UK PROJECTS ====================

  /**
   * Get all UK funding projects (Analysis ID = 1)
   */
  getUkProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}${API_ENDPOINTS.UK_PROJECTS}`)
      .pipe(
        map(projects => {
          this.ukProjectsSubject.next(projects);
          return projects;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get relevant UK funding projects only
   */
  getUkRelevantProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}${API_ENDPOINTS.UK_RELEVANT}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get UK funding statistics
   */
  getUkStatistics(): Observable<AnalysisStatistics> {
    return this.http.get<AnalysisStatistics>(`${this.baseUrl}${API_ENDPOINTS.UK_STATISTICS}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== EU PROJECTS ====================

  /**
   * Get all EU funding projects (Analysis ID = 2)
   */
  getEuProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}${API_ENDPOINTS.EU_PROJECTS}`)
      .pipe(
        map(projects => {
          this.euProjectsSubject.next(projects);
          return projects;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get relevant EU funding projects only
   */
  getEuRelevantProjects(): Observable<FundingOpportunity[]> {
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}${API_ENDPOINTS.EU_RELEVANT}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get EU funding statistics
   */
  getEuStatistics(): Observable<AnalysisStatistics> {
    return this.http.get<AnalysisStatistics>(`${this.baseUrl}${API_ENDPOINTS.EU_STATISTICS}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== COMBINED DATA ====================

  /**
   * Get all projects (UK + EU)
   */
  getAllProjects(): Observable<FundingOpportunity[]> {
    return combineLatest([
      this.getUkProjects(),
      this.getEuProjects()
    ]).pipe(
      map(([ukProjects, euProjects]) => [...ukProjects, ...euProjects])
    );
  }

  /**
   * Get all relevant projects (UK + EU)
   */
  getAllRelevantProjects(): Observable<FundingOpportunity[]> {
    return combineLatest([
      this.getUkRelevantProjects(),
      this.getEuRelevantProjects()
    ]).pipe(
      map(([ukRelevant, euRelevant]) => [...ukRelevant, ...euRelevant])
    );
  }

  /**
   * Get dashboard data (combined statistics)
   */
  getDashboardData(): Observable<DashboardData> {
    return combineLatest([
      this.getUkStatistics(),
      this.getEuStatistics()
    ]).pipe(
      map(([ukStats, euStats]) => {
        const totalProjects = ukStats.totalOpportunities + euStats.totalOpportunities;
        const totalRelevant = ukStats.relevantOpportunities + euStats.relevantOpportunities;
        
        return {
          ukStatistics: ukStats,
          euStatistics: euStats,
          totalProjects,
          totalRelevant,
          overallRelevancePercentage: totalProjects > 0 ? (totalRelevant / totalProjects) * 100 : 0,
          lastUpdated: new Date().toISOString()
        };
      })
    );
  }

  // ==================== SEARCH ====================

  /**
   * Search funding opportunities by title or description
   */
  searchProjects(query: string): Observable<FundingOpportunity[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<FundingOpportunity[]>(`${this.baseUrl}${API_ENDPOINTS.SEARCH}`, { params })
      .pipe(catchError(this.handleError));
  }

  // ==================== DATA MANAGEMENT ====================

  /**
   * Manually fetch fresh UK data from Flask API
   */
  fetchUkData(): Observable<FetchDataResponse> {
    this.loadingSubject.next(true);
    return this.http.post<FetchDataResponse>(`${this.baseUrl}${API_ENDPOINTS.FETCH_UK}`, {})
      .pipe(
        map(response => {
          this.loadingSubject.next(false);
          // Refresh UK projects after successful fetch
          this.getUkProjects().subscribe();
          return response;
        }),
        catchError(error => {
          this.loadingSubject.next(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Manually fetch fresh EU data from Flask API
   */
  fetchEuData(): Observable<FetchDataResponse> {
    this.loadingSubject.next(true);
    return this.http.post<FetchDataResponse>(`${this.baseUrl}${API_ENDPOINTS.FETCH_EU}`, {})
      .pipe(
        map(response => {
          this.loadingSubject.next(false);
          // Refresh EU projects after successful fetch
          this.getEuProjects().subscribe();
          return response;
        }),
        catchError(error => {
          this.loadingSubject.next(false);
          return this.handleError(error);
        })
      );
  }

  /**
   * Fetch both UK and EU data
   */
  fetchAllData(): Observable<[FetchDataResponse, FetchDataResponse]> {
    this.loadingSubject.next(true);
    return combineLatest([
      this.fetchUkData(),
      this.fetchEuData()
    ]).pipe(
      map(responses => {
        this.loadingSubject.next(false);
        return responses;
      })
    );
  }

  /**
   * Clean database and fetch fresh data
   */
  cleanupAndRefresh(): Observable<CleanupResponse> {
    this.loadingSubject.next(true);
    return this.http.post<CleanupResponse>(`${this.baseUrl}${API_ENDPOINTS.CLEANUP}`, {})
      .pipe(
        map(response => {
          this.loadingSubject.next(false);
          // Refresh all data after cleanup
          this.refreshAllData();
          return response;
        }),
        catchError(error => {
          this.loadingSubject.next(false);
          return this.handleError(error);
        })
      );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Refresh all cached data
   */
  refreshAllData(): void {
    this.getUkProjects().subscribe();
    this.getEuProjects().subscribe();
  }

  /**
   * Get projects by analysis type
   */
  getProjectsByType(type: AnalysisType): Observable<FundingOpportunity[]> {
    return type === AnalysisType.UK_FUNDING_OPPORTUNITIES 
      ? this.getUkProjects() 
      : this.getEuProjects();
  }

  /**
   * Get relevant projects by analysis type
   */
  getRelevantProjectsByType(type: AnalysisType): Observable<FundingOpportunity[]> {
    return type === AnalysisType.UK_FUNDING_OPPORTUNITIES 
      ? this.getUkRelevantProjects() 
      : this.getEuRelevantProjects();
  }

  /**
   * Get statistics by analysis type
   */
  getStatisticsByType(type: AnalysisType): Observable<AnalysisStatistics> {
    return type === AnalysisType.UK_FUNDING_OPPORTUNITIES 
      ? this.getUkStatistics() 
      : this.getEuStatistics();
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any): Observable<never> {
    console.error('FundingAnalysisService Error:', error);
    throw error;
  }
}
