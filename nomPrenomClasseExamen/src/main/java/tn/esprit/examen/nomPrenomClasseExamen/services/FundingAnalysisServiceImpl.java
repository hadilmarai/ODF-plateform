package tn.esprit.examen.nomPrenomClasseExamen.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import tn.esprit.examen.nomPrenomClasseExamen.dto.FlaskApiResponse;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingAnalysisRepository;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingOpportunityRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@Service
public class FundingAnalysisServiceImpl implements FundingAnalysisService {

    private final FundingAnalysisRepository fundingAnalysisRepository;
    private final FundingOpportunityRepository fundingOpportunityRepository;
    private final RestTemplate restTemplate;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${flask.api.base-url:http://localhost:5000}")
    private String flaskApiBaseUrl;

    @Override
    @Transactional
    public FundingAnalysis fetchAndStoreFundingData(AnalysisType analysisType) {
        log.info("Fetching funding data for analysis type: {}", analysisType);

        try {
            // Determine the endpoint based on analysis type
            String endpoint = analysisType == AnalysisType.UK_FUNDING_OPPORTUNITIES ?
                    "/analysis/uk" : "/analysis/eu";

            String url = flaskApiBaseUrl + endpoint;
            log.info("Calling Flask API at: {}", url);

            // Try to fetch and parse the response with better error handling
            FlaskApiResponse apiResponse = fetchFlaskApiResponse(url);

            if (apiResponse == null) {
                throw new RuntimeException("No response received from Flask API");
            }

            // Create and save FundingAnalysis entity
            FundingAnalysis fundingAnalysis = createFundingAnalysis(apiResponse, analysisType);
            fundingAnalysis = fundingAnalysisRepository.save(fundingAnalysis);

            // Process and save funding opportunities
            List<FundingOpportunity> opportunities = processFundingOpportunities(apiResponse, fundingAnalysis);
            fundingOpportunityRepository.saveAll(opportunities);

            // Update statistics
            updateAnalysisStatistics(fundingAnalysis, opportunities);

            log.info("Successfully stored funding analysis with {} opportunities", opportunities.size());
            return fundingAnalysisRepository.save(fundingAnalysis);

        } catch (Exception e) {
            log.error("Error fetching and storing funding data for {}: {}", analysisType, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch and store funding data: " + e.getMessage(), e);
        }
    }

    private FlaskApiResponse fetchFlaskApiResponse(String url) {
        try {
            log.info("Attempting to fetch data from Flask API at: {}", url);

            // First, get the raw response as String to debug
            String rawResponse = restTemplate.getForObject(url, String.class);
            log.info("Raw response received from Flask API (first 500 chars): {}",
                rawResponse != null ? rawResponse.substring(0, Math.min(500, rawResponse.length())) + "..." : "null");

            if (rawResponse == null || rawResponse.trim().isEmpty()) {
                throw new RuntimeException("Empty response received from Flask API");
            }

            // Try to parse the JSON manually first
            try {
                FlaskApiResponse apiResponse = objectMapper.readValue(rawResponse, FlaskApiResponse.class);
                log.info("Successfully parsed Flask API response");
                return apiResponse;
            } catch (Exception jsonException) {
                log.error("Failed to parse JSON response: {}", jsonException.getMessage());
                log.error("Raw response that failed to parse: {}", rawResponse);

                // Try alternative parsing approach using WebClient
                try {
                    FlaskApiResponse webClientResponse = webClient.get()
                            .uri(url)
                            .retrieve()
                            .bodyToMono(FlaskApiResponse.class)
                            .block();

                    if (webClientResponse != null) {
                        log.info("Successfully fetched data using WebClient");
                        return webClientResponse;
                    }
                } catch (Exception webClientException) {
                    log.error("WebClient also failed: {}", webClientException.getMessage());
                }

                throw new RuntimeException("Failed to parse Flask API response: " + jsonException.getMessage());
            }

        } catch (Exception e) {
            log.error("Error fetching data from Flask API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch data from Flask API: " + e.getMessage(), e);
        }
    }

    private FundingAnalysis createFundingAnalysis(FlaskApiResponse apiResponse, AnalysisType analysisType) {
        FundingAnalysis analysis = new FundingAnalysis();

        // Set fixed IDs: 1 for UK, 2 for EU
        if (analysisType == AnalysisType.UK_FUNDING_OPPORTUNITIES) {
            analysis.setId(1L);
        } else if (analysisType == AnalysisType.EU_FUNDING_OPPORTUNITIES) {
            analysis.setId(2L);
        }

        analysis.setAnalysisType(analysisType);
        analysis.setStatus(apiResponse.getStatus());

        // Parse last_update if available
        if (apiResponse.getLastUpdate() != null && !apiResponse.getLastUpdate().equals("null")) {
            try {
                analysis.setLastUpdate(LocalDateTime.parse(apiResponse.getLastUpdate()));
            } catch (Exception e) {
                log.warn("Could not parse last_update: {}", apiResponse.getLastUpdate());
            }
        }

        // Set statistics if available
        if (apiResponse.getStatistics() != null) {
            analysis.setLlmAnalyzedCount(apiResponse.getStatistics().getLlmAnalyzedCount());
            analysis.setProjectsCount(apiResponse.getStatistics().getProjectsCount());
            analysis.setRelevantCount(apiResponse.getStatistics().getRelevantCount());
        }

        return analysis;
    }

    private List<FundingOpportunity> processFundingOpportunities(FlaskApiResponse apiResponse, FundingAnalysis fundingAnalysis) {
        List<FundingOpportunity> opportunities = new ArrayList<>();
        int totalProcessed = 0;
        int filteredOut = 0;

        if (apiResponse.getResults() != null) {
            for (Map.Entry<String, FlaskApiResponse.ResultSegment> entry : apiResponse.getResults().entrySet()) {
                String dataSource = entry.getKey();
                FlaskApiResponse.ResultSegment segment = entry.getValue();

                if (segment.getData() != null) {
                    for (Map<String, Object> dataRow : segment.getData()) {
                        totalProcessed++;
                        FundingOpportunity opportunity = createFundingOpportunity(dataRow, dataSource, fundingAnalysis);
                        if (opportunity != null) { // Only add if opportunity has valid matching keywords
                            opportunities.add(opportunity);
                        } else {
                            filteredOut++;
                        }
                    }
                }
            }
        }

        log.info("Processed {} opportunities, filtered out {} due to empty matching keywords, kept {} with valid keywords",
                totalProcessed, filteredOut, opportunities.size());

        return opportunities;
    }

    private FundingOpportunity createFundingOpportunity(Map<String, Object> dataRow, String dataSource, FundingAnalysis fundingAnalysis) {
        // First, check if matching keywords exist and are not empty
        String matchingWords = getStringValue(dataRow, "Matching Word(s)");
        if (!hasValidMatchingWords(matchingWords)) {
            log.debug("Skipping opportunity due to empty/null matching keywords: {}", matchingWords);
            return null; // Skip this opportunity if no valid matching words
        }

        FundingOpportunity opportunity = new FundingOpportunity();
        opportunity.setFundingAnalysis(fundingAnalysis);
        opportunity.setDataSource(dataSource);

        // Consolidate title fields - use either "Titre" or "Title" and store in title column
        String consolidatedTitle = getStringValue(dataRow, "Titre");
        if (consolidatedTitle == null || consolidatedTitle.trim().isEmpty()) {
            consolidatedTitle = getStringValue(dataRow, "Title");
        }

        // Store consolidated title in both fields to ensure no projects appear without titles
        opportunity.setTitle(consolidatedTitle); // Primary title field
        opportunity.setTitre(consolidatedTitle); // Keep for backward compatibility
        opportunity.setMainTitle(consolidatedTitle); // Main title field
        opportunity.setLien(getStringValue(dataRow, "Lien"));
        opportunity.setUrl(getStringValue(dataRow, "URL"));
        opportunity.setDescription(getStringValue(dataRow, "Description"));
        opportunity.setDateOuverture(getStringValue(dataRow, "Date d'ouverture"));
        opportunity.setStartDate(getStringValue(dataRow, "Start_date"));
        opportunity.setDateCloture(getStringValue(dataRow, "Date de clôture"));
        opportunity.setDeadline(getStringValue(dataRow, "Deadline"));
        opportunity.setPertinence(getStringValue(dataRow, "Pertinence"));
        opportunity.setMatchingWords(matchingWords); // We already validated this is not empty
        opportunity.setPertinenceLlm(getStringValue(dataRow, "Pertinence LLM"));
        opportunity.setResumeLlm(getStringValue(dataRow, "Résumé LLM"));
        opportunity.setReponseBrute(getStringValue(dataRow, "Réponse brute"));
        opportunity.setStatus(getStringValue(dataRow, "Status"));

        return opportunity;
    }

    private String getStringValue(Map<String, Object> dataRow, String key) {
        Object value = dataRow.get(key);
        if (value == null || "null".equals(value)) {
            return null;
        }

        // Handle NaN values (they might come as Double.NaN or String "NaN")
        if (value instanceof Double && ((Double) value).isNaN()) {
            return null;
        }

        if ("NaN".equals(String.valueOf(value))) {
            return null;
        }

        return value.toString();
    }

    /**
     * Validates if matching keywords are present and not empty
     */
    private boolean hasValidMatchingWords(String matchingWords) {
        if (matchingWords == null || matchingWords.trim().isEmpty()) {
            return false;
        }

        // Check for common empty/null representations
        String normalized = matchingWords.trim().toLowerCase();
        return !normalized.equals("null") &&
               !normalized.equals("nan") &&
               !normalized.equals("none") &&
               !normalized.equals("") &&
               !normalized.equals("n/a") &&
               !normalized.equals("undefined");
    }

    private void updateAnalysisStatistics(FundingAnalysis fundingAnalysis, List<FundingOpportunity> opportunities) {
        if (fundingAnalysis.getProjectsCount() == null) {
            fundingAnalysis.setProjectsCount(opportunities.size());
        }

        if (fundingAnalysis.getRelevantCount() == null) {
            long relevantCount = opportunities.stream()
                    .filter(opp -> "Yes".equalsIgnoreCase(opp.getPertinence()) || "Oui".equalsIgnoreCase(opp.getPertinence()))
                    .count();
            fundingAnalysis.setRelevantCount((int) relevantCount);
        }
    }

    @Override
    public List<FundingAnalysis> getFundingAnalysesByType(AnalysisType analysisType) {
        return fundingAnalysisRepository.findByAnalysisTypeOrderByCreatedAtDesc(analysisType);
    }

    @Override
    public FundingAnalysis getLatestFundingAnalysis(AnalysisType analysisType) {
        Optional<FundingAnalysis> latest = fundingAnalysisRepository.findTopByAnalysisTypeOrderByCreatedAtDesc(analysisType);
        return latest.orElse(null);
    }

    @Override
    public List<FundingOpportunity> getFundingOpportunitiesByAnalysisId(Long analysisId) {
        return fundingOpportunityRepository.findByFundingAnalysisId(analysisId);
    }

    @Override
    public List<FundingOpportunity> getRelevantFundingOpportunities(Long analysisId) {
        return fundingOpportunityRepository.findByAnalysisIdAndPertinence(analysisId, "Yes");
    }

    @Override
    public List<FundingOpportunity> getFundingOpportunitiesByDataSource(Long analysisId, String dataSource) {
        return fundingOpportunityRepository.findByAnalysisIdAndDataSource(analysisId, dataSource);
    }

    @Override
    @Transactional
    public void deleteFundingAnalysis(Long analysisId) {
        fundingAnalysisRepository.deleteById(analysisId);
    }

    @Override
    public List<FundingAnalysis> getAllFundingAnalyses() {
        return fundingAnalysisRepository.findAll();
    }

    @Override
    public FundingAnalysis getFundingAnalysisById(Long analysisId) {
        Optional<FundingAnalysis> analysis = fundingAnalysisRepository.findById(analysisId);
        return analysis.orElse(null);
    }

    @Override
    public FundingOpportunity getFundingOpportunityById(Long opportunityId) {
        Optional<FundingOpportunity> opportunity = fundingOpportunityRepository.findById(opportunityId);
        return opportunity.orElse(null);
    }

    @Override
    public List<FundingOpportunity> searchFundingOpportunities(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return fundingOpportunityRepository.searchByTitleOrDescription(searchTerm.trim());
    }

    @Override
    public List<FundingOpportunity> getFundingOpportunitiesByPertinence(String pertinence) {
        return fundingOpportunityRepository.findByPertinence(pertinence);
    }

    @Override
    public List<FundingOpportunity> getFundingOpportunitiesByDateRange(String startDate, String endDate) {
        return fundingOpportunityRepository.findByDateRange(startDate, endDate);
    }

    @Override
    public List<String> getAllDataSources() {
        return fundingOpportunityRepository.findAllDistinctDataSources();
    }

    @Override
    public Map<String, Object> getAnalysisStatistics(Long analysisId) {
        Map<String, Object> stats = new HashMap<>();

        try {
            // Get the analysis
            FundingAnalysis analysis = getFundingAnalysisById(analysisId);
            if (analysis == null) {
                return stats;
            }

            // Get all opportunities for this analysis
            List<FundingOpportunity> opportunities = getFundingOpportunitiesByAnalysisId(analysisId);

            // Calculate statistics
            long totalOpportunities = opportunities.size();
            long relevantOpportunities = opportunities.stream()
                    .filter(opp -> "Yes".equalsIgnoreCase(opp.getPertinence()) || "Oui".equalsIgnoreCase(opp.getPertinence()))
                    .count();

            // Group by data source
            Map<String, Long> byDataSource = opportunities.stream()
                    .filter(opp -> opp.getDataSource() != null)
                    .collect(Collectors.groupingBy(
                            FundingOpportunity::getDataSource,
                            Collectors.counting()
                    ));

            // Group by pertinence
            Map<String, Long> byPertinence = opportunities.stream()
                    .filter(opp -> opp.getPertinence() != null)
                    .collect(Collectors.groupingBy(
                            FundingOpportunity::getPertinence,
                            Collectors.counting()
                    ));

            // Build statistics map
            stats.put("analysisId", analysisId);
            stats.put("analysisType", analysis.getAnalysisType().toString());
            stats.put("createdAt", analysis.getCreatedAt());
            stats.put("lastUpdate", analysis.getLastUpdate());
            stats.put("status", analysis.getStatus());
            stats.put("totalOpportunities", totalOpportunities);
            stats.put("relevantOpportunities", relevantOpportunities);
            stats.put("relevancePercentage", totalOpportunities > 0 ? (relevantOpportunities * 100.0 / totalOpportunities) : 0);
            stats.put("byDataSource", byDataSource);
            stats.put("byPertinence", byPertinence);

        } catch (Exception e) {
            log.error("Error calculating statistics for analysis {}: {}", analysisId, e.getMessage(), e);
            stats.put("error", "Failed to calculate statistics: " + e.getMessage());
        }

        return stats;
    }

    /**
     * Clean up existing opportunities with empty matching keywords
     */
    @Transactional
    public void cleanupOpportunitiesWithEmptyMatchingWords() {
        log.info("Cleaning up opportunities with empty matching keywords...");
        try {
            fundingOpportunityRepository.deleteOpportunitiesWithEmptyMatchingWords();
            log.info("✅ Successfully cleaned up opportunities with empty matching keywords");
        } catch (Exception e) {
            log.error("❌ Error cleaning up opportunities with empty matching keywords: {}", e.getMessage(), e);
        }
    }
}
