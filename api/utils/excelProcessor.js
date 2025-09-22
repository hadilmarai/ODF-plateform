const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Read and process Excel files
 */
class ExcelProcessor {
    /**
     * Read Excel file and return data
     * @param {string} filePath - Path to Excel file
     * @returns {Object} - Result object with success status and data
     */
    static readExcelFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            
            return {
                success: true,
                data: data,
                count: data.length,
                columns: Object.keys(data[0] || {}),
                file: path.basename(filePath),
                sheetName: sheetName,
                lastModified: fs.statSync(filePath).mtime
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                file: path.basename(filePath),
                data: null,
                count: 0
            };
        }
    }

    /**
     * Write data to Excel file
     * @param {Array} data - Data to write
     * @param {string} filePath - Output file path
     * @param {string} sheetName - Sheet name (optional)
     * @returns {Object} - Result object
     */
    static writeExcelFile(data, filePath, sheetName = 'Sheet1') {
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            XLSX.writeFile(workbook, filePath);
            
            return {
                success: true,
                file: path.basename(filePath),
                count: data.length,
                path: filePath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                file: path.basename(filePath)
            };
        }
    }

    /**
     * Validate Excel file structure for EU projects
     * @param {Array} data - Excel data
     * @returns {Object} - Validation result
     */
    static validateEUStructure(data) {
        const requiredColumns = ['Title', 'URL', 'Status'];
        const optionalColumns = ['Start_date', 'Deadline', 'Pertinence', 'Matching Word(s)', 'Pertinence LLM', 'Résumé LLM'];
        
        if (!data || data.length === 0) {
            return {
                valid: false,
                error: 'No data found in Excel file'
            };
        }

        const columns = Object.keys(data[0]);
        const missingRequired = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingRequired.length > 0) {
            return {
                valid: false,
                error: `Missing required columns: ${missingRequired.join(', ')}`,
                missingColumns: missingRequired
            };
        }

        return {
            valid: true,
            columns: columns,
            requiredColumns: requiredColumns,
            optionalColumns: optionalColumns.filter(col => columns.includes(col)),
            rowCount: data.length
        };
    }

    /**
     * Validate Excel file structure for UK projects
     * @param {Array} data - Excel data
     * @returns {Object} - Validation result
     */
    static validateUKStructure(data) {
        const requiredColumns = ['Titre', 'Lien'];
        const optionalColumns = ['Status', 'Pertinence', 'Matching Word(s)', 'Pertinence LLM', 'Résumé LLM'];
        
        if (!data || data.length === 0) {
            return {
                valid: false,
                error: 'No data found in Excel file'
            };
        }

        const columns = Object.keys(data[0]);
        const missingRequired = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingRequired.length > 0) {
            return {
                valid: false,
                error: `Missing required columns: ${missingRequired.join(', ')}`,
                missingColumns: missingRequired
            };
        }

        return {
            valid: true,
            columns: columns,
            requiredColumns: requiredColumns,
            optionalColumns: optionalColumns.filter(col => columns.includes(col)),
            rowCount: data.length
        };
    }

    /**
     * Clean and normalize data
     * @param {Array} data - Raw data
     * @param {string} type - 'eu' or 'uk'
     * @returns {Array} - Cleaned data
     */
    static cleanData(data, type) {
        if (!data || data.length === 0) return [];

        return data.map(row => {
            const cleanedRow = {};
            
            // Remove empty values and trim strings
            Object.keys(row).forEach(key => {
                let value = row[key];
                
                if (typeof value === 'string') {
                    value = value.trim();
                    if (value === '' || value === 'null' || value === 'undefined') {
                        value = null;
                    }
                }
                
                cleanedRow[key] = value;
            });

            // Type-specific cleaning
            if (type === 'eu') {
                // Normalize date formats
                if (cleanedRow.Start_date) {
                    cleanedRow.Start_date = this.normalizeDate(cleanedRow.Start_date);
                }
                if (cleanedRow.Deadline) {
                    cleanedRow.Deadline = this.normalizeDate(cleanedRow.Deadline);
                }
            }

            return cleanedRow;
        });
    }

    /**
     * Normalize date format
     * @param {string|Date} dateValue - Date value
     * @returns {string|null} - Normalized date string (YYYY-MM-DD) or null
     */
    static normalizeDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (error) {
            return null;
        }
    }

    /**
     * Get file statistics
     * @param {string} filePath - Path to file
     * @returns {Object} - File statistics
     */
    static getFileStats(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return {
                    exists: false,
                    error: 'File not found'
                };
            }

            const stats = fs.statSync(filePath);
            return {
                exists: true,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Compare two Excel files
     * @param {string} file1Path - First file path
     * @param {string} file2Path - Second file path
     * @returns {Object} - Comparison result
     */
    static compareFiles(file1Path, file2Path) {
        try {
            const file1 = this.readExcelFile(file1Path);
            const file2 = this.readExcelFile(file2Path);

            if (!file1.success || !file2.success) {
                return {
                    success: false,
                    error: 'Failed to read one or both files'
                };
            }

            return {
                success: true,
                file1: {
                    name: file1.file,
                    count: file1.count,
                    columns: file1.columns
                },
                file2: {
                    name: file2.file,
                    count: file2.count,
                    columns: file2.columns
                },
                differences: {
                    rowCountDiff: file2.count - file1.count,
                    columnsDiff: {
                        added: file2.columns.filter(col => !file1.columns.includes(col)),
                        removed: file1.columns.filter(col => !file2.columns.includes(col))
                    }
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ExcelProcessor;
