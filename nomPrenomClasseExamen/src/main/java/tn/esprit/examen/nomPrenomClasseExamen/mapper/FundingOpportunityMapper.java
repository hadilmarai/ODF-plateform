package tn.esprit.examen.nomPrenomClasseExamen.mapper;

import org.springframework.stereotype.Component;
import tn.esprit.examen.nomPrenomClasseExamen.dto.FundingOpportunityDto;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class FundingOpportunityMapper {

    /**
     * Convert FundingOpportunity entity to DTO (without circular reference)
     */
    public FundingOpportunityDto toDto(FundingOpportunity entity) {
        if (entity == null) {
            return null;
        }

        FundingOpportunityDto dto = new FundingOpportunityDto();
        dto.setId(entity.getId());
        dto.setTitre(entity.getTitre());
        dto.setTitle(entity.getTitle());
        dto.setMainTitle(entity.getMainTitle()); // Main title field
        dto.setLien(entity.getLien());
        dto.setUrl(entity.getUrl());
        dto.setDescription(entity.getDescription());
        dto.setDateOuverture(entity.getDateOuverture());
        dto.setStartDate(entity.getStartDate());
        dto.setDateCloture(entity.getDateCloture());
        dto.setDeadline(entity.getDeadline());
        dto.setPertinence(entity.getPertinence());
        dto.setMatchingWords(entity.getMatchingWords());
        dto.setPertinenceLlm(entity.getPertinenceLlm());
        dto.setResumeLlm(entity.getResumeLlm());
        dto.setReponseBrute(entity.getReponseBrute());
        dto.setStatus(entity.getStatus());
        dto.setDataSource(entity.getDataSource());

        // Add analysis info without circular reference
        if (entity.getFundingAnalysis() != null) {
            dto.setAnalysisId(entity.getFundingAnalysis().getId());
            dto.setAnalysisType(entity.getFundingAnalysis().getAnalysisType().toString());
        }

        return dto;
    }

    /**
     * Convert list of FundingOpportunity entities to DTOs
     */
    public List<FundingOpportunityDto> toDtoList(List<FundingOpportunity> entities) {
        if (entities == null) {
            return null;
        }
        return entities.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}
