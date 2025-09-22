const express = require('express');
const ProjectsController = require('../controllers/projectsController');
const AuthMiddleware = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const ValidationMiddleware = require('../middleware/validation');
const ResponseHelper = require('../utils/responseHelper');

const router = express.Router();

/**
 * Get EU projects from database
 * GET /projects/eu
 */
router.get('/eu',
    RateLimiter.general(),
    ValidationMiddleware.validatePagination(),
    ValidationMiddleware.validateProjectFilters(),
    ResponseHelper.asyncHandler(ProjectsController.getEUProjects)
);

/**
 * Get UK projects from database
 * GET /projects/uk
 */
router.get('/uk',
    RateLimiter.general(),
    ValidationMiddleware.validatePagination(),
    ValidationMiddleware.validateProjectFilters(),
    ResponseHelper.asyncHandler(ProjectsController.getUKProjects)
);

/**
 * Get single EU project by ID
 * GET /projects/eu/:id
 */
router.get('/eu/:id',
    RateLimiter.general(),
    ValidationMiddleware.validateId(),
    ResponseHelper.asyncHandler(ProjectsController.getEUProject)
);

/**
 * Get single UK project by ID
 * GET /projects/uk/:id
 */
router.get('/uk/:id',
    RateLimiter.general(),
    ValidationMiddleware.validateId(),
    ResponseHelper.asyncHandler(ProjectsController.getUKProject)
);

/**
 * Get project statistics
 * GET /projects/statistics
 */
router.get('/statistics',
    RateLimiter.general(),
    ResponseHelper.asyncHandler(ProjectsController.getProjectStatistics)
);

/**
 * Search projects across both EU and UK
 * GET /projects/search
 */
router.get('/search',
    RateLimiter.general(),
    ValidationMiddleware.validatePagination(),
    ResponseHelper.asyncHandler(ProjectsController.searchProjects)
);

/**
 * Update project pertinence (admin only)
 * PUT /projects/:type/:id/pertinence
 */
router.put('/:type/:id/pertinence',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    AuthMiddleware.adminOnly,
    ValidationMiddleware.validateAnalysisType(),
    ValidationMiddleware.validateId(),
    ValidationMiddleware.custom((body) => {
        const { pertinence, pertinence_llm } = body;
        
        if (pertinence !== undefined && !['Yes', 'No'].includes(pertinence)) {
            throw new Error('Pertinence must be either "Yes" or "No"');
        }
        
        if (pertinence_llm !== undefined && !['Yes', 'No'].includes(pertinence_llm)) {
            throw new Error('Pertinence LLM must be either "Yes" or "No"');
        }
        
        if (pertinence === undefined && pertinence_llm === undefined) {
            throw new Error('At least one field (pertinence or pertinence_llm) must be provided');
        }
        
        return true;
    }, 'Invalid pertinence values'),
    ResponseHelper.asyncHandler(ProjectsController.updateProjectPertinence)
);

/**
 * Get projects by type (dynamic route)
 * GET /projects/:type
 */
router.get('/:type',
    RateLimiter.general(),
    ValidationMiddleware.validateAnalysisType(),
    ValidationMiddleware.validatePagination(),
    ValidationMiddleware.validateProjectFilters(),
    ResponseHelper.asyncHandler(async (req, res) => {
        const { type } = req.params;
        
        if (type === 'eu') {
            return ProjectsController.getEUProjects(req, res);
        } else if (type === 'uk') {
            return ProjectsController.getUKProjects(req, res);
        } else {
            return ResponseHelper.validationError(res, [
                { field: 'type', message: 'Project type must be either "eu" or "uk"' }
            ]);
        }
    })
);

/**
 * Get single project by type and ID (dynamic route)
 * GET /projects/:type/:id
 */
router.get('/:type/:id',
    RateLimiter.general(),
    ValidationMiddleware.validateAnalysisType(),
    ValidationMiddleware.validateId(),
    ResponseHelper.asyncHandler(async (req, res) => {
        const { type } = req.params;
        
        if (type === 'eu') {
            return ProjectsController.getEUProject(req, res);
        } else if (type === 'uk') {
            return ProjectsController.getUKProject(req, res);
        } else {
            return ResponseHelper.validationError(res, [
                { field: 'type', message: 'Project type must be either "eu" or "uk"' }
            ]);
        }
    })
);

/**
 * Export projects to Excel (admin only)
 * GET /projects/:type/export
 */
router.get('/:type/export',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateAnalysisType(),
    ValidationMiddleware.validateProjectFilters(),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { type } = req.params;
            const { pertinence, pertinence_llm, status, search } = req.query;

            let whereClause = '';
            const params = [];

            // Build WHERE clause based on filters
            const conditions = [];
            
            if (pertinence) {
                conditions.push('pertinence = ?');
                params.push(pertinence);
            }
            
            if (pertinence_llm) {
                conditions.push('pertinence_llm = ?');
                params.push(pertinence_llm);
            }
            
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }
            
            if (search) {
                conditions.push('(title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?)');
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const table = type === 'eu' ? 'eu_projects' : 'uk_projects';
            const connection = await require('../config/database').pool.getConnection();
            
            const [projects] = await connection.execute(
                `SELECT * FROM ${table} ${whereClause} ORDER BY created_at DESC`,
                params
            );
            
            connection.release();

            // Create Excel file
            const ExcelProcessor = require('../utils/excelProcessor');
            const path = require('path');
            const fs = require('fs');

            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const filename = `${type}_projects_export_${new Date().toISOString().split('T')[0]}.xlsx`;
            const filepath = path.join(tempDir, filename);

            const writeResult = ExcelProcessor.writeExcelFile(projects, filepath, `${type.toUpperCase()} Projects`);
            
            if (!writeResult.success) {
                return ResponseHelper.error(res, 'Failed to create export file');
            }

            // Send file
            res.download(filepath, filename, (err) => {
                // Clean up temp file
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
                
                if (err) {
                    console.error('Error sending export file:', err);
                }
            });
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to export projects');
        }
    })
);

/**
 * Get project activity/changes (admin only)
 * GET /projects/activity
 */
router.get('/activity',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.validatePagination(),
    ValidationMiddleware.validateDateRange(),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 50, startDate, endDate, type } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '';
            const params = [];

            const conditions = [];
            
            if (startDate) {
                conditions.push('updated_at >= ?');
                params.push(startDate);
            }
            
            if (endDate) {
                conditions.push('updated_at <= ?');
                params.push(endDate);
            }

            if (conditions.length > 0) {
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const connection = await require('../config/database').pool.getConnection();
            
            let activities = [];
            
            if (!type || type === 'eu') {
                const [euActivity] = await connection.execute(
                    `SELECT 'eu' as source, id, title, url as link, pertinence, pertinence_llm, updated_at 
                     FROM eu_projects ${whereClause} 
                     ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
                    [...params, parseInt(limit), parseInt(offset)]
                );
                activities = activities.concat(euActivity);
            }

            if (!type || type === 'uk') {
                const [ukActivity] = await connection.execute(
                    `SELECT 'uk' as source, id, title, link, pertinence, pertinence_llm, updated_at 
                     FROM uk_projects ${whereClause} 
                     ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
                    [...params, parseInt(limit), parseInt(offset)]
                );
                activities = activities.concat(ukActivity);
            }

            connection.release();

            // Sort combined results by update date
            activities.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            return ResponseHelper.success(res, activities, 'Project activity retrieved successfully');
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to get project activity');
        }
    })
);

module.exports = router;
