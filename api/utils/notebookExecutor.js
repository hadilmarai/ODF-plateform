const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/app');

/**
 * Jupyter Notebook Executor
 */
class NotebookExecutor {
    /**
     * Execute a Jupyter notebook
     * @param {string} notebookPath - Path to notebook file
     * @param {string} analysisType - Type of analysis ('eu' or 'uk')
     * @param {Object} options - Execution options
     * @returns {Promise} - Execution result
     */
    static executeNotebook(notebookPath, analysisType, options = {}) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Validate notebook exists
            if (!fs.existsSync(notebookPath)) {
                return reject({
                    success: false,
                    error: `Notebook file not found: ${notebookPath}`,
                    analysisType
                });
            }

            console.log(`🚀 Starting ${analysisType} analysis: ${notebookPath}`);
            
            // Prepare execution command
            const command = 'python';
            const args = [
                '-m', 'jupyter', 'nbconvert',
                '--execute',
                '--to', 'notebook',
                '--inplace',
                notebookPath
            ];

            // Add timeout if specified
            if (options.timeout) {
                args.push('--ExecutePreprocessor.timeout=' + Math.floor(options.timeout / 1000));
            }

            const pythonProcess = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.dirname(notebookPath),
                env: { ...process.env, ...options.env }
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                // Log progress if verbose
                if (options.verbose) {
                    console.log(`[${analysisType}] ${output.trim()}`);
                }
            });
            
            pythonProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                
                // Log errors
                console.error(`[${analysisType}] ERROR: ${output.trim()}`);
            });
            
            pythonProcess.on('close', (code) => {
                const executionTime = Date.now() - startTime;
                
                if (code === 0) {
                    console.log(`✅ ${analysisType} notebook executed successfully (${executionTime}ms)`);
                    resolve({
                        success: true,
                        executionTime,
                        stdout,
                        stderr,
                        analysisType,
                        notebookPath
                    });
                } else {
                    console.error(`❌ ${analysisType} notebook execution failed with code ${code}`);
                    reject({
                        success: false,
                        error: stderr || `Process exited with code ${code}`,
                        code,
                        executionTime,
                        stdout,
                        stderr,
                        analysisType,
                        notebookPath
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                const executionTime = Date.now() - startTime;
                console.error(`❌ Failed to start ${analysisType} notebook:`, error);
                reject({
                    success: false,
                    error: error.message,
                    executionTime,
                    analysisType,
                    notebookPath
                });
            });

            // Handle timeout
            if (options.timeout) {
                setTimeout(() => {
                    pythonProcess.kill('SIGTERM');
                    reject({
                        success: false,
                        error: `Notebook execution timed out after ${options.timeout}ms`,
                        timeout: true,
                        analysisType,
                        notebookPath
                    });
                }, options.timeout);
            }
        });
    }

    /**
     * Execute multiple notebooks in sequence
     * @param {Array} notebooks - Array of notebook configurations
     * @param {Object} options - Execution options
     * @returns {Promise} - Execution results
     */
    static async executeNotebooks(notebooks, options = {}) {
        const results = [];
        
        for (const notebook of notebooks) {
            try {
                const result = await this.executeNotebook(
                    notebook.path,
                    notebook.type,
                    { ...options, ...notebook.options }
                );
                results.push(result);
            } catch (error) {
                results.push(error);
                
                // Stop on first error if specified
                if (options.stopOnError) {
                    break;
                }
            }
        }
        
        return results;
    }

    /**
     * Execute notebooks in parallel
     * @param {Array} notebooks - Array of notebook configurations
     * @param {Object} options - Execution options
     * @returns {Promise} - Execution results
     */
    static async executeNotebooksParallel(notebooks, options = {}) {
        const promises = notebooks.map(notebook =>
            this.executeNotebook(
                notebook.path,
                notebook.type,
                { ...options, ...notebook.options }
            ).catch(error => error) // Don't let one failure stop others
        );
        
        return Promise.all(promises);
    }

    /**
     * Check if Jupyter is available
     * @returns {Promise<boolean>} - True if Jupyter is available
     */
    static checkJupyterAvailability() {
        return new Promise((resolve) => {
            const process = spawn('jupyter', ['--version'], {
                stdio: 'pipe'
            });
            
            process.on('close', (code) => {
                resolve(code === 0);
            });
            
            process.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Check if Python is available
     * @returns {Promise<boolean>} - True if Python is available
     */
    static checkPythonAvailability() {
        return new Promise((resolve) => {
            const process = spawn('python', ['--version'], {
                stdio: 'pipe'
            });
            
            process.on('close', (code) => {
                resolve(code === 0);
            });
            
            process.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Get system requirements status
     * @returns {Promise<Object>} - System requirements status
     */
    static async getSystemStatus() {
        const [pythonAvailable, jupyterAvailable] = await Promise.all([
            this.checkPythonAvailability(),
            this.checkJupyterAvailability()
        ]);

        return {
            python: pythonAvailable,
            jupyter: jupyterAvailable,
            ready: pythonAvailable && jupyterAvailable,
            notebooks: {
                eu: fs.existsSync(config.paths.notebooks.eu),
                uk: fs.existsSync(config.paths.notebooks.uk)
            }
        };
    }

    /**
     * Validate notebook file
     * @param {string} notebookPath - Path to notebook
     * @returns {Object} - Validation result
     */
    static validateNotebook(notebookPath) {
        try {
            if (!fs.existsSync(notebookPath)) {
                return {
                    valid: false,
                    error: 'Notebook file not found',
                    path: notebookPath
                };
            }

            const stats = fs.statSync(notebookPath);
            if (!stats.isFile()) {
                return {
                    valid: false,
                    error: 'Path is not a file',
                    path: notebookPath
                };
            }

            // Check if it's a valid JSON file (basic notebook validation)
            const content = fs.readFileSync(notebookPath, 'utf8');
            const notebook = JSON.parse(content);

            if (!notebook.cells || !Array.isArray(notebook.cells)) {
                return {
                    valid: false,
                    error: 'Invalid notebook format: missing cells',
                    path: notebookPath
                };
            }

            return {
                valid: true,
                path: notebookPath,
                cellCount: notebook.cells.length,
                nbformat: notebook.nbformat,
                kernelspec: notebook.metadata?.kernelspec,
                lastModified: stats.mtime
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                path: notebookPath
            };
        }
    }

    /**
     * Get notebook execution history
     * @param {string} analysisType - Type of analysis
     * @param {number} limit - Number of records to return
     * @returns {Array} - Execution history
     */
    static getExecutionHistory(analysisType, limit = 10) {
        // This would typically come from database
        // For now, return empty array
        return [];
    }

    /**
     * Clean up temporary files
     * @param {string} notebookPath - Path to notebook
     * @returns {boolean} - Success status
     */
    static cleanupTempFiles(notebookPath) {
        try {
            const dir = path.dirname(notebookPath);
            const tempFiles = [
                path.join(dir, '.ipynb_checkpoints'),
                path.join(dir, '__pycache__')
            ];

            tempFiles.forEach(tempPath => {
                if (fs.existsSync(tempPath)) {
                    fs.rmSync(tempPath, { recursive: true, force: true });
                }
            });

            return true;
        } catch (error) {
            console.error('Error cleaning up temp files:', error);
            return false;
        }
    }
}

module.exports = NotebookExecutor;
