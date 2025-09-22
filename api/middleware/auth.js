const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { config } = require('../config/app');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 */
class AuthMiddleware {
    /**
     * Generate JWT token
     * @param {Object} payload - Token payload
     * @param {string} expiresIn - Token expiration
     * @returns {string} - JWT token
     */
    static generateToken(payload, expiresIn = config.jwt.expiresIn) {
        return jwt.sign(payload, config.jwt.secret, { expiresIn });
    }

    /**
     * Generate refresh token
     * @param {Object} payload - Token payload
     * @returns {string} - Refresh token
     */
    static generateRefreshToken(payload) {
        return jwt.sign(payload, config.jwt.secret, { 
            expiresIn: config.jwt.refreshExpiresIn 
        });
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {Object} - Decoded token payload
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * Hash password
     * @param {string} password - Plain text password
     * @returns {string} - Hashed password
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {boolean} - Password match result
     */
    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    /**
     * Extract token from request
     * @param {Object} req - Express request object
     * @returns {string|null} - JWT token or null
     */
    static extractToken(req) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Check query parameter
        if (req.query.token) {
            return req.query.token;
        }

        // Check API key header
        if (req.headers['x-api-key']) {
            return req.headers['x-api-key'];
        }

        return null;
    }

    /**
     * Authenticate user with JWT token
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async authenticate(req, res, next) {
        try {
            const token = AuthMiddleware.extractToken(req);

            if (!token) {
                return ResponseHelper.unauthorized(res, 'No token provided');
            }

            // Verify token
            const decoded = AuthMiddleware.verifyToken(token);
            
            // Get user from database
            const connection = await pool.getConnection();
            const [users] = await connection.execute(
                'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
                [decoded.userId]
            );
            connection.release();

            if (users.length === 0) {
                return ResponseHelper.unauthorized(res, 'User not found');
            }

            const user = users[0];

            if (!user.is_active) {
                return ResponseHelper.unauthorized(res, 'Account is deactivated');
            }

            // Add user to request object
            req.user = user;
            req.token = token;

            logger.debug('User authenticated', { 
                userId: user.id, 
                username: user.username,
                role: user.role 
            });

            next();
        } catch (error) {
            logger.warn('Authentication failed', { error: error.message });
            return ResponseHelper.unauthorized(res, 'Invalid token');
        }
    }

    /**
     * Authenticate with API key
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async authenticateApiKey(req, res, next) {
        try {
            const apiKey = req.headers['x-api-key'] || req.query.api_key;

            if (!apiKey) {
                return ResponseHelper.unauthorized(res, 'API key required');
            }

            // Check default API key
            if (config.security.defaultApiKey && apiKey === config.security.defaultApiKey) {
                req.user = { id: 0, username: 'api', role: 'admin' };
                return next();
            }

            // Check database for API key
            const connection = await pool.getConnection();
            const [keys] = await connection.execute(`
                SELECT ak.*, u.username, u.role, u.is_active 
                FROM api_keys ak 
                JOIN users u ON ak.user_id = u.id 
                WHERE ak.api_key = ? AND ak.is_active = 1 
                AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
            `, [apiKey]);

            if (keys.length === 0) {
                connection.release();
                return ResponseHelper.unauthorized(res, 'Invalid API key');
            }

            const keyData = keys[0];

            if (!keyData.is_active) {
                connection.release();
                return ResponseHelper.unauthorized(res, 'Account is deactivated');
            }

            // Update last used timestamp
            await connection.execute(
                'UPDATE api_keys SET last_used = NOW() WHERE id = ?',
                [keyData.id]
            );
            connection.release();

            // Add user to request object
            req.user = {
                id: keyData.user_id,
                username: keyData.username,
                role: keyData.role
            };
            req.apiKey = keyData;

            logger.debug('API key authenticated', { 
                keyId: keyData.id,
                keyName: keyData.key_name,
                userId: keyData.user_id 
            });

            next();
        } catch (error) {
            logger.warn('API key authentication failed', { error: error.message });
            return ResponseHelper.unauthorized(res, 'Invalid API key');
        }
    }

    /**
     * Optional authentication middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async optionalAuth(req, res, next) {
        try {
            const token = AuthMiddleware.extractToken(req);
            
            if (token) {
                // Try to authenticate if token is provided
                await AuthMiddleware.authenticate(req, res, next);
            } else {
                // Continue without authentication
                next();
            }
        } catch (error) {
            // Continue without authentication on error
            next();
        }
    }

    /**
     * Role-based authorization middleware
     * @param {Array|string} allowedRoles - Allowed roles
     * @returns {Function} - Middleware function
     */
    static authorize(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return ResponseHelper.unauthorized(res, 'Authentication required');
            }

            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            
            if (!roles.includes(req.user.role)) {
                logger.warn('Authorization failed', { 
                    userId: req.user.id,
                    userRole: req.user.role,
                    requiredRoles: roles 
                });
                return ResponseHelper.forbidden(res, 'Insufficient permissions');
            }

