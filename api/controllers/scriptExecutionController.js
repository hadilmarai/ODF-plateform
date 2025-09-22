const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const StartupDataLoader = require('../utils/startupDataLoader');

/**
 * Script Execution Controller
 * Handles execution of Python analysis scripts with comprehensive debugging
 */
class ScriptExecutionController {
    constructor() {
        // Track running processes
        this.runningProcesses = new Map();

        // Script configurations
        this.scripts = {
            eu: {
                name: 'horizoneu.py',
                path: path.resolve(__dirname, '../../horizoneu.py'),
                type: 'EU',
                outputFile: path.resolve(__dirname, '../../df_LLM_ALL_EU.xlsx'),
                timeout: 30 * 60 * 1000, // 30 minutes
                logFile: path.resolve(__dirname, '../../logs/eu_script_execution.log'),
                dependencies: ['selenium', 'pandas', 'openpyxl', 'requests']
            },
            uk: {
                name: 'innovateuk.py',
                path: path.resolve(__dirname, '../../innovateuk.py'),
                type: 'UK',
                outputFile: path.resolve(__dirname, '../../df_final_ukllm.xlsx'),
                timeout: 30 * 60 * 1000, // 30 minutes
                logFile: path.resolve(__dirname, '../../logs/uk_script_execution.log'),
                dependencies: ['selenium', 'pandas', 'openpyxl', 'requests']
            }
        };

        // Ensure logs directory exists
        this.ensureLogsDirectory();
    }

    /**
     * Ensure logs directory exists
     */
    ensureLogsDirectory() {
        const logsDir = path.resolve(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            logger.info('Created logs directory', { path: logsDir });
        }
    }

    /**
     * Execute EU analysis script
     */
    async executeEUScript(req, res) {
        try {
            const result = await this.executeScript('eu', req.user);
            ResponseHelper.success(res, result, 'EU analysis script execution started');
        } catch (error) {
            logger.error('Error executing EU script', { 
                error: error.message,
                userId: req.user?.id 
            });
            ResponseHelper.serverError(res, 'Failed to execute EU analysis script');
        }
    }

    /**
     * Execute UK analysis script
     */
    async executeUKScript(req, res) {
        try {
            const result = await this.executeScript('uk', req.user);
            ResponseHelper.success(res, result, 'UK analysis script execution started');
        } catch (error) {
            logger.error('Error executing UK script', { 
                error: error.message,
                userId: req.user?.id 
            });
            ResponseHelper.serverError(res, 'Failed to execute UK analysis script');
        }
    }

