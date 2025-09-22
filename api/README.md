# ODF Funding Analysis API

A unified Express.js API that combines EU and UK funding opportunities analysis, replacing both Flask and Spring Boot APIs with a single, efficient Node.js solution.

## 🚀 Features

- **Unified API**: Single endpoint for both EU and UK funding analysis
- **Database Integration**: MySQL database for persistent data storage
- **Excel Processing**: Automatic reading and processing of Excel files
- **Automatic Data Loading**: Loads Excel files into database on startup
- **Jupyter Notebook Execution**: Direct execution of analysis notebooks
- **Scheduled Analysis**: Automatic 24-hour scheduled execution
- **Real-time Status**: Live analysis status and progress tracking
- **File Upload**: Manual Excel file upload and processing
- **RESTful Endpoints**: Clean, consistent API structure

## 📋 Prerequisites

- Node.js (v16 or higher)
- Python with Jupyter installed
- MySQL database
- Required Python packages for notebooks

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL/MariaDB server running
- Git

### Installation Steps

1. **Navigate to API directory:**
   ```bash
   cd api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=odf_funding
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Set up the database:**
   ```bash
   npm run setup:db
   ```

   This will:
   - Create the `odf_funding` database if it doesn't exist
   - Create all required tables with proper indexes
   - Create a default admin user (admin/admin123)

5. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

6. **Verify installation:**
   - Open http://localhost:5000 in your browser
   - You should see the API documentation
   - Default admin login: `admin` / `admin123` (⚠️ Change this immediately!)

### Alternative Setup Options

**Option 1: Database only**
```bash
npm run setup
```
This runs `npm install` and `npm run setup:db` in sequence.

**Option 2: Full setup with sample data (Recommended for development)**
```bash
npm run setup:full
```
This sets up the database AND populates it with sample users, API keys, and test data.

**Option 3: Add sample data to existing setup**
```bash
npm run seed
```
This populates the database with sample data for testing.

## 🔄 Automatic Data Loading

The API automatically loads Excel files into the database on startup:

### **Excel Files Expected:**
- `df_LLM_ALL_EU.xlsx` - EU projects data (with URL column)
- `df_yes_avec_pertinence_et_resume_uk.xlsx` - UK projects data (with URL column)

### **Startup Behavior:**
1. **Clears existing project data** (keeps users and API keys)
2. **Loads EU projects** from `df_LLM_ALL_EU.xlsx`
3. **Loads UK projects** from `df_final_ukllm.xlsx`
4. **Shows loading summary** with project counts

### **Configuration:**
```env
# Enable/disable automatic loading (default: true)
AUTO_LOAD_EXCEL_ON_STARTUP=true

# Clear existing data before loading (default: true)
CLEAR_DATA_ON_STARTUP=true

# Excel file paths (relative to project root)
EU_EXCEL_FILE=../df_LLM_ALL_EU.xlsx
UK_EXCEL_FILE=../df_yes_avec_pertinence_et_resume_uk.xlsx
```

### **Manual Data Management:**
```bash
# Check data status
curl http://localhost:5000/data/status

# Reload all data (admin only)
curl -X POST -H "Authorization: Bearer <admin-token>" \
     http://localhost:5000/data/reload

# Reload only EU data
curl -X POST -H "Authorization: Bearer <admin-token>" \
     http://localhost:5000/data/reload/eu

# Reload only UK data
curl -X POST -H "Authorization: Bearer <admin-token>" \
     http://localhost:5000/data/reload/uk
```

## 🔧 Configuration

Edit the `.env` file with your settings:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=odf_funding
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## 🔧 Database Management

### Setup Database
```bash
npm run setup:db
```

### Migration Commands
```bash
# Run pending migrations
npm run migrate run

# Create a new migration
npm run migrate create "add_new_feature"

# Check migration status
npm run migrate status

# Rollback last migration
npm run migrate rollback
```

### Seeder Commands
```bash
# Seed all data (users, API keys, sample projects)
npm run seed

# Seed specific data types
npm run seed:users      # Create sample users
npm run seed:apikeys    # Generate API keys for users
npm run seed:data       # Add sample EU/UK projects

# Generate JWT tokens for all users
npm run seed:tokens

# Check seeding status
npm run seed:status

# Clear all seeded data
npm run seed:clear
```

## 🎭 Sample Data for Testing

After running `npm run seed` or `npm run setup:full`, you'll have:

### 👥 Sample Users
| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | admin123 | admin | Full admin access |
| john_doe | password123 | user | Regular user |
| jane_smith | password123 | user | Regular user |
| researcher1 | research123 | user | Research user |
| analyst | analyst123 | user | Analysis user |
| demo_user | demo123 | user | Demo account |

### 🔑 API Keys
- Each user gets API keys with appropriate permissions
- Admin users get full access API keys
- Regular users get limited access API keys
- Keys are displayed after seeding for easy testing

### 📊 Sample Projects
- **5 EU projects** with various statuses and pertinence levels
- **5 UK projects** with different characteristics
- **Sample analysis logs** showing completed and failed runs

### 🚀 Getting JWT Bearer Tokens
```bash
# Method 1: Login via API
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Response includes Bearer tokens:
# {
#   "data": {
#     "user": { "id": 1, "username": "admin", "role": "admin" },
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
# }

