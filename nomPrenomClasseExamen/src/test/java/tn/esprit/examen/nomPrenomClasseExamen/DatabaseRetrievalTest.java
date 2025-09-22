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
    "flask.api.base-url=http://localhost:5000"
})
class DatabaseRetrievalTest {

    @Autowired
    private FundingAnalysisService fundingAnalysisService;

    @Autowired
    private FundingAnalysisRepository fundingAnalysisRepository;

    @Autowired
    private FundingOpportunityRepository fundingOpportunityRepository;

    @Test
    void testCreateAndRetrieveFundingAnalysis() {
        // Create test data
        FundingAnalysis analysis = new FundingAnalysis();
        analysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        analysis.setStatus("test");
        analysis.setProjectsCount(5);
        analysis.setRelevantCount(2);
        analysis.setCreatedAt(LocalDateTime.now());

        // Save analysis
        FundingAnalysis savedAnalysis = fundingAnalysisRepository.save(analysis);
        assertNotNull(savedAnalysis.getId());

        // Create test opportunities
        FundingOpportunity opportunity1 = new FundingOpportunity();
        opportunity1.setFundingAnalysis(savedAnalysis);
        opportunity1.setTitre("Test Opportunity 1");
        opportunity1.setDescription("Test description for opportunity 1");
        opportunity1.setPertinence("Yes");
        opportunity1.setDataSource("Test Source 1");

        FundingOpportunity opportunity2 = new FundingOpportunity();
        opportunity2.setFundingAnalysis(savedAnalysis);
        opportunity2.setTitre("Test Opportunity 2");
        opportunity2.setDescription("Test description for opportunity 2");
        opportunity2.setPertinence("No");
        opportunity2.setDataSource("Test Source 2");

        fundingOpportunityRepository.save(opportunity1);
        fundingOpportunityRepository.save(opportunity2);

        // Test retrieval methods
        FundingAnalysis retrievedAnalysis = fundingAnalysisService.getFundingAnalysisById(savedAnalysis.getId());
        assertNotNull(retrievedAnalysis);
        assertEquals(savedAnalysis.getId(), retrievedAnalysis.getId());

        // Test search functionality
        List<FundingOpportunity> searchResults = fundingAnalysisService.searchFundingOpportunities("Test Opportunity");
        assertTrue(searchResults.size() >= 2);

        // Test pertinence filtering
        List<FundingOpportunity> relevantOpportunities = fundingAnalysisService.getFundingOpportunitiesByPertinence("Yes");
        assertTrue(relevantOpportunities.size() >= 1);

        // Test data sources
        List<String> dataSources = fundingAnalysisService.getAllDataSources();
        assertTrue(dataSources.contains("Test Source 1"));
        assertTrue(dataSources.contains("Test Source 2"));

        // Test statistics
        Map<String, Object> statistics = fundingAnalysisService.getAnalysisStatistics(savedAnalysis.getId());
        assertNotNull(statistics);
        assertTrue(statistics.containsKey("totalOpportunities"));
        assertTrue(statistics.containsKey("relevantOpportunities"));

        // Clean up
        fundingOpportunityRepository.delete(opportunity1);
        fundingOpportunityRepository.delete(opportunity2);
        fundingAnalysisRepository.delete(savedAnalysis);
    }

    @Test
    void testGetAllFundingAnalyses() {
        List<FundingAnalysis> analyses = fundingAnalysisService.getAllFundingAnalyses();
        assertNotNull(analyses);
        // Should return empty list or existing analyses
    }

    @Test
    void testSearchWithEmptyTerm() {
        List<FundingOpportunity> results = fundingAnalysisService.searchFundingOpportunities("");
        assertNotNull(results);
        assertTrue(results.isEmpty());

        results = fundingAnalysisService.searchFundingOpportunities(null);
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }
}
