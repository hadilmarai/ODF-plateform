package tn.esprit.examen.nomPrenomClasseExamen;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingAnalysisRepository;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingOpportunityRepository;
import tn.esprit.examen.nomPrenomClasseExamen.services.DatabaseCleanupService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "funding.database.cleanup.enabled=true"
})
class DatabaseCleanupTest {

    @Autowired
    private DatabaseCleanupService cleanupService;

    @Autowired
    private FundingAnalysisRepository fundingAnalysisRepository;

    @Autowired
    private FundingOpportunityRepository fundingOpportunityRepository;

    @Test
    void contextLoads() {
        assertNotNull(cleanupService);
    }

    @Test
    void testManualCleanup() {
        // Create test data
        FundingAnalysis analysis = new FundingAnalysis();
        analysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        analysis.setStatus("test");
        analysis.setCreatedAt(LocalDateTime.now());
        analysis = fundingAnalysisRepository.save(analysis);

        FundingOpportunity opportunity = new FundingOpportunity();
        opportunity.setFundingAnalysis(analysis);
        opportunity.setTitre("Test Opportunity");
        opportunity.setPertinence("Yes");
        fundingOpportunityRepository.save(opportunity);

        // Verify data exists
        assertTrue(fundingAnalysisRepository.count() > 0);
        assertTrue(fundingOpportunityRepository.count() > 0);

        // Perform manual cleanup
        assertDoesNotThrow(() -> cleanupService.manualCleanup());

        // Verify data is cleaned
        assertEquals(0, fundingAnalysisRepository.count());
        assertEquals(0, fundingOpportunityRepository.count());
    }

    @Test
    void testGetCleanupInfo() {
        String info = cleanupService.getCleanupInfo();
        assertNotNull(info);
        assertTrue(info.contains("Database Cleanup Service Status: ENABLED"));
        assertTrue(info.contains("Automatic cleanup on startup: YES"));
    }
}
