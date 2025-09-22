const express = require('express');
const multer = require('multer');
const path = require('path');
const UploadController = require('../controllers/uploadController');
const AuthMiddleware = require('../middleware/auth');
const RateLimiter = require('../middleware/rateLimiter');
const ValidationMiddleware = require('../middleware/validation');
const ResponseHelper = require('../utils/responseHelper');
const { config } = require('../config/app');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.paths.uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.upload.maxFileSize, // Default 50MB
        files: 1 // Only one file at a time
    }
});

/**
 * Upload and process Excel file
 * POST /upload
 */
router.post('/',
    RateLimiter.upload(),
    AuthMiddleware.optionalAuth,
    upload.single('excelFile'),
    ValidationMiddleware.validateFileUpload(),
    ValidationMiddleware.validateExcelData(req => req.body.analysisType),
    ResponseHelper.asyncHandler(UploadController.uploadExcelFile)
);

/**
 * Validate Excel file without saving
 * POST /upload/validate
 */
router.post('/validate',
    RateLimiter.upload(),
    AuthMiddleware.optionalAuth,
    upload.single('excelFile'),
    ValidationMiddleware.validateFileUpload(),
    ValidationMiddleware.validateExcelData(req => req.body.analysisType),
    ResponseHelper.asyncHandler(UploadController.validateFile)
);

/**
 * Get upload history
 * GET /upload/history
 */
router.get('/history',
    RateLimiter.general(),
    AuthMiddleware.optionalAuth,
    ValidationMiddleware.validatePagination(),
    ValidationMiddleware.custom((body, params, query) => {
        const { analysisType } = query;
        
        if (analysisType && !['eu', 'uk', 'combined'].includes(analysisType)) {
            throw new Error('Analysis type must be "eu", "uk", or "combined"');
        }
        
        return true;
    }, 'Invalid query parameters'),
    ResponseHelper.asyncHandler(UploadController.getUploadHistory)
);

/**
 * Get upload statistics
 * GET /upload/stats
 */
router.get('/stats',
    RateLimiter.general(),
    AuthMiddleware.optionalAuth,
    ResponseHelper.asyncHandler(UploadController.getUploadStats)
);

/**
 * Download template file
 * GET /upload/template/:type
 */
router.get('/template/:type',
    RateLimiter.general(),
    ValidationMiddleware.validateAnalysisType(),
    ResponseHelper.asyncHandler(UploadController.downloadTemplate)
);

/**
 * Bulk upload multiple files (admin only)
 * POST /upload/bulk
 */
router.post('/bulk',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    AuthMiddleware.adminOnly,
    upload.array('files', 10), // Allow up to 10 files
    ValidationMiddleware.custom((body, params, query, req) => {
        if (!req.files || req.files.length === 0) {
            throw new Error('No files uploaded');
        }
        
        const { analysisType } = body;
        if (!analysisType || !['eu', 'uk'].includes(analysisType)) {
            throw new Error('Analysis type must be either "eu" or "uk"');
        }
        
        return true;
    }, 'Bulk upload validation failed'),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { analysisType } = req.body;
            const files = req.files;
            
            const results = [];
            let totalProcessed = 0;
            let totalErrors = 0;

            for (const file of files) {
                try {
                    // Process each file individually
                    req.file = file;
                    const result = await UploadController.uploadExcelFile(req, { 
                        json: (data) => data // Mock response object
                    });
                    
                    results.push({
                        filename: file.originalname,
                        success: true,
                        count: result.count || 0
                    });
                    
                    totalProcessed += result.count || 0;
                } catch (error) {
                    results.push({
                        filename: file.originalname,
                        success: false,
                        error: error.message
                    });
                    totalErrors++;
                }
            }

            return ResponseHelper.success(res, {
                analysisType: analysisType.toUpperCase(),
                filesProcessed: files.length,
                totalRecords: totalProcessed,
                errors: totalErrors,
                results: results
            }, 'Bulk upload completed', 201);
        } catch (error) {
            return ResponseHelper.error(res, 'Bulk upload failed');
        }
    })
);

/**
 * Get file upload limits and configuration
 * GET /upload/config
 */
router.get('/config',
    RateLimiter.general(),
    ResponseHelper.asyncHandler(async (req, res) => {
        const uploadConfig = {
            maxFileSize: config.upload.maxFileSize,
            maxFileSizeFormatted: formatFileSize(config.upload.maxFileSize),
            allowedTypes: config.upload.allowedTypes,
            allowedExtensions: ['.xlsx', '.xls', '.csv'],
            maxFiles: 1, // For single upload
            maxBulkFiles: 10, // For bulk upload
            supportedAnalysisTypes: ['eu', 'uk']
        };

        return ResponseHelper.success(res, uploadConfig, 'Upload configuration retrieved');
    })
);

/**
 * Delete uploaded file (admin only)
 * DELETE /upload/:filename
 */
router.delete('/:filename',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    AuthMiddleware.adminOnly,
    ValidationMiddleware.custom((body, params) => {
        const { filename } = params;
        
        if (!filename || filename.includes('..') || filename.includes('/')) {
            throw new Error('Invalid filename');
        }
        
        return true;
    }, 'Invalid filename'),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { filename } = req.params;
            const fs = require('fs');
            const filePath = path.join(config.paths.uploadsDir, filename);
            
            if (!fs.existsSync(filePath)) {
                return ResponseHelper.notFound(res, 'File');
            }
            
            fs.unlinkSync(filePath);
            
            return ResponseHelper.success(res, null, 'File deleted successfully');
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to delete file');
        }
    })
);

/**
 * Clean up old uploaded files (admin only)
 * POST /upload/cleanup
 */
router.post('/cleanup',
    RateLimiter.strict(),
    AuthMiddleware.authenticate,
    AuthMiddleware.adminOnly,
    ValidationMiddleware.custom((body) => {
        const { olderThanDays = 7 } = body;
        
        if (isNaN(olderThanDays) || olderThanDays < 1) {
            throw new Error('olderThanDays must be a positive number');
        }
        
        return true;
    }, 'Invalid cleanup parameters'),
    ResponseHelper.asyncHandler(async (req, res) => {
        try {
            const { olderThanDays = 7 } = req.body;
            const fs = require('fs');
            const uploadsDir = config.paths.uploadsDir;
            
            if (!fs.existsSync(uploadsDir)) {
                return ResponseHelper.success(res, { deletedFiles: 0 }, 'No files to clean up');
            }
            
            const files = fs.readdirSync(uploadsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            
            let deletedCount = 0;
            const deletedFiles = [];
            
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    deletedFiles.push({
                        filename: file,
                        lastModified: stats.mtime,
                        size: stats.size
                    });
                }
            }
            
            return ResponseHelper.success(res, {
                deletedFiles: deletedCount,
                cutoffDate: cutoffDate.toISOString(),
                files: deletedFiles
            }, `Cleaned up ${deletedCount} old files`);
        } catch (error) {
            return ResponseHelper.error(res, 'Failed to clean up files');
        }
    })
);

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return ResponseHelper.error(res, 'File too large', 413, {
                maxSize: formatFileSize(config.upload.maxFileSize)
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return ResponseHelper.error(res, 'Too many files', 413);
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return ResponseHelper.error(res, 'Unexpected file field', 400);
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return ResponseHelper.error(res, error.message, 400);
    }
    
    next(error);
});

module.exports = router;
