-- Database setup for Funding Analysis System
-- This script creates the database and tables manually if needed

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS examentodayDb;
USE examentodayDb;

-- Create funding_analysis table
CREATE TABLE IF NOT EXISTS funding_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    last_update DATETIME,
    created_at DATETIME NOT NULL,
    status VARCHAR(100),
    llm_analyzed_count INT,
    projects_count INT,
    relevant_count INT,
    INDEX idx_analysis_type (analysis_type),
    INDEX idx_created_at (created_at)
);

-- Create funding_opportunity table
CREATE TABLE IF NOT EXISTS funding_opportunity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    funding_analysis_id BIGINT NOT NULL,
    titre VARCHAR(1000),
    title VARCHAR(1000),
    lien VARCHAR(2000),
    url VARCHAR(2000),
    description TEXT,
    date_ouverture VARCHAR(255),
    start_date VARCHAR(255),
    date_cloture VARCHAR(255),
    deadline VARCHAR(255),
    pertinence VARCHAR(50),
    matching_words TEXT,
    pertinence_llm VARCHAR(50),
    resume_llm TEXT,
    reponse_brute TEXT,
    status VARCHAR(100),
    data_source VARCHAR(255),
    FOREIGN KEY (funding_analysis_id) REFERENCES funding_analysis(id) ON DELETE CASCADE,
    INDEX idx_funding_analysis_id (funding_analysis_id),
    INDEX idx_pertinence (pertinence),
    INDEX idx_data_source (data_source)
);

-- Sample queries to verify the setup

-- Count total analyses
-- SELECT COUNT(*) as total_analyses FROM funding_analysis;

-- Count opportunities by relevance
-- SELECT pertinence, COUNT(*) as count 
-- FROM funding_opportunity 
-- GROUP BY pertinence;

-- Get latest analysis with opportunity count
-- SELECT 
--     fa.id,
--     fa.analysis_type,
--     fa.created_at,
--     fa.projects_count,
--     fa.relevant_count,
--     COUNT(fo.id) as actual_opportunities
-- FROM funding_analysis fa
-- LEFT JOIN funding_opportunity fo ON fa.id = fo.funding_analysis_id
-- GROUP BY fa.id
-- ORDER BY fa.created_at DESC;

-- Get relevant opportunities for latest UK analysis
-- SELECT 
--     fo.titre,
--     fo.title,
--     fo.pertinence,
--     fo.matching_words
-- FROM funding_analysis fa
-- JOIN funding_opportunity fo ON fa.id = fo.funding_analysis_id
-- WHERE fa.analysis_type = 'UK_FUNDING_OPPORTUNITIES'
--   AND fo.pertinence = 'Yes'
-- ORDER BY fa.created_at DESC
-- LIMIT 10;
