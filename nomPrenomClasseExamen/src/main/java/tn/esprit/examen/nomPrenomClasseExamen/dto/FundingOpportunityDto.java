package tn.esprit.examen.nomPrenomClasseExamen.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FundingOpportunityDto {
    
    Long id;
    
    // Titles (French/English)
    String titre;
    String title;
    String mainTitle; // Main title field
    
    // Links (French/English)
    String lien;
    String url;
    
    // Content
    String description;
    
    // Dates (French/English)
    String dateOuverture;
    String startDate;
    String dateCloture;
    String deadline;
    
    // Relevance Analysis
    String pertinence;
    String matchingWords;
    String pertinenceLlm;
    String resumeLlm;
    String reponseBrute;
    
    // Metadata
    String status;
    String dataSource;
    
    // Analysis info (without circular reference)
    Long analysisId;
    String analysisType;
}
