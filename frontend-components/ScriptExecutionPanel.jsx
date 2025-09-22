/**
 * Script Execution Panel Component
 * Main component for managing EU and UK script execution
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import ScriptExecutionButton from './ScriptExecutionButton';
import { useScriptExecution } from './useScriptExecution';

const ScriptExecutionPanel = ({ 
    token, 
    userRole = 'user',
    onScriptComplete,
    className = '' 
}) => {
    const [notification, setNotification] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const {
        scriptStatus,
        error,
        isPolling,
        executeEUScript,
        executeUKScript,
        stopScript,
        getScriptLogs,
        fetchStatus,
        startPolling
    } = useScriptExecution(token);

    // Check if user has admin privileges
    const isAdmin = userRole === 'admin' || userRole === 'administrator';

    // Show notification
    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Handle script execution
    const handleExecuteEU = async () => {
        try {
            const result = await executeEUScript();
            showNotification(
                `EU analysis script started successfully! Process ID: ${result.processId}`,
                'success'
            );
            
            // Start auto-refresh if enabled
            if (autoRefresh) {
                startPolling();
            }
        } catch (error) {
            showNotification(`Failed to start EU script: ${error.message}`, 'error');
        }
    };

    const handleExecuteUK = async () => {
        try {
            const result = await executeUKScript();
            showNotification(
                `UK analysis script started successfully! Process ID: ${result.processId}`,
                'success'
            );
            
            // Start auto-refresh if enabled
            if (autoRefresh) {
                startPolling();
            }
        } catch (error) {
            showNotification(`Failed to start UK script: ${error.message}`, 'error');
        }
    };

    const handleStopScript = async (scriptType) => {
        try {
            await stopScript(scriptType);
            showNotification(`${scriptType.toUpperCase()} script stopped successfully`, 'success');
        } catch (error) {
            showNotification(`Failed to stop ${scriptType.toUpperCase()} script: ${error.message}`, 'error');
        }
    };

    // Check for script completion
    useEffect(() => {
        const prevEUStatus = scriptStatus.eu.status;
        const prevUKStatus = scriptStatus.uk.status;
        
        // Check if EU script completed
        if (prevEUStatus === 'running' && scriptStatus.eu.status === 'idle') {
            showNotification('EU analysis script completed successfully!', 'success');
            if (onScriptComplete) {
                onScriptComplete('eu');
            }
        }
        
        // Check if UK script completed
        if (prevUKStatus === 'running' && scriptStatus.uk.status === 'idle') {
            showNotification('UK analysis script completed successfully!', 'success');
            if (onScriptComplete) {
                onScriptComplete('uk');
            }
        }
    }, [scriptStatus, onScriptComplete]);

    // Show error notification
    useEffect(() => {
        if (error) {
            showNotification(error, 'error');
        }
    }, [error]);

    if (!isAdmin) {
        return (
            <div className={`p-6 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div>
                        <h3 className="font-medium text-orange-800">Admin Access Required</h3>
                        <p className="text-sm text-orange-700">
                            You need administrator privileges to execute analysis scripts.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analysis Scripts</h2>
                    <p className="text-gray-600">Execute and monitor funding analysis scripts</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Auto-refresh toggle */}
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-blue-500"
                        />
                        Auto-refresh
                    </label>
                    
                    {/* Manual refresh button */}
                    <button
                        onClick={fetchStatus}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`p-4 rounded-md ${
                    notification.type === 'success' ? 'bg-green-50 border border-green-200' :
                    notification.type === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-orange-50 border border-orange-200'
                }`}>
                    <p className={`text-sm font-medium ${
                        notification.type === 'success' ? 'text-green-800' :
                        notification.type === 'error' ? 'text-red-800' :
                        'text-orange-800'
                    }`}>
                        {notification.message}
                    </p>
                </div>
            )}

            {/* Script Execution Buttons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* EU Script */}
                <ScriptExecutionButton
                    scriptType="eu"
                    scriptName="horizoneu.py"
                    status={scriptStatus.eu}
                    onExecute={handleExecuteEU}
                    onStop={handleStopScript}
                    onViewLogs={getScriptLogs}
                    disabled={!token}
                />

                {/* UK Script */}
                <ScriptExecutionButton
                    scriptType="uk"
                    scriptName="innovateuk.py"
                    status={scriptStatus.uk}
                    onExecute={handleExecuteUK}
                    onStop={handleStopScript}
                    onViewLogs={getScriptLogs}
                    disabled={!token}
                />
            </div>

            {/* Status Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">Script Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">EU Analysis (horizoneu.py)</h4>
                        <ul className="space-y-1 text-gray-600">
                            <li>• Scrapes EU Horizon Europe portal</li>
                            <li>• Performs LLM-based relevance analysis</li>
                            <li>• Generates df_LLM_ALL_EU.xlsx</li>
                            <li>• Estimated duration: 15-30 minutes</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">UK Analysis (innovateuk.py)</h4>
                        <ul className="space-y-1 text-gray-600">
                            <li>• Scrapes UKRI funding portal</li>
                            <li>• Performs text analysis and classification</li>
                            <li>• Generates df_final_ukllm.xlsx</li>
                            <li>• Estimated duration: 10-20 minutes</li>
                        </ul>
                    </div>
                </div>
                
                {isPolling && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Auto-refreshing status every 5 seconds...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScriptExecutionPanel;
