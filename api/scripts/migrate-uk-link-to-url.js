require('dotenv').config();
const { pool } = require('../config/database');

/**
 * Migration Script: Change UK projects 'link' column to 'url'
 * This makes UK projects consistent with EU projects structure
 */

async function migrateUKLinkToUrl() {
    try {
        console.log('🔄 Migrating UK projects table: link → url');
        console.log('=====================================');
        
        const connection = await pool.getConnection();
        
        // Check if the column already exists as 'url'
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'uk_projects'
            AND COLUMN_NAME IN ('link', 'url')
        `);
        
        const hasLink = columns.some(col => col.COLUMN_NAME === 'link');
        const hasUrl = columns.some(col => col.COLUMN_NAME === 'url');
        
        console.log(`Current columns: link=${hasLink}, url=${hasUrl}`);
        
        if (hasUrl && !hasLink) {
            console.log('✅ Migration already completed - url column exists');
            connection.release();
            return;
        }
        
        if (hasLink && !hasUrl) {
            console.log('📋 Step 1: Adding url column...');
            await connection.execute(`
                ALTER TABLE uk_projects 
                ADD COLUMN url VARCHAR(1000) UNIQUE AFTER title
            `);
            console.log('✅ Added url column');
            
            console.log('📋 Step 2: Copying data from link to url...');
            await connection.execute(`
                UPDATE uk_projects 
                SET url = link
            `);
            console.log('✅ Copied data from link to url');
            
            console.log('📋 Step 3: Dropping link column...');
            await connection.execute(`
                ALTER TABLE uk_projects 
                DROP COLUMN link
            `);
            console.log('✅ Dropped link column');
            
        } else if (hasLink && hasUrl) {
            console.log('⚠️  Both columns exist - copying link to url and dropping link...');
            await connection.execute(`
                UPDATE uk_projects 
                SET url = COALESCE(url, link)
            `);
            await connection.execute(`
                ALTER TABLE uk_projects 
                DROP COLUMN link
            `);
            console.log('✅ Cleaned up duplicate columns');
        }
        
        // Verify the final structure
        const [finalColumns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'uk_projects'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('');
        console.log('📊 Final UK projects table structure:');
        console.log('┌─────────────────┬─────────────┬─────────────┬─────────────┐');
        console.log('│ Column          │ Type        │ Nullable    │ Key         │');
        console.log('├─────────────────┼─────────────┼─────────────┼─────────────┤');
        
        finalColumns.forEach(col => {
            const column = col.COLUMN_NAME.padEnd(15);
            const type = col.DATA_TYPE.padEnd(11);
            const nullable = col.IS_NULLABLE.padEnd(11);
            const key = (col.COLUMN_KEY || '').padEnd(11);
            console.log(`│ ${column} │ ${type} │ ${nullable} │ ${key} │`);
        });
        
        console.log('└─────────────────┴─────────────┴─────────────┴─────────────┘');
        
        connection.release();
        
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('1. Update UK project model to use "url" field');
        console.log('2. Reload data to ensure consistency');
        console.log('3. Test API endpoints');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('1. Make sure database is running');
        console.error('2. Check database permissions');
        console.error('3. Verify table exists');
        
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    migrateUKLinkToUrl()
        .then(() => {
            console.log('🎉 Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { migrateUKLinkToUrl };
