package tn.esprit.examen.nomPrenomClasseExamen.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import com.fasterxml.jackson.annotation.JsonBackReference;

import java.io.Serializable;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "funding_opportunity")
public class FundingOpportunity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "titre", length = 1000)
    String titre;

    @Column(name = "lien", length = 2000)
    String lien;

    @Column(name = "url", length = 2000)
    String url;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "date_ouverture")
    String dateOuverture;

    @Column(name = "start_date")
    String startDate;

    @Column(name = "date_cloture")
    String dateCloture;

    @Column(name = "deadline")
    String deadline;

    @Column(name = "pertinence")
    String pertinence;

    @Column(name = "matching_words", columnDefinition = "TEXT")
    String matchingWords;

    @Column(name = "pertinence_llm")
    String pertinenceLlm;

    @Column(name = "resume_llm", columnDefinition = "TEXT")
    String resumeLlm;

    @Column(name = "reponse_brute", columnDefinition = "TEXT")
    String reponseBrute;

    @Column(name = "status")
    String status;

    @Column(name = "title", length = 1000)
    String title;

    @Column(name = "main_title", length = 1000)
    String mainTitle; // Main title field

    @Column(name = "data_source")
    String dataSource; // To distinguish between different result segments

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funding_analysis_id", nullable = false)
    @JsonBackReference
    FundingAnalysis fundingAnalysis;
}
