const { pool } = require('../config/database');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { euProjectModel, ukProjectModel } = require('../models');

/**
 * Projects Controller
 */
class ProjectsController {
    /**
     * Get EU projects from database
     */
    static async getEUProjects(req, res) {
        try {
            const { page = 1, limit = 50, pertinence, pertinence_llm, status, search } = req.query;

            const filters = {};
            if (pertinence) filters.pertinence = pertinence;
            if (pertinence_llm) filters.pertinence_llm = pertinence_llm;
            if (status) filters.status = status;
            if (search) filters.search = search;

            const pagination = { page: parseInt(page), limit: parseInt(limit) };

            const result = await euProjectModel.getProjects(filters, pagination);

            return ResponseHelper.paginated(
                res,
                result.projects,
                result.pagination.currentPage,
                result.pagination.itemsPerPage,
                result.pagination.totalItems,
                'EU projects retrieved successfully'
            );
        } catch (error) {
            logger.error('Error fetching EU projects', { error: error.message });
            return ResponseHelper.error(res, 'Failed to fetch EU projects from database');
        }
    }

    /**
     * Get UK projects from database
     */
    static async getUKProjects(req, res) {
        try {
            const { page = 1, limit = 50, pertinence, pertinence_llm, status, search } = req.query;

            const filters = {};
            if (pertinence) filters.pertinence = pertinence;
            if (pertinence_llm) filters.pertinence_llm = pertinence_llm;
            if (status) filters.status = status;
            if (search) filters.search = search;

            const pagination = { page: parseInt(page), limit: parseInt(limit) };

            const result = await ukProjectModel.getProjects(filters, pagination);

            return ResponseHelper.paginated(
                res,
                result.projects,
                result.pagination.currentPage,
                result.pagination.itemsPerPage,
                result.pagination.totalItems,
                'UK projects retrieved successfully'
            );
        } catch (error) {
            logger.error('Error fetching UK projects', { error: error.message });
            return ResponseHelper.error(res, 'Failed to fetch UK projects from database');
        }
    }

