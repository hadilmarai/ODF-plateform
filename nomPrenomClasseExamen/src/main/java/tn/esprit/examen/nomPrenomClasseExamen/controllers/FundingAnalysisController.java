package tn.esprit.examen.nomPrenomClasseExamen.controllers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.examen.nomPrenomClasseExamen.dto.FundingOpportunityDto;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;
import tn.esprit.examen.nomPrenomClasseExamen.mapper.FundingOpportunityMapper;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingAnalysisService;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingDataSchedulerService;
import tn.esprit.examen.nomPrenomClasseExamen.services.DatabaseCleanupService;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingDataSchedulerService;

import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/funding-analysis")
@CrossOrigin(origins = "*")
public class FundingAnalysisController {

    private final FundingAnalysisService fundingAnalysisService;
    private final FundingDataSchedulerService schedulerService;
    private final DatabaseCleanupService cleanupService;
    private final FundingOpportunityMapper opportunityMapper;


    /**
     * Fetch and store UK funding analysis data from Flask API
     */
    @PostMapping("/fetch/uk")
    public ResponseEntity<?> fetchUkFundingData() {
        try {
            log.info("Fetching UK funding data from Flask API");
            FundingAnalysis analysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.UK_FUNDING_OPPORTUNITIES);
            return ResponseEntity.ok(Map.of(
                "message", "UK funding data fetched and stored successfully",
                "analysisId", analysis.getId(),
                "opportunitiesCount", analysis.getProjectsCount(),
                "relevantCount", analysis.getRelevantCount()
            ));
        } catch (Exception e) {
            log.error("Error fetching UK funding data: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch UK funding data: " + e.getMessage()));
        }
    }

    /**
     * Fetch and store EU funding analysis data from Flask API
     */
    @PostMapping("/fetch/eu")
    public ResponseEntity<?> fetchEuFundingData() {
        try {
            log.info("Fetching EU funding data from Flask API");
            FundingAnalysis analysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.EU_FUNDING_OPPORTUNITIES);
            return ResponseEntity.ok(Map.of(
                "message", "EU funding data fetched and stored successfully",
                "analysisId", analysis.getId(),
                "opportunitiesCount", analysis.getProjectsCount(),
                "relevantCount", analysis.getRelevantCount()
            ));
        } catch (Exception e) {
            log.error("Error fetching EU funding data: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch EU funding data: " + e.getMessage()));
        }
    }

    /**
     * Get all funding analyses
     */
    @GetMapping
    public ResponseEntity<List<FundingAnalysis>> getAllFundingAnalyses() {
        try {
            List<FundingAnalysis> analyses = fundingAnalysisService.getAllFundingAnalyses();
            return ResponseEntity.ok(analyses);
        } catch (Exception e) {
            log.error("Error retrieving funding analyses: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }



    /**
     * Test Flask API connectivity
     */
    @GetMapping("/test-flask-api/{type}")
    public ResponseEntity<?> testFlaskApi(@PathVariable String type) {
        try {
            String endpoint = type.equalsIgnoreCase("uk") ? "/analysis/uk" : "/analysis/eu";
            String url = "http://localhost:5000" + endpoint;

            log.info("Testing Flask API connectivity at: {}", url);

            // Just test connectivity and return raw response info
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String rawResponse = restTemplate.getForObject(url, String.class);

            return ResponseEntity.ok(Map.of(
                "message", "Flask API is accessible",
                "url", url,
                "responseLength", rawResponse != null ? rawResponse.length() : 0,
                "responsePreview", rawResponse != null ? rawResponse.substring(0, Math.min(200, rawResponse.length())) : "null"
            ));
        } catch (Exception e) {
            log.error("Error testing Flask API: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to connect to Flask API: " + e.getMessage()));
        }
    }

    // ==================== SCHEDULER MANAGEMENT ENDPOINTS ====================

    /**
     * Manually trigger data fetch for both UK and EU
     */
    @PostMapping("/scheduler/trigger-all")
    public ResponseEntity<?> triggerManualDataFetch() {
        try {
            log.info("Manual trigger requested for all funding data");
            schedulerService.manualFetchAllData();
            return ResponseEntity.ok(Map.of(
                "message", "Manual data fetch completed successfully",
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Error in manual data fetch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Manual data fetch failed: " + e.getMessage()));
        }
    }

    /**
     * Get scheduler status and configuration
     */
    @GetMapping("/scheduler/status")
    public ResponseEntity<?> getSchedulerStatus() {
        try {
            String scheduleInfo = schedulerService.getScheduleInfo();
            return ResponseEntity.ok(Map.of(
                "status", "active",
                "scheduleInfo", scheduleInfo,
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Error getting scheduler status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get scheduler status: " + e.getMessage()));
        }
    }

    /**
     * Get scheduler configuration help
     */
    @GetMapping("/scheduler/help")
    public ResponseEntity<?> getSchedulerHelp() {
        return ResponseEntity.ok(Map.of(
            "message", "Funding Data Scheduler Help",
            "automaticSchedule", Map.of(
                "ukData", "Daily at 8:00 AM (0 0 8 * * *)",
                "euData", "Daily at 8:05 AM (0 5 8 * * *)",
                "timezone", java.time.ZoneId.systemDefault().toString()
            ),
            "manualTriggers", Map.of(
                "triggerAll", "POST /api/funding-analysis/scheduler/trigger-all",
                "triggerUK", "POST /api/funding-analysis/fetch/uk",
                "triggerEU", "POST /api/funding-analysis/fetch/eu"
            ),
            "monitoring", Map.of(
                "status", "GET /api/funding-analysis/scheduler/status",
                "allAnalyses", "GET /api/funding-analysis",
                "latestUK", "GET /api/funding-analysis/latest/uk",
                "latestEU", "GET /api/funding-analysis/latest/eu"
            ),
            "configuration", Map.of(
                "enableScheduler", "funding.scheduler.enabled=true",
                "customCronUK", "funding.scheduler.cron=0 0 8 * * *",
                "customCronEU", "funding.scheduler.eu.cron=0 5 8 * * *"
            )
        ));
    }

    // ==================== PROJECT RETRIEVAL ENDPOINTS ====================

    /**
     * Get UK funding projects (Analysis ID = 1)
     */
    @GetMapping("/uk/projects")
    public ResponseEntity<List<FundingOpportunityDto>> getUkProjects() {
        try {
            List<FundingOpportunity> ukProjects = fundingAnalysisService.getFundingOpportunitiesByAnalysisId(1L);
            List<FundingOpportunityDto> ukProjectDtos = opportunityMapper.toDtoList(ukProjects);
            return ResponseEntity.ok(ukProjectDtos);
        } catch (Exception e) {
            log.error("Error retrieving UK projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get EU funding projects (Analysis ID = 2)
     */
    @GetMapping("/eu/projects")
    public ResponseEntity<List<FundingOpportunityDto>> getEuProjects() {
        try {
            List<FundingOpportunity> euProjects = fundingAnalysisService.getFundingOpportunitiesByAnalysisId(2L);
            List<FundingOpportunityDto> euProjectDtos = opportunityMapper.toDtoList(euProjects);
            return ResponseEntity.ok(euProjectDtos);
        } catch (Exception e) {
            log.error("Error retrieving EU projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get UK relevant projects only (Analysis ID = 1)
     */
    @GetMapping("/uk/projects/relevant")
    public ResponseEntity<List<FundingOpportunityDto>> getUkRelevantProjects() {
        try {
            List<FundingOpportunity> ukRelevantProjects = fundingAnalysisService.getRelevantFundingOpportunities(1L);
            List<FundingOpportunityDto> ukRelevantDtos = opportunityMapper.toDtoList(ukRelevantProjects);
            return ResponseEntity.ok(ukRelevantDtos);
        } catch (Exception e) {
            log.error("Error retrieving UK relevant projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get EU relevant projects only (Analysis ID = 2)
     */
    @GetMapping("/eu/projects/relevant")
    public ResponseEntity<List<FundingOpportunityDto>> getEuRelevantProjects() {
        try {
            List<FundingOpportunity> euRelevantProjects = fundingAnalysisService.getRelevantFundingOpportunities(2L);
            List<FundingOpportunityDto> euRelevantDtos = opportunityMapper.toDtoList(euRelevantProjects);
            return ResponseEntity.ok(euRelevantDtos);
        } catch (Exception e) {
            log.error("Error retrieving EU relevant projects: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get UK analysis statistics (Analysis ID = 1)
     */
    @GetMapping("/uk/statistics")
    public ResponseEntity<Map<String, Object>> getUkStatistics() {
        try {
            Map<String, Object> ukStatistics = fundingAnalysisService.getAnalysisStatistics(1L);
            return ResponseEntity.ok(ukStatistics);
        } catch (Exception e) {
            log.error("Error retrieving UK statistics: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get EU analysis statistics (Analysis ID = 2)
     */
    @GetMapping("/eu/statistics")
    public ResponseEntity<Map<String, Object>> getEuStatistics() {
        try {
            Map<String, Object> euStatistics = fundingAnalysisService.getAnalysisStatistics(2L);
            return ResponseEntity.ok(euStatistics);
        } catch (Exception e) {
            log.error("Error retrieving EU statistics: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Search funding opportunities by title or description
     */
    @GetMapping("/search")
    public ResponseEntity<List<FundingOpportunityDto>> searchFundingOpportunities(@RequestParam String q) {
        try {
            List<FundingOpportunity> opportunities = fundingAnalysisService.searchFundingOpportunities(q);
            List<FundingOpportunityDto> opportunityDtos = opportunityMapper.toDtoList(opportunities);
            return ResponseEntity.ok(opportunityDtos);
        } catch (Exception e) {
            log.error("Error searching funding opportunities: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== DATABASE CLEANUP ENDPOINTS ====================

    /**
     * Get database cleanup status and information
     */
    @GetMapping("/cleanup/status")
    public ResponseEntity<?> getCleanupStatus() {
        try {
            String cleanupInfo = cleanupService.getCleanupInfo();
            return ResponseEntity.ok(Map.of(
                "status", "active",
                "cleanupInfo", cleanupInfo,
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Error getting cleanup status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get cleanup status: " + e.getMessage()));
        }
    }

    /**
     * Manually trigger database cleanup
     */
    @PostMapping("/cleanup/trigger")
    public ResponseEntity<?> manualCleanupDatabase() {
        try {
            log.info("Manual database cleanup requested");
            cleanupService.manualCleanup();
            return ResponseEntity.ok(Map.of(
                "message", "Database cleanup completed successfully",
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Error in manual database cleanup: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Manual database cleanup failed: " + e.getMessage()));
        }
    }

    /**
     * Get database cleanup help and configuration
     */
    @GetMapping("/cleanup/help")
    public ResponseEntity<?> getCleanupHelp() {
        return ResponseEntity.ok(Map.of(
            "message", "Database Cleanup Service Help",
            "automaticCleanup", Map.of(
                "description", "Automatically cleans database on application startup",
                "enabled", "funding.database.cleanup.enabled=true",
                "purpose", "Prevents duplicate entries when restarting application"
            ),
            "manualCleanup", Map.of(
                "trigger", "POST /api/funding-analysis/cleanup/trigger",
                "status", "GET /api/funding-analysis/cleanup/status",
                "description", "Manually clean all funding data from database"
            ),
            "configuration", Map.of(
                "enableCleanup", "funding.database.cleanup.enabled=true",
                "disableCleanup", "funding.database.cleanup.enabled=false"
            ),
            "warning", "Cleanup will delete ALL funding analysis data from database"
        ));
    }

    /**
     * Clean up opportunities with empty matching keywords
     */
    @PostMapping("/cleanup/empty-keywords")
    public ResponseEntity<?> cleanupEmptyMatchingWords() {
        try {
            log.info("Manual cleanup of empty matching keywords requested");
            fundingAnalysisService.cleanupOpportunitiesWithEmptyMatchingWords();
            return ResponseEntity.ok(Map.of(
                "message", "Successfully cleaned up opportunities with empty matching keywords",
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            log.error("Error cleaning up empty matching keywords: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to cleanup empty matching keywords: " + e.getMessage()));
        }
    }
}
