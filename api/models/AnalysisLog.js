const BaseModel = require('./BaseModel');
const logger = require('../utils/logger');

/**
 * Analysis Log Model
 */
class AnalysisLog extends BaseModel {
    constructor() {
        super('analysis_logs', 'id');
        
        // Define fillable fields
        this.fillable = [
            'analysis_type',
            'status',
            'message',
            'execution_time',
            'projects_processed',
            'relevant_projects',
            'llm_analyzed'
        ];
    }

    /**
     * Log analysis start
     * @param {string} analysisType - Type of analysis ('eu', 'uk', 'combined')
     * @param {string} message - Optional message
     * @returns {Promise<Object>} Created log entry
     */
    async logAnalysisStart(analysisType, message = null) {
        const logEntry = await this.create({
            analysis_type: analysisType,
            status: 'started',
            message: message || `${analysisType.toUpperCase()} analysis started`,
            execution_time: null,
            projects_processed: 0,
            relevant_projects: 0,
            llm_analyzed: 0
        });
        
        logger.info('Analysis start logged', {
            logId: logEntry.id,
            analysisType,
            message
        });
        
        return logEntry;
    }

    /**
     * Log analysis completion
     * @param {number} logId - Log entry ID
     * @param {Object} results - Analysis results
     * @returns {Promise<number>} Affected rows
     */
    async logAnalysisComplete(logId, results = {}) {
        const updateData = {
            status: 'completed',
            execution_time: results.executionTime || null,
            projects_processed: results.projectsProcessed || 0,
            relevant_projects: results.relevantProjects || 0,
            llm_analyzed: results.llmAnalyzed || 0,
            message: results.message || 'Analysis completed successfully'
        };
        
        const affectedRows = await this.updateById(logId, updateData);
        
        logger.info('Analysis completion logged', {
            logId,
            results: updateData
        });
        
        return affectedRows;
    }

    /**
     * Log analysis error
     * @param {number} logId - Log entry ID
     * @param {string} errorMessage - Error message
     * @param {number} executionTime - Execution time before error
     * @returns {Promise<number>} Affected rows
     */
    async logAnalysisError(logId, errorMessage, executionTime = null) {
        const updateData = {
            status: 'error',
            message: errorMessage,
            execution_time: executionTime
        };
        
        const affectedRows = await this.updateById(logId, updateData);
        
        logger.error('Analysis error logged', {
            logId,
            errorMessage,
            executionTime
        });
        
        return affectedRows;
    }

