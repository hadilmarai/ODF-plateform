const BaseModel = require('./BaseModel');
const logger = require('../utils/logger');

/**
 * UK Project Model
 */
class UKProject extends BaseModel {
    constructor() {
        super('uk_projects', 'id');
        
        // Define fillable fields
        this.fillable = [
            'title',
            'link',
            'status',
            'pertinence',
            'matching_words',
            'pertinence_llm',
            'resume_llm'
        ];
    }

    /**
     * Create multiple UK projects (bulk insert)
     * @param {Array} projectsData - Array of project data
     * @returns {Promise<Object>} Insert result
     */
    async bulkCreate(projectsData) {
        if (!Array.isArray(projectsData) || projectsData.length === 0) {
            throw new Error('Projects data must be a non-empty array');
        }

        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            
            // Clear existing data
            await connection.execute(`DELETE FROM ${this.tableName}`);
            
            // Prepare bulk insert - use 'url' to match database schema
            const fields = [
                'title', 'url', 'status', 'pertinence', 'matching_words',
                'pertinence_llm', 'resume_llm', 'created_at', 'updated_at'
            ];
            
            const placeholders = fields.map(() => '?').join(', ');
            const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
            
            let insertedCount = 0;
            const now = new Date();
            
            for (const project of projectsData) {
                // Handle empty URLs by generating unique values
                // Try multiple possible column names for URL
                let url = project.URL || project.url || project.Lien || project.link || '';
                if (!url || url.trim() === '') {
                    // Generate a unique placeholder URL using title and index
                    const title = project.Titre || project.title || 'untitled';
                    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50);
                    url = `placeholder-${sanitizedTitle}-${insertedCount + 1}`;
                }

                const values = [
                    project.Title || project.Titre || project.title || '',  // Title is correct in Excel
                    url,
                    project.Status || project.status || '',
                    project.Pertinence || project.pertinence || '',
                    project['Matching Word(s)'] || project.matching_words || '',
                    project['Pertinence LLM'] || project.pertinence_llm || '',
                    project['Résumé LLM'] || project.resume_llm || '',
                    now,
                    now
                ];
                
                await connection.execute(query, values);
                insertedCount++;
            }
            
            await connection.commit();
            
            logger.info('UK projects bulk created', {
                count: insertedCount,
                table: this.tableName
            });
            
