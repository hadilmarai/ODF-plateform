package tn.esprit.examen.nomPrenomClasseExamen.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@RequiredArgsConstructor
@Service
@ConditionalOnProperty(name = "funding.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class FundingDataSchedulerService {

    private final FundingAnalysisService fundingAnalysisService;

    /**
     * Scheduled method to fetch UK funding data every 24 hours
     * Default: Every day at 8:00 AM
     * Configurable via: funding.scheduler.cron property
     */
    @Scheduled(cron = "${funding.scheduler.cron:0 0 8 * * *}")
    public void scheduledFetchUkFundingData() {
        log.info("=== SCHEDULED TASK STARTED: Fetching UK Funding Data ===");
        log.info("Scheduled execution time: {}", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        try {
            FundingAnalysis analysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.UK_FUNDING_OPPORTUNITIES);
            
            log.info("✅ UK funding data fetched successfully!");
            log.info("Analysis ID: {}", analysis.getId());
            log.info("Total opportunities: {}", analysis.getProjectsCount());
            log.info("Relevant opportunities: {}", analysis.getRelevantCount());
            log.info("=== SCHEDULED TASK COMPLETED: UK Funding Data ===");
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch UK funding data in scheduled task: {}", e.getMessage(), e);
            log.error("=== SCHEDULED TASK FAILED: UK Funding Data ===");
        }
    }

    /**
     * Scheduled method to fetch EU funding data every 24 hours
     * Runs 5 minutes after UK data fetch to avoid conflicts
     * Default: Every day at 8:05 AM
     */
    @Scheduled(cron = "${funding.scheduler.eu.cron:0 5 8 * * *}")
    public void scheduledFetchEuFundingData() {
        log.info("=== SCHEDULED TASK STARTED: Fetching EU Funding Data ===");
        log.info("Scheduled execution time: {}", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        try {
            FundingAnalysis analysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.EU_FUNDING_OPPORTUNITIES);
            
            log.info("✅ EU funding data fetched successfully!");
            log.info("Analysis ID: {}", analysis.getId());
            log.info("Total opportunities: {}", analysis.getProjectsCount());
            log.info("Relevant opportunities: {}", analysis.getRelevantCount());
            log.info("=== SCHEDULED TASK COMPLETED: EU Funding Data ===");
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch EU funding data in scheduled task: {}", e.getMessage(), e);
            log.error("=== SCHEDULED TASK FAILED: EU Funding Data ===");
        }
    }

    /**
     * Manual trigger for testing - can be called via REST endpoint
     */
    public void manualFetchAllData() {
        log.info("=== MANUAL TRIGGER: Fetching All Funding Data ===");
        
        try {
            // Fetch UK data
            log.info("Fetching UK funding data...");
            FundingAnalysis ukAnalysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.UK_FUNDING_OPPORTUNITIES);
            log.info("UK data fetched - Analysis ID: {}, Opportunities: {}", ukAnalysis.getId(), ukAnalysis.getProjectsCount());
            
            // Wait a moment before fetching EU data
            Thread.sleep(2000);
            
            // Fetch EU data
            log.info("Fetching EU funding data...");
            FundingAnalysis euAnalysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.EU_FUNDING_OPPORTUNITIES);
            log.info("EU data fetched - Analysis ID: {}, Opportunities: {}", euAnalysis.getId(), euAnalysis.getProjectsCount());
            
            log.info("=== MANUAL TRIGGER COMPLETED: All Funding Data ===");
            
        } catch (Exception e) {
            log.error("❌ Failed to fetch funding data in manual trigger: {}", e.getMessage(), e);
            log.error("=== MANUAL TRIGGER FAILED ===");
            throw new RuntimeException("Manual data fetch failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get next scheduled execution times for monitoring
     */
    public String getScheduleInfo() {
        return String.format(
            "Scheduler Status: ENABLED\n" +
            "UK Data Fetch: Daily at 8:00 AM (cron: 0 0 8 * * *)\n" +
            "EU Data Fetch: Daily at 8:05 AM (cron: 0 5 8 * * *)\n" +
            "Current Time: %s\n" +
            "Timezone: %s",
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
            java.time.ZoneId.systemDefault()
        );
    }
}
