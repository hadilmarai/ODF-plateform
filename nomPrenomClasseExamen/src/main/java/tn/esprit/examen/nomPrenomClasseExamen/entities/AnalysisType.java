package tn.esprit.examen.nomPrenomClasseExamen.entities;

public enum AnalysisType {
    UK_FUNDING_OPPORTUNITIES("UK Funding Opportunities"),
    EU_FUNDING_OPPORTUNITIES("EU Funding Opportunities");
    
    private final String displayName;
    
    AnalysisType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
