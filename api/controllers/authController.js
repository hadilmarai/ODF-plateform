const AuthMiddleware = require('../middleware/auth');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { userModel, apiKeyModel } = require('../models');

/**
 * Authentication Controller
 */
class AuthController {
    /**
     * User registration
     */
    static async register(req, res) {
        try {
            const { username, email, password, role = 'user' } = req.body;

            // Check if user already exists
            const usernameExists = await userModel.usernameExists(username);
            const emailExists = await userModel.emailExists(email);

            if (usernameExists || emailExists) {
                return ResponseHelper.conflict(res, 'Username or email already exists');
            }

            // Create user
            const user = await userModel.createUser({ username, email, password, role });

            // Generate tokens
            const token = AuthMiddleware.generateToken({ userId: user.id, role: user.role });
            const refreshToken = AuthMiddleware.generateRefreshToken({ userId: user.id });

            logger.info('User registered successfully', { 
                userId: user.id, 
                username: user.username,
                email: user.email,
                role: user.role 
            });

            return ResponseHelper.success(res, {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    createdAt: user.created_at
                },
                token,
                refreshToken
            }, 'User registered successfully', 201);
        } catch (error) {
            logger.error('Registration failed', { 
                error: error.message,
                username: req.body.username,
                email: req.body.email 
            });

            if (error.code === 'ER_DUP_ENTRY') {
                return ResponseHelper.conflict(res, 'Username or email already exists');
            }

            return ResponseHelper.error(res, 'Registration failed');
        }
    }

    /**
     * User login
     */
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            // Authenticate user
            const user = await userModel.authenticate(username, password);

            if (!user) {
                return ResponseHelper.unauthorized(res, 'Invalid credentials');
            }

            // Generate tokens
            const token = userModel.generateToken(user);
            const refreshToken = userModel.generateRefreshToken(user);

            logger.info('User logged in successfully', { 
                userId: user.id, 
                username: user.username 
            });

            return ResponseHelper.success(res, {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                token,
                refreshToken
            }, 'Login successful');
        } catch (error) {
            logger.warn('Login failed', { 
                username: req.body.username,
                error: error.message 
            });

            return ResponseHelper.unauthorized(res, 'Invalid credentials');
        }
    }

    /**
     * Refresh token
     */
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return ResponseHelper.validationError(res, [
                    { field: 'refreshToken', message: 'Refresh token is required' }
                ]);
            }

            // Verify refresh token
            const decoded = AuthMiddleware.verifyToken(refreshToken);

            // Get user
            const connection = await require('../config/database').pool.getConnection();
            const [users] = await connection.execute(
                'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
                [decoded.userId]
            );
            connection.release();

            if (users.length === 0 || !users[0].is_active) {
                return ResponseHelper.unauthorized(res, 'Invalid refresh token');
            }

            const user = users[0];

            // Generate new tokens
            const newToken = AuthMiddleware.generateToken({ userId: user.id, role: user.role });
            const newRefreshToken = AuthMiddleware.generateRefreshToken({ userId: user.id });

            return ResponseHelper.success(res, {
                token: newToken,
                refreshToken: newRefreshToken
            }, 'Token refreshed successfully');
        } catch (error) {
            logger.warn('Token refresh failed', { error: error.message });
            return ResponseHelper.unauthorized(res, 'Invalid refresh token');
        }
    }

    /**
     * Get current user profile
     */
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;

            const connection = await require('../config/database').pool.getConnection();
            const [users] = await connection.execute(
                'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
                [userId]
            );
            connection.release();

            if (users.length === 0) {
                return ResponseHelper.notFound(res, 'User');
            }

            return ResponseHelper.success(res, users[0], 'Profile retrieved successfully');
        } catch (error) {
            logger.error('Error getting user profile', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Failed to get user profile');
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { email } = req.body;

            const connection = await require('../config/database').pool.getConnection();
            
            // Check if email is already taken by another user
            if (email) {
                const [existingUsers] = await connection.execute(
                    'SELECT id FROM users WHERE email = ? AND id != ?',
                    [email, userId]
                );

                if (existingUsers.length > 0) {
                    connection.release();
                    return ResponseHelper.conflict(res, 'Email already exists');
                }
            }

            // Update user
            const updateFields = [];
            const params = [];

            if (email) {
                updateFields.push('email = ?');
                params.push(email);
            }

            if (updateFields.length === 0) {
                connection.release();
                return ResponseHelper.validationError(res, [
                    { field: 'body', message: 'At least one field must be provided' }
                ]);
            }

            params.push(userId);

            await connection.execute(
                `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
                params
            );

            // Get updated user
            const [users] = await connection.execute(
                'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
                [userId]
            );
            connection.release();

            logger.info('User profile updated', { userId, email });

            return ResponseHelper.success(res, users[0], 'Profile updated successfully');
        } catch (error) {
            logger.error('Error updating user profile', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Failed to update user profile');
        }
    }

    /**
     * Change password
     */
    static async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            // Get current password hash
            const connection = await require('../config/database').pool.getConnection();
            const [users] = await connection.execute(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                connection.release();
                return ResponseHelper.notFound(res, 'User');
            }

            // Verify current password
            const isCurrentPasswordValid = await AuthMiddleware.comparePassword(
                currentPassword, 
                users[0].password_hash
            );

            if (!isCurrentPasswordValid) {
                connection.release();
                return ResponseHelper.unauthorized(res, 'Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await AuthMiddleware.hashPassword(newPassword);

            // Update password
            await connection.execute(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [newPasswordHash, userId]
            );
            connection.release();

            logger.info('Password changed successfully', { userId });

            return ResponseHelper.success(res, null, 'Password changed successfully');
        } catch (error) {
            logger.error('Error changing password', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Failed to change password');
        }
    }

    /**
     * Generate API key
     */
    static async generateApiKey(req, res) {
        try {
            const userId = req.user.id;
            const { keyName, permissions = {}, expiresAt } = req.body;

            const apiKeyData = await AuthMiddleware.generateApiKey(
                userId, 
                keyName, 
                permissions, 
                expiresAt
            );

            logger.info('API key generated', { 
                userId, 
                keyId: apiKeyData.id, 
                keyName 
            });

            return ResponseHelper.success(res, {
                id: apiKeyData.id,
                keyName: apiKeyData.keyName,
                apiKey: apiKeyData.apiKey,
                permissions: apiKeyData.permissions,
                expiresAt: apiKeyData.expiresAt
            }, 'API key generated successfully', 201);
        } catch (error) {
            logger.error('Error generating API key', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Failed to generate API key');
        }
    }

    /**
     * List user's API keys
     */
    static async listApiKeys(req, res) {
        try {
            const userId = req.user.id;

            const connection = await require('../config/database').pool.getConnection();
            const [apiKeys] = await connection.execute(`
                SELECT id, key_name, permissions, is_active, expires_at, last_used, created_at
                FROM api_keys 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            `, [userId]);
            connection.release();

            return ResponseHelper.success(res, apiKeys, 'API keys retrieved successfully');
        } catch (error) {
            logger.error('Error listing API keys', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Failed to list API keys');
        }
    }

    /**
     * Revoke API key
     */
    static async revokeApiKey(req, res) {
        try {
            const userId = req.user.id;
            const { keyId } = req.params;

            const connection = await require('../config/database').pool.getConnection();
            const [result] = await connection.execute(
                'UPDATE api_keys SET is_active = 0, updated_at = NOW() WHERE id = ? AND user_id = ?',
                [keyId, userId]
            );
            connection.release();

            if (result.affectedRows === 0) {
                return ResponseHelper.notFound(res, 'API key');
            }

            logger.info('API key revoked', { userId, keyId });

            return ResponseHelper.success(res, null, 'API key revoked successfully');
        } catch (error) {
            logger.error('Error revoking API key', { 
                error: error.message, 
                userId: req.user?.id,
                keyId: req.params.keyId 
            });
            return ResponseHelper.error(res, 'Failed to revoke API key');
        }
    }

    /**
     * Logout (invalidate token - would require token blacklist in production)
     */
    static async logout(req, res) {
        try {
            // In a production environment, you would add the token to a blacklist
            // For now, we'll just log the logout event
            
            logger.info('User logged out', { 
                userId: req.user?.id, 
                username: req.user?.username 
            });

            return ResponseHelper.success(res, null, 'Logged out successfully');
        } catch (error) {
            logger.error('Error during logout', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return ResponseHelper.error(res, 'Logout failed');
        }
    }
}

module.exports = AuthController;
