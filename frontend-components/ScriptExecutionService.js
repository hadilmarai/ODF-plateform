/**
 * Script Execution Service for Next.js Frontend
 * Handles API calls for executing Python analysis scripts
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ScriptExecutionService {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required');
            }
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    }

    /**
     * Execute EU analysis script
     */
    async executeEUScript() {
        const response = await fetch(`${API_BASE_URL}/scripts/execute/eu`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Execute UK analysis script
     */
    async executeUKScript() {
        const response = await fetch(`${API_BASE_URL}/scripts/execute/uk`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Get execution status of all scripts
     */
    async getExecutionStatus() {
        const response = await fetch(`${API_BASE_URL}/scripts/status`, {
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Get execution status of specific script
     */
    async getScriptStatus(scriptType) {
        const response = await fetch(`${API_BASE_URL}/scripts/status/${scriptType}`, {
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Stop a running script
     */
    async stopScript(scriptType) {
        const response = await fetch(`${API_BASE_URL}/scripts/stop/${scriptType}`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Get script logs
     */
    async getScriptLogs(scriptType) {
        const response = await fetch(`${API_BASE_URL}/scripts/logs/${scriptType}`, {
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }

    /**
     * Get scripts information
     */
    async getScriptsInfo() {
        const response = await fetch(`${API_BASE_URL}/scripts/info`, {
            headers: this.getAuthHeaders()
        });
        
        return this.handleResponse(response);
    }
}

export default new ScriptExecutionService();
