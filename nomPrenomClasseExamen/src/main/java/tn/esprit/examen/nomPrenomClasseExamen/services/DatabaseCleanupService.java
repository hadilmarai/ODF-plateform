package tn.esprit.examen.nomPrenomClasseExamen.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingAnalysisRepository;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingOpportunityRepository;

@Slf4j
@RequiredArgsConstructor
@Service
@ConditionalOnProperty(name = "funding.database.cleanup.enabled", havingValue = "true", matchIfMissing = true)
public class DatabaseCleanupService {

    private final FundingAnalysisRepository fundingAnalysisRepository;
    private final FundingOpportunityRepository fundingOpportunityRepository;
    private final FundingAnalysisService fundingAnalysisService;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${funding.database.cleanup.auto-fetch:true}")
    private boolean autoFetchEnabled;

    /**
     * Clean up database on application startup to prevent duplicate entries
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void cleanupDatabaseOnStartup() {
        log.info("=== DATABASE CLEANUP STARTED ===");
        
        try {
            // Count existing records before cleanup
            long opportunitiesCount = fundingOpportunityRepository.count();
            long analysesCount = fundingAnalysisRepository.count();
            
            log.info("Found {} funding opportunities and {} analyses in database", opportunitiesCount, analysesCount);
            
            if (opportunitiesCount > 0 || analysesCount > 0) {
                log.info("Cleaning up existing data to prevent duplicates...");
                
                // Delete all funding opportunities first (due to foreign key constraint)
                fundingOpportunityRepository.deleteAll();
                log.info("✅ Deleted {} funding opportunities", opportunitiesCount);
                
                // Delete all funding analyses
                fundingAnalysisRepository.deleteAll();
                log.info("✅ Deleted {} funding analyses", analysesCount);

                // Reset auto-increment values to ensure consistent IDs
                resetAutoIncrementValues();

                log.info("🧹 Database cleanup completed successfully!");
            } else {
                log.info("Database is already empty, no cleanup needed");
            }

            // Automatically fetch fresh data after cleanup if enabled
            if (autoFetchEnabled) {
                fetchFreshDataAfterCleanup();
            } else {
                log.info("💡 Automatic data fetch is disabled. You can manually fetch data using:");
                log.info("   - POST /api/funding-analysis/fetch/uk");
                log.info("   - POST /api/funding-analysis/fetch/eu");
            }

            log.info("=== DATABASE CLEANUP FINISHED ===");
            
        } catch (Exception e) {
            log.error("❌ Error during database cleanup: {}", e.getMessage(), e);
            log.error("=== DATABASE CLEANUP FAILED ===");
        }
    }

    /**
     * Manual cleanup method that can be called via REST endpoint
     */
    @Transactional
    public void manualCleanup() {
        log.info("=== MANUAL DATABASE CLEANUP STARTED ===");
        
        try {
            long opportunitiesCount = fundingOpportunityRepository.count();
            long analysesCount = fundingAnalysisRepository.count();
            
            log.info("Manual cleanup: Found {} opportunities and {} analyses", opportunitiesCount, analysesCount);
            
            // Delete all data
            fundingOpportunityRepository.deleteAll();
            fundingAnalysisRepository.deleteAll();

            // Reset auto-increment values
            resetAutoIncrementValues();

            log.info("✅ Manual cleanup completed: Deleted {} opportunities and {} analyses",
                    opportunitiesCount, analysesCount);
            log.info("=== MANUAL DATABASE CLEANUP FINISHED ===");
            
        } catch (Exception e) {
            log.error("❌ Error during manual database cleanup: {}", e.getMessage(), e);
            log.error("=== MANUAL DATABASE CLEANUP FAILED ===");
            throw new RuntimeException("Manual database cleanup failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get cleanup status and configuration
     */
    public String getCleanupInfo() {
        try {
            long opportunitiesCount = fundingOpportunityRepository.count();
            long analysesCount = fundingAnalysisRepository.count();
            
            return String.format(
                "Database Cleanup Service Status: ENABLED\n" +
                "Automatic cleanup on startup: YES\n" +
                "Current database state:\n" +
                "  - Funding Opportunities: %d\n" +
                "  - Funding Analyses: %d\n" +
                "Configuration: funding.database.cleanup.enabled=true",
                opportunitiesCount, analysesCount
            );
        } catch (Exception e) {
            return "Error getting cleanup info: " + e.getMessage();
        }
    }

    /**
     * Automatically fetch fresh data from Flask API after cleanup
     */
    private void fetchFreshDataAfterCleanup() {
        log.info("=== AUTOMATIC DATA FETCH STARTED ===");

        try {
            // Fetch UK data
            log.info("🇬🇧 Fetching UK funding data...");
            var ukAnalysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.UK_FUNDING_OPPORTUNITIES);
            log.info("✅ UK data fetched successfully - Analysis ID: {}, Opportunities: {}",
                    ukAnalysis.getId(), ukAnalysis.getProjectsCount());

            // Wait a moment before fetching EU data to avoid overwhelming the Flask API
            Thread.sleep(3000);

            // Fetch EU data
            log.info("🇪🇺 Fetching EU funding data...");
            var euAnalysis = fundingAnalysisService.fetchAndStoreFundingData(AnalysisType.EU_FUNDING_OPPORTUNITIES);
            log.info("✅ EU data fetched successfully - Analysis ID: {}, Opportunities: {}",
                    euAnalysis.getId(), euAnalysis.getProjectsCount());

            log.info("🎉 Automatic data fetch completed successfully!");
            log.info("=== AUTOMATIC DATA FETCH FINISHED ===");

        } catch (Exception e) {
            log.warn("⚠️ Automatic data fetch failed (this is normal if Flask API is not running): {}", e.getMessage());
            log.info("💡 You can manually fetch data later using:");
            log.info("   - POST /api/funding-analysis/fetch/uk");
            log.info("   - POST /api/funding-analysis/fetch/eu");
            log.info("=== AUTOMATIC DATA FETCH SKIPPED ===");
        }
    }

    /**
     * Reset auto-increment values to ensure consistent IDs (1 for UK, 2 for EU)
     */
    private void resetAutoIncrementValues() {
        try {
            log.info("🔄 Resetting auto-increment values...");

            // Reset funding_analysis table auto-increment to 1
            entityManager.createNativeQuery("ALTER TABLE funding_analysis AUTO_INCREMENT = 1").executeUpdate();

            // Reset funding_opportunity table auto-increment to 1
            entityManager.createNativeQuery("ALTER TABLE funding_opportunity AUTO_INCREMENT = 1").executeUpdate();

            log.info("✅ Auto-increment values reset successfully");

        } catch (Exception e) {
            log.warn("⚠️ Could not reset auto-increment values (this is normal for some databases): {}", e.getMessage());
        }
    }
}
