const { euProjectModel, ukProjectModel, analysisLogModel } = require('../models');
const logger = require('../utils/logger');

/**
 * Sample Data Seeder
 * Creates sample EU/UK projects and analysis logs for testing
 */
class SampleDataSeeder {
    constructor() {
        this.sampleEUProjects = [
            {
                title: 'Horizon Europe Digital Innovation Hub',
                url: 'https://example.eu/project/digital-innovation-hub',
                status: 'Open',
                start_date: '2024-01-15',
                deadline: '2024-12-31',
                pertinence: 'Yes',
                matching_words: 'digital innovation, technology transfer, SME support',
                pertinence_llm: 'Yes',
                resume_llm: 'This project aims to establish a comprehensive digital innovation hub supporting SMEs in their digital transformation journey through technology transfer and innovation support services.'
            },
            {
                title: 'Green Energy Transition Initiative',
                url: 'https://example.eu/project/green-energy-transition',
                status: 'Open',
                start_date: '2024-02-01',
                deadline: '2025-01-31',
                pertinence: 'Yes',
                matching_words: 'renewable energy, sustainability, climate change',
                pertinence_llm: 'Yes',
                resume_llm: 'A comprehensive initiative focused on accelerating the transition to renewable energy sources and promoting sustainable practices across European industries.'
            },
            {
                title: 'AI for Healthcare Research Program',
                url: 'https://example.eu/project/ai-healthcare',
                status: 'Open',
                start_date: '2024-03-01',
                deadline: '2024-11-30',
                pertinence: 'Yes',
                matching_words: 'artificial intelligence, healthcare, medical research',
                pertinence_llm: 'Yes',
                resume_llm: 'Research program developing AI-powered solutions for healthcare applications, including diagnostic tools and treatment optimization systems.'
            },
            {
                title: 'Smart Cities Infrastructure Development',
                url: 'https://example.eu/project/smart-cities',
                status: 'Open',
                start_date: '2024-01-01',
                deadline: '2024-10-31',
                pertinence: 'No',
                matching_words: 'smart cities, IoT, urban planning',
                pertinence_llm: 'No',
                resume_llm: 'Infrastructure development project for smart city implementations focusing on IoT integration and urban planning optimization.'
            },
            {
                title: 'Cybersecurity Excellence Network',
                url: 'https://example.eu/project/cybersecurity-network',
                status: 'Closed',
                start_date: '2023-06-01',
                deadline: '2024-05-31',
                pertinence: 'Yes',
                matching_words: 'cybersecurity, network security, data protection',
                pertinence_llm: 'Yes',
                resume_llm: 'Network of excellence in cybersecurity research and development, focusing on advanced threat detection and data protection mechanisms.'
            }
        ];

        this.sampleUKProjects = [
            {
                title: 'Innovate UK Technology Accelerator',
                link: 'https://example.uk/project/tech-accelerator',
                status: 'Open',
                pertinence: 'Yes',
                matching_words: 'innovation, technology acceleration, startup support',
                pertinence_llm: 'Yes',
                resume_llm: 'Technology accelerator program supporting innovative startups and SMEs in developing cutting-edge technologies and bringing them to market.'
            },
            {
                title: 'Advanced Manufacturing Research Initiative',
                link: 'https://example.uk/project/advanced-manufacturing',
                status: 'Open',
                pertinence: 'Yes',
                matching_words: 'advanced manufacturing, Industry 4.0, automation',
                pertinence_llm: 'Yes',
                resume_llm: 'Research initiative focused on advancing manufacturing capabilities through Industry 4.0 technologies and automation solutions.'
            },
            {
                title: 'Clean Growth Innovation Fund',
                link: 'https://example.uk/project/clean-growth',
                status: 'Open',
                pertinence: 'No',
                matching_words: 'clean growth, environmental technology, sustainability',
                pertinence_llm: 'No',
                resume_llm: 'Innovation fund supporting clean growth technologies and environmental solutions for sustainable economic development.'
            },
            {
                title: 'Digital Health Innovation Platform',
                link: 'https://example.uk/project/digital-health',
                status: 'Open',
                pertinence: 'Yes',
                matching_words: 'digital health, healthcare innovation, medical technology',
                pertinence_llm: 'Yes',
                resume_llm: 'Platform for developing and deploying digital health innovations, including telemedicine solutions and health monitoring technologies.'
            },
            {
                title: 'Future Mobility Challenge',
                link: 'https://example.uk/project/future-mobility',
                status: 'Closed',
                pertinence: 'No',
                matching_words: 'mobility, transportation, autonomous vehicles',
                pertinence_llm: 'No',
                resume_llm: 'Challenge program focused on developing future mobility solutions including autonomous vehicles and smart transportation systems.'
            }
        ];

        this.sampleAnalysisLogs = [
            {
                analysis_type: 'eu',
                status: 'completed',
                message: 'EU analysis completed successfully',
                execution_time: 45000,
                projects_processed: 150,
                relevant_projects: 45,
                llm_analyzed: 45
            },
            {
                analysis_type: 'uk',
                status: 'completed',
                message: 'UK analysis completed successfully',
                execution_time: 32000,
                projects_processed: 89,
                relevant_projects: 23,
                llm_analyzed: 23
            },
            {
                analysis_type: 'combined',
                status: 'completed',
                message: 'Combined analysis completed successfully',
                execution_time: 78000,
                projects_processed: 239,
                relevant_projects: 68,
                llm_analyzed: 68
            },
            {
                analysis_type: 'eu',
                status: 'error',
                message: 'EU analysis failed: Notebook execution timeout',
                execution_time: 120000,
                projects_processed: 0,
                relevant_projects: 0,
                llm_analyzed: 0
            },
            {
                analysis_type: 'uk',
                status: 'started',
                message: 'UK analysis started',
                execution_time: null,
                projects_processed: 0,
                relevant_projects: 0,
                llm_analyzed: 0
            }
        ];
    }

