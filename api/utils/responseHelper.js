/**
 * Response Helper Utility
 * Standardizes API responses across the application
 */
class ResponseHelper {
    /**
     * Send success response
     * @param {Object} res - Express response object
     * @param {*} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code (default: 200)
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            message,
            timestamp: new Date().toISOString(),
            data
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send error response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code (default: 500)
     * @param {*} details - Additional error details
     */
    static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };

        if (details) {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Send validation error response
     * @param {Object} res - Express response object
     * @param {Array|Object} errors - Validation errors
     * @param {string} message - Error message
     */
    static validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 400, {
            type: 'validation',
            errors
        });
    }

    /**
     * Send not found response
     * @param {Object} res - Express response object
     * @param {string} resource - Resource name
     */
    static notFound(res, resource = 'Resource') {
        return this.error(res, `${resource} not found`, 404);
    }

    /**
     * Send unauthorized response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }

    /**
     * Send forbidden response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403);
    }

    /**
     * Send conflict response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    static conflict(res, message = 'Resource conflict') {
        return this.error(res, message, 409);
    }

    /**
     * Send too many requests response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    static tooManyRequests(res, message = 'Too many requests') {
        return this.error(res, message, 429);
    }

    /**
     * Send analysis status response
     * @param {Object} res - Express response object
     * @param {Object} analysisState - Current analysis state
     */
    static analysisStatus(res, analysisState) {
        return this.success(res, {
            overallStatus: analysisState.status,
            lastUpdate: analysisState.lastUpdate,
            isRunning: analysisState.isRunning,
            errorMessage: analysisState.errorMessage,
            nextScheduledRun: 'Every 24 hours',
            euAnalysis: analysisState.euAnalysis,
            ukAnalysis: analysisState.ukAnalysis
        }, 'Analysis status retrieved successfully');
    }

    /**
     * Send analysis results response
     * @param {Object} res - Express response object
     * @param {string} analysisType - Type of analysis
     * @param {Object} fileResult - File processing result
     * @param {Object} dbStats - Database statistics
     * @param {Object} analysisState - Analysis state
     */
    static analysisResults(res, analysisType, fileResult, dbStats, analysisState) {
        if (!fileResult.success) {
            return this.notFound(res, `${analysisType} analysis data`);
        }

        // Get the correct analysis state property (euAnalysis or ukAnalysis)
        const analysisKey = `${analysisType.toLowerCase()}Analysis`;
        const currentAnalysisState = analysisState[analysisKey] || {
            status: 'not_started',
            projectsCount: 0,
            relevantCount: 0,
            llmAnalyzedCount: 0,
            error: null
        };

        return this.success(res, {
            analysisType: `${analysisType.toUpperCase()} Funding Opportunities`,
            status: currentAnalysisState.status,
            lastUpdate: analysisState.lastUpdate,
            statistics: {
                projectsCount: dbStats.total_projects || 0,
                relevantCount: dbStats.relevant_projects || 0,
                llmAnalyzedCount: dbStats.llm_approved_projects || 0
            },
            fileData: {
                count: fileResult.count,
                columns: fileResult.columns,
                file: fileResult.file,
                lastModified: fileResult.lastModified
            },
            results: fileResult.data
        }, `${analysisType.toUpperCase()} analysis results retrieved successfully`);
    }

    /**
     * Send combined analysis response
     * @param {Object} res - Express response object
     * @param {Object} euResult - EU analysis result
     * @param {Object} ukResult - UK analysis result
     * @param {Object} euStats - EU database statistics
     * @param {Object} ukStats - UK database statistics
     * @param {Object} analysisState - Analysis state
     */
    static combinedAnalysis(res, euResult, ukResult, euStats, ukStats, analysisState) {
        return this.success(res, {
            analysisType: 'Combined EU & UK Funding Opportunities',
            lastUpdate: analysisState.lastUpdate,
            overallStatus: analysisState.status,
            eu: {
                status: analysisState.euAnalysis.status,
                fileAvailable: euResult.success,
                statistics: {
                    projectsCount: euStats.total_projects || 0,
                    relevantCount: euStats.relevant_projects || 0,
                    llmAnalyzedCount: euStats.llm_approved_projects || 0
                },
                data: euResult.success ? euResult.data : null
            },
            uk: {
                status: analysisState.ukAnalysis.status,
                fileAvailable: ukResult.success,
                statistics: {
                    projectsCount: ukStats.total_projects || 0,
                    relevantCount: ukStats.relevant_projects || 0,
                    llmAnalyzedCount: ukStats.llm_approved_projects || 0
                },
                data: ukResult.success ? ukResult.data : null
            },
            totalStatistics: {
                projectsCount: (euStats.total_projects || 0) + (ukStats.total_projects || 0),
                relevantCount: (euStats.relevant_projects || 0) + (ukStats.relevant_projects || 0),
                llmAnalyzedCount: (euStats.llm_approved_projects || 0) + (ukStats.llm_approved_projects || 0)
            }
        }, 'Combined analysis results retrieved successfully');
    }

    /**
     * Send database projects response
     * @param {Object} res - Express response object
     * @param {Array} projects - Projects array
     * @param {string} type - Project type ('eu' or 'uk')
     */
    static databaseProjects(res, projects, type) {
        return this.success(res, {
            type: type.toUpperCase(),
            count: projects.length,
            projects: projects
        }, `${type.toUpperCase()} projects retrieved successfully`);
    }

    /**
     * Send trigger analysis response
     * @param {Object} res - Express response object
     * @param {string} analysisType - Type of analysis
     * @param {Object} result - Analysis result
     */
    static triggerAnalysis(res, analysisType, result) {
        return this.success(res, {
            analysisType,
            ...result
        }, `${analysisType} analysis triggered successfully`, 202);
    }

    /**
     * Send file upload response
     * @param {Object} res - Express response object
     * @param {string} analysisType - Type of analysis
     * @param {number} count - Number of records processed
     */
    static fileUpload(res, analysisType, count) {
        return this.success(res, {
            analysisType: analysisType.toUpperCase(),
            count,
            message: `${analysisType.toUpperCase()} data uploaded and saved successfully`
        }, 'File uploaded successfully', 201);
    }

    /**
     * Send health check response
     * @param {Object} res - Express response object
     * @param {Object} healthData - Health check data
     */
    static healthCheck(res, healthData) {
        const isHealthy = healthData.database && healthData.system.ready;
        const statusCode = isHealthy ? 200 : 503;
        const message = isHealthy ? 'Service is healthy' : 'Service is unhealthy';

        return res.status(statusCode).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            message,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            ...healthData
        });
    }

    /**
     * Send API documentation response
     * @param {Object} res - Express response object
     * @param {Object} endpoints - Available endpoints
     * @param {Object} analysisState - Current analysis state
     */
    static apiDocumentation(res, endpoints, analysisState) {
        return this.success(res, {
            message: 'ODF EU & UK Funding Analysis API',
            version: '2.0.0',
            description: 'Unified Node.js API for EU and UK funding opportunities analysis',
            endpoints,
            lastUpdate: analysisState.lastUpdate,
            status: analysisState.status
        }, 'API documentation retrieved successfully');
    }

    /**
     * Send paginated response
     * @param {Object} res - Express response object
     * @param {Array} data - Data array
     * @param {number} page - Current page
     * @param {number} limit - Items per page
     * @param {number} total - Total items
     * @param {string} message - Success message
     */
    static paginated(res, data, page, limit, total, message = 'Data retrieved successfully') {
        const totalPages = Math.ceil(total / limit);
        
        return this.success(res, {
            items: data,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        }, message);
    }

    /**
     * Handle async route errors
     * @param {Function} fn - Async route handler
     * @returns {Function} - Wrapped route handler
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Create standard error handler middleware
     * @returns {Function} - Error handler middleware
     */
    static errorHandler() {
        return (err, req, res, next) => {
            console.error('Error:', err);

            // Handle specific error types
            if (err.name === 'ValidationError') {
                return this.validationError(res, err.errors, err.message);
            }

            if (err.name === 'UnauthorizedError') {
                return this.unauthorized(res, err.message);
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                return this.error(res, 'File too large', 413);
            }

            // Default error response
            const statusCode = err.statusCode || err.status || 500;
            const message = err.message || 'Internal Server Error';
            
            return this.error(res, message, statusCode);
        };
    }
}

module.exports = ResponseHelper;
