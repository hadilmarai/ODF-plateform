const { body, param, query, validationResult } = require('express-validator');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Validation Middleware
 */
class ValidationMiddleware {
    /**
     * Handle validation errors
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            const formattedErrors = errors.array().map(error => ({
                field: error.param,
                message: error.msg,
                value: error.value
            }));
            
            return ResponseHelper.validationError(res, formattedErrors);
        }
        
        next();
    }

    /**
     * Validate analysis type parameter
     */
    static validateAnalysisType() {
        return [
            param('type')
                .isIn(['eu', 'uk'])
                .withMessage('Analysis type must be either "eu" or "uk"'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate file upload
     */
    static validateFileUpload() {
        return [
            body('analysisType')
                .isIn(['eu', 'uk'])
                .withMessage('Analysis type must be either "eu" or "uk"'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate user registration
     */
    static validateUserRegistration() {
        return [
            body('username')
                .isLength({ min: 3, max: 50 })
                .withMessage('Username must be between 3 and 50 characters')
                .matches(/^[a-zA-Z0-9_]+$/)
                .withMessage('Username can only contain letters, numbers, and underscores'),
            body('email')
                .isEmail()
                .withMessage('Must be a valid email address')
                .normalizeEmail(),
            body('password')
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
            body('role')
                .optional()
                .isIn(['admin', 'user'])
                .withMessage('Role must be either "admin" or "user"'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate user login
     */
    static validateUserLogin() {
        return [
            body('username')
                .notEmpty()
                .withMessage('Username or email is required'),
            body('password')
                .notEmpty()
                .withMessage('Password is required'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate API key generation
     */
    static validateApiKeyGeneration() {
        return [
            body('keyName')
                .isLength({ min: 3, max: 100 })
                .withMessage('Key name must be between 3 and 100 characters'),
            body('permissions')
                .optional()
                .isObject()
                .withMessage('Permissions must be an object'),
            body('expiresAt')
                .optional()
                .isISO8601()
                .withMessage('Expiration date must be a valid ISO 8601 date'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate pagination parameters
     */
    static validatePagination() {
        return [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer'),
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate project filters
     */
    static validateProjectFilters() {
        return [
            query('pertinence')
                .optional()
                .isIn(['Yes', 'No'])
                .withMessage('Pertinence must be either "Yes" or "No"'),
            query('pertinence_llm')
                .optional()
                .isIn(['Yes', 'No'])
                .withMessage('Pertinence LLM must be either "Yes" or "No"'),
            query('status')
                .optional()
                .isString()
                .withMessage('Status must be a string'),
            query('search')
                .optional()
                .isString()
                .isLength({ max: 255 })
                .withMessage('Search term must be a string with maximum 255 characters'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate date range
     */
    static validateDateRange() {
        return [
            query('startDate')
                .optional()
                .isISO8601()
                .withMessage('Start date must be a valid ISO 8601 date'),
            query('endDate')
                .optional()
                .isISO8601()
                .withMessage('End date must be a valid ISO 8601 date'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate ID parameter
     */
    static validateId() {
        return [
            param('id')
                .isInt({ min: 1 })
                .withMessage('ID must be a positive integer'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate analysis configuration
     */
    static validateAnalysisConfig() {
        return [
            body('timeout')
                .optional()
                .isInt({ min: 1000, max: 3600000 })
                .withMessage('Timeout must be between 1000ms and 3600000ms (1 hour)'),
            body('verbose')
                .optional()
                .isBoolean()
                .withMessage('Verbose must be a boolean'),
            body('stopOnError')
                .optional()
                .isBoolean()
                .withMessage('Stop on error must be a boolean'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate Excel data structure
     * @param {string} analysisType - Type of analysis ('eu' or 'uk')
     * @returns {Function} - Validation middleware
     */
    static validateExcelData(analysisType) {
        const requiredFields = analysisType === 'eu' 
            ? ['Title', 'URL', 'Status']
            : ['Titre', 'Lien'];

        return (req, res, next) => {
            if (!req.file) {
                return ResponseHelper.validationError(res, [
                    { field: 'file', message: 'Excel file is required' }
                ]);
            }

            // Additional file validation would go here
            // For now, just check file extension
            const allowedExtensions = ['.xlsx', '.xls'];
            const fileExtension = req.file.originalname.toLowerCase().slice(-5);
            
            if (!allowedExtensions.some(ext => fileExtension.endsWith(ext))) {
                return ResponseHelper.validationError(res, [
                    { field: 'file', message: 'File must be an Excel file (.xlsx or .xls)' }
                ]);
            }

            next();
        };
    }

    /**
     * Validate email configuration
     */
    static validateEmailConfig() {
        return [
            body('host')
                .notEmpty()
                .withMessage('Email host is required'),
            body('port')
                .isInt({ min: 1, max: 65535 })
                .withMessage('Port must be between 1 and 65535'),
            body('secure')
                .isBoolean()
                .withMessage('Secure must be a boolean'),
            body('user')
                .isEmail()
                .withMessage('User must be a valid email address'),
            body('password')
                .notEmpty()
                .withMessage('Password is required'),
            this.handleValidationErrors
        ];
    }

    /**
     * Validate notification settings
     */
    static validateNotificationSettings() {
        return [
            body('enableSlack')
                .optional()
                .isBoolean()
                .withMessage('Enable Slack must be a boolean'),
            body('slackWebhook')
                .optional()
                .isURL()
                .withMessage('Slack webhook must be a valid URL'),
            body('enableEmail')
                .optional()
                .isBoolean()
                .withMessage('Enable email must be a boolean'),
            body('notifyOnSuccess')
                .optional()
                .isBoolean()
                .withMessage('Notify on success must be a boolean'),
            body('notifyOnError')
                .optional()
                .isBoolean()
                .withMessage('Notify on error must be a boolean'),
            this.handleValidationErrors
        ];
    }

    /**
     * Custom validation for complex objects
     * @param {Function} validator - Custom validator function
     * @param {string} message - Error message
     * @returns {Function} - Validation middleware
     */
    static custom(validator, message = 'Validation failed') {
        return (req, res, next) => {
            try {
                const isValid = validator(req.body, req.params, req.query);
                
                if (!isValid) {
                    return ResponseHelper.validationError(res, [
                        { field: 'custom', message }
                    ]);
                }
                
                next();
            } catch (error) {
                return ResponseHelper.validationError(res, [
                    { field: 'custom', message: error.message }
                ]);
            }
        };
    }

    /**
     * Sanitize input data
     * @param {Array} fields - Fields to sanitize
     * @returns {Function} - Sanitization middleware
     */
    static sanitize(fields = []) {
        return (req, res, next) => {
            const sanitizeValue = (value) => {
                if (typeof value === 'string') {
                    return value.trim().replace(/[<>]/g, '');
                }
                return value;
            };

            // Sanitize specified fields or all fields if none specified
            const fieldsToSanitize = fields.length > 0 ? fields : Object.keys(req.body);
            
            fieldsToSanitize.forEach(field => {
                if (req.body[field] !== undefined) {
                    req.body[field] = sanitizeValue(req.body[field]);
                }
            });

            next();
        };
    }

    /**
     * Validate request content type
     * @param {Array} allowedTypes - Allowed content types
     * @returns {Function} - Validation middleware
     */
    static validateContentType(allowedTypes = ['application/json']) {
        return (req, res, next) => {
            const contentType = req.get('Content-Type');
            
            if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
                return ResponseHelper.validationError(res, [
                    { 
                        field: 'content-type', 
                        message: `Content-Type must be one of: ${allowedTypes.join(', ')}` 
                    }
                ]);
            }
            
            next();
        };
    }
}

module.exports = ValidationMiddleware;
