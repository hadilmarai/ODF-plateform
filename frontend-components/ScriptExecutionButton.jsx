/**
 * Script Execution Button Component
 * Reusable button component for executing Python analysis scripts
 */

import React, { useState } from 'react';
import { Play, Square, Eye, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const ScriptExecutionButton = ({
    scriptType,
    scriptName,
    status,
    onExecute,
    onStop,
    onViewLogs,
    disabled = false,
    className = ''
}) => {
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState('');
    const [loadingLogs, setLoadingLogs] = useState(false);

    const isRunning = status?.status === 'running';
    const isLoading = status?.loading || false;

    const getStatusColor = () => {
        switch (status?.status) {
            case 'running':
                return 'text-orange-600 bg-yellow-50 border-yellow-200';
            case 'idle':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'error':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = () => {
        switch (status?.status) {
            case 'running':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'idle':
                return <CheckCircle className="w-4 h-4" />;
            case 'error':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <CheckCircle className="w-4 h-4" />;
        }
    };

    const getStatusText = () => {
        if (isRunning) {
            const runningTime = status.runningTime || '';
            return `Running ${runningTime}`;
        }
        return status?.status === 'idle' ? 'Ready' : status?.status || 'Unknown';
    };

    const handleExecute = async () => {
        try {
            await onExecute();
        } catch (error) {
            console.error(`Error executing ${scriptType} script:`, error);
        }
    };

    const handleStop = async () => {
        if (window.confirm(`Are you sure you want to stop the ${scriptType.toUpperCase()} analysis script?`)) {
            try {
                await onStop(scriptType);
            } catch (error) {
                console.error(`Error stopping ${scriptType} script:`, error);
            }
        }
    };

    const handleViewLogs = async () => {
        if (showLogs) {
            setShowLogs(false);
            return;
        }

        setLoadingLogs(true);
        try {
            const logData = await onViewLogs(scriptType);
            if (logData.status === 'not_running') {
                setLogs(`No ${scriptType.toUpperCase()} script is currently running.`);
            } else {
                const output = logData.logs?.join('') || 'No output yet...';
                const errors = logData.errors?.join('') || '';
                setLogs(`=== OUTPUT ===\n${output}\n\n=== ERRORS ===\n${errors}`);
            }
            setShowLogs(true);
        } catch (error) {
            setLogs(`Error loading logs: ${error.message}`);
            setShowLogs(true);
        } finally {
            setLoadingLogs(false);
        }
    };

    return (
        <div className={`border rounded-lg p-6 bg-white shadow-sm ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {scriptType.toUpperCase()} Analysis
                    </h3>
                    <p className="text-sm text-gray-500">{scriptName}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor()}`}>
                    {getStatusIcon()}
                    {getStatusText()}
                </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4">
                {scriptType === 'eu' 
                    ? 'Scrapes EU funding opportunities and performs LLM-based analysis'
                    : 'Scrapes UK funding opportunities and performs text analysis'
                }
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={handleExecute}
                    disabled={disabled || isRunning || isLoading}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                        transition-colors duration-200
                        ${isRunning || isLoading || disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }
                    `}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    Execute Script
                </button>

                <button
                    onClick={handleStop}
                    disabled={!isRunning || disabled}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                        transition-colors duration-200
                        ${!isRunning || disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                        }
                    `}
                >
                    <Square className="w-4 h-4" />
                    Stop Script
                </button>

                <button
                    onClick={handleViewLogs}
                    disabled={disabled}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                        transition-colors duration-200
                        ${disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                        }
                    `}
                >
                    {loadingLogs ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                    {showLogs ? 'Hide Logs' : 'View Logs'}
                </button>
            </div>

            {/* Running Info */}
            {isRunning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-orange-800">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">
                            Script is running... Estimated duration: 15-30 minutes
                        </span>
                    </div>
                    {status.processId && (
                        <p className="text-xs text-orange-700 mt-1">
                            Process ID: {status.processId} | Started: {new Date(status.startTime).toLocaleTimeString()}
                        </p>
                    )}
                </div>
            )}

            {/* Logs Section */}
            {showLogs && (
                <div className="mt-4">
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{logs}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScriptExecutionButton;
