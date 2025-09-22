# Script Execution Feature

## Overview

This feature allows administrators to execute Python analysis scripts (`horizoneu.py` and `innovateuk.py`) directly from the frontend, with real-time status monitoring and automatic database updates.

## 🚀 Features

### ✅ **Backend API Endpoints**
- **Execute Scripts**: Start EU/UK analysis scripts
- **Monitor Status**: Real-time script execution status
- **View Logs**: Access script output and error logs
- **Stop Scripts**: Terminate running scripts
- **Timeout Handling**: 30-minute execution limit

### ✅ **Frontend Components**
- **React Components**: Ready-to-use Next.js components
- **Real-time Updates**: Auto-polling for status updates
- **Admin Controls**: Execute, stop, and monitor scripts
- **Responsive UI**: Mobile-friendly interface

### ✅ **Security & Performance**
- **Admin Only**: Restricted to administrator users
- **Background Execution**: Non-blocking script execution
- **Process Management**: Track and manage running processes
- **Automatic Database Updates**: Scripts update database on completion

## 📁 File Structure

```
ODF/
├── api/
│   ├── controllers/
│   │   └── scriptExecutionController.js    # Script execution logic
│   ├── routes/
│   │   └── scripts.js                      # API endpoints
│   └── utils/
│       └── startupDataLoader.js            # Database update methods
├── frontend-components/
│   ├── ScriptExecutionService.js           # API service
│   ├── useScriptExecution.js               # React hook
│   ├── ScriptExecutionButton.jsx           # Individual script button
│   ├── ScriptExecutionPanel.jsx            # Main panel component
│   └── integration-examples.md             # Integration guide
├── horizoneu.py                            # EU analysis script
├── innovateuk.py                           # UK analysis script
└── SCRIPT_EXECUTION_README.md              # This file
```

## 🔧 API Endpoints

### Authentication Required
All endpoints require Bearer token authentication with admin privileges.

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scripts/execute/eu` | Execute EU analysis script |
| `POST` | `/scripts/execute/uk` | Execute UK analysis script |
| `GET` | `/scripts/status` | Get status of all scripts |
| `GET` | `/scripts/status/:scriptType` | Get status of specific script |
| `POST` | `/scripts/stop/:scriptType` | Stop running script |
| `GET` | `/scripts/logs/:scriptType` | Get script execution logs |
| `GET` | `/scripts/info` | Get scripts information |

### Example API Calls

```javascript
// Execute EU script
const response = await fetch('/scripts/execute/eu', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Get status
const status = await fetch('/scripts/status', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🎨 Frontend Integration

### 1. Install Dependencies
```bash
npm install lucide-react
```

### 2. Copy Components
Copy all files from `frontend-components/` to your Next.js project.

### 3. Basic Usage
```jsx
import ScriptExecutionPanel from '../components/ScriptExecutionPanel';

const AdminPage = () => {
    const { token, user } = useAuth();

    return (
        <ScriptExecutionPanel
            token={token}
            userRole={user?.role}
            onScriptComplete={(scriptType) => {
                console.log(`${scriptType} script completed`);
            }}
        />
    );
};
```

### 4. Integration in Project Tables
```jsx
// Add execute buttons to your EU/UK project tables
import { useScriptExecution } from '../hooks/useScriptExecution';

const ProjectTable = ({ scriptType }) => {
    const { executeEUScript, executeUKScript, scriptStatus } = useScriptExecution(token);
    
    return (
        <div>
            <button onClick={scriptType === 'eu' ? executeEUScript : executeUKScript}>
                Re-execute {scriptType.toUpperCase()} Analysis
            </button>
            {/* Your table content */}
        </div>
    );
};
```

## ⚙️ Configuration

### Environment Variables
```bash
# .env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Script Paths
The controller automatically resolves script paths:
- EU Script: `../../horizoneu.py`
- UK Script: `../../innovateuk.py`

### Timeout Settings
Scripts have a 30-minute timeout limit (configurable in controller):
```javascript
timeout: 30 * 60 * 1000 // 30 minutes
```

## 🔄 How It Works

### 1. Script Execution Flow
```
Frontend Button Click
    ↓
API Call to /scripts/execute/{type}
    ↓
Python Process Spawned
    ↓
Immediate Response (Process Started)
    ↓
Background Execution
    ↓
Database Auto-Update on Completion
```

### 2. Status Monitoring
- **Polling**: Frontend polls status every 5 seconds
- **Real-time Updates**: Shows running time, process ID
- **Completion Detection**: Automatic notification when done

### 3. Database Updates
- Scripts generate Excel files (`df_LLM_ALL_EU.xlsx`, `df_final_ukllm.xlsx`)
- API automatically reloads data into database on completion
- No manual intervention required

## 🛡️ Security Features

### Admin-Only Access
```javascript
// Only admin users can execute scripts
const isAdmin = userRole === 'admin' || userRole === 'administrator';
```

### Process Isolation
- Each script runs in isolated Python process
- Process tracking prevents multiple instances
- Automatic cleanup on completion/timeout

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Graceful failure handling

## 📊 Monitoring & Logs

### Real-time Status
- **Idle**: Script ready to execute
- **Running**: Script currently executing
- **Error**: Script failed or timed out

### Log Access
- View real-time script output
- Error logs for debugging
- Process information (PID, start time)

### Performance Metrics
- Execution time tracking
- Success/failure rates
- Resource usage monitoring

## 🚨 Troubleshooting

### Common Issues

1. **Script Not Found**
   - Ensure `horizoneu.py` and `innovateuk.py` exist in root directory
   - Check file permissions

2. **Permission Denied**
   - Verify user has admin role
   - Check authentication token

3. **Timeout Issues**
   - Scripts have 30-minute limit
   - Check Python dependencies
   - Monitor system resources

4. **Database Update Failed**
   - Verify Excel files are generated
   - Check database connection
   - Review error logs

### Debug Commands
```bash
# Check script files
ls -la *.py

# Test script execution manually
python horizoneu.py
python innovateuk.py

# Check API logs
tail -f api/logs/odf_api_*.log
```

## 🔮 Future Enhancements

- **Progress Indicators**: Real-time progress bars
- **Email Notifications**: Completion alerts
- **Scheduling**: Automated script execution
- **Resource Monitoring**: CPU/Memory usage
- **Batch Execution**: Run multiple scripts
- **Custom Parameters**: Script configuration options

## 📞 Support

For issues or questions:
1. Check the logs in `api/logs/`
2. Verify script files exist and are executable
3. Ensure database connection is working
4. Review authentication and permissions
