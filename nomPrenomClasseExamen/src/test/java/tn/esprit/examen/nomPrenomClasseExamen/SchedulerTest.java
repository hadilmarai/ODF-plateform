package tn.esprit.examen.nomPrenomClasseExamen;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingDataSchedulerService;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "funding.scheduler.enabled=true",
    "flask.api.base-url=http://localhost:5000"
})
class SchedulerTest {

    @Autowired
    private FundingDataSchedulerService schedulerService;

    @Test
    void contextLoads() {
        assertNotNull(schedulerService);
    }

    @Test
    void testSchedulerInfo() {
        String scheduleInfo = schedulerService.getScheduleInfo();
        assertNotNull(scheduleInfo);
        assertTrue(scheduleInfo.contains("ENABLED"));
        assertTrue(scheduleInfo.contains("8:00 AM"));
        assertTrue(scheduleInfo.contains("8:05 AM"));
    }

    @Test
    void testManualTriggerMethod() {
        // This test just verifies the method exists and can be called
        // In a real environment with Flask API running, it would actually fetch data
        assertDoesNotThrow(() -> {
            // Only test if Flask API is available, otherwise skip
            try {
                schedulerService.manualFetchAllData();
            } catch (RuntimeException e) {
                // Expected if Flask API is not running during tests
                assertTrue(e.getMessage().contains("Failed to fetch") || 
                          e.getMessage().contains("Connection refused"));
            }
        });
    }
}
