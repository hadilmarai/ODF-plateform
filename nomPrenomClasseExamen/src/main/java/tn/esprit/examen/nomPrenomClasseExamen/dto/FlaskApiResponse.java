package tn.esprit.examen.nomPrenomClasseExamen.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FlaskApiResponse {

    @JsonProperty("analysis_type")
    private String analysisType;

    @JsonProperty("last_update")
    private String lastUpdate;

    private Map<String, ResultSegment> results;

    private Statistics statistics;

    private String status;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResultSegment {
        private List<String> columns;
        private Integer count;
        private List<Map<String, Object>> data;
        private String file;
        @JsonProperty("size_kb")
        private Double sizeKb;
        private String type;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Statistics {
        @JsonProperty("llm_analyzed_count")
        private Integer llmAnalyzedCount;

        @JsonProperty("projects_count")
        private Integer projectsCount;

        @JsonProperty("relevant_count")
        private Integer relevantCount;
    }
}
