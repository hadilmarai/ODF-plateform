require('dotenv').config();

const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development'
    },

    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'odf_funding',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // File paths configuration (relative to project root)
    paths: {
        notebooks: {
            eu: process.env.EU_NOTEBOOK_PATH || '../LLMODF.ipynb',
            uk: process.env.UK_NOTEBOOK_PATH || '../innovateuk.ipynb'
        },
        outputFiles: {
            eu: process.env.EU_OUTPUT_FILE || '../df_LLM_ALL_EU.xlsx',
            uk: process.env.UK_OUTPUT_FILE || '../df_final_ukllm.xlsx'
        },
        dataDir: process.env.DATA_DIR || '../data',
        logsDir: process.env.LOG_DIR || '../logs',
        uploadsDir: process.env.UPLOADS_DIR || './uploads'
    },

    // Analysis configuration
    analysis: {
        schedule: process.env.ANALYSIS_SCHEDULE || '0 0 * * *', // Daily at midnight
        autoStart: process.env.AUTO_START_ANALYSIS === 'true',
        timeout: parseInt(process.env.ANALYSIS_TIMEOUT) || 3600000, // 1 hour in ms
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3
    },

    dataLoading: {
        autoLoadOnStartup: process.env.AUTO_LOAD_EXCEL_ON_STARTUP !== 'false', // Default true
        clearDataOnStartup: process.env.CLEAR_DATA_ON_STARTUP !== 'false', // Default true
        euExcelFile: process.env.EU_EXCEL_FILE || '../df_LLM_ALL_EU.xlsx',
        ukExcelFile: process.env.UK_EXCEL_FILE || '../df_final_ukllm.xlsx'
    },

    // Security configuration
    security: {
        corsOrigin: process.env.CORS_ORIGIN || '*',
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
        defaultApiKey: process.env.DEFAULT_API_KEY
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        logFile: process.env.LOG_FILE || 'api.log'
    },

    // Email configuration (for notifications)
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@odf-api.com'
    },

    // Notification configuration
    notifications: {
        enableSlack: process.env.SLACK_ENABLED === 'true',
        slackWebhook: process.env.SLACK_WEBHOOK_URL,
        enableEmail: process.env.EMAIL_NOTIFICATIONS === 'true',
        notifyOnSuccess: process.env.NOTIFY_ON_SUCCESS === 'true',
        notifyOnError: process.env.NOTIFY_ON_ERROR !== 'false' // Default to true
    },

    // File upload configuration
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'xlsx,xls,csv').split(','),
        tempDir: process.env.TEMP_DIR || './temp'
    },

    // Cache configuration
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
        maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
    }
};

// Validation function
const validateConfig = () => {
    const required = [
        'database.host',
        'database.user',
        'database.name'
    ];

    const missing = [];
    
    required.forEach(key => {
        const keys = key.split('.');
        let value = config;
        
        for (const k of keys) {
            value = value[k];
            if (value === undefined || value === null || value === '') {
                missing.push(key);
                break;
            }
        }
    });

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate JWT secret in production
    if (config.server.env === 'production' && config.jwt.secret === 'your-super-secret-jwt-key-change-this-in-production') {
        throw new Error('JWT_SECRET must be set in production environment');
    }

    return true;
};

// Get configuration for specific environment
const getConfig = (env = process.env.NODE_ENV) => {
    const envConfig = { ...config };
    
    // Environment-specific overrides
    switch (env) {
        case 'development':
            envConfig.logging.level = 'debug';
            envConfig.security.corsOrigin = '*';
            break;
            
        case 'production':
            envConfig.logging.level = 'warn';
            envConfig.security.corsOrigin = process.env.CORS_ORIGIN || 'https://yourdomain.com';
            envConfig.security.apiKeyRequired = true;
            break;
            
        case 'test':
            envConfig.database.name = 'odf_funding_test';
            envConfig.logging.level = 'error';
            envConfig.analysis.autoStart = false;
            break;
    }
    
    return envConfig;
};

module.exports = {
    config: getConfig(),
    validateConfig,
    getConfig
};
