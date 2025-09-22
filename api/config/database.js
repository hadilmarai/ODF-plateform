const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odf_funding',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    // MySQL2 valid options only
    acquireTimeout: 60000,  // This is valid for pool
    idleTimeout: 600000,    // 10 minutes
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database initialization function
const initializeDatabase = async () => {
    try {
        // First, try to run the database setup script to ensure database exists
        try {
            const { setupDatabase } = require('../scripts/setup-database-simple');
            await setupDatabase();
        } catch (setupError) {
            // If setup script fails, try to connect anyway (database might already exist)
            console.log('⚠️  Setup script failed, trying direct connection...');
        }

        const connection = await pool.getConnection();
        console.log('🔗 Connected to MySQL database');
        
        // Create EU projects table
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_pertinence (pertinence),
                INDEX idx_pertinence_llm (pertinence_llm),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `);

        // Create UK projects table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS uk_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                url VARCHAR(1000) UNIQUE,
                status VARCHAR(100),
                pertinence VARCHAR(10),
                matching_words TEXT,
                pertinence_llm VARCHAR(10),
                resume_llm TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_pertinence (pertinence),
                INDEX idx_pertinence_llm (pertinence_llm),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `);

        // Create analysis logs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS analysis_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                analysis_type ENUM('eu', 'uk', 'combined') NOT NULL,
                status ENUM('started', 'completed', 'error') NOT NULL,
                message TEXT,
                execution_time INT,
                projects_processed INT DEFAULT 0,
                relevant_projects INT DEFAULT 0,
                llm_analyzed INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_analysis_type (analysis_type),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `);

        // Create users table for authentication
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_email (email),
                INDEX idx_role (role)
            )
        `);

        // Create API keys table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                key_name VARCHAR(100) NOT NULL,
                api_key VARCHAR(255) UNIQUE NOT NULL,
                user_id INT,
                permissions JSON,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NULL,
                last_used TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_api_key (api_key),
                INDEX idx_user_id (user_id),
                INDEX idx_is_active (is_active)
            )
        `);

        connection.release();
        console.log('✅ Database tables initialized successfully');
        
        return true;
    } catch (error) {
        // Provide specific error messages for common issues
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('❌ Database does not exist!');
            console.error('');
            console.error('🔧 To fix this, run one of the following commands:');
            console.error('   npm run setup:db');
            console.error('   or');
            console.error('   node scripts/setup-database.js');
            console.error('');
            console.error('This will create the database and all required tables.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('❌ Database access denied!');
            console.error('');
            console.error('🔧 Please check your database credentials in .env file:');
            console.error('   DB_HOST, DB_USER, DB_PASSWORD');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to MySQL server!');
            console.error('');
            console.error('🔧 Please ensure MySQL server is running and accessible.');
        } else {
            console.error('❌ Database initialization failed:', error.message);
        }

        throw error;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

// Get database statistics
const getDatabaseStats = async () => {
    try {
        const connection = await pool.getConnection();
        
        const [euStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects
            FROM eu_projects
        `);
        
        const [ukStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE WHEN pertinence = 'Yes' THEN 1 ELSE 0 END) as relevant_projects,
                SUM(CASE WHEN pertinence_llm = 'Yes' THEN 1 ELSE 0 END) as llm_approved_projects
            FROM uk_projects
        `);
        
        const [recentLogs] = await connection.execute(`
            SELECT analysis_type, status, created_at, execution_time
            FROM analysis_logs 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        connection.release();
        
        return {
            eu: euStats[0] || { total_projects: 0, relevant_projects: 0, llm_approved_projects: 0 },
            uk: ukStats[0] || { total_projects: 0, relevant_projects: 0, llm_approved_projects: 0 },
            recentLogs: recentLogs || []
        };
    } catch (error) {
        console.error('❌ Error getting database stats:', error);
        throw error;
    }
};

// Close database connection
const closeConnection = async () => {
    try {
        await pool.end();
        console.log('🔌 Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
};

module.exports = {
    pool,
    initializeDatabase,
    testConnection,
    getDatabaseStats,
    closeConnection,
    dbConfig
};
