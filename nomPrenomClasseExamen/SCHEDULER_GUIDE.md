# 🕐 Funding Data Scheduler Guide

## ✅ **Automatic Scheduling is ENABLED!**

Your Spring Boot application now automatically fetches funding data every 24 hours without any manual intervention.

## 📅 **Default Schedule**

- **UK Funding Data**: Every day at **8:00 AM** 
- **EU Funding Data**: Every day at **8:05 AM** (5 minutes after UK to avoid conflicts)

## 🚀 **How It Works**

1. **Automatic Execution**: The scheduler runs in the background
2. **Daily Fetch**: Both UK and EU data are fetched automatically
3. **Database Storage**: All data is stored in your MySQL database
4. **Error Handling**: Failed attempts are logged but don't stop future executions
5. **Logging**: Detailed logs for monitoring and debugging

## 🔧 **Configuration**

### Current Settings (application.properties):
```properties
# Enable/disable the scheduler
funding.scheduler.enabled=true

# UK funding data fetch schedule (daily at 8:00 AM)
funding.scheduler.cron=0 0 8 * * *

# EU funding data fetch schedule (daily at 8:05 AM)  
funding.scheduler.eu.cron=0 5 8 * * *
```

## 📊 **Monitoring & Management**

### Check Scheduler Status:
```bash
curl http://localhost:8080/api/funding-analysis/scheduler/status
```

### Manual Trigger (Test):
```bash
curl -X POST http://localhost:8080/api/funding-analysis/scheduler/trigger-all
```

### Get Help Information:
```bash
curl http://localhost:8080/api/funding-analysis/scheduler/help
```

## 🎯 **What Happens Automatically**

Every day at the scheduled times:

1. **8:00 AM**: 
   - Fetches UK funding data from Flask API
   - Parses and stores in database
   - Logs success/failure

2. **8:05 AM**:
   - Fetches EU funding data from Flask API  
   - Parses and stores in database
   - Logs success/failure

## 📝 **Log Messages to Watch For**

### Successful Execution:
```
=== SCHEDULED TASK STARTED: Fetching UK Funding Data ===
✅ UK funding data fetched successfully!
Analysis ID: 123
Total opportunities: 109
Relevant opportunities: 5
=== SCHEDULED TASK COMPLETED: UK Funding Data ===
```

### Failed Execution:
```
❌ Failed to fetch UK funding data in scheduled task: [error message]
=== SCHEDULED TASK FAILED: UK Funding Data ===
```

## ⚙️ **Customization Options**

### Change Schedule Time:
Edit `application.properties`:
```properties
# Run at 6:00 AM instead
funding.scheduler.cron=0 0 6 * * *

# Run at 10:30 PM instead  
funding.scheduler.cron=0 30 22 * * *
```

### Disable Scheduler:
```properties
funding.scheduler.enabled=false
```

## 🔄 **Manual Operations**

Even with automatic scheduling, you can still trigger manual fetches:

```bash
# Fetch both UK and EU data now
curl -X POST http://localhost:8080/api/funding-analysis/scheduler/trigger-all

# Fetch only UK data
curl -X POST http://localhost:8080/api/funding-analysis/fetch/uk

# Fetch only EU data
curl -X POST http://localhost:8080/api/funding-analysis/fetch/eu
```

## 🎉 **You're All Set!**

The scheduler is now active and will automatically fetch funding data every day. 

**No more manual curl commands needed - it's all automatic! 🚀**