    /**
     * Run the sample data seeder
     */
    async run(options = {}) {
        try {
            console.log('📊 Seeding sample data...');

            const {
                skipProjects = true,  // Skip projects by default
                skipAnalysisLogs = false
            } = options;

            const results = {
                euProjects: 0,
                ukProjects: 0,
                analysisLogs: 0
            };

            // Seed EU projects (only if not skipped)
            if (!skipProjects) {
                console.log('   📋 Seeding EU projects...');
                const euResult = await euProjectModel.bulkCreate(this.sampleEUProjects);
                results.euProjects = euResult.count;
                console.log(`   ✅ Created ${euResult.count} EU projects`);
            } else {
                console.log('   ⏭️  Skipping EU projects seeding');
            }

            // Seed UK projects (only if not skipped)
            if (!skipProjects) {
                console.log('   📋 Seeding UK projects...');
                const ukResult = await ukProjectModel.bulkCreate(this.sampleUKProjects);
                results.ukProjects = ukResult.count;
                console.log(`   ✅ Created ${ukResult.count} UK projects`);
            } else {
                console.log('   ⏭️  Skipping UK projects seeding');
            }

            // Seed analysis logs (only if not skipped)
            if (!skipAnalysisLogs) {
                console.log('   📋 Seeding analysis logs...');
                for (const logData of this.sampleAnalysisLogs) {
                    await analysisLogModel.create(logData);
                    results.analysisLogs++;
                }
                console.log(`   ✅ Created ${results.analysisLogs} analysis logs`);
            } else {
                console.log('   ⏭️  Skipping analysis logs seeding');
            }

            console.log(`\n📊 Sample Data Seeding Summary:`);
            console.log(`   EU Projects: ${results.euProjects}`);
            console.log(`   UK Projects: ${results.ukProjects}`);
            console.log(`   Analysis Logs: ${results.analysisLogs}`);
            console.log(`   Total Records: ${results.euProjects + results.ukProjects + results.analysisLogs}`);

            // Show data overview only if we seeded something
            if (results.euProjects > 0 || results.ukProjects > 0 || results.analysisLogs > 0) {
                console.log(`\n📈 Data Overview:`);

                if (results.euProjects > 0) {
                    console.log(`   EU Projects:`);
                    console.log(`     - Open: ${this.sampleEUProjects.filter(p => p.status === 'Open').length}`);
                    console.log(`     - Closed: ${this.sampleEUProjects.filter(p => p.status === 'Closed').length}`);
                    console.log(`     - Relevant: ${this.sampleEUProjects.filter(p => p.pertinence === 'Yes').length}`);
                    console.log(`     - LLM Approved: ${this.sampleEUProjects.filter(p => p.pertinence_llm === 'Yes').length}`);
                }

                if (results.ukProjects > 0) {
                    console.log(`   UK Projects:`);
                    console.log(`     - Open: ${this.sampleUKProjects.filter(p => p.status === 'Open').length}`);
                    console.log(`     - Closed: ${this.sampleUKProjects.filter(p => p.status === 'Closed').length}`);
                    console.log(`     - Relevant: ${this.sampleUKProjects.filter(p => p.pertinence === 'Yes').length}`);
                    console.log(`     - LLM Approved: ${this.sampleUKProjects.filter(p => p.pertinence_llm === 'Yes').length}`);
                }

                if (results.analysisLogs > 0) {
                    console.log(`   Analysis Logs:`);
                    console.log(`     - Completed: ${this.sampleAnalysisLogs.filter(l => l.status === 'completed').length}`);
                    console.log(`     - Failed: ${this.sampleAnalysisLogs.filter(l => l.status === 'error').length}`);
                    console.log(`     - Running: ${this.sampleAnalysisLogs.filter(l => l.status === 'started').length}`);
                }
            } else {
                console.log(`\n💡 No sample data was seeded (all options were skipped)`);
            }

            logger.info('Sample data seeding completed', results);

            return {
                success: true,
                ...results
            };

        } catch (error) {
            console.error('❌ Sample data seeding failed:', error.message);
            logger.error('Sample data seeding failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Clear all sample data
     */
    async clear(options = {}) {
        try {
            console.log('🗑️  Clearing sample data...');

            const {
                skipProjects = false,  // Allow clearing projects by default in clear method
                skipAnalysisLogs = false
            } = options;

            let deletedCount = 0;

            // Clear EU projects (only if not skipped)
            if (!skipProjects) {
                const euCount = await euProjectModel.count();
                if (euCount > 0) {
                    await euProjectModel.truncate();
                    deletedCount += euCount;
                    console.log(`   🗑️  Cleared ${euCount} EU projects`);
                } else {
                    console.log(`   ℹ️  No EU projects to clear`);
                }
            } else {
                console.log(`   ⏭️  Skipping EU projects clearing`);
            }

            // Clear UK projects (only if not skipped)
            if (!skipProjects) {
                const ukCount = await ukProjectModel.count();
                if (ukCount > 0) {
                    await ukProjectModel.truncate();
                    deletedCount += ukCount;
                    console.log(`   🗑️  Cleared ${ukCount} UK projects`);
                } else {
                    console.log(`   ℹ️  No UK projects to clear`);
                }
            } else {
                console.log(`   ⏭️  Skipping UK projects clearing`);
            }

            // Clear analysis logs (only if not skipped)
            if (!skipAnalysisLogs) {
                const logsCount = await analysisLogModel.count();
                if (logsCount > 0) {
                    await analysisLogModel.truncate();
                    deletedCount += logsCount;
                    console.log(`   🗑️  Cleared ${logsCount} analysis logs`);
                } else {
                    console.log(`   ℹ️  No analysis logs to clear`);
                }
            } else {
                console.log(`   ⏭️  Skipping analysis logs clearing`);
            }

            console.log(`✅ Cleared ${deletedCount} sample records`);

            return {
                success: true,
                deleted: deletedCount
            };

        } catch (error) {
            console.error('❌ Sample data clearing failed:', error.message);
            throw error;
        }
    }

    /**
     * Seed only analysis logs
     */
    async runAnalysisLogsOnly() {
        return await this.run({ skipProjects: true, skipAnalysisLogs: false });
    }

    /**
     * Seed only projects (both EU and UK)
     */
    async runProjectsOnly() {
        return await this.run({ skipProjects: false, skipAnalysisLogs: true });
    }

    /**
     * Seed only EU projects
     */
    async runEUProjectsOnly() {
        try {
            console.log('📊 Seeding EU projects only...');
            const euResult = await euProjectModel.bulkCreate(this.sampleEUProjects);
            console.log(`✅ Created ${euResult.count} EU projects`);
            return { success: true, euProjects: euResult.count };
        } catch (error) {
            console.error('❌ EU projects seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Seed only UK projects
     */
    async runUKProjectsOnly() {
        try {
            console.log('📊 Seeding UK projects only...');
            const ukResult = await ukProjectModel.bulkCreate(this.sampleUKProjects);
            console.log(`✅ Created ${ukResult.count} UK projects`);
            return { success: true, ukProjects: ukResult.count };
        } catch (error) {
            console.error('❌ UK projects seeding failed:', error.message);
            throw error;
        }
    }

    /**
     * Clear only projects
     */
    async clearProjectsOnly() {
        return await this.clear({ skipProjects: false, skipAnalysisLogs: true });
    }

    /**
     * Clear only analysis logs
     */
    async clearAnalysisLogsOnly() {
        return await this.clear({ skipProjects: true, skipAnalysisLogs: false });
    }

    /**
     * Get sample data statistics
     */
    getStatistics() {
        return {
            euProjects: {
                total: this.sampleEUProjects.length,
                open: this.sampleEUProjects.filter(p => p.status === 'Open').length,
                closed: this.sampleEUProjects.filter(p => p.status === 'Closed').length,
                relevant: this.sampleEUProjects.filter(p => p.pertinence === 'Yes').length,
                llmApproved: this.sampleEUProjects.filter(p => p.pertinence_llm === 'Yes').length
            },
            ukProjects: {
                total: this.sampleUKProjects.length,
                open: this.sampleUKProjects.filter(p => p.status === 'Open').length,
                closed: this.sampleUKProjects.filter(p => p.status === 'Closed').length,
                relevant: this.sampleUKProjects.filter(p => p.pertinence === 'Yes').length,
                llmApproved: this.sampleUKProjects.filter(p => p.pertinence_llm === 'Yes').length
            },
            analysisLogs: {
                total: this.sampleAnalysisLogs.length,
                completed: this.sampleAnalysisLogs.filter(l => l.status === 'completed').length,
                failed: this.sampleAnalysisLogs.filter(l => l.status === 'error').length,
                running: this.sampleAnalysisLogs.filter(l => l.status === 'started').length
            }
        };
    }
}

module.exports = SampleDataSeeder;
