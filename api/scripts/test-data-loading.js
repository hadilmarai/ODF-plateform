require('dotenv').config();
const StartupDataLoader = require('../utils/startupDataLoader');

/**
 * Test Data Loading Script
 * Test the automatic data loading functionality
 */

async function testDataLoading() {
    try {
        console.log('🧪 Testing Data Loading Functionality');
        console.log('=====================================');
        
        const dataLoader = new StartupDataLoader();
        
        // 1. Check file status
        console.log('📋 Step 1: Checking Excel files...');
        const fileInfo = dataLoader.getFileInfo();
        
        console.log('   EU File:');
        console.log(`     Path: ${fileInfo.eu.path}`);
        console.log(`     Exists: ${fileInfo.eu.exists ? '✅' : '❌'}`);
        if (fileInfo.eu.exists) {
            console.log(`     Size: ${(fileInfo.eu.size / 1024).toFixed(2)} KB`);
            console.log(`     Modified: ${fileInfo.eu.modified}`);
        }
        
        console.log('   UK File:');
        console.log(`     Path: ${fileInfo.uk.path}`);
        console.log(`     Exists: ${fileInfo.uk.exists ? '✅' : '❌'}`);
        if (fileInfo.uk.exists) {
            console.log(`     Size: ${(fileInfo.uk.size / 1024).toFixed(2)} KB`);
            console.log(`     Modified: ${fileInfo.uk.modified}`);
        }
        
        // 2. Check current database status
        console.log('\n📋 Step 2: Checking database status...');
        const status = await dataLoader.getStatus();
        console.log(`   Current EU projects in DB: ${status.database.eu}`);
        console.log(`   Current UK projects in DB: ${status.database.uk}`);
        console.log(`   Total projects in DB: ${status.total}`);
        
        // 3. Test data loading
        if (fileInfo.eu.exists || fileInfo.uk.exists) {
            console.log('\n📋 Step 3: Testing data loading...');
            const result = await dataLoader.loadStartupData();
            
            console.log('\n📊 Loading Results:');
            console.log(`   EU Projects loaded: ${result.results.eu.loaded}`);
            console.log(`   UK Projects loaded: ${result.results.uk.loaded}`);
            console.log(`   Total execution time: ${result.executionTime}ms`);
            
            // 4. Verify final status
            console.log('\n📋 Step 4: Verifying final status...');
            const finalStatus = await dataLoader.getStatus();
            console.log(`   Final EU projects in DB: ${finalStatus.database.eu}`);
            console.log(`   Final UK projects in DB: ${finalStatus.database.uk}`);
            console.log(`   Final total projects in DB: ${finalStatus.total}`);
            
        } else {
            console.log('\n⚠️  No Excel files found, skipping data loading test');
        }
        
        console.log('\n✅ Data loading test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Data loading test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run test if called directly
if (require.main === module) {
    testDataLoading();
}

module.exports = { testDataLoading };
