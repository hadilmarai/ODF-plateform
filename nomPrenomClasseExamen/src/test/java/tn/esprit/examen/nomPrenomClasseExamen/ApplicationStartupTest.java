package tn.esprit.examen.nomPrenomClasseExamen;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.examen.nomPrenomClasseExamen.services.DatabaseCleanupService;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingAnalysisService;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingDataSchedulerService;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "funding.database.cleanup.enabled=true",
    "funding.database.cleanup.auto-fetch=false", // Disable auto-fetch for tests
    "funding.scheduler.enabled=true",
    "flask.api.base-url=http://localhost:5000"
})
class ApplicationStartupTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private FundingAnalysisService fundingAnalysisService;

    @Autowired
    private FundingDataSchedulerService schedulerService;

    @Autowired
    private DatabaseCleanupService cleanupService;

    @Test
    void contextLoads() {
        // Test that the application context loads successfully
        assertNotNull(applicationContext);
        assertNotNull(fundingAnalysisService);
        assertNotNull(schedulerService);
        assertNotNull(cleanupService);
    }

    @Test
    void testServicesAreAvailable() {
        // Test that all required services are properly injected
        assertNotNull(fundingAnalysisService);
        assertNotNull(schedulerService);
        assertNotNull(cleanupService);
        
        // Test that services have basic functionality
        assertDoesNotThrow(() -> {
            fundingAnalysisService.getAllFundingAnalyses();
            schedulerService.getScheduleInfo();
            cleanupService.getCleanupInfo();
        });
    }

    @Test
    void testConfigurationProperties() {
        // Test that configuration properties are loaded correctly
        String scheduleInfo = schedulerService.getScheduleInfo();
        assertNotNull(scheduleInfo);
        assertTrue(scheduleInfo.contains("ENABLED"));
        
        String cleanupInfo = cleanupService.getCleanupInfo();
        assertNotNull(cleanupInfo);
        assertTrue(cleanupInfo.contains("ENABLED"));
    }
}
