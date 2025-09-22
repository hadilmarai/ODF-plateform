require('dotenv').config();
const { setupDatabase } = require('./setup-database-simple');
const { SeederRunner } = require('./seed');

/**
 * Quick Setup Script
 * Combines database setup and seeding for rapid development setup
 */

async function quickSetup() {
    try {
        console.log('🚀 Starting quick setup...');
        console.log('This will set up the database and populate it with sample data.');
        console.log('=====================================');
        
        const startTime = Date.now();

        // Step 1: Setup database
        console.log('📋 Step 1: Setting up database...');
        await setupDatabase();
        console.log('✅ Database setup completed\n');

        // Step 2: Run seeders
        console.log('📋 Step 2: Seeding sample data...');
        const seeder = new SeederRunner();
        const seedResult = await seeder.runAll();
        console.log('✅ Data seeding completed\n');

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log('=====================================');
        console.log('🎉 Quick setup completed successfully!');
        console.log(`⏱️  Total setup time: ${totalTime}ms`);
        console.log('');

        // Show ready-to-use credentials
        console.log('🔐 Ready-to-use Credentials:');
        console.log('');
        console.log('👤 Admin User:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   Role: admin');
        console.log('');
        console.log('👤 Test User:');
        console.log('   Username: john_doe');
        console.log('   Password: password123');
        console.log('   Role: user');
        console.log('');

        // Show API endpoints
        console.log('🌐 API Endpoints:');
        console.log('   Base URL: http://localhost:5000');
        console.log('   Documentation: http://localhost:5000');
        console.log('   Login: POST /auth/login');
        console.log('   Projects: GET /projects/eu, GET /projects/uk');
        console.log('   Analysis: GET /analysis/status');
        console.log('');

        // Show next steps
        console.log('🚀 Next Steps:');
        console.log('   1. Start the server: npm start');
        console.log('   2. Test login: POST /auth/login with admin credentials');
        console.log('   3. Use JWT Bearer token: Authorization: Bearer <token>');
        console.log('   4. Or use API keys: X-API-Key: <api-key>');
        console.log('');
        console.log('🔐 Authentication Examples:');
        console.log('   Bearer Token: curl -H "Authorization: Bearer <jwt-token>" http://localhost:5000/projects/eu');
        console.log('   API Key:      curl -H "X-API-Key: <api-key>" http://localhost:5000/projects/eu');
        console.log('');
        console.log('💡 Useful commands:');
        console.log('   npm run seed:tokens  - Generate fresh JWT Bearer tokens');
        console.log('   npm run seed:status  - Check seeded data status');
        console.log('   npm run seed:clear   - Clear all seeded data');

        return {
            success: true,
            setupTime: totalTime,
            seedResult
        };

    } catch (error) {
        console.error('❌ Quick setup failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('1. Make sure MySQL server is running');
        console.error('2. Check your .env file configuration');
        console.error('3. Ensure database user has proper permissions');
        console.error('4. Try running setup steps individually:');
        console.error('   - npm run setup:db');
        console.error('   - npm run seed');
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    quickSetup();
}

module.exports = { quickSetup };
