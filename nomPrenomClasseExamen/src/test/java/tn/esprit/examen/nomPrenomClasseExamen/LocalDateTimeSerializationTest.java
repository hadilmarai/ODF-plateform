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
class LocalDateTimeSerializationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testLocalDateTimeSerialization() throws Exception {
        // Create a FundingAnalysis with LocalDateTime
        FundingAnalysis analysis = new FundingAnalysis();
        analysis.setId(1L);
        analysis.setAnalysisType(AnalysisType.UK_FUNDING_OPPORTUNITIES);
        analysis.setCreatedAt(LocalDateTime.now());
        analysis.setLastUpdate(LocalDateTime.now().minusHours(1));
        analysis.setStatus("test");
        analysis.setProjectsCount(10);
        analysis.setRelevantCount(5);

        // Serialize to JSON
        String json = objectMapper.writeValueAsString(analysis);
        
        // Verify JSON contains the LocalDateTime fields
        assertNotNull(json);
        assertTrue(json.contains("createdAt"));
        assertTrue(json.contains("lastUpdate"));
        assertTrue(json.contains("UK_FUNDING_OPPORTUNITIES"));
        
        // Deserialize back from JSON
        FundingAnalysis deserializedAnalysis = objectMapper.readValue(json, FundingAnalysis.class);
        
        // Verify deserialization worked
        assertNotNull(deserializedAnalysis);
        assertEquals(analysis.getId(), deserializedAnalysis.getId());
        assertEquals(analysis.getAnalysisType(), deserializedAnalysis.getAnalysisType());
        assertEquals(analysis.getStatus(), deserializedAnalysis.getStatus());
        assertEquals(analysis.getProjectsCount(), deserializedAnalysis.getProjectsCount());
        assertEquals(analysis.getRelevantCount(), deserializedAnalysis.getRelevantCount());
        
        // LocalDateTime should be properly serialized/deserialized
        assertNotNull(deserializedAnalysis.getCreatedAt());
        assertNotNull(deserializedAnalysis.getLastUpdate());
    }
}
