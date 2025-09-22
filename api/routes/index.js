const express = require('express');
const { analysisState } = require('../controllers/analysisController');
const ResponseHelper = require('../utils/responseHelper');
const { config } = require('../config/app');
const NotebookExecutor = require('../utils/notebookExecutor');
const { testConnection } = require('../config/database');

const router = express.Router();

/**
 * Root endpoint - API documentation
 */
router.get('/', (req, res) => {
    const endpoints = {
        // Core endpoints
        '/': 'GET - API information and documentation',
        '/status': 'GET - Current analysis status',
        '/health': 'GET - Health check',
        
        // Analysis endpoints
        '/analysis/eu': 'GET - EU analysis results',
        '/analysis/uk': 'GET - UK analysis results',
        '/analysis/combined': 'GET - Combined analysis results',
        
        // Trigger endpoints
        '/trigger': 'POST - Trigger full analysis (EU + UK)',
        '/trigger/eu': 'POST - Trigger EU analysis only',
        '/trigger/uk': 'POST - Trigger UK analysis only',
        
        // Projects endpoints
        '/projects/eu': 'GET - EU projects from database (with pagination and filters)',
        '/projects/uk': 'GET - UK projects from database (with pagination and filters)',
        '/projects/eu/:id': 'GET - Single EU project by ID',
        '/projects/uk/:id': 'GET - Single UK project by ID',
        '/projects/statistics': 'GET - Project statistics',
        '/projects/search': 'GET - Search projects across EU and UK',
        '/projects/:type/:id/pertinence': 'PUT - Update project pertinence (admin only)',
        
        // File upload endpoints
        '/upload': 'POST - Upload Excel file manually',
        '/upload/validate': 'POST - Validate Excel file without saving',
        '/upload/history': 'GET - Upload history',
        '/upload/stats': 'GET - Upload statistics',
        '/upload/template/:type': 'GET - Download template file (eu/uk)',

        // Data management endpoints
        '/data/status': 'GET - Data loading status and statistics',
        '/data/files': 'GET - Excel files information',
        '/data/summary': 'GET - Data summary with statistics',
        '/data/reload': 'POST - Reload all data from Excel files (admin only)',
        '/data/reload/eu': 'POST - Reload EU data only (admin only)',
        '/data/reload/uk': 'POST - Reload UK data only (admin only)',
        '/data/clear': 'DELETE - Clear all project data (admin only)',

        // Script execution endpoints
        '/scripts/execute/eu': 'POST - Execute EU analysis script (admin only)',
        '/scripts/execute/uk': 'POST - Execute UK analysis script (admin only)',
        '/scripts/status': 'GET - Get execution status of all scripts',
        '/scripts/status/:scriptType': 'GET - Get status of specific script (eu/uk)',
        '/scripts/stop/:scriptType': 'POST - Stop running script (admin only)',
        '/scripts/logs/:scriptType': 'GET - Get script execution logs (admin only)',
        '/scripts/info': 'GET - Get information about available scripts',
        
        // Authentication endpoints
        '/auth/register': 'POST - User registration',
        '/auth/login': 'POST - User login',
        '/auth/refresh': 'POST - Refresh JWT token',
        '/auth/logout': 'POST - User logout',
        '/auth/profile': 'GET - Get user profile',
        '/auth/profile': 'PUT - Update user profile',
        '/auth/password': 'PUT - Change password',
        '/auth/api-keys': 'GET - List user API keys',
        '/auth/api-keys': 'POST - Generate new API key',
        '/auth/api-keys/:keyId': 'DELETE - Revoke API key'
    };

    return ResponseHelper.apiDocumentation(res, endpoints, analysisState);
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbHealthy = await testConnection();
        
        // Check system requirements
        const systemStatus = await NotebookExecutor.getSystemStatus();
        
        // Check file availability
        const fs = require('fs');
        const filesAvailable = {
            notebooks: {
                eu: fs.existsSync(config.paths.notebooks.eu),
                uk: fs.existsSync(config.paths.notebooks.uk)
            },
            outputFiles: {
                eu: fs.existsSync(config.paths.outputFiles.eu),
                uk: fs.existsSync(config.paths.outputFiles.uk)
            }
        };

        const healthData = {
            database: dbHealthy,
            system: systemStatus,
            files: filesAvailable,
            analysis: {
                status: analysisState.status,
                isRunning: analysisState.isRunning,
                lastUpdate: analysisState.lastUpdate
            },
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        };

        return ResponseHelper.healthCheck(res, healthData);
    } catch (error) {
        return ResponseHelper.error(res, 'Health check failed', 503, {
            error: error.message
        });
    }
});

