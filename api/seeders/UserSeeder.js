const { userModel } = require('../models');
const logger = require('../utils/logger');

/**
 * User Seeder
 * Creates sample users for testing and development
 */
class UserSeeder {
    constructor() {
        this.users = [
            {
                username: 'admin',
                email: 'admin@odf-api.com',
                password: 'admin123',
                role: 'admin'
            },
            {
                username: 'john_doe',
                email: 'john.doe@example.com',
                password: 'password123',
                role: 'user'
            },
            {
                username: 'jane_smith',
                email: 'jane.smith@example.com',
                password: 'password123',
                role: 'user'
            },
            {
                username: 'researcher1',
                email: 'researcher1@university.edu',
                password: 'research123',
                role: 'user'
            },
            {
                username: 'analyst',
                email: 'analyst@company.com',
                password: 'analyst123',
                role: 'user'
            },
            {
                username: 'demo_user',
                email: 'demo@odf-api.com',
                password: 'demo123',
                role: 'user'
            },
            {
                username: 'test_admin',
                email: 'test.admin@odf-api.com',
                password: 'testadmin123',
                role: 'admin'
            },
            {
                username: 'api_tester',
                email: 'api.tester@example.com',
                password: 'apitest123',
                role: 'user'
            }
        ];
    }

    /**
     * Run the user seeder
     */
    async run() {
        try {
            console.log('👥 Seeding users...');
            
            let createdCount = 0;
            let skippedCount = 0;
            const createdUsers = [];

            for (const userData of this.users) {
                try {
                    // Check if user already exists
                    const existingUser = await userModel.findByIdentifier(userData.username);
                    
                    if (existingUser) {
                        console.log(`   ⏭️  User '${userData.username}' already exists, skipping`);
                        skippedCount++;
                        createdUsers.push({
                            ...existingUser,
                            password: userData.password // For reference in output
                        });
                        continue;
                    }

                    // Create user
                    const user = await userModel.createUser(userData);
                    createdUsers.push({
                        ...user,
                        password: userData.password // For reference in output
                    });
                    
                    console.log(`   ✅ Created user: ${userData.username} (${userData.role})`);
                    createdCount++;
                    
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`   ⏭️  User '${userData.username}' already exists, skipping`);
                        skippedCount++;
                    } else {
                        console.error(`   ❌ Failed to create user '${userData.username}':`, error.message);
                    }
                }
            }

            console.log(`\n📊 User Seeding Summary:`);
            console.log(`   Created: ${createdCount} users`);
            console.log(`   Skipped: ${skippedCount} users`);
            console.log(`   Total: ${createdCount + skippedCount} users`);

            // Display user credentials for testing
            console.log(`\n🔑 User Credentials for Testing:`);
            console.log('   ┌─────────────────┬─────────────────────────────┬─────────────────┬──────────┐');
            console.log('   │ Username        │ Email                       │ Password        │ Role     │');
            console.log('   ├─────────────────┼─────────────────────────────┼─────────────────┼──────────┤');
            
            createdUsers.forEach(user => {
                const username = user.username.padEnd(15);
                const email = user.email.padEnd(27);
                const password = user.password.padEnd(15);
                const role = user.role.padEnd(8);
                console.log(`   │ ${username} │ ${email} │ ${password} │ ${role} │`);
            });
            
            console.log('   └─────────────────┴─────────────────────────────┴─────────────────┴──────────┘');

            // Show login examples
            console.log(`\n🚀 Login Examples:`);
            console.log(`   Admin Login:`);
            console.log(`   POST /auth/login`);
            console.log(`   { "username": "admin", "password": "admin123" }`);
            console.log(``);
            console.log(`   User Login:`);
            console.log(`   POST /auth/login`);
            console.log(`   { "username": "john_doe", "password": "password123" }`);
            console.log(``);
            console.log(`   Response includes JWT Bearer tokens:`);
            console.log(`   {`);
            console.log(`     "data": {`);
            console.log(`       "user": { "id": 1, "username": "admin", "role": "admin" },`);
            console.log(`       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",`);
            console.log(`       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`);
            console.log(`     }`);
            console.log(`   }`);