            next();
        };
    }

    /**
     * Admin only middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static adminOnly(req, res, next) {
        return AuthMiddleware.authorize('admin')(req, res, next);
    }

    /**
     * Create user account
     * @param {string} username - Username
     * @param {string} email - Email address
     * @param {string} password - Plain text password
     * @param {string} role - User role (default: 'user')
     * @returns {Object} - Created user data
     */
    static async createUser(username, email, password, role = 'user') {
        try {
            const hashedPassword = await AuthMiddleware.hashPassword(password);
            
            const connection = await pool.getConnection();
            const [result] = await connection.execute(`
                INSERT INTO users (username, email, password_hash, role) 
                VALUES (?, ?, ?, ?)
            `, [username, email, hashedPassword, role]);
            
            const [users] = await connection.execute(
                'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
                [result.insertId]
            );
            connection.release();

            logger.info('User created', { 
                userId: result.insertId, 
                username, 
                email, 
                role 
            });

            return users[0];
        } catch (error) {
            logger.error('Failed to create user', { 
                username, 
                email, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Authenticate user credentials
     * @param {string} username - Username or email
     * @param {string} password - Plain text password
     * @returns {Object} - Authentication result
     */
    static async authenticateCredentials(username, password) {
        try {
            const connection = await pool.getConnection();
            const [users] = await connection.execute(`
                SELECT id, username, email, password_hash, role, is_active 
                FROM users 
                WHERE (username = ? OR email = ?) AND is_active = 1
            `, [username, username]);
            connection.release();

            if (users.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = users[0];
            const passwordMatch = await AuthMiddleware.comparePassword(password, user.password_hash);

            if (!passwordMatch) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            const connection2 = await pool.getConnection();
            await connection2.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );
            connection2.release();

            logger.info('User authenticated', { 
                userId: user.id, 
                username: user.username 
            });

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
        } catch (error) {
            logger.warn('Authentication failed', { 
                username, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Generate API key for user
     * @param {number} userId - User ID
     * @param {string} keyName - API key name
     * @param {Object} permissions - Key permissions
     * @param {Date} expiresAt - Expiration date (optional)
     * @returns {Object} - API key data
     */
    static async generateApiKey(userId, keyName, permissions = {}, expiresAt = null) {
        try {
            const apiKey = require('crypto').randomBytes(32).toString('hex');
            
            const connection = await pool.getConnection();
            const [result] = await connection.execute(`
                INSERT INTO api_keys (user_id, key_name, api_key, permissions, expires_at) 
                VALUES (?, ?, ?, ?, ?)
            `, [userId, keyName, apiKey, JSON.stringify(permissions), expiresAt]);
            connection.release();

            logger.info('API key generated', { 
                keyId: result.insertId, 
                userId, 
                keyName 
            });

            return {
                id: result.insertId,
                keyName,
                apiKey,
                permissions,
                expiresAt
            };
        } catch (error) {
            logger.error('Failed to generate API key', { 
                userId, 
                keyName, 
                error: error.message 
            });
            throw error;
        }
    }
}

module.exports = AuthMiddleware;