/**
 * API version endpoint
 */
router.get('/version', (req, res) => {
    const packageJson = require('../package.json');
    
    return ResponseHelper.success(res, {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        nodeVersion: process.version,
        environment: config.server.env
    }, 'Version information retrieved successfully');
});

/**
 * System status endpoint (admin only)
 */
router.get('/system', async (req, res) => {
    try {
        const systemInfo = {
            server: {
                environment: config.server.env,
                port: config.server.port,
                uptime: process.uptime(),
                pid: process.pid
            },
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: {
                os: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            },
            analysis: {
                state: analysisState,
                schedule: config.analysis.schedule,
                autoStart: config.analysis.autoStart
            },
            database: {
                host: config.database.host,
                name: config.database.name,
                connectionLimit: config.database.connectionLimit
            }
        };

        return ResponseHelper.success(res, systemInfo, 'System information retrieved successfully');
    } catch (error) {
        return ResponseHelper.error(res, 'Failed to get system information');
    }
});

/**
 * Configuration endpoint (admin only)
 */
router.get('/config', (req, res) => {
    // Return safe configuration (without sensitive data)
    const safeConfig = {
        server: {
            port: config.server.port,
            env: config.server.env
        },
        analysis: {
            schedule: config.analysis.schedule,
            autoStart: config.analysis.autoStart,
            timeout: config.analysis.timeout,
            maxRetries: config.analysis.maxRetries
        },
        security: {
            corsOrigin: config.security.corsOrigin,
            rateLimitWindow: config.security.rateLimitWindow,
            rateLimitMax: config.security.rateLimitMax,
            apiKeyRequired: config.security.apiKeyRequired
        },
        logging: {
            level: config.logging.level,
            enableFileLogging: config.logging.enableFileLogging
        },
        upload: {
            maxFileSize: config.upload.maxFileSize,
            allowedTypes: config.upload.allowedTypes
        }
    };

    return ResponseHelper.success(res, safeConfig, 'Configuration retrieved successfully');
});

/**
 * Logs endpoint (admin only)
 */
router.get('/logs', (req, res) => {
    try {
        const { lines = 100 } = req.query;
        const logger = require('../utils/logger');
        
        const logContents = logger.getLogContents(parseInt(lines));
        const logStats = logger.getLogStats();

        return ResponseHelper.success(res, {
            contents: logContents,
            statistics: logStats
        }, 'Logs retrieved successfully');
    } catch (error) {
        return ResponseHelper.error(res, 'Failed to retrieve logs');
    }
});

/**
 * Clear logs endpoint (admin only)
 */
router.delete('/logs', (req, res) => {
    try {
        const logger = require('../utils/logger');
        const success = logger.clearLogs();

        if (success) {
            return ResponseHelper.success(res, null, 'Logs cleared successfully');
        } else {
            return ResponseHelper.error(res, 'Failed to clear logs');
        }
    } catch (error) {
        return ResponseHelper.error(res, 'Failed to clear logs');
    }
});

/**
 * Reset analysis state endpoint (admin only)
 */
router.post('/reset', (req, res) => {
    try {
        const { AnalysisController } = require('../controllers/analysisController');
        AnalysisController.resetAnalysisState();
        
        return ResponseHelper.success(res, null, 'Analysis state reset successfully');
    } catch (error) {
        return ResponseHelper.error(res, 'Failed to reset analysis state');
    }
});

/**
 * Test database connection endpoint (admin only)
 */
router.get('/test/database', async (req, res) => {
    try {
        const isConnected = await testConnection();
        
        if (isConnected) {
            return ResponseHelper.success(res, { connected: true }, 'Database connection successful');
        } else {
            return ResponseHelper.error(res, 'Database connection failed', 503);
        }
    } catch (error) {
        return ResponseHelper.error(res, 'Database connection test failed', 503, {
            error: error.message
        });
    }
});

/**
 * Test notebook execution endpoint (admin only)
 */
router.get('/test/notebooks', async (req, res) => {
    try {
        const systemStatus = await NotebookExecutor.getSystemStatus();
        
        return ResponseHelper.success(res, systemStatus, 'Notebook system status retrieved');
    } catch (error) {
        return ResponseHelper.error(res, 'Failed to check notebook system', 500, {
            error: error.message
        });
    }
});

module.exports = router;
