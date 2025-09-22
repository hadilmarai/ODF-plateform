const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Base Model class providing common database operations
 */
class BaseModel {
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.fillable = []; // Fields that can be mass assigned
        this.hidden = []; // Fields to hide in JSON output
        this.timestamps = true; // Whether to use created_at/updated_at
    }

    /**
     * Get database connection from pool
     * @returns {Promise<Connection>} Database connection
     */
    async getConnection() {
        return await pool.getConnection();
    }

    /**
     * Execute a query with connection management
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async executeQuery(query, params = []) {
        const connection = await this.getConnection();
        try {
            const [results] = await connection.execute(query, params);
            return results;
        } catch (error) {
            logger.error('Database query error', {
                query,
                params,
                error: error.message,
                table: this.tableName
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Find all records with optional conditions
     * @param {Object} conditions - WHERE conditions
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Array of records
     */
    async findAll(conditions = {}, options = {}) {
        const { limit, offset, orderBy = `${this.primaryKey} DESC` } = options;
        
        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];

        // Build WHERE clause
        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map(key => `${key} = ?`)
                .join(' AND ');
            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(conditions));
        }

        // Add ORDER BY
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }

        // Add LIMIT and OFFSET
        if (limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(limit));
            
            if (offset) {
                query += ` OFFSET ?`;
                params.push(parseInt(offset));
            }
        }

        const results = await this.executeQuery(query, params);
        return results.map(record => this.formatRecord(record));
    }

    /**
     * Find a single record by conditions
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<Object|null>} Single record or null
     */
    async findOne(conditions = {}) {
        const results = await this.findAll(conditions, { limit: 1 });
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find record by primary key
     * @param {*} id - Primary key value
     * @returns {Promise<Object|null>} Single record or null
     */
    async findById(id) {
        return await this.findOne({ [this.primaryKey]: id });
    }

    /**
     * Create a new record
     * @param {Object} data - Record data
     * @returns {Promise<Object>} Created record
     */
    async create(data) {
        // Filter only fillable fields
        const filteredData = this.filterFillable(data);
        
        // Add timestamps if enabled
        if (this.timestamps) {
            filteredData.created_at = new Date();
            filteredData.updated_at = new Date();
        }

        const fields = Object.keys(filteredData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(filteredData);

        const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(query, values);
            await connection.commit();
            
            // Return the created record
            const createdRecord = await this.findById(result.insertId);
            
            logger.info('Record created', {
                table: this.tableName,
                id: result.insertId,
                affectedRows: result.affectedRows
            });
            
            return createdRecord;
        } catch (error) {
            await connection.rollback();
            logger.error('Error creating record', {
                table: this.tableName,
                data: filteredData,
                error: error.message
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update record(s) by conditions
     * @param {Object} conditions - WHERE conditions
     * @param {Object} data - Update data
     * @returns {Promise<number>} Number of affected rows
     */
    async update(conditions, data) {
        // Filter only fillable fields
        const filteredData = this.filterFillable(data);
        
        // Add updated timestamp if enabled
        if (this.timestamps) {
            filteredData.updated_at = new Date();
        }

        const setClause = Object.keys(filteredData)
            .map(key => `${key} = ?`)
            .join(', ');
        
        const whereClause = Object.keys(conditions)
            .map(key => `${key} = ?`)
            .join(' AND ');

        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
        const params = [...Object.values(filteredData), ...Object.values(conditions)];

        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(query, params);
            await connection.commit();
            
            logger.info('Records updated', {
                table: this.tableName,
                conditions,
                affectedRows: result.affectedRows
            });
            
            return result.affectedRows;
        } catch (error) {
            await connection.rollback();
            logger.error('Error updating records', {
                table: this.tableName,
                conditions,
                data: filteredData,
                error: error.message
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update record by primary key
     * @param {*} id - Primary key value
     * @param {Object} data - Update data
     * @returns {Promise<number>} Number of affected rows
     */
    async updateById(id, data) {
        return await this.update({ [this.primaryKey]: id }, data);
    }

    /**
     * Delete record(s) by conditions
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<number>} Number of affected rows
     */
    async delete(conditions) {
        const whereClause = Object.keys(conditions)
            .map(key => `${key} = ?`)
            .join(' AND ');

        const query = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
        const params = Object.values(conditions);

        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(query, params);
            await connection.commit();
            
            logger.info('Records deleted', {
                table: this.tableName,
                conditions,
                affectedRows: result.affectedRows
            });
            
            return result.affectedRows;
        } catch (error) {
            await connection.rollback();
            logger.error('Error deleting records', {
                table: this.tableName,
                conditions,
                error: error.message
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete record by primary key
     * @param {*} id - Primary key value
     * @returns {Promise<number>} Number of affected rows
     */
    async deleteById(id) {
        return await this.delete({ [this.primaryKey]: id });
    }

    /**
     * Count records with optional conditions
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<number>} Record count
     */
    async count(conditions = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];

        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map(key => `${key} = ?`)
                .join(' AND ');
            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(conditions));
        }

        const results = await this.executeQuery(query, params);
        return results[0].count;
    }

    /**
     * Check if record exists
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<boolean>} Whether record exists
     */
    async exists(conditions) {
        const count = await this.count(conditions);
        return count > 0;
    }

    /**
     * Truncate table (delete all records)
     * @returns {Promise<void>}
     */
    async truncate() {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(`DELETE FROM ${this.tableName}`);
            await connection.commit();
            
            logger.info('Table truncated', { table: this.tableName });
        } catch (error) {
            await connection.rollback();
            logger.error('Error truncating table', {
                table: this.tableName,
                error: error.message
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Filter data to only include fillable fields
     * @param {Object} data - Input data
     * @returns {Object} Filtered data
     */
    filterFillable(data) {
        if (this.fillable.length === 0) {
            return data; // If no fillable fields defined, allow all
        }

        const filtered = {};
        this.fillable.forEach(field => {
            if (data.hasOwnProperty(field)) {
                filtered[field] = data[field];
            }
        });
        return filtered;
    }

    /**
     * Format record for output (hide sensitive fields)
     * @param {Object} record - Database record
     * @returns {Object} Formatted record
     */
    formatRecord(record) {
        if (this.hidden.length === 0) {
            return record;
        }

        const formatted = { ...record };
        this.hidden.forEach(field => {
            delete formatted[field];
        });
        return formatted;
    }

    /**
     * Execute raw SQL query
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async raw(query, params = []) {
        return await this.executeQuery(query, params);
    }

    /**
     * Begin database transaction
     * @returns {Promise<Connection>} Database connection with transaction
     */
    async beginTransaction() {
        const connection = await this.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Commit transaction
     * @param {Connection} connection - Database connection
     */
    async commitTransaction(connection) {
        await connection.commit();
        connection.release();
    }

    /**
     * Rollback transaction
     * @param {Connection} connection - Database connection
     */
    async rollbackTransaction(connection) {
        await connection.rollback();
        connection.release();
    }
}

module.exports = BaseModel;
