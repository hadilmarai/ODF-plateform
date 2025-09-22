package tn.esprit.examen.nomPrenomClasseExamen;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingAnalysisRepository;
import tn.esprit.examen.nomPrenomClasseExamen.services.DatabaseCleanupService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "funding.database.cleanup.enabled=true",
    "funding.database.cleanup.auto-fetch=false"
})
class FixedIdTest {

    @Autowired
    private FundingAnalysisRepository fundingAnalysisRepository;

    @Autowired
    private DatabaseCleanupService cleanupService;

    @Test
    void testFixedAnalysisIds() {
        // Clean up first
        cleanupService.manualCleanup();

        // Create UK analysis
        FundingAnalysis ukAnalysis = new FundingAnalysis();
        ukAnalysis.setId(1L);
        ukAnalysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        ukAnalysis.setStatus("test");
        ukAnalysis.setCreatedAt(LocalDateTime.now());
        ukAnalysis = fundingAnalysisRepository.save(ukAnalysis);

        // Create EU analysis
        FundingAnalysis euAnalysis = new FundingAnalysis();
        euAnalysis.setId(2L);
        euAnalysis.setAnalysisType(AnalysisType.EU_FUNDING_OPPORTUNITIES);
        euAnalysis.setStatus("test");
        euAnalysis.setCreatedAt(LocalDateTime.now());
        euAnalysis = fundingAnalysisRepository.save(euAnalysis);

        // Verify IDs are as expected
        assertEquals(1L, ukAnalysis.getId());
        assertEquals(2L, euAnalysis.getId());

        // Verify we can retrieve by fixed IDs
        FundingAnalysis retrievedUk = fundingAnalysisRepository.findById(1L).orElse(null);
        FundingAnalysis retrievedEu = fundingAnalysisRepository.findById(2L).orElse(null);

        assertNotNull(retrievedUk);
        assertNotNull(retrievedEu);
        assertEquals(AnalysisType.UK_FUNDING_OPPORTUNITIES, retrievedUk.getAnalysisType());
        assertEquals(AnalysisType.EU_FUNDING_OPPORTUNITIES, retrievedEu.getAnalysisType());

        // Clean up
        cleanupService.manualCleanup();
    }
}
