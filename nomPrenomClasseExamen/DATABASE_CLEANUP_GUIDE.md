# 🧹 Database Cleanup Guide

## ✅ **Automatic Database Cleanup - ENABLED!**

The system now automatically cleans the database on startup to prevent duplicate entries when you restart the application.

## 🔄 **How It Works**

### **Automatic Cleanup on Startup**
1. **When you start the application**, the cleanup service runs automatically
2. **Checks existing data** in the database
3. **Deletes all funding opportunities** first (due to foreign key constraints)
4. **Deletes all funding analyses**
5. **Automatically fetches fresh UK and EU data** from Flask API
6. **Logs the entire process** for monitoring
7. **Application continues** with fresh, clean data

### **What Gets Cleaned**
- ✅ All records from `funding_opportunity` table
- ✅ All records from `funding_analysis` table
- ✅ Maintains database structure (tables, columns, indexes)
- ✅ Resets auto-increment IDs

## ⚙️ **Configuration**

### **Enable/Disable Cleanup**
```properties
# Enable automatic cleanup (default: true)
funding.database.cleanup.enabled=true

# Enable automatic data fetch after cleanup (default: true)
funding.database.cleanup.auto-fetch=true

# Disable automatic cleanup
funding.database.cleanup.enabled=false

# Disable automatic data fetch
funding.database.cleanup.auto-fetch=false
```

### **Current Configuration**
The cleanup is **ENABLED by default** in your `application.properties`:
```properties
### DATABASE CLEANUP ###
# Enable/disable automatic database cleanup on startup (true by default)
funding.database.cleanup.enabled=true

# Enable/disable automatic data fetch after cleanup (true by default)
funding.database.cleanup.auto-fetch=true
```

## 📊 **Cleanup Process Logs**

### **Successful Cleanup with Auto-Fetch**
```
=== DATABASE CLEANUP STARTED ===
Found 109 funding opportunities and 2 analyses in database
Cleaning up existing data to prevent duplicates...
✅ Deleted 109 funding opportunities
✅ Deleted 2 funding analyses
🧹 Database cleanup completed successfully!
=== AUTOMATIC DATA FETCH STARTED ===
🇬🇧 Fetching UK funding data...
✅ UK data fetched successfully - Analysis ID: 1, Opportunities: 109
🇪🇺 Fetching EU funding data...
✅ EU data fetched successfully - Analysis ID: 2, Opportunities: 85
🎉 Automatic data fetch completed successfully!
=== AUTOMATIC DATA FETCH FINISHED ===
=== DATABASE CLEANUP FINISHED ===
```

### **Empty Database**
```
=== DATABASE CLEANUP STARTED ===
Found 0 funding opportunities and 0 analyses in database
Database is already empty, no cleanup needed
=== DATABASE CLEANUP FINISHED ===
```

### **Cleanup Error**
```
❌ Error during database cleanup: [error message]
=== DATABASE CLEANUP FAILED ===
```

## 🔧 **Manual Cleanup Endpoints**

### **Check Cleanup Status**
```bash
curl http://localhost:8080/api/funding-analysis/cleanup/status
```

**Response:**
```json
{
  "status": "active",
  "cleanupInfo": "Database Cleanup Service Status: ENABLED\nAutomatic cleanup on startup: YES\nCurrent database state:\n  - Funding Opportunities: 0\n  - Funding Analyses: 0\nConfiguration: funding.database.cleanup.enabled=true",
  "timestamp": "2024-01-15T10:30:45"
}
```

### **Manual Cleanup Trigger**
```bash
curl -X POST http://localhost:8080/api/funding-analysis/cleanup/trigger
```

**Response:**
```json
{
  "message": "Database cleanup completed successfully",
  "timestamp": "2024-01-15T10:30:45"
}
```

### **Get Cleanup Help**
```bash
curl http://localhost:8080/api/funding-analysis/cleanup/help
```

## 🎯 **Benefits**

### **Prevents Duplicates**
- ✅ **No duplicate analyses** when restarting application
- ✅ **No duplicate opportunities** in database
- ✅ **Clean slate** for each application run
- ✅ **Consistent data** without manual intervention

### **Development Friendly**
- ✅ **Easy testing** - restart app for fresh data
- ✅ **No manual cleanup** required
- ✅ **Predictable state** on each startup
- ✅ **Fast development cycle**

## 🚨 **Important Notes**

### **Data Loss Warning**
- ⚠️ **All funding data is deleted** on application restart
- ⚠️ **No backup is created** automatically
- ⚠️ **Historical data is lost** unless exported

### **Production Considerations**
For production environments, you might want to:
1. **Disable automatic cleanup**: `funding.database.cleanup.enabled=false`
2. **Use manual cleanup** only when needed
3. **Implement data backup** before cleanup
4. **Use database migrations** for schema changes

## 🔄 **Typical Workflow**

### **Development Cycle**
1. **Start application** → Database cleaned automatically
2. **Fetch UK data** → `curl -X POST http://localhost:8080/api/funding-analysis/fetch/uk`
3. **Fetch EU data** → `curl -X POST http://localhost:8080/api/funding-analysis/fetch/eu`
4. **Test/develop** with fresh data
5. **Restart application** → Process repeats

### **Manual Control**
```bash
# Check current database state
curl http://localhost:8080/api/funding-analysis/cleanup/status

# Clean database manually if needed
curl -X POST http://localhost:8080/api/funding-analysis/cleanup/trigger

# Fetch fresh data
curl -X POST http://localhost:8080/api/funding-analysis/fetch/uk
curl -X POST http://localhost:8080/api/funding-analysis/fetch/eu
```

## 🛠️ **Troubleshooting**

### **Cleanup Not Working**
1. Check configuration: `funding.database.cleanup.enabled=true`
2. Check application logs for cleanup messages
3. Verify database permissions

### **Cleanup Errors**
1. Check database connection
2. Verify foreign key constraints
3. Check application logs for detailed error messages

### **Disable Cleanup**
If you want to keep data between restarts:
```properties
funding.database.cleanup.enabled=false
```

## 📈 **Monitoring**

### **Log Messages to Watch**
- `=== DATABASE CLEANUP STARTED ===`
- `✅ Deleted X funding opportunities`
- `✅ Deleted X funding analyses`
- `🧹 Database cleanup completed successfully!`
- `❌ Error during database cleanup`

### **Status Endpoint**
Use the status endpoint to monitor:
- Current database state
- Cleanup configuration
- Service status

## 🎉 **Result**

**No more duplicate entries!** 

Every time you restart your application:
1. ✅ Database is automatically cleaned
2. ✅ Fresh data can be fetched
3. ✅ No manual intervention needed
4. ✅ Consistent, predictable behavior

**Your development workflow is now streamlined with automatic database cleanup! 🚀**
