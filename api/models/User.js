const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config/app');
const logger = require('../utils/logger');

/**
 * User Model
 */
class User extends BaseModel {
    constructor() {
        super('users', 'id');
        
        // Define fillable fields (fields that can be mass assigned)
        this.fillable = [
            'username',
            'email',
            'password_hash',
            'role',
            'is_active'
        ];
        
        // Define hidden fields (fields to hide in JSON output)
        this.hidden = [
            'password_hash'
        ];
    }

    /**
     * Create a new user with hashed password
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    async createUser(userData) {
        const { username, email, password, role = 'user' } = userData;
        
        // Hash password
        const passwordHash = await this.hashPassword(password);
        
        // Create user
        const user = await this.create({
            username,
            email,
            password_hash: passwordHash,
            role,
            is_active: true
        });
        
        logger.info('User created', {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        
        return user;
    }

    /**
     * Find user by username or email
     * @param {string} identifier - Username or email
     * @returns {Promise<Object|null>} User or null
     */
    async findByIdentifier(identifier) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE (username = ? OR email = ?) AND is_active = 1
        `;
        
        const results = await this.executeQuery(query, [identifier, identifier]);
        return results.length > 0 ? this.formatRecord(results[0]) : null;
    }

    /**
     * Find user by username or email (including password hash for authentication)
     * @param {string} identifier - Username or email
     * @returns {Promise<Object|null>} User with password hash or null
     */
    async findByIdentifierWithPassword(identifier) {
        const query = `
            SELECT * FROM ${this.tableName} 
            WHERE (username = ? OR email = ?) AND is_active = 1
        `;
        
        const results = await this.executeQuery(query, [identifier, identifier]);
        return results.length > 0 ? results[0] : null; // Don't format to keep password_hash
    }

    /**
     * Authenticate user with credentials
     * @param {string} identifier - Username or email
     * @param {string} password - Plain text password
     * @returns {Promise<Object|null>} Authenticated user or null
     */
    async authenticate(identifier, password) {
        const user = await this.findByIdentifierWithPassword(identifier);
        
        if (!user) {
            return null;
        }
        
        const isPasswordValid = await this.comparePassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            return null;
        }
        
        // Update last login
        await this.updateById(user.id, { last_login: new Date() });
        
        logger.info('User authenticated', {
            userId: user.id,
            username: user.username
        });
        
        return this.formatRecord(user);
    }

    /**
     * Hash password
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} Password match result
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token for user
     * @param {Object} user - User object
     * @param {string} expiresIn - Token expiration
     * @returns {string} JWT token
     */
    generateToken(user, expiresIn = config.jwt.expiresIn) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role
        };
        
        return jwt.sign(payload, config.jwt.secret, { expiresIn });
    }

    /**
     * Generate refresh token for user
     * @param {Object} user - User object
     * @returns {string} Refresh token
     */
    generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            type: 'refresh'
        };
        
        return jwt.sign(payload, config.jwt.secret, { 
            expiresIn: config.jwt.refreshExpiresIn 
        });
    }

    /**
     * Change user password
     * @param {number} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} Success status
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.executeQuery(
            `SELECT password_hash FROM ${this.tableName} WHERE id = ?`,
            [userId]
        );
        
        if (user.length === 0) {
            throw new Error('User not found');
        }
        
        const isCurrentPasswordValid = await this.comparePassword(
            currentPassword, 
            user[0].password_hash
        );
        
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        
        const newPasswordHash = await this.hashPassword(newPassword);
        
        await this.updateById(userId, {
            password_hash: newPasswordHash
        });
        
        logger.info('Password changed', { userId });
        
        return true;
    }

    /**
     * Activate/deactivate user
     * @param {number} userId - User ID
     * @param {boolean} isActive - Active status
     * @returns {Promise<number>} Affected rows
     */
    async setActiveStatus(userId, isActive) {
        const affectedRows = await this.updateById(userId, { is_active: isActive });
        
        logger.info('User status changed', {
            userId,
            isActive,
            affectedRows
        });
        
        return affectedRows;
    }

    /**
     * Get users with pagination and filters
     * @param {Object} filters - Filter conditions
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Users and pagination info
     */
    async getUsers(filters = {}, pagination = {}) {
        const { page = 1, limit = 20 } = pagination;
        const offset = (page - 1) * limit;
        
        let conditions = {};
        
        // Apply filters
        if (filters.role) {
            conditions.role = filters.role;
        }
        
        if (filters.isActive !== undefined) {
            conditions.is_active = filters.isActive;
        }
        
        // Get total count
        const totalCount = await this.count(conditions);
        
        // Get users with pagination
        const users = await this.findAll(conditions, {
            limit,
            offset,
            orderBy: 'created_at DESC'
        });
        
        return {
            users,
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
     * Search users by username or email
     * @param {string} searchTerm - Search term
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Search results and pagination info
     */
    async searchUsers(searchTerm, pagination = {}) {
        const { page = 1, limit = 20 } = pagination;
        const offset = (page - 1) * limit;
        
        const searchPattern = `%${searchTerm}%`;
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE (username LIKE ? OR email LIKE ?) AND is_active = 1
        `;
        const countResults = await this.executeQuery(countQuery, [searchPattern, searchPattern]);
        const totalCount = countResults[0].count;
        
        // Get users
        const searchQuery = `
            SELECT * FROM ${this.tableName}
            WHERE (username LIKE ? OR email LIKE ?) AND is_active = 1
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const users = await this.executeQuery(searchQuery, [
            searchPattern, 
            searchPattern, 
            limit, 
            offset
        ]);
        
        return {
            users: users.map(user => this.formatRecord(user)),
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
     * Get user statistics
     * @returns {Promise<Object>} User statistics
     */
    async getStatistics() {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_users
            FROM ${this.tableName}
        `;
        
        const results = await this.executeQuery(statsQuery);
        return results[0];
    }

    /**
     * Check if username exists
     * @param {string} username - Username to check
     * @param {number} excludeUserId - User ID to exclude from check
     * @returns {Promise<boolean>} Whether username exists
     */
    async usernameExists(username, excludeUserId = null) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE username = ?`;
        const params = [username];
        
        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }
        
        const results = await this.executeQuery(query, params);
        return results[0].count > 0;
    }

    /**
     * Check if email exists
     * @param {string} email - Email to check
     * @param {number} excludeUserId - User ID to exclude from check
     * @returns {Promise<boolean>} Whether email exists
     */
    async emailExists(email, excludeUserId = null) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ?`;
        const params = [email];
        
        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }
        
        const results = await this.executeQuery(query, params);
        return results[0].count > 0;
    }

    /**
     * Get user activity (last login, etc.)
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User activity data
     */
    async getUserActivity(userId) {
        const query = `
            SELECT 
                u.last_login,
                u.created_at,
                COUNT(ak.id) as api_keys_count,
                MAX(ak.last_used) as last_api_key_used
            FROM ${this.tableName} u
            LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.is_active = 1
            WHERE u.id = ?
            GROUP BY u.id
        `;
        
        const results = await this.executeQuery(query, [userId]);
        return results.length > 0 ? results[0] : null;
    }
}

module.exports = User;
