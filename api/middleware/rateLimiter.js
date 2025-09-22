const rateLimit = require('express-rate-limit');
const { config } = require('../config/app');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Rate Limiting Middleware
 */
class RateLimiter {
    /**
     * Create basic rate limiter
     * @param {Object} options - Rate limit options
     * @returns {Function} - Rate limit middleware
     */
    static createLimiter(options = {}) {
        // Use higher limits in development
        const isDevelopment = process.env.NODE_ENV === 'development';
        const defaultMax = isDevelopment ? 1000 : (config.security.rateLimitMax || 100);

        const defaultOptions = {
            windowMs: config.security.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
            max: defaultMax, // Higher limit in development
            message: 'Too many requests from this IP, please try again later',
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            handler: (req, res) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.originalUrl,
                    user: req.user ? req.user.username : 'anonymous',
                    environment: process.env.NODE_ENV
                });
                return ResponseHelper.tooManyRequests(res, options.message || 'Too many requests');
            },
            skip: (req) => {
                // Skip rate limiting for authenticated admin users or in development mode
                return (req.user && req.user.role === 'admin') || isDevelopment;
            },
            keyGenerator: (req) => {
                // Use user ID if authenticated, otherwise IP
                return req.user ? `user:${req.user.id}` : req.ip;
            }
        };

        return rateLimit({ ...defaultOptions, ...options });
    }

    /**
     * General API rate limiter
     */
    static general() {
        return this.createLimiter({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // 100 requests per 15 minutes
            message: 'Too many API requests, please try again later'
        });
    }

    /**
     * Strict rate limiter for sensitive endpoints
     */
    static strict() {
        return this.createLimiter({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // 10 requests per 15 minutes
            message: 'Too many requests to sensitive endpoint, please try again later'
        });
    }

    /**
     * Authentication rate limiter
     */
    static auth() {
        return this.createLimiter({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 login attempts per 15 minutes
            message: 'Too many authentication attempts, please try again later',
            skipSuccessfulRequests: true // Don't count successful requests
        });
    }

    /**
     * Analysis trigger rate limiter
     */
    static analysis() {
        return this.createLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 3, // 3 analysis triggers per hour
            message: 'Too many analysis requests, please wait before triggering again'
        });
    }

    /**
     * File upload rate limiter
     */
    static upload() {
        return this.createLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // 10 uploads per hour
            message: 'Too many file uploads, please try again later'
        });
    }

    /**
     * Create custom rate limiter with Redis store (if available)
     * @param {Object} options - Rate limit options
     * @returns {Function} - Rate limit middleware
     */
    static createRedisLimiter(options = {}) {
        // This would use Redis for distributed rate limiting
        // For now, fall back to memory store
        return this.createLimiter(options);
    }

    /**
     * Dynamic rate limiter based on user role
     * @param {Object} limits - Role-based limits
     * @returns {Function} - Rate limit middleware
     */
    static dynamic(limits = {}) {
        const defaultLimits = {
            admin: { windowMs: 15 * 60 * 1000, max: 1000 },
            user: { windowMs: 15 * 60 * 1000, max: 100 },
            guest: { windowMs: 15 * 60 * 1000, max: 20 }
        };

        const roleLimits = { ...defaultLimits, ...limits };

        return (req, res, next) => {
            const userRole = req.user ? req.user.role : 'guest';
            const limit = roleLimits[userRole] || roleLimits.guest;

            const limiter = this.createLimiter(limit);
            return limiter(req, res, next);
        };
    }

    /**
     * Bypass rate limiting for specific conditions
     * @param {Function} condition - Condition function
     * @returns {Function} - Middleware function
     */
    static bypass(condition) {
        return (req, res, next) => {
            if (condition(req)) {
                return next();
            }
            return this.general()(req, res, next);
        };
    }

    /**
     * Rate limiter with custom store
     * @param {Object} store - Custom store implementation
     * @param {Object} options - Rate limit options
     * @returns {Function} - Rate limit middleware
     */
    static withStore(store, options = {}) {
        return this.createLimiter({ ...options, store });
    }
}

module.exports = RateLimiter;
