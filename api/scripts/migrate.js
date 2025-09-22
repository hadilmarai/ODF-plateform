const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Simple Database Migration System
 */

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odf_funding',
    port: process.env.DB_PORT || 3306
};

const migrationsDir = path.join(__dirname, '..', 'migrations');

class MigrationRunner {
    constructor() {
        this.connection = null;
    }

    async connect() {
        this.connection = await mysql.createConnection(dbConfig);
        
        // Create migrations table if it doesn't exist
        await this.connection.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.end();
        }
    }

    async getExecutedMigrations() {
        const [rows] = await this.connection.execute(
            'SELECT filename FROM migrations ORDER BY executed_at'
        );
        return rows.map(row => row.filename);
    }

    async getPendingMigrations() {
        // Ensure migrations directory exists
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir, { recursive: true });
            console.log(`📁 Created migrations directory: ${migrationsDir}`);
            return [];
        }

        const allMigrations = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        const executedMigrations = await this.getExecutedMigrations();
        
        return allMigrations.filter(migration => !executedMigrations.includes(migration));
    }

    async executeMigration(filename) {
        const filePath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split SQL by semicolons and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            await this.connection.execute(statement);
        }
        
        // Record migration as executed
        await this.connection.execute(
            'INSERT INTO migrations (filename) VALUES (?)',
            [filename]
        );
        
        console.log(`✅ Executed migration: ${filename}`);
    }

    async runMigrations() {
        try {
            await this.connect();
            console.log('🔄 Checking for pending migrations...');
            
            const pendingMigrations = await this.getPendingMigrations();
            
            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations found');
                return;
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
            pendingMigrations.forEach(migration => {
                console.log(`   - ${migration}`);
            });
            
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            
            console.log('🎉 All migrations completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    async createMigration(name) {
        // Ensure migrations directory exists
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
        const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
        const filePath = path.join(migrationsDir, filename);
        
        const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL statements here
-- Example:
-- ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Remember to end each statement with a semicolon
`;
        
        fs.writeFileSync(filePath, template);
        console.log(`📝 Created migration file: ${filename}`);
        console.log(`   Path: ${filePath}`);
        
        return filename;
    }

    async rollbackLastMigration() {
        try {
            await this.connect();
            
            const [lastMigration] = await this.connection.execute(
                'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
            );
            
            if (lastMigration.length === 0) {
                console.log('ℹ️  No migrations to rollback');
                return;
            }
            
            const filename = lastMigration[0].filename;
            console.log(`⚠️  Rolling back migration: ${filename}`);
            
            // Check if rollback file exists
            const rollbackFile = filename.replace('.sql', '_rollback.sql');
            const rollbackPath = path.join(migrationsDir, rollbackFile);
            
            if (!fs.existsSync(rollbackPath)) {
                console.error(`❌ Rollback file not found: ${rollbackFile}`);
                console.error('   Create a rollback file with the reverse operations');
                return;
            }
            
            const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
            const statements = rollbackSql.split(';').filter(stmt => stmt.trim().length > 0);
            
            for (const statement of statements) {
                await this.connection.execute(statement);
            }
            
            // Remove migration record
            await this.connection.execute(
                'DELETE FROM migrations WHERE filename = ?',
                [filename]
            );
            
            console.log(`✅ Rolled back migration: ${filename}`);
            
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    async showStatus() {
        try {
            await this.connect();
            
            const executedMigrations = await this.getExecutedMigrations();
            const pendingMigrations = await this.getPendingMigrations();
            
            console.log('📊 Migration Status:');
            console.log(`   Executed: ${executedMigrations.length}`);
            console.log(`   Pending: ${pendingMigrations.length}`);
            
            if (executedMigrations.length > 0) {
                console.log('\n✅ Executed Migrations:');
                executedMigrations.forEach(migration => {
                    console.log(`   - ${migration}`);
                });
            }
            
            if (pendingMigrations.length > 0) {
                console.log('\n⏳ Pending Migrations:');
                pendingMigrations.forEach(migration => {
                    console.log(`   - ${migration}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to get migration status:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const migrationRunner = new MigrationRunner();
    
    try {
        switch (command) {
            case 'run':
                await migrationRunner.runMigrations();
                break;
                
            case 'create':
                const name = args[1];
                if (!name) {
                    console.error('❌ Please provide a migration name');
                    console.error('   Usage: npm run migrate create "add_new_column"');
                    process.exit(1);
                }
                await migrationRunner.createMigration(name);
                break;
                
            case 'rollback':
                await migrationRunner.rollbackLastMigration();
                break;
                
            case 'status':
                await migrationRunner.showStatus();
                break;
                
            default:
                console.log('🔧 Database Migration Tool');
                console.log('');
                console.log('Available commands:');
                console.log('  run      - Execute pending migrations');
                console.log('  create   - Create a new migration file');
                console.log('  rollback - Rollback the last migration');
                console.log('  status   - Show migration status');
                console.log('');
                console.log('Usage examples:');
                console.log('  npm run migrate run');
                console.log('  npm run migrate create "add_user_preferences"');
                console.log('  npm run migrate status');
                break;
        }
    } catch (error) {
        console.error('❌ Migration command failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MigrationRunner };
