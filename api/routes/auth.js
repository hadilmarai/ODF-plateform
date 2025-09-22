const express = require('express');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const ValidationMiddleware = require('../middleware/validation');
const ResponseHelper = require('../utils/responseHelper');

const router = express.Router();

/**
 * User registration
 * POST /auth/register
 */
router.post('/register',
    RateLimiter.auth(),
    ValidationMiddleware.validateUserRegistration(),
    ValidationMiddleware.sanitize(['username', 'email']),
    ResponseHelper.asyncHandler(AuthController.register)
);

/**
 * User login
 * POST /auth/login
 */
router.post('/login',
    RateLimiter.auth(),
    ValidationMiddleware.validateUserLogin(),
    ValidationMiddleware.sanitize(['username']),
    ResponseHelper.asyncHandler(AuthController.login)
);

/**
 * Refresh JWT token
 * POST /auth/refresh
 */
router.post('/refresh',
    RateLimiter.general(),
    ValidationMiddleware.validateContentType(['application/json']),
    ResponseHelper.asyncHandler(AuthController.refreshToken)
);

/**
 * User logout
 * POST /auth/logout
 */
router.post('/logout',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ResponseHelper.asyncHandler(AuthController.logout)
);

/**
 * Get current user profile
 * GET /auth/profile
 */
router.get('/profile',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ResponseHelper.asyncHandler(AuthController.getProfile)
);

/**
 * Update user profile
 * PUT /auth/profile
 */
router.put('/profile',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.custom((body) => {
        const { email } = body;
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email format');
        }
        
        return true;
    }, 'Invalid profile data'),
    ValidationMiddleware.sanitize(['email']),
    ResponseHelper.asyncHandler(AuthController.updateProfile)
);

/**
 * Change password
 * PUT /auth/password
 */
router.put('/password',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.custom((body) => {
        const { currentPassword, newPassword } = body;
        
        if (!currentPassword || !newPassword) {
            throw new Error('Current password and new password are required');
        }
        
        if (newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }
        
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            throw new Error('New password must contain at least one lowercase letter, one uppercase letter, and one number');
        }
        
        return true;
    }, 'Invalid password data'),
    ResponseHelper.asyncHandler(AuthController.changePassword)
);

/**
 * List user's API keys
 * GET /auth/api-keys
 */
router.get('/api-keys',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ResponseHelper.asyncHandler(AuthController.listApiKeys)
);

/**
 * Generate new API key
 * POST /auth/api-keys
 */
router.post('/api-keys',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateApiKeyGeneration(),
    ValidationMiddleware.sanitize(['keyName']),
    ResponseHelper.asyncHandler(AuthController.generateApiKey)
);

/**
 * Revoke API key
 * DELETE /auth/api-keys/:keyId
 */
router.delete('/api-keys/:keyId',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ValidationMiddleware.custom((body, params) => {
        const { keyId } = params;
        
        if (!keyId || isNaN(parseInt(keyId))) {
            throw new Error('Valid key ID is required');
        }
        
        return true;
    }, 'Invalid key ID'),
    ResponseHelper.asyncHandler(AuthController.revokeApiKey)
);

/**
 * Get authentication status
 * GET /auth/status
 */
router.get('/status',
    RateLimiter.general(),
    AuthMiddleware.optionalAuth,
    ResponseHelper.asyncHandler(async (req, res) => {
        const isAuthenticated = !!req.user;
        
        const status = {
            authenticated: isAuthenticated,
            user: isAuthenticated ? {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            } : null,
            timestamp: new Date().toISOString()
        };

        return ResponseHelper.success(res, status, 'Authentication status retrieved');
    })
);

/**
 * Validate token
 * POST /auth/validate
 */
router.post('/validate',
    RateLimiter.general(),
    ValidationMiddleware.custom((body) => {
        const { token } = body;
        
        if (!token) {
            throw new Error('Token is required');
        }
        
        return true;
    }, 'Token validation failed'),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { token } = req.body;
            
            // Verify token
            const decoded = AuthMiddleware.verifyToken(token);
            
            // Get user from database
            const connection = await require('../config/database').pool.getConnection();
            const [users] = await connection.execute(
                'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
                [decoded.userId]
            );
            connection.release();

            if (users.length === 0 || !users[0].is_active) {
                return ResponseHelper.unauthorized(res, 'Invalid token');
            }

            const user = users[0];

            return ResponseHelper.success(res, {
                valid: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                expiresAt: new Date(decoded.exp * 1000).toISOString()
            }, 'Token is valid');
        } catch (error) {
            return ResponseHelper.success(res, {
                valid: false,
                error: error.message
            }, 'Token validation completed');
        }
    })
);

/**
 * Get user permissions
 * GET /auth/permissions
 */
router.get('/permissions',
    RateLimiter.general(),
    AuthMiddleware.authenticate,
    ResponseHelper.asyncHandler(async (req, res) => {
        const permissions = {
            canTriggerAnalysis: true,
            canUploadFiles: true,
            canViewProjects: true,
            canUpdatePertinence: req.user.role === 'admin',
            canAccessLogs: req.user.role === 'admin',
            canManageUsers: req.user.role === 'admin',
            canViewSystemInfo: req.user.role === 'admin',
            canExportData: req.user.role === 'admin'
        };

        return ResponseHelper.success(res, permissions, 'User permissions retrieved');
    })
);

/**
 * Create default admin user (development only)
 * POST /auth/create-admin
 */
router.post('/create-admin',
    RateLimiter.strict(),
    ValidationMiddleware.custom((body, params, query, req) => {
        // Only allow in development environment
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Admin creation not allowed in production');
        }
        
        const { username, email, password } = body;
        
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }
        
        return true;
    }, 'Admin creation validation failed'),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { username, email, password } = req.body;
            
            // Check if admin already exists
            const connection = await require('../config/database').pool.getConnection();
            const [existingAdmins] = await connection.execute(
                'SELECT id FROM users WHERE role = "admin"'
            );
            connection.release();

            if (existingAdmins.length > 0) {
                return ResponseHelper.conflict(res, 'Admin user already exists');
            }

            // Create admin user
            const user = await AuthMiddleware.createUser(username, email, password, 'admin');

            return ResponseHelper.success(res, {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }, 'Admin user created successfully', 201);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return ResponseHelper.conflict(res, 'Username or email already exists');
            }
            
            return ResponseHelper.error(res, 'Failed to create admin user');
        }
    })
);

module.exports = router;
