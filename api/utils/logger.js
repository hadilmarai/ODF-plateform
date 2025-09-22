const fs = require('fs');
const path = require('path');
const { config } = require('../config/app');

/**
 * Custom Logger utility
 */
class Logger {
    constructor() {
        this.logLevel = config.logging.level || 'info';
        this.enableFileLogging = config.logging.enableFileLogging || false;
        this.logFile = config.logging.logFile || 'api.log';
        this.logDir = config.paths.logsDir || '../logs';
        
        // Ensure log directory exists
        this.ensureLogDirectory();
        
        // Log levels
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (this.enableFileLogging && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Check if message should be logged based on level
     * @param {string} level - Log level
     * @returns {boolean} - Should log
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @returns {string} - Formatted message
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        
        let formatted = `[${timestamp}] ${levelUpper} ${message}`;
        
        if (Object.keys(meta).length > 0) {
            formatted += ` | ${JSON.stringify(meta)}`;
        }
        
        return formatted;
    }

    /**
     * Write to log file
     * @param {string} message - Formatted message
     */
    writeToFile(message) {
        if (!this.enableFileLogging) return;
        
        try {
            const logPath = path.join(this.logDir, this.logFile);
            fs.appendFileSync(logPath, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata
     */
    error(message, meta = {}) {
        if (!this.shouldLog('error')) return;
        
        const formatted = this.formatMessage('error', message, meta);
        console.error(formatted);
        this.writeToFile(formatted);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        if (!this.shouldLog('warn')) return;
        
        const formatted = this.formatMessage('warn', message, meta);
        console.warn(formatted);
        this.writeToFile(formatted);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        if (!this.shouldLog('info')) return;
        
        const formatted = this.formatMessage('info', message, meta);
        console.log(formatted);
        this.writeToFile(formatted);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        if (!this.shouldLog('debug')) return;
        
        const formatted = this.formatMessage('debug', message, meta);
        console.log(formatted);
        this.writeToFile(formatted);
    }

    /**
     * Log analysis start
     * @param {string} analysisType - Type of analysis
     * @param {Object} meta - Additional metadata
     */
    analysisStart(analysisType, meta = {}) {
        this.info(`Analysis started: ${analysisType}`, {
            analysisType,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }

    /**
     * Log analysis completion
     * @param {string} analysisType - Type of analysis
     * @param {number} executionTime - Execution time in ms
     * @param {Object} results - Analysis results
     */
    analysisComplete(analysisType, executionTime, results = {}) {
        this.info(`Analysis completed: ${analysisType}`, {
            analysisType,
            executionTime,
            executionTimeFormatted: this.formatDuration(executionTime),
            ...results
        });
    }

    /**
     * Log analysis error
     * @param {string} analysisType - Type of analysis
     * @param {Error} error - Error object
     * @param {Object} meta - Additional metadata
     */
    analysisError(analysisType, error, meta = {}) {
        this.error(`Analysis failed: ${analysisType}`, {
            analysisType,
            error: error.message,
            stack: error.stack,
            ...meta
        });
    }

    /**
     * Log API request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in ms
     */
    apiRequest(req, res, responseTime) {
        const message = `${req.method} ${req.originalUrl} - ${res.statusCode}`;
        const meta = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };

        if (res.statusCode >= 400) {
            this.warn(message, meta);
        } else {
            this.info(message, meta);
        }
    }

    /**
     * Log database operation
     * @param {string} operation - Database operation
     * @param {string} table - Table name
     * @param {Object} meta - Additional metadata
     */
    dbOperation(operation, table, meta = {}) {
        this.debug(`Database ${operation}: ${table}`, {
            operation,
            table,
            ...meta
        });
    }

    /**
     * Format duration in human readable format
     * @param {number} ms - Duration in milliseconds
     * @returns {string} - Formatted duration
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
        return `${(ms / 3600000).toFixed(2)}h`;
    }

    /**
     * Get log file contents
     * @param {number} lines - Number of lines to return (default: 100)
     * @returns {string} - Log file contents
     */
    getLogContents(lines = 100) {
        if (!this.enableFileLogging) {
            return 'File logging is disabled';
        }

        try {
            const logPath = path.join(this.logDir, this.logFile);
            if (!fs.existsSync(logPath)) {
                return 'Log file not found';
            }

            const content = fs.readFileSync(logPath, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            
            return logLines.slice(-lines).join('\n');
        } catch (error) {
            return `Error reading log file: ${error.message}`;
        }
    }

    /**
     * Clear log file
     * @returns {boolean} - Success status
     */
    clearLogs() {
        if (!this.enableFileLogging) return false;

        try {
            const logPath = path.join(this.logDir, this.logFile);
            if (fs.existsSync(logPath)) {
                fs.writeFileSync(logPath, '');
            }
            return true;
        } catch (error) {
            this.error('Failed to clear log file', { error: error.message });
            return false;
        }
    }

    /**
     * Get log statistics
     * @returns {Object} - Log statistics
     */
    getLogStats() {
        if (!this.enableFileLogging) {
            return { fileLogging: false };
        }

        try {
            const logPath = path.join(this.logDir, this.logFile);
            if (!fs.existsSync(logPath)) {
                return { fileExists: false };
            }

            const stats = fs.statSync(logPath);
            const content = fs.readFileSync(logPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            return {
                fileExists: true,
                fileSize: stats.size,
                fileSizeFormatted: this.formatFileSize(stats.size),
                lineCount: lines.length,
                lastModified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
