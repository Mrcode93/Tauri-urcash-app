const db = require('../database');
const logger = require('../utils/logger');

class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  create(data) {
    try {
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(data);

      const lastId = db.insert(
        `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      return this.getById(lastId);
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.create:`, err);
      throw err;
    }
  }

  getAll({ filters = {}, page = 1, limit = 50 } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let query = `SELECT * FROM ${this.tableName}`;
      const values = [];

      // Add filters if any
      if (Object.keys(filters).length > 0) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, _]) => `${key} = ?`);

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
          values.push(...Object.values(filters).filter(value => value !== undefined));
        }
      }

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      values.push(limit, offset);

      const items = db.query(query, values);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const countValues = [];
      
      if (Object.keys(filters).length > 0) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value !== undefined)
          .map(([key, _]) => `${key} = ?`);

        if (conditions.length > 0) {
          countQuery += ' WHERE ' + conditions.join(' AND ');
          countValues.push(...Object.values(filters).filter(value => value !== undefined));
        }
      }
      
      const totalResult = db.queryOne(countQuery, countValues);
      const total = totalResult.total;
      const hasMore = (page * limit) < total;

      return {
        items,
        total,
        hasMore,
        page,
        limit
      };
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.getAll:`, err);
      throw err;
    }
  }

  getById(id) {
    try {
      return db.queryOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.getById:`, err);
      throw err;
    }
  }

  update(id, data) {
    try {
      const fields = Object.keys(data);
      if (fields.length === 0) return null;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const changes = db.update(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
        values
      );

      return changes > 0 ? this.getById(id) : null;
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.update:`, err);
      throw err;
    }
  }

  delete(id) {
    try {
      const changes = db.update(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
      return changes > 0;
    } catch (err) {
      logger.error(`Error in ${this.constructor.name}.delete:`, err);
      throw err;
    }
  }
}

module.exports = BaseService;