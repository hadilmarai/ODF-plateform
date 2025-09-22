package tn.esprit.examen.nomPrenomClasseExamen.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "funding_analysis")
public class FundingAnalysis implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_type", nullable = false)
    AnalysisType analysisType;

    @Column(name = "last_update")
    LocalDateTime lastUpdate;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "status")
    String status;

    @Column(name = "llm_analyzed_count")
    Integer llmAnalyzedCount;

    @Column(name = "projects_count")
    Integer projectsCount;

    @Column(name = "relevant_count")
    Integer relevantCount;

    @OneToMany(mappedBy = "fundingAnalysis", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    List<FundingOpportunity> opportunities;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
