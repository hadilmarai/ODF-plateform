package tn.esprit.examen.nomPrenomClasseExamen.services;

import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;

import java.util.List;
import java.util.Map;

public interface FundingAnalysisService {
    
    /**
     * Fetch and store funding analysis data from Flask API
     * @param analysisType The type of analysis (UK or EU)
     * @return The saved FundingAnalysis entity
     */
    FundingAnalysis fetchAndStoreFundingData(AnalysisType analysisType);
    
    /**
     * Get all funding analyses by type
     * @param analysisType The type of analysis
     * @return List of funding analyses
     */
    List<FundingAnalysis> getFundingAnalysesByType(AnalysisType analysisType);
    
    /**
     * Get the latest funding analysis by type
     * @param analysisType The type of analysis
     * @return The latest funding analysis
     */
    FundingAnalysis getLatestFundingAnalysis(AnalysisType analysisType);
    
    /**
     * Get all funding opportunities for a specific analysis
     * @param analysisId The analysis ID
     * @return List of funding opportunities
     */
    List<FundingOpportunity> getFundingOpportunitiesByAnalysisId(Long analysisId);
    
    /**
     * Get relevant funding opportunities for a specific analysis
     * @param analysisId The analysis ID
     * @return List of relevant funding opportunities
     */
    List<FundingOpportunity> getRelevantFundingOpportunities(Long analysisId);
    
    /**
     * Get funding opportunities by data source
     * @param analysisId The analysis ID
     * @param dataSource The data source name
     * @return List of funding opportunities
     */
    List<FundingOpportunity> getFundingOpportunitiesByDataSource(Long analysisId, String dataSource);
    
    /**
     * Delete a funding analysis and all its opportunities
     * @param analysisId The analysis ID
     */
    void deleteFundingAnalysis(Long analysisId);
    
    /**
     * Get all funding analyses
     * @return List of all funding analyses
     */
    List<FundingAnalysis> getAllFundingAnalyses();

    /**
     * Get funding analysis by ID with all opportunities
     * @param analysisId The analysis ID
     * @return FundingAnalysis with opportunities loaded
     */
    FundingAnalysis getFundingAnalysisById(Long analysisId);

    /**
     * Get funding opportunity by ID
     * @param opportunityId The opportunity ID
     * @return FundingOpportunity
     */
    FundingOpportunity getFundingOpportunityById(Long opportunityId);

    /**
     * Search funding opportunities by title or description
     * @param searchTerm The search term
     * @return List of matching opportunities
     */
    List<FundingOpportunity> searchFundingOpportunities(String searchTerm);

    /**
     * Get funding opportunities by pertinence status
     * @param pertinence The pertinence status ("Yes", "No", "Oui", "Non")
     * @return List of opportunities with specified pertinence
     */
    List<FundingOpportunity> getFundingOpportunitiesByPertinence(String pertinence);

    /**
     * Get funding opportunities by date range
     * @param startDate Start date string
     * @param endDate End date string
     * @return List of opportunities within date range
     */
    List<FundingOpportunity> getFundingOpportunitiesByDateRange(String startDate, String endDate);

    /**
     * Get all unique data sources
     * @return List of unique data source names
     */
    List<String> getAllDataSources();

    /**
     * Get statistics for a specific analysis
     * @param analysisId The analysis ID
     * @return Map with statistics
     */
    Map<String, Object> getAnalysisStatistics(Long analysisId);
}
