const fs = require('fs');
const path = require('path');
const ExcelProcessor = require('../utils/excelProcessor');
const { AnalysisController } = require('./analysisController');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * File Upload Controller
 */
class UploadController {
    /**
     * Upload and process Excel file
     */
    static async uploadExcelFile(req, res) {
        try {
            if (!req.file) {
                return ResponseHelper.validationError(res, [
                    { field: 'file', message: 'No file uploaded' }
                ]);
            }

            const { analysisType } = req.body;
            
            if (!analysisType || !['eu', 'uk'].includes(analysisType)) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return ResponseHelper.validationError(res, [
                    { field: 'analysisType', message: 'Analysis type must be either "eu" or "uk"' }
                ]);
            }

            logger.info('File upload started', {
                filename: req.file.originalname,
                size: req.file.size,
                analysisType,
                userId: req.user?.id
            });

            // Read and validate Excel file
            const fileResult = ExcelProcessor.readExcelFile(req.file.path);
            
            if (!fileResult.success) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return ResponseHelper.error(res, 'Failed to read Excel file', 400, {
                    details: fileResult.error
                });
            }

            // Validate file structure
            const validation = analysisType === 'eu' 
                ? ExcelProcessor.validateEUStructure(fileResult.data)
                : ExcelProcessor.validateUKStructure(fileResult.data);

