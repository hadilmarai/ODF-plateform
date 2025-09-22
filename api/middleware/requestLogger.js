const logger = require('../utils/logger');
const { config } = require('../config/app');

/**
 * Request Logging Middleware
 */
class RequestLogger {
    /**
     * Basic request logging middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static basic(req, res, next) {
        const startTime = Date.now();
        
        // Log request start
        logger.info(`${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const responseTime = Date.now() - startTime;
            
            logger.apiRequest(req, res, responseTime);
            
            originalEnd.call(this, chunk, encoding);
        };

        next();
    }

    /**
     * Detailed request logging with body (for development)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static detailed(req, res, next) {
        const startTime = Date.now();
        
        // Log detailed request information
        const requestData = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            headers: req.headers,
            query: req.query,
            params: req.params,
            timestamp: new Date().toISOString()
        };

        // Include body for non-GET requests (be careful with sensitive data)
        if (req.method !== 'GET' && req.body) {
            requestData.body = RequestLogger.sanitizeBody(req.body);
        }

        logger.debug('Detailed request', requestData);

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const responseTime = Date.now() - startTime;
            
            const responseData = {
                statusCode: res.statusCode,
                responseTime,
                responseTimeFormatted: logger.formatDuration(responseTime),
                headers: res.getHeaders()
            };

            logger.debug('Detailed response', responseData);
            logger.apiRequest(req, res, responseTime);
            
            originalEnd.call(this, chunk, encoding);
        };

        next();
    }

    /**
     * Security-focused logging
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static security(req, res, next) {
        const startTime = Date.now();
        
        // Log security-relevant information
        const securityData = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            authorization: req.get('Authorization') ? 'Bearer [REDACTED]' : 'None',
            apiKey: req.get('X-API-Key') ? '[REDACTED]' : 'None',
            referer: req.get('Referer'),
            origin: req.get('Origin'),
            timestamp: new Date().toISOString()
        };

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /\.\./,  // Directory traversal
            /<script/i,  // XSS attempts
            /union.*select/i,  // SQL injection
            /javascript:/i,  // JavaScript injection
            /data:text\/html/i  // Data URI XSS
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => 
            pattern.test(req.originalUrl) || 
            pattern.test(JSON.stringify(req.query)) ||
            pattern.test(JSON.stringify(req.body))
        );

        if (isSuspicious) {
            logger.warn('Suspicious request detected', {
                ...securityData,
                query: req.query,
                body: RequestLogger.sanitizeBody(req.body)
            });
        }

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const responseTime = Date.now() - startTime;
            
            // Log failed authentication attempts
            if (res.statusCode === 401 || res.statusCode === 403) {
                logger.warn('Authentication/Authorization failed', {
                    ...securityData,
                    statusCode: res.statusCode,
                    responseTime
                });
            }
            
            originalEnd.call(this, chunk, encoding);
        };

        next();
    }

    /**
     * Performance monitoring middleware
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static performance(req, res, next) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();
        
        // Override res.end to log performance metrics
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage();
            
            const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            const memoryDiff = {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startMemory.heapTotal
            };

            const performanceData = {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
                memoryDiff,
                timestamp: new Date().toISOString()
            };

            // Log slow requests
            if (responseTime > 1000) { // Slower than 1 second
                logger.warn('Slow request detected', performanceData);
            } else {
                logger.debug('Performance metrics', performanceData);
            }
            
            originalEnd.call(this, chunk, encoding);
        };

        next();
    }

    /**
     * Error logging middleware
     * @param {Error} err - Error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static error(err, req, res, next) {
        const errorData = {
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: RequestLogger.sanitizeBody(req.body),
            query: req.query,
            params: req.params,
            timestamp: new Date().toISOString()
        };

        logger.error('Request error', errorData);
        
        next(err);
    }

    /**
     * Sanitize request body for logging (remove sensitive data)
     * @param {Object} body - Request body
     * @returns {Object} - Sanitized body
     */
    static sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sensitiveFields = [
            'password',
            'token',
            'apiKey',
            'api_key',
            'secret',
            'authorization',
            'auth',
            'credential',
            'key'
        ];

        const sanitized = { ...body };
        
        Object.keys(sanitized).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (sensitiveFields.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Create custom logging middleware
     * @param {Function} logFunction - Custom log function
     * @returns {Function} - Logging middleware
     */
    static custom(logFunction) {
        return (req, res, next) => {
            const startTime = Date.now();
            
            const originalEnd = res.end;
            res.end = function(chunk, encoding) {
                const responseTime = Date.now() - startTime;
                
                logFunction({
                    req,
                    res,
                    responseTime,
                    timestamp: new Date().toISOString()
                });
                
                originalEnd.call(this, chunk, encoding);
            };

            next();
        };
    }

    /**
     * Skip logging for certain routes
     * @param {Array} skipRoutes - Routes to skip
     * @param {Function} middleware - Logging middleware to wrap
     * @returns {Function} - Conditional logging middleware
     */
    static skipRoutes(skipRoutes = [], middleware) {
        return (req, res, next) => {
            const shouldSkip = skipRoutes.some(route => {
                if (typeof route === 'string') {
                    return req.originalUrl.startsWith(route);
                }
                if (route instanceof RegExp) {
                    return route.test(req.originalUrl);
                }
                return false;
            });

            if (shouldSkip) {
                return next();
            }

            return middleware(req, res, next);
        };
    }

    /**
     * Get appropriate logging middleware based on environment
     * @returns {Function} - Logging middleware
     */
    static getMiddleware() {
        const env = config.server.env;
        
        switch (env) {
            case 'development':
                return this.detailed;
            case 'production':
                return this.basic;
            case 'test':
                return (req, res, next) => next(); // No logging in tests
            default:
                return this.basic;
        }
    }
}

module.exports = RequestLogger;
