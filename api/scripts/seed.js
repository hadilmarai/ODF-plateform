require('dotenv').config();
const UserSeeder = require('../seeders/UserSeeder');
const ApiKeySeeder = require('../seeders/ApiKeySeeder');
const SampleDataSeeder = require('../seeders/SampleDataSeeder');
const logger = require('../utils/logger');

/**
 * Main Seeder Runner
 * Orchestrates all database seeders
 */
class SeederRunner {
    constructor() {
        this.userSeeder = new UserSeeder();
        this.apiKeySeeder = new ApiKeySeeder();
        this.sampleDataSeeder = new SampleDataSeeder();
    }

    /**
     * Run all seeders
     */
    async runAll() {
        try {
            console.log('🌱 Starting database seeding...');
            console.log('=====================================');
            
            const startTime = Date.now();
            const results = {};

            // 1. Seed users first (required for API keys)
            results.users = await this.userSeeder.run();
            console.log('');

            // 2. Seed API keys (requires users)
            results.apiKeys = await this.apiKeySeeder.run();
            console.log('');

            // 3. Seed sample data (skip projects by default, only seed analysis logs)
            results.sampleData = await this.sampleDataSeeder.run();
            console.log('');

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            console.log('=====================================');
            console.log('🎉 Database seeding completed successfully!');
            console.log(`⏱️  Total execution time: ${executionTime}ms`);
            console.log('');

            // Summary
            console.log('📊 Seeding Summary:');
            console.log(`   Users: ${results.users.created} created, ${results.users.skipped} skipped`);
            console.log(`   API Keys: ${results.apiKeys.created} created, ${results.apiKeys.skipped} skipped`);
            console.log(`   EU Projects: ${results.sampleData.euProjects} created`);
            console.log(`   UK Projects: ${results.sampleData.ukProjects} created`);
            console.log(`   Analysis Logs: ${results.sampleData.analysisLogs} created`);

            // Quick start guide
            console.log('');
            console.log('🚀 Quick Start Guide:');
            console.log('   1. Start the server: npm start');
            console.log('   2. Visit: http://localhost:5000');
            console.log('   3. Login with: admin / admin123');
            console.log('   4. Use Bearer token or API key for authentication');
            console.log('');
            console.log('🔐 Authentication Options:');
            console.log('   Bearer Token: Authorization: Bearer <jwt-token>');
            console.log('   API Key:      X-API-Key: <api-key>');
            console.log('   API Key:      ?api_key=<api-key>');
            console.log('');
            console.log('📚 Available endpoints:');
            console.log('   GET  /projects/eu     - View EU projects');
            console.log('   GET  /projects/uk     - View UK projects');
            console.log('   POST /auth/login      - Login to get JWT Bearer token');
            console.log('   GET  /analysis/status - Check analysis status');

            logger.info('Database seeding completed', {
                executionTime,
                results
            });

            return {
                success: true,
                executionTime,
                results
            };

        } catch (error) {
            console.error('❌ Database seeding failed:', error.message);
            logger.error('Database seeding failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run only user seeder
     */
    async runUsers() {
        try {
            console.log('👥 Running user seeder only...');
            const result = await this.userSeeder.run();
            console.log('✅ User seeding completed');
            return result;
        } catch (error) {
            console.error('❌ User seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Run only API key seeder
     */
    async runApiKeys() {
        try {
            console.log('🔑 Running API key seeder only...');
            const result = await this.apiKeySeeder.run();
            console.log('✅ API key seeding completed');
            return result;
        } catch (error) {
            console.error('❌ API key seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Run only sample data seeder (analysis logs only by default)
     */
    async runSampleData() {
        try {
            console.log('📊 Running sample data seeder only...');
            const result = await this.sampleDataSeeder.run();
            console.log('✅ Sample data seeding completed');
            return result;
        } catch (error) {
            console.error('❌ Sample data seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Run only analysis logs seeder
     */
    async runAnalysisLogs() {
        try {
            console.log('📋 Running analysis logs seeder only...');
            const result = await this.sampleDataSeeder.runAnalysisLogsOnly();
            console.log('✅ Analysis logs seeding completed');
            return result;
        } catch (error) {
            console.error('❌ Analysis logs seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Run projects seeder (both EU and UK)
     */
    async runProjects() {
        try {
            console.log('📊 Running projects seeder only...');
            const result = await this.sampleDataSeeder.runProjectsOnly();
            console.log('✅ Projects seeding completed');
            return result;
        } catch (error) {
            console.error('❌ Projects seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate tokens for all users
     */
    async generateTokens() {
        try {
            console.log('🎫 Generating JWT tokens for all users...');
            const tokens = await this.userSeeder.generateTokensForUsers();
            console.log('✅ Token generation completed');
            return tokens;
        } catch (error) {
            console.error('❌ Token generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Clear all seeded data
     */
    async clearAll() {
        try {
            console.log('🗑️  Clearing all seeded data...');
            console.log('=====================================');

            // Clear in reverse order
            await this.sampleDataSeeder.clear();
            console.log('');
            
            await this.apiKeySeeder.clear();
            console.log('');
            
            await this.userSeeder.clear();
            console.log('');

            console.log('=====================================');
            console.log('✅ All seeded data cleared successfully!');

            return { success: true };

        } catch (error) {
            console.error('❌ Data clearing failed:', error.message);
            throw error;
        }
    }

    /**
     * Show seeding status
     */
    async showStatus() {
        try {
            console.log('📊 Seeding Status:');
            console.log('=====================================');

            // Check users
            const { userModel, apiKeyModel, euProjectModel, ukProjectModel, analysisLogModel } = require('../models');
            
            const userCount = await userModel.count();
            const apiKeyCount = await apiKeyModel.count();
            const euProjectCount = await euProjectModel.count();
            const ukProjectCount = await ukProjectModel.count();
            const analysisLogCount = await analysisLogModel.count();

            console.log(`👥 Users: ${userCount}`);
            console.log(`🔑 API Keys: ${apiKeyCount}`);
            console.log(`🇪🇺 EU Projects: ${euProjectCount}`);
            console.log(`🇬🇧 UK Projects: ${ukProjectCount}`);
            console.log(`📋 Analysis Logs: ${analysisLogCount}`);
            console.log('');

            const isEmpty = userCount === 0 && apiKeyCount === 0 && euProjectCount === 0 && ukProjectCount === 0 && analysisLogCount === 0;
            
            if (isEmpty) {
                console.log('💡 Database appears to be empty. Run "npm run seed" to populate with sample data.');
            } else {
                console.log('✅ Database contains seeded data.');
            }

            return {
                users: userCount,
                apiKeys: apiKeyCount,
                euProjects: euProjectCount,
                ukProjects: ukProjectCount,
                analysisLogs: analysisLogCount,
                isEmpty
            };

        } catch (error) {
            console.error('❌ Status check failed:', error.message);
            throw error;
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';
    const seeder = new SeederRunner();

    try {
        switch (command) {
            case 'all':
                await seeder.runAll();
                break;

            case 'users':
                await seeder.runUsers();
                break;

            case 'apikeys':
                await seeder.runApiKeys();
                break;

            case 'data':
                await seeder.runSampleData();
                break;

            case 'logs':
                await seeder.runAnalysisLogs();
                break;

            case 'projects':
                await seeder.runProjects();
                break;

            case 'tokens':
                await seeder.generateTokens();
                break;

            case 'clear':
                await seeder.clearAll();
                break;

            case 'status':
                await seeder.showStatus();
                break;

            default:
                console.log('🌱 Database Seeder');
                console.log('');
                console.log('Available commands:');
                console.log('  all      - Run all seeders (default)');
                console.log('  users    - Seed users only');
                console.log('  apikeys  - Seed API keys only');
                console.log('  data     - Seed sample data (analysis logs only by default)');
                console.log('  logs     - Seed analysis logs only');
                console.log('  projects - Seed sample projects (EU & UK)');
                console.log('  tokens   - Generate JWT tokens for all users');
                console.log('  clear    - Clear all seeded data');
                console.log('  status   - Show current seeding status');
                console.log('');
                console.log('Usage examples:');
                console.log('  npm run seed           # Seed users, API keys, and analysis logs');
                console.log('  npm run seed users     # Seed users only');
                console.log('  npm run seed logs      # Seed analysis logs only');
                console.log('  npm run seed projects  # Seed sample projects only');
                console.log('  npm run seed tokens    # Generate JWT tokens');
                console.log('  npm run seed status    # Check seeding status');
                break;
        }
    } catch (error) {
        console.error('❌ Seeder command failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SeederRunner };