            logger.info('User seeding completed', {
                created: createdCount,
                skipped: skippedCount,
                total: createdCount + skippedCount
            });

            return {
                success: true,
                created: createdCount,
                skipped: skippedCount,
                users: createdUsers
            };

        } catch (error) {
            console.error('❌ User seeding failed:', error.message);
            logger.error('User seeding failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Clear all users (except keep one admin)
     */
    async clear() {
        try {
            console.log('🗑️  Clearing users...');
            
            // Get all users except one admin
            const users = await userModel.findAll();
            const admins = users.filter(user => user.role === 'admin');
            const regularUsers = users.filter(user => user.role === 'user');
            
            let deletedCount = 0;
            
            // Delete all regular users
            for (const user of regularUsers) {
                await userModel.deleteById(user.id);
                deletedCount++;
                console.log(`   🗑️  Deleted user: ${user.username}`);
            }
            
            // Delete extra admins (keep one)
            if (admins.length > 1) {
                for (let i = 1; i < admins.length; i++) {
                    await userModel.deleteById(admins[i].id);
                    deletedCount++;
                    console.log(`   🗑️  Deleted admin: ${admins[i].username}`);
                }
            }
            
            console.log(`✅ Cleared ${deletedCount} users (kept 1 admin)`);
            
            return {
                success: true,
                deleted: deletedCount
            };
            
        } catch (error) {
            console.error('❌ User clearing failed:', error.message);
            throw error;
        }
    }

    /**
     * Get seeded user credentials for testing
     */
    getUserCredentials() {
        return this.users.map(user => ({
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role
        }));
    }

    /**
     * Get admin credentials
     */
    getAdminCredentials() {
        return this.users.filter(user => user.role === 'admin');
    }

    /**
     * Get regular user credentials
     */
    getUserCredentials() {
        return this.users.filter(user => user.role === 'user');
    }

    /**
     * Generate JWT tokens for all seeded users
     */
    async generateTokensForUsers() {
        try {
            console.log('🔑 Generating JWT tokens for seeded users...');
            
            const tokens = [];
            
            for (const userData of this.users) {
                const user = await userModel.findByIdentifier(userData.username);
                
                if (user) {
                    const token = userModel.generateToken(user);
                    const refreshToken = userModel.generateRefreshToken(user);
                    
                    tokens.push({
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        token,
                        refreshToken
                    });
                }
            }
            
            console.log(`✅ Generated tokens for ${tokens.length} users`);
            
            // Display tokens for easy copying
            console.log(`\n🎫 JWT Bearer Tokens for Testing:`);
            tokens.forEach(tokenData => {
                console.log(`\n   User: ${tokenData.username} (${tokenData.role})`);
                console.log(`   Bearer Token: ${tokenData.token}`);
                console.log(`   Refresh Token: ${tokenData.refreshToken}`);
            });

            // Show usage examples
            console.log(`\n🚀 Bearer Token Usage Examples:`);
            if (tokens.length > 0) {
                const adminToken = tokens.find(t => t.role === 'admin');
                const userToken = tokens.find(t => t.role === 'user');

                if (adminToken) {
                    console.log(`\n   Admin API Call:`);
                    console.log(`   curl -H "Authorization: Bearer ${adminToken.token}" \\`);
                    console.log(`        http://localhost:5000/projects/eu`);
                }

                if (userToken) {
                    console.log(`\n   User API Call:`);
                    console.log(`   curl -H "Authorization: Bearer ${userToken.token}" \\`);
                    console.log(`        http://localhost:5000/projects/uk`);
                }

                console.log(`\n   JavaScript/Fetch Example:`);
                console.log(`   fetch('http://localhost:5000/projects/eu', {`);
                console.log(`     headers: {`);
                console.log(`       'Authorization': 'Bearer ${adminToken ? adminToken.token.substring(0, 50) + '...' : 'your-token-here'}'`);
                console.log(`     }`);
                console.log(`   })`);
            }
            
            return tokens;
            
        } catch (error) {
            console.error('❌ Token generation failed:', error.message);
            throw error;
        }
    }
}

module.exports = UserSeeder;
