require('dotenv').config();
const StartupDataLoader = require('../utils/startupDataLoader');

/**
 * Manual Data Reload Script
 * Reload data from Excel files with correct paths
 */

async function reloadData() {
    try {
        console.log('🔄 Manual Data Reload');
        console.log('=====================================');
        console.log('This will clear existing data and reload from Excel files:');
        console.log('  EU: df_LLM_ALL_EU.xlsx');
        console.log('  UK: df_yes_avec_pertinence_et_resume_uk.xlsx');
        console.log('');
        
        const dataLoader = new StartupDataLoader();
        
        // Show current file status
        console.log('📋 Checking Excel files...');
        const fileInfo = dataLoader.getFileInfo();
        
        console.log(`   EU File: ${fileInfo.eu.fileName}`);
        console.log(`     Exists: ${fileInfo.eu.exists ? '✅' : '❌'}`);
        if (fileInfo.eu.exists) {
            console.log(`     Size: ${(fileInfo.eu.size / 1024).toFixed(2)} KB`);
        }
        
        console.log(`   UK File: ${fileInfo.uk.fileName}`);
        console.log(`     Exists: ${fileInfo.uk.exists ? '✅' : '❌'}`);
        if (fileInfo.uk.exists) {
            console.log(`     Size: ${(fileInfo.uk.size / 1024).toFixed(2)} KB`);
        }
        
        if (!fileInfo.eu.exists || !fileInfo.uk.exists) {
            console.log('');
            console.log('❌ Missing Excel files! Please ensure both files exist:');
            if (!fileInfo.eu.exists) console.log(`   Missing: ${fileInfo.eu.path}`);
            if (!fileInfo.uk.exists) console.log(`   Missing: ${fileInfo.uk.path}`);
            process.exit(1);
        }
        
        console.log('');
        
        // Reload data
        const result = await dataLoader.reloadData();
        
        console.log('✅ Data reload completed successfully!');
        console.log('');
        console.log('📊 Final Summary:');
        console.log(`   EU Projects: ${result.results.eu.loaded}`);
        console.log(`   UK Projects: ${result.results.uk.loaded}`);
        console.log(`   Total Projects: ${result.results.eu.loaded + result.results.uk.loaded}`);
        console.log(`   Execution Time: ${result.executionTime}ms`);
        
        // Show database status
        console.log('');
        console.log('🔍 Verifying database...');
        const status = await dataLoader.getStatus();
        console.log(`   EU projects in database: ${status.database.eu}`);
        console.log(`   UK projects in database: ${status.database.uk}`);
        console.log(`   Total projects in database: ${status.total}`);
        
        if (status.total > 0) {
            console.log('');
            console.log('🎉 Database successfully populated with fresh data!');
            console.log('');
            console.log('🚀 You can now test the API endpoints:');
            console.log('   GET /projects/eu     - View EU projects');
            console.log('   GET /projects/uk     - View UK projects');
            console.log('   GET /analysis/eu     - EU analysis results');
            console.log('   GET /analysis/uk     - UK analysis results');
        } else {
            console.log('');
            console.log('⚠️  Database is still empty. Check for errors above.');
        }
        
    } catch (error) {
        console.error('');
        console.error('❌ Data reload failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('1. Make sure the Excel files exist in the project root');
        console.error('2. Check file permissions');
        console.error('3. Verify database connection');
        console.error('4. Check the logs for more details');
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    reloadData();
}

module.exports = { reloadData };
