const fs = require('fs');
const path = require('path');
const os = require('os');

class LogViewer {
  constructor() {
    this.APP_DATA_DIR = path.join(os.homedir(), '.urcash');
    this.LOGS_DIR = path.join(this.APP_DATA_DIR, 'logs');
  }

  /**
   * Get all available log files
   */
  getLogFiles() {
    if (!fs.existsSync(this.LOGS_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(this.LOGS_DIR);
    return files
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(this.LOGS_DIR, file),
        date: file.replace('app-', '').replace('.log', ''),
        size: fs.statSync(path.join(this.LOGS_DIR, file)).size
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Read log file and parse entries
   */
  readLogFile(filePath, limit = 1000) {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    return lines
      .slice(-limit) // Get last N lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { timestamp: new Date().toISOString(), level: 'ERROR', message: 'Invalid log entry', data: line };
        }
      })
      .filter(entry => entry && entry.timestamp);
  }

  /**
   * Get recent logs with filtering
   */
  getRecentLogs(options = {}) {
    const {
      hours = 24,
      level = null,
      operation = null,
      userId = null,
      limit = 1000
    } = options;

    const logFiles = this.getLogFiles();
    const allLogs = [];
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    for (const file of logFiles) {
      const logs = this.readLogFile(file.path, limit);
      
      for (const log of logs) {
        const logTime = new Date(log.timestamp);
        
        // Filter by time
        if (logTime < cutoffTime) continue;
        
        // Filter by level
        if (level && log.level !== level) continue;
        
        // Filter by operation
        if (operation && log.message && !log.message.includes(operation)) continue;
        
        // Filter by user ID
        if (userId && log.data && log.data.userId !== userId) continue;
        
        allLogs.push(log);
      }
    }

    return allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Get log statistics
   */
  getLogStats(hours = 24) {
    const logs = this.getRecentLogs({ hours });
    
    const stats = {
      total: logs.length,
      byLevel: {},
      byOperation: {},
      byUser: {},
      errors: [],
      warnings: [],
      performance: []
    };

    for (const log of logs) {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by operation
      if (log.message) {
        const operation = log.message.split('_')[0];
        stats.byOperation[operation] = (stats.byOperation[operation] || 0) + 1;
      }
      
      // Count by user
      if (log.data && log.data.userId) {
        stats.byUser[log.data.userId] = (stats.byUser[log.data.userId] || 0) + 1;
      }
      
      // Collect errors
      if (log.level === 'ERROR') {
        stats.errors.push(log);
      }
      
      // Collect warnings
      if (log.level === 'WARN') {
        stats.warnings.push(log);
      }
      
      // Collect performance logs
      if (log.message && log.message.includes('PERFORMANCE')) {
        stats.performance.push(log);
      }
    }

    return stats;
  }

  /**
   * Search logs
   */
  searchLogs(query, hours = 24) {
    const logs = this.getRecentLogs({ hours });
    const results = [];
    
    for (const log of logs) {
      const searchText = JSON.stringify(log).toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push(log);
      }
    }
    
    return results;
  }

  /**
   * Get logs for specific user
   */
  getUserLogs(userId, hours = 24) {
    return this.getRecentLogs({ hours, userId });
  }

  /**
   * Get error logs
   */
  getErrorLogs(hours = 24) {
    return this.getRecentLogs({ hours, level: 'ERROR' });
  }

  /**
   * Get performance logs
   */
  getPerformanceLogs(hours = 24) {
    const logs = this.getRecentLogs({ hours });
    return logs.filter(log => log.message && log.message.includes('PERFORMANCE'));
  }

  /**
   * Clear old log files (older than days)
   */
  clearOldLogs(days = 30) {
    const logFiles = this.getLogFiles();
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    let deletedCount = 0;

    for (const file of logFiles) {
      const fileDate = new Date(file.date);
      if (fileDate < cutoffDate) {
        try {
          fs.unlinkSync(file.path);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete log file ${file.name}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Export logs to JSON
   */
  exportLogs(options = {}) {
    const logs = this.getRecentLogs(options);
    const exportPath = path.join(this.LOGS_DIR, `export-${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      fs.writeFileSync(exportPath, JSON.stringify(logs, null, 2));
      return exportPath;
    } catch (error) {
      throw new Error(`Failed to export logs: ${error.message}`);
    }
  }
}

module.exports = new LogViewer(); 