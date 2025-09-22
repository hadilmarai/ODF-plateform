const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');
require('dotenv').config();

// Import configuration and utilities
const { config, validateConfig } = require('./config/app');
const { initializeDatabase } = require('./config/database');
const logger = require('./utils/logger');
const ResponseHelper = require('./utils/responseHelper');
const StartupDataLoader = require('./utils/startupDataLoader');

// Import middleware
const RequestLogger = require('./middleware/requestLogger');
const RateLimiter = require('./middleware/rateLimiter');

// Import routes
const indexRoutes = require('./routes/index');
const analysisRoutes = require('./routes/analysis');
const projectsRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const dataRoutes = require('./routes/data');
const scriptRoutes = require('./routes/scripts');

// Import controllers
const { AnalysisController } = require('./controllers/analysisController');

const app = express();
const PORT = config.server.port;

// Validate configuration on startup
try {
    validateConfig();
    logger.info('Configuration validated successfully');
} catch (error) {
    logger.error('Configuration validation failed', { error: error.message });
    process.exit(1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
    origin: config.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(RequestLogger.getMiddleware());

// Rate limiting middleware
app.use(RateLimiter.general());

// Ensure required directories exist
const ensureDirectories = () => {
    const fs = require('fs');
    const dirs = [
        config.paths.dataDir,
        config.paths.logsDir,
        config.paths.uploadsDir,
        './temp'
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`Created directory: ${dir}`);
        }
    });
};

// Mount routes
app.use('/', indexRoutes);
app.use('/analysis', analysisRoutes);
app.use('/projects', projectsRoutes);
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.use('/data', dataRoutes);
app.use('/scripts', scriptRoutes);

// 404 handler
app.use('*', (req, res) => {
    ResponseHelper.notFound(res, 'Endpoint');
});

// Global error handler
app.use(ResponseHelper.errorHandler());

// Schedule automatic analysis every 24 hours
if (config.analysis.schedule) {
    cron.schedule(config.analysis.schedule, async () => {
        logger.info('🕐 Running scheduled analysis...');
        try {
            await AnalysisController.runFullAnalysis();
            logger.info('✅ Scheduled analysis completed');
        } catch (error) {
            logger.error('❌ Scheduled analysis failed', { error: error.message });
        }
    });

    logger.info(`⏰ Analysis scheduled: ${config.analysis.schedule}`);
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Close database connections
    require('./config/database').closeConnection()
        .then(() => {
            logger.info('Database connections closed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Error during shutdown', { error: error.message });
            process.exit(1);
        });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Server initialization
const startServer = async () => {
    try {
        // Validate configuration
        validateConfig();

        // Ensure directories exist
        ensureDirectories();

        // Initialize database
        await initializeDatabase();

        // Load Excel files into database on startup (if enabled)
        if (config.dataLoading.autoLoadOnStartup) {
            const dataLoader = new StartupDataLoader();
            await dataLoader.loadStartupData();
        } else {
            logger.info('⏭️  Automatic data loading disabled');
        }

        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`🚀 ODF API Server running on port ${PORT}`);
            logger.info(`📊 API Documentation available at http://localhost:${PORT}`);
            logger.info(`🌍 Environment: ${config.server.env}`);
            logger.info(`🔒 Security: CORS origin set to ${config.security.corsOrigin}`);

            if (config.analysis.schedule) {
                logger.info(`⏰ Analysis scheduled: ${config.analysis.schedule}`);
            }

            if (config.analysis.autoStart) {
                logger.info('🚀 Auto-starting initial analysis...');
                AnalysisController.runFullAnalysis()
                    .then(() => logger.info('✅ Initial analysis completed'))
                    .catch(error => logger.error('❌ Initial analysis failed', { error: error.message }));
            }
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${PORT} is already in use`);
            } else {
                logger.error('❌ Server error', { error: error.message });
            }
            process.exit(1);
        });

        return server;
    } catch (error) {
        logger.error('❌ Failed to start server', { error: error.message });
        process.exit(1);
    }
};

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;
