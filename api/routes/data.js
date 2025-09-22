const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const StartupDataLoader = require('../utils/startupDataLoader');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Data Management Routes
 * Endpoints for managing Excel data loading
 */

// Initialize data loader
const dataLoader = new StartupDataLoader();

/**
 * @route GET /data/status
 * @desc Get data loading status
 * @access Public
 */
router.get('/status', async (req, res) => {
    try {
        const status = await dataLoader.getStatus();
        
        ResponseHelper.success(res, status, 'Data status retrieved successfully');
    } catch (error) {
        logger.error('Error getting data status', { error: error.message });
        ResponseHelper.serverError(res, 'Failed to get data status');
    }
});

/**
 * @route GET /data/files
 * @desc Get Excel files information
 * @access Public
 */
router.get('/files', (req, res) => {
    try {
        const fileInfo = dataLoader.getFileInfo();
        
        ResponseHelper.success(res, fileInfo, 'File information retrieved successfully');
    } catch (error) {
        logger.error('Error getting file info', { error: error.message });
        ResponseHelper.serverError(res, 'Failed to get file information');
    }
});

/**
 * @route POST /data/reload
 * @desc Reload all data from Excel files
 * @access Admin only
 */
router.post('/reload', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    try {
        logger.info('Manual data reload triggered', {
            userId: req.user.id,
            username: req.user.username
        });
        
        const result = await dataLoader.reloadData();
        
        ResponseHelper.success(res, result, 'Data reloaded successfully');
    } catch (error) {
        logger.error('Error reloading data', {
            error: error.message,
            userId: req.user?.id
        });
        ResponseHelper.serverError(res, 'Failed to reload data');
    }
});

/**
 * @route POST /data/reload/eu
 * @desc Reload only EU data from Excel file
 * @access Admin only
 */
router.post('/reload/eu', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    try {
        logger.info('Manual EU data reload triggered', {
            userId: req.user.id,
            username: req.user.username
        });
        
        const result = await dataLoader.loadEUOnly();
        
        ResponseHelper.success(res, result, 'EU data reloaded successfully');
    } catch (error) {
        logger.error('Error reloading EU data', {
            error: error.message,
            userId: req.user?.id
        });
        ResponseHelper.serverError(res, 'Failed to reload EU data');
    }
});

/**
 * @route POST /data/reload/uk
 * @desc Reload only UK data from Excel file
 * @access Admin only
 */
router.post('/reload/uk', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    try {
        logger.info('Manual UK data reload triggered', {
            userId: req.user.id,
            username: req.user.username
        });
        
        const result = await dataLoader.loadUKOnly();
        
        ResponseHelper.success(res, result, 'UK data reloaded successfully');
    } catch (error) {
        logger.error('Error reloading UK data', {
            error: error.message,
            userId: req.user?.id
        });
        ResponseHelper.serverError(res, 'Failed to reload UK data');
    }
});

/**
 * @route DELETE /data/clear
 * @desc Clear all project data
 * @access Admin only
 */
router.delete('/clear', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    try {
        logger.info('Manual data clear triggered', {
            userId: req.user.id,
            username: req.user.username
        });
        
        await dataLoader.clearExistingData();
        
        ResponseHelper.success(res, { cleared: true }, 'All project data cleared successfully');
    } catch (error) {
        logger.error('Error clearing data', {
            error: error.message,
            userId: req.user?.id
        });
        ResponseHelper.serverError(res, 'Failed to clear data');
    }
});

/**
 * @route GET /data/summary
 * @desc Get data summary with statistics
 * @access Public
 */
router.get('/summary', async (req, res) => {
    try {
        const status = await dataLoader.getStatus();
        const fileInfo = dataLoader.getFileInfo();
        
        const summary = {
            database: status.database,
            files: {
                eu: {
                    fileName: fileInfo.eu.fileName,
                    exists: fileInfo.eu.exists,
                    size: fileInfo.eu.size,
                    modified: fileInfo.eu.modified
                },
                uk: {
                    fileName: fileInfo.uk.fileName,
                    exists: fileInfo.uk.exists,
                    size: fileInfo.uk.size,
                    modified: fileInfo.uk.modified
                }
            },
            statistics: {
                totalProjects: status.total,
                euProjects: status.database.eu,
                ukProjects: status.database.uk,
                filesAvailable: fileInfo.eu.exists && fileInfo.uk.exists
            }
        };
        
        ResponseHelper.success(res, summary, 'Data summary retrieved successfully');
    } catch (error) {
        logger.error('Error getting data summary', { error: error.message });
        ResponseHelper.serverError(res, 'Failed to get data summary');
    }
});

module.exports = router;
