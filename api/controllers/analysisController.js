const { pool, getDatabaseStats } = require('../config/database');
const ExcelProcessor = require('../utils/excelProcessor');
const NotebookExecutor = require('../utils/notebookExecutor');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { config } = require('../config/app');
const { euProjectModel, ukProjectModel, analysisLogModel } = require('../models');

// Global analysis state
let analysisState = {
    status: 'not_started', // not_started, running, completed, error
    lastUpdate: null,
    euAnalysis: {
        status: 'not_started',
        projectsCount: 0,
        relevantCount: 0,
        llmAnalyzedCount: 0,
        error: null
    },
    ukAnalysis: {
        status: 'not_started',
        projectsCount: 0,
        relevantCount: 0,
        llmAnalyzedCount: 0,
        error: null
    },
    isRunning: false,
    errorMessage: null
};

/**
 * Analysis Controller
 */
class AnalysisController {
    /**
     * Get current analysis status
     */
    static async getStatus(req, res) {
        try {
            return ResponseHelper.analysisStatus(res, analysisState);
        } catch (error) {
            logger.error('Error getting analysis status', { error: error.message });
            return ResponseHelper.error(res, 'Failed to get analysis status');
        }
    }

    /**
     * Get EU analysis results
     */
    static async getEUAnalysis(req, res) {
        try {
            logger.debug('Getting EU analysis', {
                filePath: config.paths.outputFiles.eu,
                analysisState: analysisState.euAnalysis
            });

            const fileResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.eu);

            if (!fileResult.success) {
                logger.warn('EU analysis file not found or invalid', {
                    filePath: config.paths.outputFiles.eu,
                    error: fileResult.error
                });
                return ResponseHelper.notFound(res, 'EU analysis data');
            }

            const dbStats = await getDatabaseStats();

            return ResponseHelper.analysisResults(
                res,
                'EU',
                fileResult,
                dbStats.eu,
                analysisState
            );
        } catch (error) {
            logger.error('Error getting EU analysis', {
                error: error.message,
                stack: error.stack,
                filePath: config.paths.outputFiles.eu
            });
            return ResponseHelper.error(res, 'Failed to load EU analysis');
        }
    }

    /**
     * Get UK analysis results
     */
    static async getUKAnalysis(req, res) {
        try {
            logger.debug('Getting UK analysis', {
                filePath: config.paths.outputFiles.uk,
                analysisState: analysisState.ukAnalysis
            });

            const fileResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.uk);

            if (!fileResult.success) {
                logger.warn('UK analysis file not found or invalid', {
                    filePath: config.paths.outputFiles.uk,
                    error: fileResult.error
                });
                return ResponseHelper.notFound(res, 'UK analysis data');
            }

            const dbStats = await getDatabaseStats();

            return ResponseHelper.analysisResults(
                res,
                'UK',
                fileResult,
                dbStats.uk,
                analysisState
            );
        } catch (error) {
            logger.error('Error getting UK analysis', {
                error: error.message,
                stack: error.stack,
                filePath: config.paths.outputFiles.uk
            });
            return ResponseHelper.error(res, 'Failed to load UK analysis');
        }
    }

    /**
     * Get combined analysis results
     */
    static async getCombinedAnalysis(req, res) {
        try {
            const euResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.eu);
            const ukResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.uk);
            const dbStats = await getDatabaseStats();

            return ResponseHelper.combinedAnalysis(
                res,
                euResult,
                ukResult,
                dbStats.eu,
                dbStats.uk,
                analysisState
            );
        } catch (error) {
            logger.error('Error getting combined analysis', { error: error.message });
            return ResponseHelper.error(res, 'Failed to load combined analysis');
        }
    }

    /**
     * Trigger full analysis (EU + UK)
     */
    static async triggerFullAnalysis(req, res) {
        try {
            if (analysisState.isRunning) {
                return ResponseHelper.conflict(res, 'Analysis is already running');
            }

            // Start analysis in background
            AnalysisController.runFullAnalysis()
                .then(() => {
                    logger.info('Full analysis completed successfully');
                })
                .catch((error) => {
                    logger.error('Full analysis failed', { error: error.message });
                });

            return ResponseHelper.triggerAnalysis(res, 'Full Analysis', {
                message: 'Full analysis started successfully',
                estimatedTime: '30-60 minutes'
            });
        } catch (error) {
            logger.error('Error triggering full analysis', { error: error.message });
            return ResponseHelper.error(res, 'Failed to trigger full analysis');
        }
    }

    /**
     * Trigger EU analysis only
     */
    static async triggerEUAnalysis(req, res) {
        try {
            if (analysisState.isRunning) {
                return ResponseHelper.conflict(res, 'Analysis is already running');
            }

            // Start EU analysis in background
            AnalysisController.runEUAnalysis()
                .then(() => {
                    logger.info('EU analysis completed successfully');
                })
                .catch((error) => {
                    logger.error('EU analysis failed', { error: error.message });
                });

            return ResponseHelper.triggerAnalysis(res, 'EU Analysis', {
                message: 'EU analysis started successfully',
                estimatedTime: '15-30 minutes'
            });
        } catch (error) {
            logger.error('Error triggering EU analysis', { error: error.message });
            return ResponseHelper.error(res, 'Failed to trigger EU analysis');
        }
    }

    /**
     * Trigger UK analysis only
     */
    static async triggerUKAnalysis(req, res) {
        try {
            if (analysisState.isRunning) {
                return ResponseHelper.conflict(res, 'Analysis is already running');
            }

            // Start UK analysis in background
            AnalysisController.runUKAnalysis()
                .then(() => {
                    logger.info('UK analysis completed successfully');
                })
                .catch((error) => {
                    logger.error('UK analysis failed', { error: error.message });
                });

            return ResponseHelper.triggerAnalysis(res, 'UK Analysis', {
                message: 'UK analysis started successfully',
                estimatedTime: '15-30 minutes'
            });
        } catch (error) {
            logger.error('Error triggering UK analysis', { error: error.message });
            return ResponseHelper.error(res, 'Failed to trigger UK analysis');
        }
    }

    /**
     * Run full analysis (internal method)
     */
    static async runFullAnalysis() {
        if (analysisState.isRunning) {
            throw new Error('Analysis is already running');
        }

        analysisState.isRunning = true;
        analysisState.status = 'running';
        analysisState.errorMessage = null;

        try {
            logger.analysisStart('Full Analysis');
            const startTime = Date.now();

            // Run EU analysis
            await AnalysisController.executeEUAnalysis();
            
            // Run UK analysis
            await AnalysisController.executeUKAnalysis();

            const executionTime = Date.now() - startTime;
            analysisState.status = 'completed';
            analysisState.lastUpdate = new Date().toISOString();
            
            logger.analysisComplete('Full Analysis', executionTime, {
                euProjects: analysisState.euAnalysis.projectsCount,
                ukProjects: analysisState.ukAnalysis.projectsCount
            });

            return { success: true, message: 'Full analysis completed successfully' };
        } catch (error) {
            analysisState.status = 'error';
            analysisState.errorMessage = error.message;
            logger.analysisError('Full Analysis', error);
            throw error;
        } finally {
            analysisState.isRunning = false;
        }
    }

    /**
     * Run EU analysis only (internal method)
     */
    static async runEUAnalysis() {
        if (analysisState.isRunning) {
            throw new Error('Analysis is already running');
        }

        analysisState.isRunning = true;
        analysisState.euAnalysis.status = 'running';

        try {
            await AnalysisController.executeEUAnalysis();
            analysisState.euAnalysis.status = 'completed';
            analysisState.lastUpdate = new Date().toISOString();
            
            return { success: true, message: 'EU analysis completed successfully' };
        } catch (error) {
            analysisState.euAnalysis.status = 'error';
            analysisState.euAnalysis.error = error.message;
            throw error;
        } finally {
            analysisState.isRunning = false;
        }
    }

    /**
     * Run UK analysis only (internal method)
     */
    static async runUKAnalysis() {
        if (analysisState.isRunning) {
            throw new Error('Analysis is already running');
        }

        analysisState.isRunning = true;
        analysisState.ukAnalysis.status = 'running';

        try {
            await AnalysisController.executeUKAnalysis();
            analysisState.ukAnalysis.status = 'completed';
            analysisState.lastUpdate = new Date().toISOString();
            
            return { success: true, message: 'UK analysis completed successfully' };
        } catch (error) {
            analysisState.ukAnalysis.status = 'error';
            analysisState.ukAnalysis.error = error.message;
            throw error;
        } finally {
            analysisState.isRunning = false;
        }
    }

    /**
     * Execute EU analysis (notebook + data processing)
     */
    static async executeEUAnalysis() {
        logger.info('Starting EU analysis execution');
        
        // Execute notebook
        await NotebookExecutor.executeNotebook(
            config.paths.notebooks.eu,
            'eu',
            { timeout: config.analysis.timeout }
        );
        
        // Process results
        const euResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.eu);
        if (euResult.success) {
            await AnalysisController.saveEUDataToDatabase(euResult.data);
            analysisState.euAnalysis.projectsCount = euResult.count;
        }
    }

    /**
     * Execute UK analysis (notebook + data processing)
     */
    static async executeUKAnalysis() {
        logger.info('Starting UK analysis execution');
        
        // Execute notebook
        await NotebookExecutor.executeNotebook(
            config.paths.notebooks.uk,
            'uk',
            { timeout: config.analysis.timeout }
        );
        
        // Process results
        const ukResult = ExcelProcessor.readExcelFile(config.paths.outputFiles.uk);
        if (ukResult.success) {
            await AnalysisController.saveUKDataToDatabase(ukResult.data);
            analysisState.ukAnalysis.projectsCount = ukResult.count;
        }
    }

    /**
     * Save EU data to database
     */
    static async saveEUDataToDatabase(data) {
        try {
            const result = await euProjectModel.bulkCreate(data);
            logger.info(`Saved ${result.count} EU projects to database`);
            return result;
        } catch (error) {
            logger.error('Error saving EU data', { error: error.message });
            throw error;
        }
    }

    /**
     * Save UK data to database
     */
    static async saveUKDataToDatabase(data) {
        try {
            const result = await ukProjectModel.bulkCreate(data);
            logger.info(`Saved ${result.count} UK projects to database`);
            return result;
        } catch (error) {
            logger.error('Error saving UK data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get analysis state (for internal use)
     */
    static getAnalysisState() {
        return analysisState;
    }

    /**
     * Reset analysis state
     */
    static resetAnalysisState() {
        analysisState = {
            status: 'not_started',
            lastUpdate: null,
            euAnalysis: {
                status: 'not_started',
                projectsCount: 0,
                relevantCount: 0,
                llmAnalyzedCount: 0,
                error: null
            },
            ukAnalysis: {
                status: 'not_started',
                projectsCount: 0,
                relevantCount: 0,
                llmAnalyzedCount: 0,
                error: null
            },
            isRunning: false,
            errorMessage: null
        };
    }
}

module.exports = { AnalysisController, analysisState };