            if (!validation.valid) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return ResponseHelper.validationError(res, [
                    { field: 'file', message: validation.error }
                ], 'Invalid file structure');
            }

            // Clean data
            const cleanedData = ExcelProcessor.cleanData(fileResult.data, analysisType);

            // Save to database
            let saveResult;
            if (analysisType === 'eu') {
                saveResult = await AnalysisController.saveEUDataToDatabase(cleanedData);
            } else {
                saveResult = await AnalysisController.saveUKDataToDatabase(cleanedData);
            }

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            logger.info('File upload completed', {
                filename: req.file.originalname,
                analysisType,
                recordsProcessed: saveResult.count,
                userId: req.user?.id
            });

            return ResponseHelper.fileUpload(res, analysisType, saveResult.count);
        } catch (error) {
            // Clean up uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            logger.error('File upload failed', {
                error: error.message,
                filename: req.file?.originalname,
                analysisType: req.body?.analysisType,
                userId: req.user?.id
            });

            return ResponseHelper.error(res, 'Failed to process uploaded file');
        }
    }

    /**
     * Get upload history
     */
    static async getUploadHistory(req, res) {
        try {
            const { page = 1, limit = 20, analysisType } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '';
            const params = [];

            if (analysisType && ['eu', 'uk'].includes(analysisType)) {
                whereClause = 'WHERE analysis_type = ?';
                params.push(analysisType);
            }

            const connection = await require('../config/database').pool.getConnection();
            
            // Get total count
            const [countResult] = await connection.execute(
                `SELECT COUNT(*) as total FROM analysis_logs ${whereClause}`,
                params
            );
            const total = countResult[0].total;

            // Get upload history
            const [logs] = await connection.execute(
                `SELECT * FROM analysis_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            
            connection.release();

            return ResponseHelper.paginated(
                res,
                logs,
                parseInt(page),
                parseInt(limit),
                total,
                'Upload history retrieved successfully'
            );
        } catch (error) {
            logger.error('Error getting upload history', { error: error.message });
            return ResponseHelper.error(res, 'Failed to get upload history');
        }
    }

    /**
     * Download template file
     */
    static async downloadTemplate(req, res) {
        try {
            const { type } = req.params;
            
            if (!['eu', 'uk'].includes(type)) {
                return ResponseHelper.validationError(res, [
                    { field: 'type', message: 'Type must be either "eu" or "uk"' }
                ]);
            }

            // Create template data
            const templateData = type === 'eu' ? [
                {
                    'Title': 'Example EU Project Title',
                    'URL': 'https://example.com/eu-project',
                    'Status': 'Open',
                    'Start_date': '2024-01-01',
                    'Deadline': '2024-12-31',
                    'Pertinence': 'Yes',
                    'Matching Word(s)': 'innovation, technology',
                    'Pertinence LLM': 'Yes',
                    'Résumé LLM': 'This is an example project summary'
                }
            ] : [
                {
                    'Titre': 'Example UK Project Title',
                    'Lien': 'https://example.com/uk-project',
                    'Status': 'Open',
                    'Pertinence': 'Yes',
                    'Matching Word(s)': 'innovation, technology',
                    'Pertinence LLM': 'Yes',
                    'Résumé LLM': 'This is an example project summary'
                }
            ];

            // Create temporary file
            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const filename = `${type}_template.xlsx`;
            const filepath = path.join(tempDir, filename);

            const writeResult = ExcelProcessor.writeExcelFile(templateData, filepath, 'Template');
            
            if (!writeResult.success) {
                return ResponseHelper.error(res, 'Failed to create template file');
            }

            logger.info('Template downloaded', { type, userId: req.user?.id });

            // Send file
            res.download(filepath, filename, (err) => {
                // Clean up temp file
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
                
                if (err) {
                    logger.error('Error sending template file', { error: err.message });
                }
            });
        } catch (error) {
            logger.error('Error creating template', { 
                error: error.message, 
                type: req.params.type 
            });
            return ResponseHelper.error(res, 'Failed to create template file');
        }
    }

    /**
     * Validate uploaded file without saving
     */
    static async validateFile(req, res) {
        try {
            if (!req.file) {
                return ResponseHelper.validationError(res, [
                    { field: 'file', message: 'No file uploaded' }
                ]);
            }

            const { analysisType } = req.body;
            
            if (!analysisType || !['eu', 'uk'].includes(analysisType)) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return ResponseHelper.validationError(res, [
                    { field: 'analysisType', message: 'Analysis type must be either "eu" or "uk"' }
                ]);
            }

            // Read Excel file
            const fileResult = ExcelProcessor.readExcelFile(req.file.path);
            
            if (!fileResult.success) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return ResponseHelper.error(res, 'Failed to read Excel file', 400, {
                    details: fileResult.error
                });
            }

            // Validate file structure
            const validation = analysisType === 'eu' 
                ? ExcelProcessor.validateEUStructure(fileResult.data)
                : ExcelProcessor.validateUKStructure(fileResult.data);

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            const response = {
                valid: validation.valid,
                analysisType,
                filename: req.file.originalname,
                fileSize: req.file.size,
                rowCount: fileResult.count,
                columns: fileResult.columns
            };

            if (!validation.valid) {
                response.error = validation.error;
                response.missingColumns = validation.missingColumns;
            } else {
                response.requiredColumns = validation.requiredColumns;
                response.optionalColumns = validation.optionalColumns;
            }

            logger.info('File validation completed', {
                filename: req.file.originalname,
                analysisType,
                valid: validation.valid,
                userId: req.user?.id
            });

            return ResponseHelper.success(res, response, 'File validation completed');
        } catch (error) {
            // Clean up uploaded file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            logger.error('File validation failed', {
                error: error.message,
                filename: req.file?.originalname,
                userId: req.user?.id
            });

            return ResponseHelper.error(res, 'Failed to validate file');
        }
    }

    /**
     * Get file upload statistics
     */
    static async getUploadStats(req, res) {
        try {
            const connection = await require('../config/database').pool.getConnection();
            
            const [stats] = await connection.execute(`
                SELECT 
                    analysis_type,
                    COUNT(*) as total_uploads,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_uploads,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_uploads,
                    AVG(execution_time) as avg_processing_time,
                    MAX(created_at) as last_upload
                FROM analysis_logs 
                GROUP BY analysis_type
            `);

            const [recentUploads] = await connection.execute(`
                SELECT analysis_type, status, created_at, execution_time
                FROM analysis_logs 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            connection.release();

            const statistics = {
                byType: stats.reduce((acc, stat) => {
                    acc[stat.analysis_type] = {
                        totalUploads: stat.total_uploads,
                        successfulUploads: stat.successful_uploads,
                        failedUploads: stat.failed_uploads,
                        avgProcessingTime: Math.round(stat.avg_processing_time || 0),
                        lastUpload: stat.last_upload
                    };
                    return acc;
                }, {}),
                recentActivity: recentUploads
            };

            return ResponseHelper.success(res, statistics, 'Upload statistics retrieved successfully');
        } catch (error) {
            logger.error('Error getting upload statistics', { error: error.message });
            return ResponseHelper.error(res, 'Failed to get upload statistics');
        }
    }
}

module.exports = UploadController;
