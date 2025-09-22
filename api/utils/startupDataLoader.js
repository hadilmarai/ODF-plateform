const path = require('path');
const fs = require('fs');
const ExcelProcessor = require('./excelProcessor');
const { euProjectModel, ukProjectModel } = require('../models');
const logger = require('./logger');
const { config } = require('../config/app');

/**
 * Startup Data Loader
 * Automatically loads Excel files into database on server startup
 */
class StartupDataLoader {
    constructor() {
        // Define Excel file paths from configuration
        this.excelFiles = {
            eu: {
                path: path.resolve(__dirname, '..', config.dataLoading.euExcelFile),
                model: euProjectModel,
                type: 'EU'
            },
            uk: {
                path: path.resolve(__dirname, '..', config.dataLoading.ukExcelFile),
                model: ukProjectModel,
                type: 'UK'
            }
        };
    }

    /**
     * Load all Excel files into database
     */
    async loadStartupData() {
        try {
            console.log('🔄 Starting automatic data loading...');
            console.log('=====================================');
            
            const startTime = Date.now();
            const results = {
                eu: { loaded: 0, skipped: false },
                uk: { loaded: 0, skipped: false }
            };

            // Clear existing data first
            await this.clearExistingData();

            // Load EU projects
            results.eu = await this.loadExcelFile('eu');

            // Load UK projects
            results.uk = await this.loadExcelFile('uk');

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            console.log('=====================================');
            console.log('✅ Automatic data loading completed!');
            console.log(`⏱️  Total execution time: ${executionTime}ms`);
            console.log('');
            console.log('📊 Loading Summary:');
            console.log(`   EU Projects: ${results.eu.loaded} loaded`);
            console.log(`   UK Projects: ${results.uk.loaded} loaded`);
            console.log(`   Total Projects: ${results.eu.loaded + results.uk.loaded} loaded`);
            console.log('');

            logger.info('Startup data loading completed', {
                executionTime,
                euProjects: results.eu.loaded,
                ukProjects: results.uk.loaded,
                totalProjects: results.eu.loaded + results.uk.loaded
            });

            return {
                success: true,
                executionTime,
                results
            };

        } catch (error) {
            console.error('❌ Startup data loading failed:', error.message);
            logger.error('Startup data loading failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Clear existing project data
     */
    async clearExistingData() {
        try {
            console.log('🗑️  Clearing existing project data...');
            
            // Get current counts
            const euCount = await euProjectModel.count();
            const ukCount = await ukProjectModel.count();
            
            if (euCount > 0 || ukCount > 0) {
                // Clear EU projects
                if (euCount > 0) {
                    await euProjectModel.truncate();
                    console.log(`   🗑️  Cleared ${euCount} existing EU projects`);
                }
                
                // Clear UK projects
                if (ukCount > 0) {
                    await ukProjectModel.truncate();
                    console.log(`   🗑️  Cleared ${ukCount} existing UK projects`);
                }
                
                console.log(`✅ Cleared ${euCount + ukCount} existing projects`);
            } else {
                console.log('ℹ️  No existing projects to clear');
            }

        } catch (error) {
            console.error('❌ Error clearing existing data:', error.message);
            throw error;
        }
    }

    /**
     * Load a specific Excel file
     */
    async loadExcelFile(type) {
        try {
            const fileConfig = this.excelFiles[type];
            const filePath = fileConfig.path;
            
            console.log(`📋 Loading ${fileConfig.type} projects from Excel...`);
            console.log(`   File: ${path.basename(filePath)}`);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️  File not found: ${filePath}`);
                console.log(`   ⏭️  Skipping ${fileConfig.type} projects loading`);
                return { loaded: 0, skipped: true, reason: 'File not found' };
            }

            // Read Excel file
            const excelData = ExcelProcessor.readExcelFile(filePath);
            
            if (!excelData.success) {
                console.log(`   ❌ Failed to read Excel file: ${excelData.error}`);
                return { loaded: 0, skipped: true, reason: excelData.error };
            }

            if (!excelData.data || excelData.data.length === 0) {
                console.log(`   ⚠️  Excel file is empty`);
                return { loaded: 0, skipped: true, reason: 'Empty file' };
            }

            console.log(`   📊 Found ${excelData.data.length} records in Excel file`);

            // Load data into database using model's bulk create
            const result = await fileConfig.model.bulkCreate(excelData.data);
            
            console.log(`   ✅ Successfully loaded ${result.count} ${fileConfig.type} projects`);

            return { 
                loaded: result.count, 
                skipped: false,
                totalRecords: excelData.data.length,
                fileName: path.basename(filePath)
            };

        } catch (error) {
            console.error(`   ❌ Error loading ${this.excelFiles[type].type} projects:`, error.message);
            return { 
                loaded: 0, 
                skipped: true, 
                reason: error.message 
            };
        }
    }

    /**
     * Check if Excel files exist
     */
    checkExcelFiles() {
        const status = {};
        
        for (const [type, config] of Object.entries(this.excelFiles)) {
            status[type] = {
                path: config.path,
                exists: fs.existsSync(config.path),
                type: config.type
            };
        }
        
        return status;
    }

    /**
     * Get file information
     */
    getFileInfo() {
        const info = {};
        
        for (const [type, config] of Object.entries(this.excelFiles)) {
            const filePath = config.path;
            const exists = fs.existsSync(filePath);
            
            info[type] = {
                path: filePath,
                fileName: path.basename(filePath),
                exists,
                type: config.type
            };
            
            if (exists) {
                try {
                    const stats = fs.statSync(filePath);
                    info[type].size = stats.size;
                    info[type].modified = stats.mtime;
                } catch (error) {
                    info[type].error = error.message;
                }
            }
        }
        
        return info;
    }

    /**
     * Reload data (clear and load again)
     */
    async reloadData() {
        console.log('🔄 Reloading data from Excel files...');
        return await this.loadStartupData();
    }

    /**
     * Load only EU projects
     */
    async loadEUOnly() {
        try {
            console.log('🔄 Loading EU projects only...');
            
            // Clear existing EU data
            const euCount = await euProjectModel.count();
            if (euCount > 0) {
                await euProjectModel.truncate();
                console.log(`🗑️  Cleared ${euCount} existing EU projects`);
            }
            
            // Load EU projects
            const result = await this.loadExcelFile('eu');
            
            console.log(`✅ EU projects loading completed: ${result.loaded} projects`);
            return result;
            
        } catch (error) {
            console.error('❌ EU projects loading failed:', error.message);
            throw error;
        }
    }

    /**
     * Load only UK projects
     */
    async loadUKOnly() {
        try {
            console.log('🔄 Loading UK projects only...');
            
            // Clear existing UK data
            const ukCount = await ukProjectModel.count();
            if (ukCount > 0) {
                await ukProjectModel.truncate();
                console.log(`🗑️  Cleared ${ukCount} existing UK projects`);
            }
            
            // Load UK projects
            const result = await this.loadExcelFile('uk');
            
            console.log(`✅ UK projects loading completed: ${result.loaded} projects`);
            return result;
            
        } catch (error) {
            console.error('❌ UK projects loading failed:', error.message);
            throw error;
        }
    }

    /**
     * Get loading status
     */
    async getStatus() {
        try {
            const fileInfo = this.getFileInfo();
            const dbCounts = {
                eu: await euProjectModel.count(),
                uk: await ukProjectModel.count()
            };
            
            return {
                files: fileInfo,
                database: dbCounts,
                total: dbCounts.eu + dbCounts.uk
            };
            
        } catch (error) {
            console.error('❌ Error getting status:', error.message);
            throw error;
        }
    }
}

module.exports = StartupDataLoader;
