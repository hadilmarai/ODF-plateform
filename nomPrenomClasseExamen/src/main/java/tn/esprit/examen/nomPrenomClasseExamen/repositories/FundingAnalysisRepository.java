package tn.esprit.examen.nomPrenomClasseExamen.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.examen.nomPrenomClasseExamen.entities.AnalysisType;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingAnalysis;

import java.util.List;
import java.util.Optional;

public interface FundingAnalysisRepository extends JpaRepository<FundingAnalysis, Long> {
    
    List<FundingAnalysis> findByAnalysisTypeOrderByCreatedAtDesc(AnalysisType analysisType);
    
    Optional<FundingAnalysis> findTopByAnalysisTypeOrderByCreatedAtDesc(AnalysisType analysisType);
    
    @Query("SELECT fa FROM FundingAnalysis fa WHERE fa.analysisType = :analysisType AND fa.status = :status")
    List<FundingAnalysis> findByAnalysisTypeAndStatus(@Param("analysisType") AnalysisType analysisType, 
                                                      @Param("status") String status);
}