            return {
                success: true,
                count: insertedCount,
                message: `Successfully inserted ${insertedCount} UK projects`
            };
        } catch (error) {
            await connection.rollback();
            logger.error('Error in UK projects bulk create', {
                error: error.message,
                table: this.tableName
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get projects with filters and pagination
     * @param {Object} filters - Filter conditions
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Projects and pagination info
     */
    async getProjects(filters = {}, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const offset = (page - 1) * limit;
        
        let whereConditions = [];
        let params = [];
        
        // Apply filters
        if (filters.pertinence) {
            whereConditions.push('pertinence = ?');
            params.push(filters.pertinence);
        }
        
        if (filters.pertinence_llm) {
            whereConditions.push('pertinence_llm = ?');
            params.push(filters.pertinence_llm);
        }
        
        if (filters.status) {
            whereConditions.push('status = ?');
            params.push(filters.status);
        }
        
        if (filters.search) {
            whereConditions.push('(title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
        const countResults = await this.executeQuery(countQuery, params);
        const totalCount = countResults[0].count;
        
        // Get projects
        const projectsQuery = `
            SELECT * FROM ${this.tableName} 
            ${whereClause} 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const projects = await this.executeQuery(projectsQuery, [...params, limit, offset]);
        
        return {
            projects,
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
     * Get project statistics
     * @returns {Promise<Object>} Project statistics
     */
    async getStatistics() {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects,
                COUNT(DISTINCT status) as unique_statuses,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as recently_added
            FROM ${this.tableName}
        `;
        
        const results = await this.executeQuery(statsQuery);
        return results[0];
    }

    /**
     * Search projects
     * @param {string} searchTerm - Search term
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Search results
     */
    async searchProjects(searchTerm, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const offset = (page - 1) * limit;
        
        const searchPattern = `%${searchTerm}%`;
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
        `;
        const countResults = await this.executeQuery(countQuery, [searchPattern, searchPattern, searchPattern]);
        const totalCount = countResults[0].count;
        
        // Get projects
        const searchQuery = `
            SELECT *, 'uk' as source FROM ${this.tableName}
            WHERE title LIKE ? OR matching_words LIKE ? OR resume_llm LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const projects = await this.executeQuery(searchQuery, [
            searchPattern, searchPattern, searchPattern, limit, offset
        ]);
        
        return {
            projects,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1
            },
            searchTerm
        };
    }

    /**
     * Update project pertinence
     * @param {number} projectId - Project ID
     * @param {Object} pertinenceData - Pertinence data
     * @returns {Promise<number>} Affected rows
     */
    async updatePertinence(projectId, pertinenceData) {
        const updateData = {};
        
        if (pertinenceData.pertinence !== undefined) {
            updateData.pertinence = pertinenceData.pertinence;
        }
        
        if (pertinenceData.pertinence_llm !== undefined) {
            updateData.pertinence_llm = pertinenceData.pertinence_llm;
        }
        
        if (Object.keys(updateData).length === 0) {
            throw new Error('No pertinence data provided');
        }
        
        const affectedRows = await this.updateById(projectId, updateData);
        
        logger.info('UK project pertinence updated', {
            projectId,
            updateData,
            affectedRows
        });
        
        return affectedRows;
    }

    /**
     * Get projects by status
     * @param {string} status - Project status
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Projects with pagination
     */
    async getProjectsByStatus(status, pagination = {}) {
        return await this.getProjects({ status }, pagination);
    }

    /**
     * Get relevant projects (pertinence = 'Yes')
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Relevant projects
     */
    async getRelevantProjects(pagination = {}) {
        return await this.getProjects({ pertinence: 'Yes' }, pagination);
    }

    /**
     * Get LLM approved projects (pertinence_llm = 'Yes')
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} LLM approved projects
     */
    async getLLMApprovedProjects(pagination = {}) {
        return await this.getProjects({ pertinence_llm: 'Yes' }, pagination);
    }

    /**
     * Get recent projects
     * @param {number} days - Number of days back to check
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Recent projects
     */
    async getRecentProjects(days = 7, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        const [projects, countResults] = await Promise.all([
            this.executeQuery(query, [days, limit, offset]),
            this.executeQuery(countQuery, [days])
        ]);
        
        const totalCount = countResults[0].count;
        
        return {
            projects,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1
            },
            daysBack: days
        };
    }

    /**
     * Get projects activity (recently updated)
     * @param {number} days - Number of days back to check
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Recently updated projects
     */
    async getProjectsActivity(days = 7, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const offset = (page - 1) * limit;
        
        const query = `
            SELECT *, 'uk' as source FROM ${this.tableName}
            WHERE updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND updated_at > created_at
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND updated_at > created_at
        `;
        
        const [projects, countResults] = await Promise.all([
            this.executeQuery(query, [days, limit, offset]),
            this.executeQuery(countQuery, [days])
        ]);
        
        const totalCount = countResults[0].count;
        
        return {
            projects,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPreviousPage: page > 1
            },
            daysBack: days
        };
    }

    /**
     * Export projects to array format
     * @param {Object} filters - Filter conditions
     * @returns {Promise<Array>} Projects array
     */
    async exportProjects(filters = {}) {
        const result = await this.getProjects(filters, { limit: 10000 }); // Large limit for export
        return result.projects;
    }

    /**
     * Get projects grouped by status
     * @returns {Promise<Object>} Projects grouped by status
     */
    async getProjectsByStatusGroup() {
        const query = `
            SELECT 
                status,
                COUNT(*) as count,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_count,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_count
            FROM ${this.tableName}
            GROUP BY status
            ORDER BY count DESC
        `;
        
        const results = await this.executeQuery(query);
        
        return results.reduce((acc, row) => {
            acc[row.status || 'Unknown'] = {
                count: row.count,
                relevantCount: row.relevant_count,
                llmApprovedCount: row.llm_approved_count
            };
            return acc;
        }, {});
    }

    /**
     * Get matching words analysis
     * @returns {Promise<Array>} Most common matching words
     */
    async getMatchingWordsAnalysis() {
        const query = `
            SELECT 
                matching_words,
                COUNT(*) as frequency,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_count
            FROM ${this.tableName}
            WHERE matching_words IS NOT NULL AND matching_words != ''
            GROUP BY matching_words
            ORDER BY frequency DESC
            LIMIT 20
        `;
        
        return await this.executeQuery(query);
    }
}

module.exports = UKProject;
