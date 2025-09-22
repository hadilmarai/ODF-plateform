# ODF Flask API Documentation

## Overview

The ODF Flask API automates the execution of both EU and UK funding opportunity analysis notebooks every 24 hours and provides RESTful endpoints for accessing the results in your development environment.

## Features

- **Automated Execution**: Runs `LLMODF.ipynb` (EU analysis) and `innovateuk.ipynb` (UK analysis) every 24 hours
- **RESTful API**: Access analysis results via HTTP endpoints
- **Real-time Status**: Monitor analysis progress and status
- **Data Export**: Export results in CSV, JSON, or Excel formats
- **Combined Analysis**: Access both EU and UK results together
- **Development Ready**: CORS enabled for frontend development

## Quick Start

### 1. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or use the startup script (recommended)
python start_api.py
```

### 2. Start the API

```bash
# Option 1: Use startup script (checks dependencies)
python start_api.py

# Option 2: Direct start
python odf_api.py

# Option 3: Windows batch file
start_odf_api.bat
```

### 3. Access the API

The API will be available at: **http://localhost:5000**

## API Endpoints

### Core Endpoints

#### `GET /`
**Home page with API documentation**
```json
{
  "message": "ODF EU & UK Funding Analysis API",
  "version": "1.0.0",
  "endpoints": { ... },
  "last_update": "2025-01-07T10:30:00",
  "status": "completed"
}
```

#### `GET /status`
**Get current analysis status**
```json
{
  "overall_status": "completed",
  "last_update": "2025-01-07T10:30:00",
  "is_running": false,
  "eu_analysis": {
    "status": "completed",
    "projects_count": 325,
    "relevant_count": 45,
    "llm_analyzed_count": 12
  },
  "uk_analysis": {
    "status": "completed", 
    "projects_count": 180,
    "relevant_count": 28,
    "llm_analyzed_count": 8
  }
}
```

#### `GET /health`
**Health check endpoint**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T10:30:00",
  "notebooks_available": {
    "eu": true,
    "uk": true
  }
}
```

### Analysis Results

#### `GET /analysis/eu`
**Get EU funding analysis results**
Returns the latest EU analysis data including keyword matching and LLM analysis.

#### `GET /analysis/uk`
**Get UK funding analysis results**
Returns the latest UK analysis data including keyword matching and LLM analysis.

#### `GET /analysis/combined`
**Get combined EU & UK analysis results**
Returns both EU and UK results in a single response.

#### `GET /statistics`
**Get analysis statistics**
```json
{
  "statistics": {
    "total_projects": 505,
    "total_relevant": 73,
    "total_llm_analyzed": 20,
    "relevance_rate": 14.46
  }
}
```

### Manual Triggers

#### `POST /trigger`
**Manually trigger full analysis (both notebooks)**
```bash
curl -X POST http://localhost:5000/trigger
```

#### `POST /trigger/eu`
**Manually trigger EU analysis only**
```bash
curl -X POST http://localhost:5000/trigger/eu
```

#### `POST /trigger/uk`
**Manually trigger UK analysis only**
```bash
curl -X POST http://localhost:5000/trigger/uk
```

### Data Export

#### `GET /export/<type>/<format>`
**Export analysis data**

**Parameters:**
- `type`: `eu`, `uk`, or `combined`
- `format`: `csv`, `json`, or `excel`

**Examples:**
```bash
# Export EU results as Excel
GET /export/eu/excel

# Export UK results as CSV
GET /export/uk/csv

# Export combined results as JSON
GET /export/combined/json
```

#### `GET /files`
**List available output files**
Shows all generated files with metadata (size, last modified, etc.)

## Automated Scheduling

The API automatically runs both notebooks every 24 hours:

1. **EU Analysis** (`LLMODF.ipynb`):
   - Scrapes EU funding portal
   - Performs keyword matching
   - Runs LLM analysis with Groq
   - Generates final results

2. **UK Analysis** (`innovateuk.ipynb`):
   - Scrapes UKRI funding portal
   - Performs keyword matching  
   - Runs LLM analysis with Groq
   - Generates final results

## Development Usage

### Frontend Integration

```javascript
// Check API status
fetch('http://localhost:5000/status')
  .then(response => response.json())
  .then(data => console.log('API Status:', data));

// Get EU analysis results
fetch('http://localhost:5000/analysis/eu')
  .then(response => response.json())
  .then(data => console.log('EU Results:', data));

// Trigger manual analysis
fetch('http://localhost:5000/trigger', { method: 'POST' })
  .then(response => response.json())
  .then(data => console.log('Analysis triggered:', data));
```

### Python Integration

```python
import requests

# Check status
response = requests.get('http://localhost:5000/status')
status = response.json()

# Get combined results
response = requests.get('http://localhost:5000/analysis/combined')
results = response.json()

# Export data
response = requests.get('http://localhost:5000/export/combined/json')
with open('combined_results.json', 'wb') as f:
    f.write(response.content)
```

## Output Files

The API generates several output files:

### EU Analysis Files
- `df_final_yes.xlsx` - Final EU LLM results
- `df_LLM_YES_EU.xlsx` - EU LLM analysis
- `projects_with_pertinence.csv` - EU keyword analysis
- `ODF_project_dataset.csv` - ODF projects reference

### UK Analysis Files
- `df_final_yes_uk_llm.xlsx` - Final UK LLM results
- `df_final_ukllm.xlsx` - UK LLM analysis
- `projets_UKRI_with_keywords.xlsx` - UK keyword analysis
- `projets_UKRI_full.txt` - Raw UK projects data

## Configuration

Edit `odf_api.py` to modify:

```python
CONFIG = {
    "update_interval_hours": 24,  # Change schedule interval
    "data_dir": "data",          # Export directory
    "logs_dir": "logs",          # Logs directory
    "notebooks": {
        "eu": "LLMODF.ipynb",
        "uk": "innovateuk.ipynb"
    }
}
```

## Troubleshooting

### Common Issues

1. **Notebooks not found**
   - Ensure `LLMODF.ipynb` and `innovateuk.ipynb` are in the same directory
   - Check file permissions

2. **ChromeDriver errors**
   - Download ChromeDriver and place in `chromedriver-win64/` folder
   - Ensure Chrome browser is installed

3. **Groq API errors**
   - Check API key in notebooks
   - Verify internet connection

4. **Port 5000 already in use**
   - Change port in `app.run()` call
   - Or stop other services using port 5000

### Logs

Check the `logs/` directory for detailed execution logs:
- `logs/odf_api_YYYYMMDD_HHMMSS.log`

## Dependencies

See `requirements.txt` for full list. Key dependencies:
- Flask 2.3.3
- pandas 2.0.3
- selenium 4.15.2
- jupyter 1.0.0
- groq 0.4.2

## Support

The API provides comprehensive logging and error handling. Check:
1. API status endpoint: `/status`
2. Log files in `logs/` directory
3. Console output when running

For development, the API runs with CORS enabled and detailed error messages.