    /**
     * Get analysis history with pagination
     * @param {Object} filters - Filter conditions
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Analysis history and pagination info
     */
    async getAnalysisHistory(filters = {}, pagination = {}) {
        const { page = 1, limit = 20 } = pagination;
        const offset = (page - 1) * limit;
        
        let whereConditions = [];
        let params = [];
        
        // Apply filters
        if (filters.analysisType) {
            whereConditions.push('analysis_type = ?');
            params.push(filters.analysisType);
        }
        
        if (filters.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        if (filters.startDate) {
            whereConditions.push('created_at >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('created_at <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
        const countResults = await this.executeQuery(countQuery, params);
        const totalCount = countResults[0].count;
        
        // Get history
        const historyQuery = `
            SELECT * FROM ${this.tableName} 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const history = await this.executeQuery(historyQuery, [...params, limit, offset]);
        
        return {
            history,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1
            }
        };
    }

    /**
     * Get analysis statistics
     * @param {Object} filters - Filter conditions (optional)
     * @returns {Promise<Object>} Analysis statistics
     */
    async getAnalysisStatistics(filters = {}) {
        let whereConditions = [];
        let params = [];
        
        // Apply date filters if provided
        if (filters.startDate) {
            whereConditions.push('created_at >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('created_at <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';
        
        const statsQuery = `
            SELECT 
                analysis_type,
                COUNT(*) as total_runs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_runs,
                AVG(CASE WHEN execution_time IS NOT NULL THEN execution_time END) as avg_execution_time,
                MIN(CASE WHEN execution_time IS NOT NULL THEN execution_time END) as min_execution_time,
                MAX(CASE WHEN execution_time IS NOT NULL THEN execution_time END) as max_execution_time,
                SUM(projects_processed) as total_projects_processed,
                SUM(relevant_projects) as total_relevant_projects,
                SUM(llm_analyzed) as total_llm_analyzed,
                MAX(created_at) as last_run
            FROM ${this.tableName} 
            ${whereClause}
            GROUP BY analysis_type
        `;
        
        const results = await this.executeQuery(statsQuery, params);
        
        // Transform results into a more usable format
        const statistics = {
            byType: {},
            overall: {
                totalRuns: 0,
                successfulRuns: 0,
                failedRuns: 0,
                totalProjectsProcessed: 0,
                totalRelevantProjects: 0,
                totalLlmAnalyzed: 0
            }
        };
        
        results.forEach(row => {
            const successRate = row.total_runs > 0 
                ? ((row.successful_runs / row.total_runs) * 100).toFixed(2)
                : 0;
            
            statistics.byType[row.analysis_type] = {
                totalRuns: row.total_runs,
                successfulRuns: row.successful_runs,
                failedRuns: row.failed_runs,
                successRate: parseFloat(successRate),
                avgExecutionTime: Math.round(row.avg_execution_time || 0),
                minExecutionTime: row.min_execution_time || 0,
                maxExecutionTime: row.max_execution_time || 0,
                totalProjectsProcessed: row.total_projects_processed || 0,
                totalRelevantProjects: row.total_relevant_projects || 0,
                totalLlmAnalyzed: row.total_llm_analyzed || 0,
                lastRun: row.last_run
            };
            
            // Add to overall statistics
            statistics.overall.totalRuns += row.total_runs;
            statistics.overall.successfulRuns += row.successful_runs;
            statistics.overall.failedRuns += row.failed_runs;
            statistics.overall.totalProjectsProcessed += row.total_projects_processed || 0;
            statistics.overall.totalRelevantProjects += row.total_relevant_projects || 0;
            statistics.overall.totalLlmAnalyzed += row.total_llm_analyzed || 0;
        });
        
        // Calculate overall success rate
        statistics.overall.successRate = statistics.overall.totalRuns > 0
            ? ((statistics.overall.successfulRuns / statistics.overall.totalRuns) * 100).toFixed(2)
            : 0;
        
        return statistics;
    }

    /**
     * Get recent analysis activity
     * @param {number} limit - Number of recent entries to return
     * @returns {Promise<Array>} Recent analysis activity
     */
    async getRecentActivity(limit = 10) {
        const query = `
            SELECT 
                analysis_type,
                status,
                execution_time,
                projects_processed,
                relevant_projects,
                llm_analyzed,
                created_at,
                message
            FROM ${this.tableName} 
            ORDER BY created_at DESC 
            LIMIT ?
        `;
        
        return await this.executeQuery(query, [limit]);
    }

    /**
     * Get analysis performance trends
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Array>} Performance trends
     */
    async getPerformanceTrends(days = 30) {
        const query = `
            SELECT 
                DATE(created_at) as analysis_date,
                analysis_type,
                COUNT(*) as runs_count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
                AVG(CASE WHEN execution_time IS NOT NULL THEN execution_time END) as avg_execution_time,
                SUM(projects_processed) as total_projects
            FROM ${this.tableName}
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at), analysis_type
            ORDER BY analysis_date DESC, analysis_type
        `;
        
        return await this.executeQuery(query, [days]);
    }

    /**
     * Get failed analysis details
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Failed analyses with details
     */
    async getFailedAnalyses(pagination = {}) {
        const { page = 1, limit = 20 } = pagination;
        const offset = (page - 1) * limit;
        
        // Get total count of failed analyses
        const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'error'`;
        const countResults = await this.executeQuery(countQuery);
        const totalCount = countResults[0].count;
        
        // Get failed analyses
        const failedQuery = `
            SELECT * FROM ${this.tableName}
            WHERE status = 'error'
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const failedAnalyses = await this.executeQuery(failedQuery, [limit, offset]);
        
        return {
            failedAnalyses,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1
            }
        };
    }

    /**
     * Clean up old log entries
     * @param {number} daysToKeep - Number of days to keep logs
     * @returns {Promise<number>} Number of deleted entries
     */
    async cleanupOldLogs(daysToKeep = 90) {
        const query = `
            DELETE FROM ${this.tableName}
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        const results = await this.executeQuery(query, [daysToKeep]);
        
        logger.info('Old analysis logs cleaned up', {
            daysToKeep,
            deletedCount: results.affectedRows || 0
        });
        
        return results.affectedRows || 0;
    }

    /**
     * Get analysis duration distribution
     * @returns {Promise<Object>} Duration distribution statistics
     */
    async getDurationDistribution() {
        const query = `
            SELECT 
                analysis_type,
                CASE 
                    WHEN execution_time < 60000 THEN 'Under 1 minute'
                    WHEN execution_time < 300000 THEN '1-5 minutes'
                    WHEN execution_time < 900000 THEN '5-15 minutes'
                    WHEN execution_time < 1800000 THEN '15-30 minutes'
                    WHEN execution_time < 3600000 THEN '30-60 minutes'
                    ELSE 'Over 1 hour'
                END as duration_range,
                COUNT(*) as count
            FROM ${this.tableName}
            WHERE execution_time IS NOT NULL AND status = 'completed'
            GROUP BY analysis_type, duration_range
            ORDER BY analysis_type, 
                CASE duration_range
                    WHEN 'Under 1 minute' THEN 1
                    WHEN '1-5 minutes' THEN 2
                    WHEN '5-15 minutes' THEN 3
                    WHEN '15-30 minutes' THEN 4
                    WHEN '30-60 minutes' THEN 5
                    WHEN 'Over 1 hour' THEN 6
                END
        `;
        
        const results = await this.executeQuery(query);
        
        // Group by analysis type
        const distribution = {};
        results.forEach(row => {
            if (!distribution[row.analysis_type]) {
                distribution[row.analysis_type] = {};
            }
            distribution[row.analysis_type][row.duration_range] = row.count;
        });
        
        return distribution;
    }
}

module.exports = AnalysisLog;
