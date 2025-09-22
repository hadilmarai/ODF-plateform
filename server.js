const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odf_funding',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Global state for analysis status
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

// File paths configuration
const CONFIG = {
    notebooks: {
        eu: 'LLMODF.ipynb',
        uk: 'innovateuk.ipynb'
    },
    outputFiles: {
        eu: 'df_final_yes.xlsx',
        uk: 'df_final_ukllm.xlsx'
    },
    dataDir: 'data',
    logsDir: 'logs'
};

// Ensure directories exist
const ensureDirectories = () => {
    [CONFIG.dataDir, CONFIG.logsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Database initialization
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        
        // Create tables if they don't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS eu_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                url VARCHAR(1000) UNIQUE,
                status VARCHAR(100),
                start_date DATE,
                deadline DATE,
                pertinence VARCHAR(10),
                matching_words TEXT,
                pertinence_llm VARCHAR(10),
                resume_llm TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS uk_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                link VARCHAR(1000) UNIQUE,
                status VARCHAR(100),
                pertinence VARCHAR(10),
                matching_words TEXT,
                pertinence_llm VARCHAR(10),
                resume_llm TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS analysis_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                analysis_type ENUM('eu', 'uk', 'combined') NOT NULL,
                status ENUM('started', 'completed', 'error') NOT NULL,
                message TEXT,
                execution_time INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

// Utility function to read Excel files
const readExcelFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        return {
            success: true,
            data: data,
            count: data.length,
            columns: Object.keys(data[0] || {}),
            file: path.basename(filePath)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            file: path.basename(filePath)
        };
    }
};

