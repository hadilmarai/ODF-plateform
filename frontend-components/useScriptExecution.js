/**
 * React Hook for Script Execution Management
 * Handles state management for Python script execution
 */

import { useState, useEffect, useCallback } from 'react';
import ScriptExecutionService from './ScriptExecutionService';

export const useScriptExecution = (token) => {
    const [scriptStatus, setScriptStatus] = useState({
        eu: { status: 'idle', loading: false },
        uk: { status: 'idle', loading: false }
    });
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState(null);

    // Set token when provided
    useEffect(() => {
        if (token) {
            ScriptExecutionService.setToken(token);
        }
    }, [token]);

    // Fetch current status
    const fetchStatus = useCallback(async () => {
        try {
            const response = await ScriptExecutionService.getExecutionStatus();
            if (response.success) {
                setScriptStatus(prev => ({
                    eu: { ...prev.eu, ...response.data.eu, loading: false },
                    uk: { ...prev.uk, ...response.data.uk, loading: false }
                }));
            }
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching script status:', err);
        }
    }, []);

    // Start polling for status updates
    const startPolling = useCallback(() => {
        if (!isPolling) {
            setIsPolling(true);
            const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
            
            // Store interval ID for cleanup
            return () => {
                clearInterval(interval);
                setIsPolling(false);
            };
        }
    }, [isPolling, fetchStatus]);

    // Execute EU script
    const executeEUScript = useCallback(async () => {
        setScriptStatus(prev => ({
            ...prev,
            eu: { ...prev.eu, loading: true }
        }));
        setError(null);

        try {
            const response = await ScriptExecutionService.executeEUScript();
            if (response.success) {
                // Start polling for updates
                startPolling();
                // Immediate status update
                await fetchStatus();
                return response.data;
            }
        } catch (err) {
            setError(err.message);
            setScriptStatus(prev => ({
                ...prev,
                eu: { ...prev.eu, loading: false }
            }));
            throw err;
        }
    }, [fetchStatus, startPolling]);

    // Execute UK script
    const executeUKScript = useCallback(async () => {
        setScriptStatus(prev => ({
            ...prev,
            uk: { ...prev.uk, loading: true }
        }));
        setError(null);

        try {
            const response = await ScriptExecutionService.executeUKScript();
            if (response.success) {
                // Start polling for updates
                startPolling();
                // Immediate status update
                await fetchStatus();
                return response.data;
            }
        } catch (err) {
            setError(err.message);
            setScriptStatus(prev => ({
                ...prev,
                uk: { ...prev.uk, loading: false }
            }));
            throw err;
        }
    }, [fetchStatus, startPolling]);

    // Stop script
    const stopScript = useCallback(async (scriptType) => {
        try {
            const response = await ScriptExecutionService.stopScript(scriptType);
            if (response.success) {
                await fetchStatus();
                return response.data;
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [fetchStatus]);

    // Get script logs
    const getScriptLogs = useCallback(async (scriptType) => {
        try {
            const response = await ScriptExecutionService.getScriptLogs(scriptType);
            if (response.success) {
                return response.data;
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Initial status fetch
    useEffect(() => {
        if (token) {
            fetchStatus();
        }
    }, [token, fetchStatus]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (isPolling) {
                setIsPolling(false);
            }
        };
    }, [isPolling]);

    return {
        scriptStatus,
        error,
        isPolling,
        executeEUScript,
        executeUKScript,
        stopScript,
        getScriptLogs,
        fetchStatus,
        startPolling
    };
};
