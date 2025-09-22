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
import tn.esprit.examen.nomPrenomClasseExamen.services.FundingAnalysisService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "funding.database.cleanup.enabled=false", // Disable cleanup for tests
    "funding.database.cleanup.auto-fetch=false"
})
class ProjectEndpointsTest {

    @Autowired
    private FundingAnalysisService fundingAnalysisService;

    @Autowired
    private FundingAnalysisRepository fundingAnalysisRepository;

    @Autowired
    private FundingOpportunityRepository fundingOpportunityRepository;

    @Test
    void testUkAndEuProjectRetrieval() {
        // Clean up first
        fundingOpportunityRepository.deleteAll();
        fundingAnalysisRepository.deleteAll();

        // Create UK analysis with ID = 1
        FundingAnalysis ukAnalysis = new FundingAnalysis();
        ukAnalysis.setId(1L);
        ukAnalysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        ukAnalysis.setStatus("test");
        ukAnalysis.setCreatedAt(LocalDateTime.now());
        ukAnalysis = fundingAnalysisRepository.save(ukAnalysis);

        // Create EU analysis with ID = 2
        FundingAnalysis euAnalysis = new FundingAnalysis();
        euAnalysis.setId(2L);
        euAnalysis.setAnalysisType(AnalysisType.EU_FUNDING_OPPORTUNITIES);
        euAnalysis.setStatus("test");
        euAnalysis.setCreatedAt(LocalDateTime.now());
        euAnalysis = fundingAnalysisRepository.save(euAnalysis);

        // Create UK opportunities
        FundingOpportunity ukOpp1 = new FundingOpportunity();
        ukOpp1.setFundingAnalysis(ukAnalysis);
        ukOpp1.setTitre("UK Project 1");
        ukOpp1.setPertinence("Yes");
        fundingOpportunityRepository.save(ukOpp1);

        FundingOpportunity ukOpp2 = new FundingOpportunity();
        ukOpp2.setFundingAnalysis(ukAnalysis);
        ukOpp2.setTitre("UK Project 2");
        ukOpp2.setPertinence("No");
        fundingOpportunityRepository.save(ukOpp2);

        // Create EU opportunities
        FundingOpportunity euOpp1 = new FundingOpportunity();
        euOpp1.setFundingAnalysis(euAnalysis);
        euOpp1.setTitle("EU Project 1");
        euOpp1.setPertinence("Yes");
        fundingOpportunityRepository.save(euOpp1);

        // Test UK projects retrieval
        List<FundingOpportunity> ukProjects = fundingAnalysisService.getFundingOpportunitiesByAnalysisId(1L);
        assertEquals(2, ukProjects.size());

        // Test EU projects retrieval
        List<FundingOpportunity> euProjects = fundingAnalysisService.getFundingOpportunitiesByAnalysisId(2L);
        assertEquals(1, euProjects.size());

        // Test UK relevant projects
        List<FundingOpportunity> ukRelevant = fundingAnalysisService.getRelevantFundingOpportunities(1L);
        assertEquals(1, ukRelevant.size());
        assertEquals("UK Project 1", ukRelevant.get(0).getTitre());

        // Test EU relevant projects
        List<FundingOpportunity> euRelevant = fundingAnalysisService.getRelevantFundingOpportunities(2L);
        assertEquals(1, euRelevant.size());
        assertEquals("EU Project 1", euRelevant.get(0).getTitle());

        // Test statistics
        Map<String, Object> ukStats = fundingAnalysisService.getAnalysisStatistics(1L);
        assertNotNull(ukStats);
        assertEquals(2L, ukStats.get("totalOpportunities"));
        assertEquals(1L, ukStats.get("relevantOpportunities"));

        Map<String, Object> euStats = fundingAnalysisService.getAnalysisStatistics(2L);
        assertNotNull(euStats);
        assertEquals(1L, euStats.get("totalOpportunities"));
        assertEquals(1L, euStats.get("relevantOpportunities"));

        // Clean up
        fundingOpportunityRepository.deleteAll();
        fundingAnalysisRepository.deleteAll();
    }
}
