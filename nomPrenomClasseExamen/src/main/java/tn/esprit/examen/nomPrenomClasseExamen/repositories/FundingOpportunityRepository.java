package tn.esprit.examen.nomPrenomClasseExamen.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.examen.nomPrenomClasseExamen.entities.FundingOpportunity;

import java.util.List;

public interface FundingOpportunityRepository extends JpaRepository<FundingOpportunity, Long> {
    
    List<FundingOpportunity> findByFundingAnalysisId(Long fundingAnalysisId);
    
    @Query("SELECT fo FROM FundingOpportunity fo WHERE fo.fundingAnalysis.id = :analysisId AND fo.pertinence = :pertinence")
    List<FundingOpportunity> findByAnalysisIdAndPertinence(@Param("analysisId") Long analysisId, 
                                                           @Param("pertinence") String pertinence);
    
    @Query("SELECT fo FROM FundingOpportunity fo WHERE fo.fundingAnalysis.id = :analysisId AND fo.dataSource = :dataSource")
    List<FundingOpportunity> findByAnalysisIdAndDataSource(@Param("analysisId") Long analysisId, 
                                                           @Param("dataSource") String dataSource);
    
    @Query("SELECT COUNT(fo) FROM FundingOpportunity fo WHERE fo.fundingAnalysis.id = :analysisId AND fo.pertinence = 'Yes'")
    Long countRelevantOpportunitiesByAnalysisId(@Param("analysisId") Long analysisId);

    @Query("SELECT fo FROM FundingOpportunity fo WHERE fo.pertinence = :pertinence")
    List<FundingOpportunity> findByPertinence(@Param("pertinence") String pertinence);

    @Query("SELECT fo FROM FundingOpportunity fo WHERE " +
           "LOWER(fo.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(fo.mainTitle) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(fo.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<FundingOpportunity> searchByTitleOrDescription(@Param("searchTerm") String searchTerm);

    @Query("SELECT fo FROM FundingOpportunity fo WHERE " +
           "fo.dateOuverture LIKE CONCAT('%', :startDate, '%') OR " +
           "fo.startDate LIKE CONCAT('%', :startDate, '%') OR " +
           "fo.dateCloture LIKE CONCAT('%', :endDate, '%') OR " +
           "fo.deadline LIKE CONCAT('%', :endDate, '%')")
    List<FundingOpportunity> findByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT DISTINCT fo.dataSource FROM FundingOpportunity fo WHERE fo.dataSource IS NOT NULL")
    List<String> findAllDistinctDataSources();

    /**
     * Delete opportunities with empty or null matching keywords
     */
    @Modifying
    @Query("DELETE FROM FundingOpportunity fo WHERE fo.matchingWords IS NULL OR " +
           "TRIM(fo.matchingWords) = '' OR " +
           "LOWER(TRIM(fo.matchingWords)) IN ('null', 'nan', 'none', 'n/a', 'undefined')")
    void deleteOpportunitiesWithEmptyMatchingWords();
}
