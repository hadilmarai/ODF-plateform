const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Database Setup Script
 * Creates the database and all required tables if they don't exist
 */

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
};

const databaseName = process.env.DB_NAME || 'odf_funding';

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🔧 Starting database setup...');
        
        // Connect to MySQL server (without specifying database)
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL server');
        
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        console.log(`✅ Database '${databaseName}' created or already exists`);

        // Use the database
        await connection.query(`USE \`${databaseName}\``);
        console.log(`✅ Using database '${databaseName}'`);
        
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add indexes separately
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_username ON users (username)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_email ON users (email)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_role ON users (role)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_active ON users (is_active)`);
        console.log('✅ Users table created or already exists');
        
        // Create api_keys table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                key_name VARCHAR(100) NOT NULL,
                api_key VARCHAR(64) UNIQUE NOT NULL,
                permissions JSON,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NULL,
                last_used TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add foreign key and indexes separately
        try {
            await connection.query(`ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
        } catch (error) {
            // Foreign key might already exist, ignore error
            if (!error.message.includes('Duplicate key name')) {
                console.log('   Note: Foreign key constraint may already exist');
            }
        }

        await connection.query(`CREATE INDEX IF NOT EXISTS idx_api_key ON api_keys (api_key)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_user_id ON api_keys (user_id)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_active ON api_keys (is_active)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_expires ON api_keys (expires_at)`);
        console.log('✅ API keys table created or already exists');
        
        // Create eu_projects table
        await connection.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add indexes separately
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_title ON eu_projects (title(100))`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_url ON eu_projects (url(100))`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_status ON eu_projects (status)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_pertinence ON eu_projects (pertinence)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_pertinence_llm ON eu_projects (pertinence_llm)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_start_date ON eu_projects (start_date)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_deadline ON eu_projects (deadline)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_created_at ON eu_projects (created_at)`);

        // Add fulltext index separately
        try {
            await connection.query(`CREATE FULLTEXT INDEX idx_search ON eu_projects (title, matching_words, resume_llm)`);
        } catch (error) {
            if (!error.message.includes('Duplicate key name')) {
                console.log('   Note: Fulltext index may already exist for eu_projects');
            }
        }
        console.log('✅ EU projects table created or already exists');
        
        // Create uk_projects table
        await connection.query(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add indexes separately
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_title ON uk_projects (title(100))`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_link ON uk_projects (link(100))`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_status ON uk_projects (status)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_pertinence ON uk_projects (pertinence)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_pertinence_llm ON uk_projects (pertinence_llm)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_created_at ON uk_projects (created_at)`);

        // Add fulltext index separately
        try {
            await connection.query(`CREATE FULLTEXT INDEX idx_search ON uk_projects (title, matching_words, resume_llm)`);
        } catch (error) {
            if (!error.message.includes('Duplicate key name')) {
                console.log('   Note: Fulltext index may already exist for uk_projects');
            }
        }
        console.log('✅ UK projects table created or already exists');
        
        // Create analysis_logs table
        await connection.query(`
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add indexes separately
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis_logs (analysis_type)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_status ON analysis_logs (status)`);
        await connection.query(`CREATE INDEX IF NOT EXISTS idx_created_at ON analysis_logs (created_at)`);
        console.log('✅ Analysis logs table created or already exists');
        
        // Create default admin user if no users exist
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (users[0].count === 0) {
            const bcrypt = require('bcryptjs');
            const adminPassword = 'admin123'; // Change this in production!
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            await connection.query(`
                INSERT INTO users (username, email, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, ['admin', 'admin@odf-api.com', hashedPassword, 'admin', true]);
            
            console.log('✅ Default admin user created');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   ⚠️  IMPORTANT: Change the admin password after first login!');
        }
        
        console.log('🎉 Database setup completed successfully!');
        console.log('');
        console.log('📊 Database Summary:');
        console.log(`   Database: ${databaseName}`);
        console.log('   Tables: users, api_keys, eu_projects, uk_projects, analysis_logs');
        console.log('   Indexes: Optimized for search and filtering');
        console.log('   Default admin user: admin / admin123');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