    /**
     * Execute a Python script
     */
    async executeScript(scriptType, user) {
        const script = this.scripts[scriptType];
        
        if (!script) {
            throw new Error(`Unknown script type: ${scriptType}`);
        }

        // Check if script is already running
        if (this.runningProcesses.has(scriptType)) {
            const process = this.runningProcesses.get(scriptType);
            return {
                status: 'already_running',
                scriptType: script.type,
                processId: process.pid,
                startTime: process.startTime,
                message: `${script.type} analysis is already running`
            };
        }

        // Check if script file exists
        if (!fs.existsSync(script.path)) {
            throw new Error(`Script file not found: ${script.path}`);
        }

        logger.info(`Starting ${script.type} analysis script`, {
            scriptPath: script.path,
            userId: user?.id,
            username: user?.username
        });

        // Start the Python process with proper encoding
        const pythonProcess = spawn('python', [script.path], {
            cwd: path.dirname(script.path),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        });

        const processInfo = {
            pid: pythonProcess.pid,
            startTime: new Date(),
            scriptType,
            user: user?.username || 'unknown',
            process: pythonProcess,
            output: [],
            errors: []
        };

        this.runningProcesses.set(scriptType, processInfo);

        // Handle process output
        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            processInfo.output.push(output);
            logger.debug(`${script.type} script output`, { output: output.trim() });
        });

        pythonProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            processInfo.errors.push(error);

            // Distinguish between actual errors and progress/info messages
            if (this.isProgressMessage(error)) {
                logger.info(`${script.type} script progress`, { progress: error });
            } else if (this.isWarningMessage(error)) {
                logger.warn(`${script.type} script warning`, { warning: error });
            } else {
                logger.error(`${script.type} script error`, { error: error });
            }
        });

        // Handle process completion
        pythonProcess.on('close', async (code) => {
            const endTime = new Date();
            const duration = endTime - processInfo.startTime;
            
            logger.info(`${script.type} script completed`, {
                exitCode: code,
                duration: `${duration}ms`,
                userId: user?.id
            });

            // Remove from running processes
            this.runningProcesses.delete(scriptType);

            // If successful, reload data into database
            if (code === 0) {
                try {
                    const dataLoader = new StartupDataLoader();
                    if (scriptType === 'eu') {
                        await dataLoader.loadEUOnly();
                    } else {
                        await dataLoader.loadUKOnly();
                    }
                    logger.info(`${script.type} data reloaded into database`);
                } catch (error) {
                    logger.error(`Failed to reload ${script.type} data`, { error: error.message });
                }
            }
        });

        // Set timeout
        setTimeout(() => {
            if (this.runningProcesses.has(scriptType)) {
                logger.warn(`${script.type} script timeout, killing process`, {
                    pid: pythonProcess.pid,
                    timeout: script.timeout
                });
                pythonProcess.kill('SIGTERM');
                this.runningProcesses.delete(scriptType);
            }
        }, script.timeout);

        return {
            status: 'started',
            scriptType: script.type,
            processId: pythonProcess.pid,
            startTime: processInfo.startTime,
            estimatedDuration: '15-30 minutes',
            message: `${script.type} analysis script started successfully`
        };
    }

    /**
     * Get execution status
     */
    async getExecutionStatus(req, res) {
        try {
            const status = {
                eu: this.getScriptStatus('eu'),
                uk: this.getScriptStatus('uk'),
                timestamp: new Date()
            };

            ResponseHelper.success(res, status, 'Script execution status retrieved');
        } catch (error) {
            logger.error('Error getting execution status', { error: error.message });
            ResponseHelper.serverError(res, 'Failed to get execution status');
        }
    }

    /**
     * Get status of a specific script
     */
    getScriptStatus(scriptType) {
        const script = this.scripts[scriptType];
        const processInfo = this.runningProcesses.get(scriptType);

        if (!processInfo) {
            return {
                status: 'idle',
                scriptType: script.type,
                lastOutputFile: fs.existsSync(script.outputFile) ? {
                    exists: true,
                    size: fs.statSync(script.outputFile).size,
                    modified: fs.statSync(script.outputFile).mtime
                } : { exists: false }
            };
        }

        const runningTime = new Date() - processInfo.startTime;
        
        return {
            status: 'running',
            scriptType: script.type,
            processId: processInfo.pid,
            startTime: processInfo.startTime,
            runningTime: `${Math.floor(runningTime / 1000)}s`,
            user: processInfo.user,
            recentOutput: processInfo.output.slice(-3), // Last 3 output lines
            recentErrors: processInfo.errors.slice(-3)  // Last 3 error lines
        };
    }

    /**
     * Stop a running script
     */
    async stopScript(req, res) {
        try {
            const { scriptType } = req.params;
            
            if (!this.scripts[scriptType]) {
                return ResponseHelper.badRequest(res, 'Invalid script type');
            }

            const processInfo = this.runningProcesses.get(scriptType);
            
            if (!processInfo) {
                return ResponseHelper.badRequest(res, `${scriptType.toUpperCase()} script is not running`);
            }

            // Kill the process
            processInfo.process.kill('SIGTERM');
            this.runningProcesses.delete(scriptType);

            logger.info(`${scriptType.toUpperCase()} script stopped by user`, {
                processId: processInfo.pid,
                userId: req.user?.id,
                username: req.user?.username
            });

            ResponseHelper.success(res, {
                status: 'stopped',
                scriptType: scriptType.toUpperCase(),
                processId: processInfo.pid,
                message: `${scriptType.toUpperCase()} script stopped successfully`
            }, 'Script stopped successfully');

        } catch (error) {
            logger.error('Error stopping script', { 
                error: error.message,
                scriptType: req.params.scriptType 
            });
            ResponseHelper.serverError(res, 'Failed to stop script');
        }
    }

    /**
     * Get script logs
     */
    async getScriptLogs(req, res) {
        try {
            const { scriptType } = req.params;

            if (!this.scripts[scriptType]) {
                return ResponseHelper.badRequest(res, 'Invalid script type');
            }

            const processInfo = this.runningProcesses.get(scriptType);

            if (!processInfo) {
                return ResponseHelper.success(res, {
                    status: 'not_running',
                    logs: [],
                    errors: []
                }, 'No running process found');
            }

            ResponseHelper.success(res, {
                status: 'running',
                scriptType: scriptType.toUpperCase(),
                processId: processInfo.pid,
                startTime: processInfo.startTime,
                logs: processInfo.output,
                errors: processInfo.errors
            }, 'Script logs retrieved');

        } catch (error) {
            logger.error('Error getting script logs', {
                error: error.message,
                scriptType: req.params.scriptType
            });
            ResponseHelper.serverError(res, 'Failed to get script logs');
        }
    }

    /**
     * Check if a message is a progress indicator
     */
    isProgressMessage(message) {
        const progressPatterns = [
            /\d+%\|.*\|\s*\d+\/\d+/,  // Progress bar: "15%|█▌| 15/100"
            /Checking each project/,   // tqdm progress messages
            /it\/s\]/,                 // iterations per second
            /\[\d+:\d+<\d+:\d+/,      // time estimates [01:09<06:22]
            /Created TensorFlow Lite/, // TensorFlow initialization
            /DevTools listening on/    // Chrome DevTools
        ];

        return progressPatterns.some(pattern => pattern.test(message));
    }

    /**
     * Check if a message is a warning (not an error)
     */
    isWarningMessage(message) {
        const warningPatterns = [
            /ERROR:google_apis\\gcm\\engine/, // Chrome GCM errors (not critical)
            /ERROR:.*registration_request/,   // Chrome registration errors
            /DEPRECATED_ENDPOINT/,            // API deprecation warnings
            /PHONE_REGISTRATION_ERROR/        // Chrome phone registration
        ];

        return warningPatterns.some(pattern => pattern.test(message));
    }
}

module.exports = new ScriptExecutionController();
