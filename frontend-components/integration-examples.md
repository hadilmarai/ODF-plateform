# Next.js Integration Examples

## 1. Integration in your EU Projects Page

```jsx
// pages/eu-projects.js or components/EUProjectsPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; // Your auth hook
import ScriptExecutionPanel from '../components/ScriptExecutionPanel';

const EUProjectsPage = () => {
    const { token, user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleScriptComplete = (scriptType) => {
        if (scriptType === 'eu') {
            // Refresh your EU projects data
            setRefreshTrigger(prev => prev + 1);
            // Or call your data fetching function
            // fetchEUProjects();
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">EU Funding Projects</h1>
            
            {/* Script Execution Panel */}
            <div className="mb-8">
                <ScriptExecutionPanel
                    token={token}
                    userRole={user?.role}
                    onScriptComplete={handleScriptComplete}
                />
            </div>
            
            {/* Your existing EU projects table/components */}
            <EUProjectsTable key={refreshTrigger} />
        </div>
    );
};

export default EUProjectsPage;
```

## 2. Integration in your UK Projects Page

```jsx
// pages/uk-projects.js or components/UKProjectsPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ScriptExecutionPanel from '../components/ScriptExecutionPanel';

const UKProjectsPage = () => {
    const { token, user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleScriptComplete = (scriptType) => {
        if (scriptType === 'uk') {
            // Refresh your UK projects data
            setRefreshTrigger(prev => prev + 1);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">UK Funding Projects</h1>
            
            {/* Script Execution Panel */}
            <div className="mb-8">
                <ScriptExecutionPanel
                    token={token}
                    userRole={user?.role}
                    onScriptComplete={handleScriptComplete}
                />
            </div>
            
            {/* Your existing UK projects table/components */}
            <UKProjectsTable key={refreshTrigger} />
        </div>
    );
};

export default UKProjectsPage;
```

## 3. Standalone Admin Page

```jsx
// pages/admin/scripts.js
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import ScriptExecutionPanel from '../../components/ScriptExecutionPanel';

const ScriptsAdminPage = () => {
    const { token, user } = useAuth();

    const handleScriptComplete = (scriptType) => {
        // Handle completion - maybe show notification or redirect
        console.log(`${scriptType} script completed`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <ScriptExecutionPanel
                    token={token}
                    userRole={user?.role}
                    onScriptComplete={handleScriptComplete}
                    className="max-w-6xl mx-auto"
                />
            </div>
        </div>
    );
};

export default ScriptsAdminPage;
```

## 4. Adding Execute Buttons to Existing Tables

```jsx
// In your existing EU/UK project tables
import React from 'react';
import { Play } from 'lucide-react';
import { useScriptExecution } from '../hooks/useScriptExecution';

const ProjectTableHeader = ({ scriptType, token, userRole }) => {
    const { executeEUScript, executeUKScript, scriptStatus } = useScriptExecution(token);
    
    const isAdmin = userRole === 'admin';
    const isRunning = scriptStatus[scriptType]?.status === 'running';
    
    const handleExecute = async () => {
        try {
            if (scriptType === 'eu') {
                await executeEUScript();
            } else {
                await executeUKScript();
            }
        } catch (error) {
            console.error('Script execution failed:', error);
        }
    };

    return (
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
                {scriptType === 'eu' ? 'EU Projects' : 'UK Projects'}
            </h2>
            
            {isAdmin && (
                <button
                    onClick={handleExecute}
                    disabled={isRunning}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                        ${isRunning 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }
                    `}
                >
                    <Play className="w-4 h-4" />
                    {isRunning ? 'Running...' : `Re-execute ${scriptType.toUpperCase()} Analysis`}
                </button>
            )}
        </div>
    );
};
```

## 5. Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 6. Required Dependencies

```bash
npm install lucide-react
# or
yarn add lucide-react
```

## 7. API Timeout Configuration

Since the scripts take a long time to execute, make sure your API calls have appropriate timeout handling:

```jsx
// In your ScriptExecutionService.js, you can add timeout handling:
const executeWithTimeout = async (url, options, timeoutMs = 60000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - script is still running in background');
        }
        throw error;
    }
};
```

## 8. Usage Notes

- The scripts will run in the background on the server
- HTTP requests return immediately after starting the script
- Use polling to get real-time status updates
- Scripts automatically update the database when complete
- Admin privileges required for script execution
- Each script can only run one instance at a time
- Scripts have a 30-minute timeout limit
