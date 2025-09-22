package tn.esprit.examen.nomPrenomClasseExamen;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tn.esprit.examen.nomPrenomClasseExamen.dto.FlaskApiResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class JsonParsingTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testNaNHandling() throws Exception {
        // Test JSON with NaN values
        String jsonWithNaN = """
            {
                "analysis_type": "UK Funding Opportunities",
                "last_update": null,
                "results": {
                    "UK Keyword Analysis": {
                        "columns": ["Title", "Value"],
                        "count": 1,
                        "data": [
                            {
                                "Title": "Test",
                                "Value": NaN
                            }
                        ]
                    }
                },
                "status": "running"
            }
            """;

        // This should not throw an exception now
        FlaskApiResponse response = objectMapper.readValue(jsonWithNaN, FlaskApiResponse.class);
        
        assertNotNull(response);
        assertEquals("UK Funding Opportunities", response.getAnalysisType());
        assertEquals("running", response.getStatus());
        assertNotNull(response.getResults());
        assertTrue(response.getResults().containsKey("UK Keyword Analysis"));
        
        FlaskApiResponse.ResultSegment segment = response.getResults().get("UK Keyword Analysis");
        assertNotNull(segment);
        assertEquals(1, segment.getCount());
        assertNotNull(segment.getData());
        assertEquals(1, segment.getData().size());
        
        // The NaN value should be handled properly
        Object nanValue = segment.getData().get(0).get("Value");
        // NaN might be parsed as Double.NaN or null, both are acceptable
        assertTrue(nanValue == null || (nanValue instanceof Double && ((Double) nanValue).isNaN()));
    }
}