# Method 2: Generate tokens for all users
npm run seed:tokens
```

### 🔐 Using Bearer Tokens
```bash
# Using Bearer token in Authorization header
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     http://localhost:5000/projects/eu

# JavaScript/Fetch example
fetch('http://localhost:5000/projects/eu', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})

# Alternative: Using API Keys (no Bearer prefix needed)
curl -H "X-API-Key: your-api-key-here" http://localhost:5000/projects/eu
```

## 🚨 Troubleshooting

### Database Connection Issues

**Error: "Unknown database 'odf_funding'"**
```bash
# Solution: Run the database setup script
npm run setup:db
```

**Error: "Access denied for user"**
- Check your MySQL credentials in `.env`
- Ensure MySQL server is running
- Verify user has proper permissions

**Error: "ECONNREFUSED"**
- Ensure MySQL server is running
- Check if the port (default 3306) is correct
- Verify firewall settings

### Common Issues

**Port already in use:**
```bash
# Change PORT in .env file or kill the process
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

**Permission errors:**
```bash
# Run with proper permissions or change file ownership
sudo chown -R $USER:$USER .
```

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/status` | Current analysis status |
| GET | `/health` | Health check |

### Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analysis/eu` | EU funding analysis results |
| GET | `/analysis/uk` | UK funding analysis results |
| GET | `/analysis/combined` | Combined EU & UK analysis |

### Trigger Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trigger` | Trigger full analysis (EU + UK) |
| POST | `/trigger/eu` | Trigger EU analysis only |
| POST | `/trigger/uk` | Trigger UK analysis only |

### Database Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/eu` | EU projects from database |
| GET | `/projects/uk` | UK projects from database |

### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload Excel file manually |

## 📊 Response Examples

### Status Response
```json
{
  "overallStatus": "completed",
  "lastUpdate": "2024-01-15T10:30:00Z",
  "isRunning": false,
  "euAnalysis": {
    "status": "completed",
    "projectsCount": 150,
    "relevantCount": 45,
    "llmAnalyzedCount": 12
  },
  "ukAnalysis": {
    "status": "completed",
    "projectsCount": 89,
    "relevantCount": 23,
    "llmAnalyzedCount": 8
  }
}
```

### Analysis Response
```json
{
  "analysisType": "EU Funding Opportunities",
  "status": "completed",
  "lastUpdate": "2024-01-15T10:30:00Z",
  "statistics": {
    "projectsCount": 150,
    "relevantCount": 45,
    "llmAnalyzedCount": 12
  },
  "results": [...]
}
```

## ⏰ Scheduled Execution

The API automatically runs analysis every 24 hours at midnight. You can also trigger analysis manually using the trigger endpoints.

## 🗄️ Database Schema

### EU Projects Table
```sql
CREATE TABLE eu_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000) UNIQUE,
    status VARCHAR(100),
    start_date DATE,
    deadline DATE,
    pertinence VARCHAR(10),
    matching_words TEXT,
    pertinence_llm VARCHAR(10),
    resume_llm TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### UK Projects Table
```sql
CREATE TABLE uk_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    link VARCHAR(1000) UNIQUE,
    status VARCHAR(100),
    pertinence VARCHAR(10),
    matching_words TEXT,
    pertinence_llm VARCHAR(10),
    resume_llm TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔍 Usage Examples

### Check API Status
```bash
curl http://localhost:5000/status
```

### Trigger Full Analysis
```bash
curl -X POST http://localhost:5000/trigger
```

### Get EU Analysis Results
```bash
curl http://localhost:5000/analysis/eu
```

### Upload Excel File
```bash
curl -X POST -F "excelFile=@data.xlsx" -F "analysisType=eu" http://localhost:5000/upload
```

## 🚦 Development

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## 📝 Notes

- The API expects Jupyter notebooks (`LLMODF.ipynb` and `innovateuk.ipynb`) in the parent directory
- Output Excel files are expected in the parent directory
- Database tables are created automatically on first run
- All file paths are relative to the parent directory of the API folder

## 🔧 Troubleshooting

1. **Database Connection Issues**: Check your MySQL credentials in `.env`
2. **Notebook Execution Fails**: Ensure Python and Jupyter are properly installed
3. **File Not Found**: Verify notebook and output file paths
4. **Port Already in Use**: Change the PORT in `.env` file

## 🤝 Migration from Previous APIs

This API replaces both:
- Flask API (Python-based)
- Spring Boot API (Java-based)

All functionality has been consolidated into this single Express.js application for better maintainability and performance.
