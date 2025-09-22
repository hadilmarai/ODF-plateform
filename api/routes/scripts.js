const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const ScriptExecutionController = require('../controllers/scriptExecutionController');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Script Execution Routes
 * Endpoints for executing Python analysis scripts
 */

/**
 * @route POST /scripts/execute/eu
 * @desc Execute EU analysis script (horizoneu.py)
 * @access Admin only
 */
router.post('/execute/eu', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    await ScriptExecutionController.executeEUScript(req, res);
});

/**
 * @route POST /scripts/execute/uk
 * @desc Execute UK analysis script (innovateuk.py)
 * @access Admin only
 */
router.post('/execute/uk', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    await ScriptExecutionController.executeUKScript(req, res);
});

/**
 * @route GET /scripts/status
 * @desc Get execution status of all scripts
 * @access Authenticated users
 */
router.get('/status', AuthMiddleware.authenticate, async (req, res) => {
    await ScriptExecutionController.getExecutionStatus(req, res);
});

/**
 * @route GET /scripts/status/:scriptType
 * @desc Get execution status of specific script (eu/uk)
 * @access Authenticated users
 */
router.get('/status/:scriptType', AuthMiddleware.authenticate, async (req, res) => {
    try {
        const { scriptType } = req.params;
        
        if (!['eu', 'uk'].includes(scriptType)) {
            return ResponseHelper.badRequest(res, 'Invalid script type. Use "eu" or "uk"');
        }

        const status = ScriptExecutionController.getScriptStatus(scriptType);
        ResponseHelper.success(res, status, `${scriptType.toUpperCase()} script status retrieved`);
        
    } catch (error) {
        ResponseHelper.serverError(res, 'Failed to get script status');
    }
});

/**
 * @route POST /scripts/stop/:scriptType
 * @desc Stop a running script
 * @access Admin only
 */
router.post('/stop/:scriptType', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    await ScriptExecutionController.stopScript(req, res);
});

/**
 * @route GET /scripts/logs/:scriptType
 * @desc Get logs from a running script
 * @access Admin only
 */
router.get('/logs/:scriptType', AuthMiddleware.authenticate, AuthMiddleware.adminOnly, async (req, res) => {
    await ScriptExecutionController.getScriptLogs(req, res);
});

/**
 * @route GET /scripts/info
 * @desc Get information about available scripts
 * @access Authenticated users
 */
router.get('/info', AuthMiddleware.authenticate, (req, res) => {
    const scriptsInfo = {
        eu: {
            name: 'horizoneu.py',
            type: 'EU',
            description: 'EU funding opportunities scraper and LLM analysis',
            estimatedDuration: '15-30 minutes',
            outputFile: 'df_LLM_ALL_EU.xlsx',
            features: [
                'Web scraping from EU funding portal',
                'LLM-based relevance analysis',
                'Excel file generation',
                'Database update'
            ]
        },
        uk: {
            name: 'innovateuk.py',
            type: 'UK', 
            description: 'UK funding opportunities scraper and analysis',
            estimatedDuration: '10-20 minutes',
            outputFile: 'df_final_ukllm.xlsx',
            features: [
                'Web scraping from UKRI portal',
                'Text analysis and classification',
                'Excel file generation',
                'Database update'
            ]
        }
    };

    ResponseHelper.success(res, scriptsInfo, 'Scripts information retrieved');
});

module.exports = router;
