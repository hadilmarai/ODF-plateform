package tn.esprit.examen.nomPrenomClasseExamen;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;
import tn.esprit.examen.nomPrenomClasseExamen.repositories.FundingAnalysisRepository;
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingAnalysisService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "flask.api.base-url=http://localhost:5000"
})
class FundingAnalysisIntegrationTest {

    @Autowired
    private FundingAnalysisRepository fundingAnalysisRepository;

    @Autowired
    private FundingAnalysisService fundingAnalysisService;

    @Test
    void contextLoads() {
        assertNotNull(fundingAnalysisRepository);
        assertNotNull(fundingAnalysisService);
    }

    @Test
    void testCreateFundingAnalysis() {
        // Create a test funding analysis
        FundingAnalysis analysis = new FundingAnalysis();
        analysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        analysis.setStatus("test");
        analysis.setProjectsCount(10);
        analysis.setRelevantCount(5);
        analysis.setCreatedAt(LocalDateTime.now());

        // Save it
        FundingAnalysis saved = fundingAnalysisRepository.save(analysis);

        // Verify it was saved
        assertNotNull(saved.getId());
        assertEquals(AnalysisType.UK_FUNDING_OPPORTUNITIES, saved.getAnalysisType());
        assertEquals("test", saved.getStatus());
        assertEquals(10, saved.getProjectsCount());
        assertEquals(5, saved.getRelevantCount());

        // Clean up
        fundingAnalysisRepository.delete(saved);
    }
}
