# Troubleshooting Guide

## JSON Parsing Error Fix

The error you encountered indicates a JSON parsing issue with NaN values. Here are the fixes implemented:

### 1. NaN Value Handling (MAIN FIX)
- Enabled `JsonParser.Feature.ALLOW_NON_NUMERIC_NUMBERS` in ObjectMapper
- Configured RestTemplate to use custom ObjectMapper
- Added proper NaN handling in data processing methods

### 2. Enhanced Error Handling
- Added `@JsonIgnoreProperties(ignoreUnknown = true)` to all DTO classes
- Implemented fallback parsing mechanisms
- Added detailed logging for debugging

### 3. Robust JSON Parsing
- Added ObjectMapper with lenient configuration
- Implemented WebClient as fallback option
- Better error messages and logging

### 3. Testing Endpoints

Before trying to fetch data, test the Flask API connectivity:

```bash
# Test UK endpoint
curl http://localhost:8080/api/funding-analysis/test-flask-api/uk

# Test EU endpoint  
curl http://localhost:8080/api/funding-analysis/test-flask-api/eu
```

### 4. Step-by-Step Debugging

1. **Check Flask API is running:**
   ```bash
   curl http://localhost:5000/analysis/uk
   curl http://localhost:5000/analysis/eu
   ```

2. **Test Spring Boot connectivity:**
   ```bash
   curl http://localhost:8080/api/funding-analysis/test-flask-api/uk
   ```

3. **Try fetching data:**
   ```bash
   curl -X POST http://localhost:8080/api/funding-analysis/fetch/uk
   ```

### 5. Common Issues and Solutions

#### Issue: "Failed to fetch EU funding data"
**Solution:** 
- Ensure Flask API is running on localhost:5000
- Check that endpoints return valid JSON
- Use test endpoint to verify connectivity

#### Issue: JSON parsing errors
**Solution:**
- Updated DTO classes with `@JsonIgnoreProperties(ignoreUnknown = true)`
- Added ObjectMapper with lenient configuration
- Implemented fallback parsing mechanisms

#### Issue: LocalDateTime serialization error
**Solution:**
- Added `jackson-datatype-jsr310` dependency
- Registered JavaTimeModule in ObjectMapper
- Configured JSON date format in application.properties

#### Issue: Empty response
**Solution:**
- Check Flask API logs for errors
- Verify endpoint URLs are correct
- Ensure Flask API returns data in expected format

### 6. Configuration Check

Verify your `application.properties`:
```properties
flask.api.base-url=http://localhost:5000
spring.datasource.url=jdbc:mysql://localhost:3306/examentodayDb?createDatabaseIfNotExist=true
```

### 7. Database Setup

If database issues occur:
```sql
-- Run this in MySQL/phpMyAdmin
CREATE DATABASE IF NOT EXISTS examentodayDb;
USE examentodayDb;
```

### 8. Logs to Check

Check Spring Boot logs for:
- "Raw response received from Flask API"
- "Successfully parsed Flask API response"
- Any JSON parsing errors

### 9. Manual Testing

You can also test the endpoints manually:

1. **Start your Spring Boot app**
2. **Open browser/Postman**
3. **Test connectivity first:**
   - GET `http://localhost:8080/api/funding-analysis/test-flask-api/uk`
4. **If connectivity works, try fetching:**
   - POST `http://localhost:8080/api/funding-analysis/fetch/uk`

### 10. Expected Response Format

The Flask API should return JSON in this format:
```json
{
  "analysis_type": "UK Funding Opportunities",
  "last_update": null,
  "results": {
    "segment_name": {
      "columns": [...],
      "count": 123,
      "data": [...]
    }
  },
  "statistics": {
    "llm_analyzed_count": 0,
    "projects_count": 0,
    "relevant_count": 0
  },
  "status": "running"
}
```

If your Flask API returns a different format, we may need to adjust the DTO classes accordingly.
