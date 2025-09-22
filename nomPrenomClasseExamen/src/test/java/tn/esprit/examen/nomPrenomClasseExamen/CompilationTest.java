package tn.esprit.examen.nomPrenomClasseExamen;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CompilationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testObjectMapperConfiguration() throws Exception {
        // Test that ObjectMapper is properly configured and can handle LocalDateTime
        FundingAnalysis analysis = new FundingAnalysis();
        analysis.setId(1L);
        analysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        analysis.setCreatedAt(LocalDateTime.now());
        analysis.setStatus("test");

        // This should not throw any compilation or runtime errors
        String json = objectMapper.writeValueAsString(analysis);
        assertNotNull(json);
        assertTrue(json.contains("UK_FUNDING_OPPORTUNITIES"));
        
        // Deserialize back
        FundingAnalysis deserialized = objectMapper.readValue(json, FundingAnalysis.class);
        assertNotNull(deserialized);
        assertEquals(analysis.getId(), deserialized.getId());
        assertEquals(analysis.getAnalysisType(), deserialized.getAnalysisType());
    }

    @Test
    void contextLoads() {
        // This test ensures the application context loads without compilation errors
        assertNotNull(objectMapper);
    }
}
