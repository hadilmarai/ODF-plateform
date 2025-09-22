const express = require('express');
const { AnalysisController } = require('../controllers/analysisController');
const AuthMiddleware = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const ValidationMiddleware = require('../middleware/validation');
const ResponseHelper = require('../utils/responseHelper');

const router = express.Router();

/**
 * Get current analysis status
 * GET /analysis/status
 */
router.get('/status',
    AuthMiddleware.optionalAuth,
    RateLimiter.general(),
    ResponseHelper.asyncHandler(AnalysisController.getStatus)
);

/**
 * Get EU analysis results
 * GET /analysis/eu
 */
router.get('/eu',
    AuthMiddleware.optionalAuth,
    RateLimiter.general(),
    ResponseHelper.asyncHandler(AnalysisController.getEUAnalysis)
);

/**
 * Get UK analysis results
 * GET /analysis/uk
 */
router.get('/uk',
    AuthMiddleware.optionalAuth,
    RateLimiter.general(),
    ResponseHelper.asyncHandler(AnalysisController.getUKAnalysis)
);

/**
 * Get combined analysis results
 * GET /analysis/combined
 */
router.get('/combined',
    AuthMiddleware.optionalAuth,
    RateLimiter.general(),
    ResponseHelper.asyncHandler(AnalysisController.getCombinedAnalysis)
);

/**
 * Trigger full analysis (EU + UK)
 * POST /analysis/trigger
 * Requires authentication
 */
router.post('/trigger',
    RateLimiter.analysis(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validateAnalysisConfig(),
    ResponseHelper.asyncHandler(AnalysisController.triggerFullAnalysis)
);

/**
 * Trigger EU analysis only
 * POST /analysis/trigger/eu
 * Requires authentication
 */
router.post('/trigger/eu',
    RateLimiter.analysis(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validateAnalysisConfig(),
    ResponseHelper.asyncHandler(AnalysisController.triggerEUAnalysis)
);

/**
 * Trigger UK analysis only
 * POST /analysis/trigger/uk
 * Requires authentication
 */
router.post('/trigger/uk',
    RateLimiter.analysis(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validateAnalysisConfig(),
    ResponseHelper.asyncHandler(AnalysisController.triggerUKAnalysis)
);

/**
 * Get analysis by type (dynamic route)
 * GET /analysis/:type
 */
router.get('/:type',
    RateLimiter.general(),
    ValidationMiddleware.validateAnalysisType(),
    ResponseHelper.asyncHandler(async (req, res) => {
        const { type } = req.params;
        
        if (type === 'eu') {
            return AnalysisController.getEUAnalysis(req, res);
        } else if (type === 'uk') {
            return AnalysisController.getUKAnalysis(req, res);
        } else {
            return ResponseHelper.validationError(res, [
                { field: 'type', message: 'Analysis type must be either "eu" or "uk"' }
            ]);
        }
    })
);

/**
 * Trigger analysis by type (dynamic route)
 * POST /analysis/trigger/:type
 */
router.post('/trigger/:type',
    RateLimiter.analysis(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validateAnalysisType(),
    ValidationMiddleware.validateAnalysisConfig(),
    ResponseHelper.asyncHandler(async (req, res) => {
        const { type } = req.params;
        
        if (type === 'eu') {
            return AnalysisController.triggerEUAnalysis(req, res);
        } else if (type === 'uk') {
            return AnalysisController.triggerUKAnalysis(req, res);
        } else {
            return ResponseHelper.validationError(res, [
                { field: 'type', message: 'Analysis type must be either "eu" or "uk"' }
            ]);
        }
    })
);

/**
 * Get analysis history/logs
 * GET /analysis/history
 */
router.get('/history',
    RateLimiter.general(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validatePagination(),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 20, type } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '';
            const params = [];

            if (type && ['eu', 'uk', 'combined'].includes(type)) {
                whereClause = 'WHERE analysis_type = ?';
                params.push(type);
            }

            const connection = await require('../config/database').pool.getConnection();
            
            // Get total count
            const [countResult] = await connection.execute(
                `SELECT COUNT(*) as total FROM analysis_logs ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get history with pagination
            const [history] = await connection.execute(
                `SELECT * FROM analysis_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            
            connection.release();

            return ResponseHelper.paginated(
                res,
                history,
                parseInt(page),
                parseInt(limit),
                total,
                'Analysis history retrieved successfully'
            );
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to get analysis history');
        }
    })
);

/**
 * Get analysis statistics
 * GET /analysis/statistics
 */
router.get('/statistics',
    RateLimiter.general(),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const connection = await require('../config/database').pool.getConnection();
            
            // Get analysis statistics
            const [analysisStats] = await connection.execute(`
                SELECT 
                    analysis_type,
                    COUNT(*) as total_runs,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_runs,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_runs,
                    AVG(execution_time) as avg_execution_time,
                    MAX(created_at) as last_run
                FROM analysis_logs 
                GROUP BY analysis_type
            `);

            // Get recent activity
            const [recentActivity] = await connection.execute(`
                SELECT analysis_type, status, execution_time, created_at
                FROM analysis_logs 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            connection.release();

            const statistics = {
                byType: analysisStats.reduce((acc, stat) => {
                    acc[stat.analysis_type] = {
                        totalRuns: stat.total_runs,
                        successfulRuns: stat.successful_runs,
                        failedRuns: stat.failed_runs,
                        successRate: stat.total_runs > 0 ? (stat.successful_runs / stat.total_runs * 100).toFixed(2) : 0,
                        avgExecutionTime: Math.round(stat.avg_execution_time || 0),
                        lastRun: stat.last_run
                    };
                    return acc;
                }, {}),
                recentActivity: recentActivity,
                currentState: require('../controllers/analysisController').analysisState
            };

            return ResponseHelper.success(res, statistics, 'Analysis statistics retrieved successfully');
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to get analysis statistics');
        }
    })
);

/**
 * Cancel running analysis (admin only)
 * POST /analysis/cancel
 */
router.post('/cancel',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    AuthMiddleware.adminOnly,
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { analysisState } = require('../controllers/analysisController');
            
            if (!analysisState.isRunning) {
                return ResponseHelper.conflict(res, 'No analysis is currently running');
            }

            // In a real implementation, you would need to track and kill the running processes
            // For now, we'll just reset the state
            analysisState.isRunning = false;
            analysisState.status = 'cancelled';
            analysisState.errorMessage = 'Analysis cancelled by user';

            return ResponseHelper.success(res, null, 'Analysis cancelled successfully');
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to cancel analysis');
        }
    })
);

module.exports = router;
