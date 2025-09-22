const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Simplified Database Setup Script
 * Handles MySQL prepared statement limitations
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
        
        // Close connection and reconnect to the specific database
        await connection.end();
        
        // Reconnect with the database specified
        connection = await mysql.createConnection({
            ...dbConfig,
            database: databaseName
        });
        console.log(`✅ Connected to database '${databaseName}'`);
        
        // Create tables one by one
        console.log('📋 Creating tables...');
        
        // Users table
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
        console.log('✅ Users table created');
        
        // API Keys table
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
        console.log('✅ API keys table created');
        
        // EU Projects table
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
        console.log('✅ EU projects table created');
        
        // UK Projects table
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
        console.log('✅ UK projects table created');
        
        // Analysis Logs table
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
        console.log('✅ Analysis logs table created');
        
        // Add indexes (ignore errors if they already exist)
        console.log('📋 Adding indexes...');
        
        const indexes = [
            // Users indexes
            'CREATE INDEX idx_username ON users (username)',
            'CREATE INDEX idx_email ON users (email)',
            'CREATE INDEX idx_role ON users (role)',
            'CREATE INDEX idx_active ON users (is_active)',
            
            // API Keys indexes
            'CREATE INDEX idx_api_key ON api_keys (api_key)',
            'CREATE INDEX idx_user_id ON api_keys (user_id)',
            'CREATE INDEX idx_api_active ON api_keys (is_active)',
            'CREATE INDEX idx_expires ON api_keys (expires_at)',
            
            // EU Projects indexes
            'CREATE INDEX idx_eu_title ON eu_projects (title(100))',
            'CREATE INDEX idx_eu_url ON eu_projects (url(100))',
            'CREATE INDEX idx_eu_status ON eu_projects (status)',
            'CREATE INDEX idx_eu_pertinence ON eu_projects (pertinence)',
            'CREATE INDEX idx_eu_pertinence_llm ON eu_projects (pertinence_llm)',
            'CREATE INDEX idx_eu_start_date ON eu_projects (start_date)',
            'CREATE INDEX idx_eu_deadline ON eu_projects (deadline)',
            'CREATE INDEX idx_eu_created_at ON eu_projects (created_at)',
            
            // UK Projects indexes
            'CREATE INDEX idx_uk_title ON uk_projects (title(100))',
            'CREATE INDEX idx_uk_link ON uk_projects (link(100))',
            'CREATE INDEX idx_uk_status ON uk_projects (status)',
            'CREATE INDEX idx_uk_pertinence ON uk_projects (pertinence)',
            'CREATE INDEX idx_uk_pertinence_llm ON uk_projects (pertinence_llm)',
            'CREATE INDEX idx_uk_created_at ON uk_projects (created_at)',
            
            // Analysis Logs indexes
            'CREATE INDEX idx_analysis_type ON analysis_logs (analysis_type)',
            'CREATE INDEX idx_log_status ON analysis_logs (status)',
            'CREATE INDEX idx_log_created_at ON analysis_logs (created_at)'
        ];
        
        for (const indexQuery of indexes) {
            try {
                await connection.query(indexQuery);
            } catch (error) {
                // Ignore duplicate key errors
                if (!error.message.includes('Duplicate key name')) {
                    console.log(`   Warning: ${error.message}`);
                }
            }
        }
        console.log('✅ Indexes added');
        
        // Add foreign key constraints
        console.log('📋 Adding foreign key constraints...');
        try {
            await connection.query(`
                ALTER TABLE api_keys 
                ADD CONSTRAINT fk_api_keys_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            `);
        } catch (error) {
            if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
                console.log(`   Warning: ${error.message}`);
            }
        }
        console.log('✅ Foreign key constraints added');
        
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
        } else {
            console.log('ℹ️  Admin user already exists, skipping creation');
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
        console.error('');
        console.error('🔧 Troubleshooting tips:');
        console.error('1. Make sure MySQL server is running');
        console.error('2. Check your database credentials in .env file');
        console.error('3. Ensure the MySQL user has CREATE DATABASE privileges');
        console.error('4. Try connecting manually: mysql -u root -p');
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
