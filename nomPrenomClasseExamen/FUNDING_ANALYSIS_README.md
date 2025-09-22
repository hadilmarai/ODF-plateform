# Funding Analysis Database Integration

This Spring Boot application integrates with your Flask API to fetch and store funding analysis data in a MySQL database.

## Overview

The system fetches funding analysis data from your Flask API endpoints (`/analysis/uk` and `/analysis/eu`) and stores it in a structured database format for persistence and easy querying.

## Database Schema

### Tables Created

1. **funding_analysis** - Main analysis records
   - `id` (Primary Key)
   - `analysis_type` (UK_FUNDING_OPPORTUNITIES or EU_FUNDING_OPPORTUNITIES)
   - `last_update` (DateTime)
   - `created_at` (DateTime)
   - `status` (String)
   - `llm_analyzed_count` (Integer)
   - `projects_count` (Integer)
   - `relevant_count` (Integer)

2. **funding_opportunity** - Individual funding opportunities
   - `id` (Primary Key)
   - `funding_analysis_id` (Foreign Key)
   - `titre` (Title in French)
   - `title` (Title in English)
   - `lien` (Link in French)
   - `url` (URL in English)
   - `description` (Text)
   - `date_ouverture` (Opening date in French)
   - `start_date` (Start date in English)
   - `date_cloture` (Closing date in French)
   - `deadline` (Deadline in English)
   - `pertinence` (Relevance)
   - `matching_words` (Text)
   - `pertinence_llm` (LLM relevance)
   - `resume_llm` (LLM summary)
   - `reponse_brute` (Raw response)
   - `status` (Status)
   - `data_source` (Source segment name)

## API Endpoints

### Fetch Data from Flask API

**POST** `/api/funding-analysis/fetch/uk`
- Fetches UK funding data from Flask API and stores in database
- Returns: Analysis ID, opportunities count, relevant count

**POST** `/api/funding-analysis/fetch/eu`
- Fetches EU funding data from Flask API and stores in database
- Returns: Analysis ID, opportunities count, relevant count

### Query Stored Data

**GET** `/api/funding-analysis`
- Returns all funding analyses

**GET** `/api/funding-analysis/type/{analysisType}`
- Returns analyses by type (uk or eu)

**GET** `/api/funding-analysis/latest/{analysisType}`
- Returns the latest analysis for the specified type

**GET** `/api/funding-analysis/{analysisId}/opportunities`
- Returns all opportunities for a specific analysis

**GET** `/api/funding-analysis/{analysisId}/opportunities/relevant`
- Returns only relevant opportunities (Pertinence = "Yes")

**GET** `/api/funding-analysis/{analysisId}/opportunities/source/{dataSource}`
- Returns opportunities from a specific data source segment

**DELETE** `/api/funding-analysis/{analysisId}`
- Deletes an analysis and all its opportunities

### Database Retrieval Endpoints

**GET** `/api/funding-analysis/{analysisId}`
- Get specific funding analysis by ID with all details

**GET** `/api/funding-analysis/opportunity/{opportunityId}`
- Get specific funding opportunity by ID

**GET** `/api/funding-analysis/search?q={searchTerm}`
- Search funding opportunities by title or description

**GET** `/api/funding-analysis/opportunities/pertinence/{pertinence}`
- Get opportunities by pertinence status (Yes, No, Oui, Non)

**GET** `/api/funding-analysis/opportunities/date-range?startDate={start}&endDate={end}`
- Get opportunities within date range

**GET** `/api/funding-analysis/data-sources`
- Get all unique data source names

**GET** `/api/funding-analysis/{analysisId}/statistics`
- Get detailed statistics for specific analysis

## Configuration

### Application Properties

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/examentodayDb?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# Flask API Configuration
flask.api.base-url=http://localhost:5000
```

## Usage Examples

### 1. Fetch UK Funding Data

```bash
curl -X POST http://localhost:8080/api/funding-analysis/fetch/uk
```

Response:
```json
{
  "message": "UK funding data fetched and stored successfully",
  "analysisId": 1,
  "opportunitiesCount": 109,
  "relevantCount": 5
}
```

### 2. Get Latest UK Analysis

```bash
curl http://localhost:8080/api/funding-analysis/latest/uk
```

### 3. Get Relevant Opportunities

```bash
curl http://localhost:8080/api/funding-analysis/1/opportunities/relevant
```

## Data Mapping

The system maps Flask API response fields to database columns:

### UK Data Mapping
- `Titre` → `titre`
- `Lien` → `lien`
- `Description` → `description`
- `Date d'ouverture` → `date_ouverture`
- `Date de clôture` → `date_cloture`
- `Pertinence` → `pertinence`
- `Matching Word(s)` → `matching_words`
- `Pertinence LLM` → `pertinence_llm`
- `Résumé LLM` → `resume_llm`
- `Réponse brute` → `reponse_brute`

### EU Data Mapping
- `Title` → `title`
- `URL` → `url`
- `Start_date` → `start_date`
- `Deadline` → `deadline`
- `Status` → `status`
- (Plus all common fields)

## Running the Application

1. Ensure MySQL is running on localhost:3306
2. Ensure your Flask API is running on localhost:5000
3. Start the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
4. The application will be available at http://localhost:8080

## Testing

Run the integration tests:
```bash
./mvnw test
```

## Database Access

You can access the stored data through:
- **phpMyAdmin**: http://localhost/phpmyadmin
- **Direct MySQL**: Connect to `examentodayDb` database
- **API endpoints**: Use the REST endpoints described above

## Data Persistence Benefits

1. **Historical Data**: Keep track of funding analysis over time
2. **Fast Queries**: Query specific opportunities without calling Flask API
3. **Data Analysis**: Perform complex queries and analytics on stored data
4. **Backup**: Database provides reliable data persistence
5. **Integration**: Easy integration with other systems and reporting tools
