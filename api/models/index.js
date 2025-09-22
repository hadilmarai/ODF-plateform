/**
 * Models Index
 * Exports all model classes for easy importing
 */

const BaseModel = require('./BaseModel');
const User = require('./User');
const EUProject = require('./EUProject');
const UKProject = require('./UKProject');
const AnalysisLog = require('./AnalysisLog');
const ApiKey = require('./ApiKey');

// Create singleton instances
const userModel = new User();
const euProjectModel = new EUProject();
const ukProjectModel = new UKProject();
const analysisLogModel = new AnalysisLog();
const apiKeyModel = new ApiKey();

module.exports = {
    // Base model class
    BaseModel,
    
    // Model classes
    User,
    EUProject,
    UKProject,
    AnalysisLog,
    ApiKey,
    
    // Singleton instances (ready to use)
    userModel,
    euProjectModel,
    ukProjectModel,
    analysisLogModel,
    apiKeyModel,
    
    // Convenience methods for getting fresh instances
    createUserModel: () => new User(),
    createEUProjectModel: () => new EUProject(),
    createUKProjectModel: () => new UKProject(),
    createAnalysisLogModel: () => new AnalysisLog(),
    createApiKeyModel: () => new ApiKey()
};