// Function to save EU data to database
const saveEUDataToDatabase = async (data) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Clear existing data
        await connection.execute('DELETE FROM eu_projects');
        
        // Insert new data
        const insertQuery = `
            INSERT INTO eu_projects (title, url, status, start_date, deadline, pertinence, matching_words, pertinence_llm, resume_llm)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            status = VALUES(status),
            start_date = VALUES(start_date),
            deadline = VALUES(deadline),
            pertinence = VALUES(pertinence),
            matching_words = VALUES(matching_words),
            pertinence_llm = VALUES(pertinence_llm),
            resume_llm = VALUES(resume_llm),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        for (const row of data) {
            await connection.execute(insertQuery, [
                row.Title || row.title || '',
                row.URL || row.url || '',
                row.Status || row.status || '',
                row.Start_date || row.start_date || null,
                row.Deadline || row.deadline || null,
                row.Pertinence || row.pertinence || '',
                row['Matching Word(s)'] || row.matching_words || '',
                row['Pertinence LLM'] || row.pertinence_llm || '',
                row['Résumé LLM'] || row.resume_llm || ''
            ]);
        }
        
        await connection.commit();
        console.log(`✅ Saved ${data.length} EU projects to database`);
        return { success: true, count: data.length };
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error saving EU data:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Function to save UK data to database
const saveUKDataToDatabase = async (data) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Clear existing data
        await connection.execute('DELETE FROM uk_projects');
        
        // Insert new data
        const insertQuery = `
            INSERT INTO uk_projects (title, link, status, pertinence, matching_words, pertinence_llm, resume_llm)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            status = VALUES(status),
            pertinence = VALUES(pertinence),
            matching_words = VALUES(matching_words),
            pertinence_llm = VALUES(pertinence_llm),
            resume_llm = VALUES(resume_llm),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        for (const row of data) {
            await connection.execute(insertQuery, [
                row.Titre || row.title || '',
                row.Lien || row.link || '',
                row.Status || row.status || '',
                row.Pertinence || row.pertinence || '',
                row['Matching Word(s)'] || row.matching_words || '',
                row['Pertinence LLM'] || row.pertinence_llm || '',
                row['Résumé LLM'] || row.resume_llm || ''
            ]);
        }
        
        await connection.commit();
        console.log(`✅ Saved ${data.length} UK projects to database`);
        return { success: true, count: data.length };
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error saving UK data:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Function to execute Jupyter notebooks
const executeNotebook = async (notebookPath, analysisType) => {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Starting ${analysisType} analysis: ${notebookPath}`);
        analysisState[`${analysisType}Analysis`].status = 'running';
        
        const startTime = Date.now();
        const pythonProcess = spawn('python', ['-m', 'jupyter', 'nbconvert', '--execute', '--to', 'notebook', '--inplace', notebookPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            const executionTime = Date.now() - startTime;
            
            if (code === 0) {
                console.log(`✅ ${analysisType} notebook executed successfully`);
                analysisState[`${analysisType}Analysis`].status = 'completed';
                resolve({ success: true, executionTime, stdout });
            } else {
                console.error(`❌ ${analysisType} notebook execution failed with code ${code}`);
                console.error('Error output:', stderr);
                analysisState[`${analysisType}Analysis`].status = 'error';
                analysisState[`${analysisType}Analysis`].error = stderr;
                reject({ success: false, error: stderr, code, executionTime });
            }
        });
        
        pythonProcess.on('error', (error) => {
            console.error(`❌ Failed to start ${analysisType} notebook:`, error);
            analysisState[`${analysisType}Analysis`].status = 'error';
            analysisState[`${analysisType}Analysis`].error = error.message;
            reject({ success: false, error: error.message });
        });
    });
};

// API Routes

// Home endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'ODF EU & UK Funding Analysis API',
        version: '2.0.0',
        description: 'Unified Node.js API for EU and UK funding opportunities analysis',
        endpoints: {
            '/status': 'GET - Current analysis status',
            '/analysis/eu': 'GET - EU analysis results',
            '/analysis/uk': 'GET - UK analysis results',
            '/analysis/combined': 'GET - Combined analysis results',
            '/trigger': 'POST - Trigger full analysis',
            '/trigger/eu': 'POST - Trigger EU analysis only',
            '/trigger/uk': 'POST - Trigger UK analysis only',
            '/projects/eu': 'GET - EU projects from database',
            '/projects/uk': 'GET - UK projects from database',
            '/upload': 'POST - Upload Excel files manually',
            '/health': 'GET - Health check'
        },
        lastUpdate: analysisState.lastUpdate,
        status: analysisState.status
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        overallStatus: analysisState.status,
        lastUpdate: analysisState.lastUpdate,
        isRunning: analysisState.isRunning,
        errorMessage: analysisState.errorMessage,
        nextScheduledRun: 'Every 24 hours',
        euAnalysis: analysisState.euAnalysis,
        ukAnalysis: analysisState.ukAnalysis
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        notebooksAvailable: {
            eu: fs.existsSync(CONFIG.notebooks.eu),
            uk: fs.existsSync(CONFIG.notebooks.uk)
        },
        outputFilesAvailable: {
            eu: fs.existsSync(CONFIG.outputFiles.eu),
            uk: fs.existsSync(CONFIG.outputFiles.uk)
        }
    });
});

// EU Analysis endpoint
app.get('/analysis/eu', async (req, res) => {
    try {
        const fileResult = readExcelFile(CONFIG.outputFiles.eu);

        if (!fileResult.success) {
            return res.status(404).json({
                error: 'No EU analysis data available',
                details: fileResult.error
            });
        }

        // Get database statistics
        const connection = await pool.getConnection();
        const [dbStats] = await connection.execute(`
            SELECT
                COUNT(*) as total_projects,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects
            FROM eu_projects
        `);
        connection.release();

        res.json({
            analysisType: 'EU Funding Opportunities',
            status: analysisState.euAnalysis.status,
            lastUpdate: analysisState.lastUpdate,
            statistics: {
                projectsCount: dbStats[0]?.total_projects || 0,
                relevantCount: dbStats[0]?.relevant_projects || 0,
                llmAnalyzedCount: dbStats[0]?.llm_approved_projects || 0
            },
            fileData: {
                count: fileResult.count,
                columns: fileResult.columns,
                file: fileResult.file
            },
            results: fileResult.data
        });
    } catch (error) {
        console.error('Error in EU analysis endpoint:', error);
        res.status(500).json({
            error: 'Error loading EU analysis',
            details: error.message
        });
    }
});

// UK Analysis endpoint
app.get('/analysis/uk', async (req, res) => {
    try {
        const fileResult = readExcelFile(CONFIG.outputFiles.uk);

        if (!fileResult.success) {
            return res.status(404).json({
                error: 'No UK analysis data available',
                details: fileResult.error
            });
        }

        // Get database statistics
        const connection = await pool.getConnection();
        const [dbStats] = await connection.execute(`
            SELECT
                COUNT(*) as total_projects,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects
            FROM uk_projects
        `);
        connection.release();

        res.json({
            analysisType: 'UK Funding Opportunities',
            status: analysisState.ukAnalysis.status,
            lastUpdate: analysisState.lastUpdate,
            statistics: {
                projectsCount: dbStats[0]?.total_projects || 0,
                relevantCount: dbStats[0]?.relevant_projects || 0,
                llmAnalyzedCount: dbStats[0]?.llm_approved_projects || 0
            },
            fileData: {
                count: fileResult.count,
                columns: fileResult.columns,
                file: fileResult.file
            },
            results: fileResult.data
        });
    } catch (error) {
        console.error('Error in UK analysis endpoint:', error);
        res.status(500).json({
            error: 'Error loading UK analysis',
            details: error.message
        });
    }
});

ensureDirectories();
