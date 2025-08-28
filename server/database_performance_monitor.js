const db = require('./database');
const logger = require('./utils/logger');

/**
 * Database Performance Monitor
 * Tracks query performance and provides optimization insights
 */
class DatabasePerformanceMonitor {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      peakQueryTime: 0,
      totalQueryTime: 0
    };
  }

  /**
   * Start monitoring a query
   */
  startQuery(sql, params = []) {
    const queryId = this.generateQueryId();
    const startTime = process.hrtime.bigint();
    
    return {
      queryId,
      sql,
      params,
      startTime,
      finish: (result, error) => this.finishQuery(queryId, sql, params, startTime, result, error)
    };
  }

  /**
   * Finish monitoring a query
   */
  finishQuery(queryId, sql, params, startTime, result, error) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Update performance metrics
    this.performanceMetrics.totalQueries++;
    this.performanceMetrics.totalQueryTime += duration;
    this.performanceMetrics.averageQueryTime = this.performanceMetrics.totalQueryTime / this.performanceMetrics.totalQueries;
    
    if (duration > this.performanceMetrics.peakQueryTime) {
      this.performanceMetrics.peakQueryTime = duration;
    }

    // Track slow queries (over 100ms)
    if (duration > 100) {
      this.performanceMetrics.slowQueries++;
      this.slowQueries.push({
        queryId,
        sql: this.sanitizeSQL(sql),
        params,
        duration,
        timestamp: new Date().toISOString(),
        error: error ? error.message : null
      });

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      logger.warn(`Slow query detected: ${duration.toFixed(2)}ms`, {
        sql: this.sanitizeSQL(sql),
        params,
        duration
      });
    }

    // Track query statistics
    const queryKey = this.getQueryKey(sql);
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastExecuted: null
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastExecuted = new Date().toISOString();
  }

  /**
   * Generate unique query ID
   */
  generateQueryId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get query key for statistics
   */
  getQueryKey(sql) {
    // Remove parameters and normalize whitespace
    return sql.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize SQL for logging
   */
  sanitizeSQL(sql) {
    return sql.replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      summary: { ...this.performanceMetrics },
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      topQueries: this.getTopQueries(),
      recommendations: this.getRecommendations()
    };

    return report;
  }

  /**
   * Get top queries by execution time
   */
  getTopQueries() {
    const queries = Array.from(this.queryStats.entries())
      .map(([sql, stats]) => ({
        sql: this.sanitizeSQL(sql),
        ...stats
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);

    return queries;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];

    // Check for slow queries
    if (this.performanceMetrics.slowQueries > 0) {
      recommendations.push({
        type: 'warning',
        message: `${this.performanceMetrics.slowQueries} slow queries detected. Consider adding indexes or optimizing queries.`
      });
    }

    // Check for frequently executed queries
    const frequentQueries = Array.from(this.queryStats.entries())
      .filter(([sql, stats]) => stats.count > 100)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    if (frequentQueries.length > 0) {
      recommendations.push({
        type: 'info',
        message: 'Consider adding indexes for frequently executed queries.',
        queries: frequentQueries.map(([sql, stats]) => ({
          sql: this.sanitizeSQL(sql),
          count: stats.count
        }))
      });
    }

    // Check for queries without indexes
    const queriesWithoutIndexes = this.identifyQueriesWithoutIndexes();
    if (queriesWithoutIndexes.length > 0) {
      recommendations.push({
        type: 'warning',
        message: 'Consider adding indexes for these queries:',
        queries: queriesWithoutIndexes
      });
    }

    return recommendations;
  }

  /**
   * Identify queries that might benefit from indexes
   */
  identifyQueriesWithoutIndexes() {
    const suspiciousQueries = [];
    
    for (const [sql, stats] of this.queryStats.entries()) {
      const normalizedSQL = sql.toLowerCase();
      
      // Check for SELECT queries with WHERE clauses
      if (normalizedSQL.includes('select') && normalizedSQL.includes('where')) {
        // Look for common patterns that might need indexes
        const patterns = [
          /where\s+(\w+)\s*=\s*\?/g,
          /where\s+(\w+)\s*>\s*\?/g,
          /where\s+(\w+)\s*<\s*\?/g,
          /where\s+(\w+)\s*like\s*\?/g,
          /order\s+by\s+(\w+)/g,
          /group\s+by\s+(\w+)/g
        ];

        for (const pattern of patterns) {
          const matches = sql.match(pattern);
          if (matches && stats.averageTime > 50) {
            suspiciousQueries.push({
              sql: this.sanitizeSQL(sql),
              pattern: pattern.source,
              averageTime: stats.averageTime,
              count: stats.count
            });
            break;
          }
        }
      }
    }

    return suspiciousQueries.slice(0, 5);
  }

  /**
   * Reset performance metrics
   */
  reset() {
    this.queryStats.clear();
    this.slowQueries = [];
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      peakQueryTime: 0,
      totalQueryTime: 0
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const connection = db.db || db.reconnect();
      
      const stats = {
        tables: {},
        indexes: {},
        storage: {},
        performance: {}
      };

      // Get table statistics
      const tables = connection.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      for (const table of tables) {
        const tableName = table.name;
        const rowCount = connection.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;
        const tableInfo = connection.prepare(`PRAGMA table_info(${tableName})`).all();
        
        stats.tables[tableName] = {
          rowCount,
          columns: tableInfo.length,
          columns_info: tableInfo
        };
      }

      // Get index statistics
      const indexes = connection.prepare(`
        SELECT name, tbl_name, sql FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();

      for (const index of indexes) {
        stats.indexes[index.name] = {
          table: index.tbl_name,
          definition: index.sql
        };
      }

      // Get storage statistics
      const dbPath = connection.name;
      const fs = require('fs');
      if (fs.existsSync(dbPath)) {
        const stats_info = fs.statSync(dbPath);
        stats.storage = {
          size: stats_info.size,
          size_mb: (stats_info.size / 1024 / 1024).toFixed(2),
          created: stats_info.birthtime,
          modified: stats_info.mtime
        };
      }

      // Get performance statistics
      try {
        const pragmaStats = connection.prepare('PRAGMA stats').all();
        stats.performance = {
          cache_hits: 0,
          cache_misses: 0,
          page_count: 0,
          page_size: 0
        };

        for (const stat of pragmaStats) {
          if (stat.stat === 'cache_hits') stats.performance.cache_hits = stat.value;
          if (stat.stat === 'cache_misses') stats.performance.cache_misses = stat.value;
          if (stat.stat === 'page_count') stats.performance.page_count = stat.value;
          if (stat.stat === 'page_size') stats.performance.page_size = stat.value;
        }
      } catch (error) {
        // PRAGMA stats might not be available in all SQLite versions
        stats.performance = {
          cache_hits: 0,
          cache_misses: 0,
          page_count: 0,
          page_size: 0
        };
      }

      return stats;
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions() {
    const suggestions = [];
    const dbStats = await this.getDatabaseStats();

    // Check for large tables without proper indexes
    for (const [tableName, tableInfo] of Object.entries(dbStats.tables)) {
      if (tableInfo.rowCount > 1000) {
        const tableIndexes = Object.values(dbStats.indexes)
          .filter(index => index.table === tableName);
        
        if (tableIndexes.length < 2) {
          suggestions.push({
            type: 'warning',
            table: tableName,
            message: `Large table (${tableInfo.rowCount} rows) with few indexes. Consider adding indexes for frequently queried columns.`
          });
        }
      }
    }

    // Check for missing foreign key indexes
    for (const [tableName, tableInfo] of Object.entries(dbStats.tables)) {
      const foreignKeyColumns = tableInfo.columns_info
        .filter(col => col.name.endsWith('_id') && col.name !== 'id');
      
      for (const column of foreignKeyColumns) {
        const hasIndex = Object.values(dbStats.indexes)
          .some(index => index.table === tableName && index.definition.includes(column.name));
        
        if (!hasIndex) {
          suggestions.push({
            type: 'info',
            table: tableName,
            column: column.name,
            message: `Consider adding index on foreign key column: ${column.name}`
          });
        }
      }
    }

    // Check database size
    if (dbStats.storage.size_mb > 100) {
      suggestions.push({
        type: 'info',
        message: `Database size is ${dbStats.storage.size_mb}MB. Consider implementing data archiving for old records.`
      });
    }

    return suggestions;
  }
}

// Create singleton instance
const performanceMonitor = new DatabasePerformanceMonitor();

// Export the monitor and helper functions
module.exports = {
  performanceMonitor,
  DatabasePerformanceMonitor,
  
  // Helper function to wrap database queries with monitoring
  monitorQuery: (sql, params = []) => {
    const monitor = performanceMonitor.startQuery(sql, params);
    
    return {
      execute: async (connection) => {
        try {
          const result = connection.prepare(sql).all(params);
          monitor.finish(result, null);
          return result;
        } catch (error) {
          monitor.finish(null, error);
          throw error;
        }
      },
      
      executeOne: async (connection) => {
        try {
          const result = connection.prepare(sql).get(params);
          monitor.finish(result, null);
          return result;
        } catch (error) {
          monitor.finish(null, error);
          throw error;
        }
      },
      
      run: async (connection) => {
        try {
          const result = connection.prepare(sql).run(params);
          monitor.finish(result, null);
          return result;
        } catch (error) {
          monitor.finish(null, error);
          throw error;
        }
      }
    };
  }
}; 