    /**
     * Get single EU project by ID
     */
    static async getEUProject(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            const [projects] = await connection.execute(
                'SELECT * FROM eu_projects WHERE id = ?',
                [id]
            );
            connection.release();

            if (projects.length === 0) {
                return ResponseHelper.notFound(res, 'EU project');
            }

            return ResponseHelper.success(res, projects[0], 'EU project retrieved successfully');
        } catch (error) {
            logger.error('Error fetching EU project', { error: error.message, projectId: req.params.id });
            return ResponseHelper.error(res, 'Failed to fetch EU project');
        }
    }

    /**
     * Get single UK project by ID
     */
    static async getUKProject(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await pool.getConnection();
            const [projects] = await connection.execute(
                'SELECT * FROM uk_projects WHERE id = ?',
                [id]
            );
            connection.release();

            if (projects.length === 0) {
                return ResponseHelper.notFound(res, 'UK project');
            }

            return ResponseHelper.success(res, projects[0], 'UK project retrieved successfully');
        } catch (error) {
            logger.error('Error fetching UK project', { error: error.message, projectId: req.params.id });
            return ResponseHelper.error(res, 'Failed to fetch UK project');
        }
    }

    /**
     * Get project statistics
     */
    static async getProjectStatistics(req, res) {
        try {
            const connection = await pool.getConnection();
            
            // EU statistics
            const [euStats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_projects,
                    SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                    SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects,
                    COUNT(DISTINCT status) as unique_statuses
                FROM eu_projects
            `);
            
            // UK statistics
            const [ukStats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_projects,
                    SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                    SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects,
                    COUNT(DISTINCT status) as unique_statuses
                FROM uk_projects
            `);

            // Recent activity
            const [recentEU] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM eu_projects 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const [recentUK] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM uk_projects 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            connection.release();

            const statistics = {
                eu: {
                    ...euStats[0],
                    recentlyAdded: recentEU[0].count
                },
                uk: {
                    ...ukStats[0],
                    recentlyAdded: recentUK[0].count
                },
                combined: {
                    total_projects: (euStats[0].total_projects || 0) + (ukStats[0].total_projects || 0),
                    relevant_projects: (euStats[0].relevant_projects || 0) + (ukStats[0].relevant_projects || 0),
                    llm_approved_projects: (euStats[0].llm_approved_projects || 0) + (ukStats[0].llm_approved_projects || 0),
                    recentlyAdded: (recentEU[0].count || 0) + (recentUK[0].count || 0)
                }
            };

            return ResponseHelper.success(res, statistics, 'Project statistics retrieved successfully');
        } catch (error) {
            logger.error('Error fetching project statistics', { error: error.message });
            return ResponseHelper.error(res, 'Failed to fetch project statistics');
        }
    }

    /**
     * Search projects across both EU and UK
     */
    static async searchProjects(req, res) {
        try {
            const { query: searchQuery, type, page = 1, limit = 50 } = req.query;
            
            if (!searchQuery) {
                return ResponseHelper.validationError(res, [
                    { field: 'query', message: 'Search query is required' }
                ]);
            }

            const offset = (page - 1) * limit;
            const searchTerm = `%${searchQuery}%`;
            const connection = await pool.getConnection();

            let results = [];
            let total = 0;

            if (!type || type === 'eu') {
                const [euResults] = await connection.execute(`
                    SELECT 'eu' as source, id, title, url as link, status, pertinence, pertinence_llm, created_at
                    FROM eu_projects 
                    WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                `, [searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]);
                
                results = results.concat(euResults);
            }

            if (!type || type === 'uk') {
                const [ukResults] = await connection.execute(`
                    SELECT 'uk' as source, id, title, link, status, pertinence, pertinence_llm, created_at
                    FROM uk_projects 
                    WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                `, [searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]);
                
                results = results.concat(ukResults);
            }

            // Get total count
            if (!type || type === 'eu') {
                const [euCount] = await connection.execute(`
                    SELECT COUNT(*) as count FROM eu_projects 
                    WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
                `, [searchTerm, searchTerm, searchTerm]);
                total += euCount[0].count;
            }

            if (!type || type === 'uk') {
                const [ukCount] = await connection.execute(`
                    SELECT COUNT(*) as count FROM uk_projects 
                    WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
                `, [searchTerm, searchTerm, searchTerm]);
                total += ukCount[0].count;
            }

            connection.release();

            // Sort combined results by date
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return ResponseHelper.paginated(
                res,
                results,
                parseInt(page),
                parseInt(limit),
                total,
                `Search results for "${searchQuery}"`
            );
        } catch (error) {
            logger.error('Error searching projects', { error: error.message, query: req.query });
            return ResponseHelper.error(res, 'Failed to search projects');
        }
    }

    /**
     * Update project pertinence (admin only)
     */
    static async updateProjectPertinence(req, res) {
        try {
            const { type, id } = req.params;
            const { pertinence, pertinence_llm } = req.body;

            if (!['eu', 'uk'].includes(type)) {
                return ResponseHelper.validationError(res, [
                    { field: 'type', message: 'Type must be either "eu" or "uk"' }
                ]);
            }

            const table = type === 'eu' ? 'eu_projects' : 'uk_projects';
            const connection = await pool.getConnection();

            const updateFields = [];
            const params = [];

            if (pertinence !== undefined) {
                updateFields.push('pertinence = ?');
                params.push(pertinence);
            }

            if (pertinence_llm !== undefined) {
                updateFields.push('pertinence_llm = ?');
                params.push(pertinence_llm);
            }

            if (updateFields.length === 0) {
                return ResponseHelper.validationError(res, [
                    { field: 'body', message: 'At least one field (pertinence or pertinence_llm) must be provided' }
                ]);
            }

            params.push(id);

            const [result] = await connection.execute(
                `UPDATE ${table} SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
                params
            );

            connection.release();

            if (result.affectedRows === 0) {
                return ResponseHelper.notFound(res, `${type.toUpperCase()} project`);
            }

            logger.info('Project pertinence updated', { 
                type, 
                projectId: id, 
                pertinence, 
                pertinence_llm,
                userId: req.user?.id 
            });

            return ResponseHelper.success(res, null, 'Project pertinence updated successfully');
        } catch (error) {
            logger.error('Error updating project pertinence', { 
                error: error.message, 
                type: req.params.type, 
                projectId: req.params.id 
            });
            return ResponseHelper.error(res, 'Failed to update project pertinence');
        }
    }
}

module.exports = ProjectsController;
