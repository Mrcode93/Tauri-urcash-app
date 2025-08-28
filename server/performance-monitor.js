const { performance } = require('perf_hooks');
const os = require('os');
const logger = require('./utils/logger');

/**
 * Performance Monitor
 * Tracks server performance metrics and provides insights
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        slow: 0,
        errors: 0,
        averageResponseTime: 0
      },
      memory: {
        usage: [],
        peak: 0
      },
      cpu: {
        usage: [],
        peak: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    this.startTime = Date.now();
    this.isMonitoring = false;
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect metrics every 30 seconds
    
    logger.info('Performance monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    clearInterval(this.monitorInterval);
    this.isMonitoring = false;
    logger.info('Performance monitoring stopped');
  }

  collectMetrics() {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
      
      this.metrics.memory.usage.push({
        timestamp: Date.now(),
        rss: memoryMB,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });
      
      if (memoryMB > this.metrics.memory.peak) {
        this.metrics.memory.peak = memoryMB;
      }

      // CPU metrics
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      this.metrics.cpu.usage.push({
        timestamp: Date.now(),
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
        total: cpuPercent
      });
      
      if (cpuPercent > this.metrics.cpu.peak) {
        this.metrics.cpu.peak = cpuPercent;
      }

      // Keep only last 100 entries to prevent memory leaks
      if (this.metrics.memory.usage.length > 100) {
        this.metrics.memory.usage = this.metrics.memory.usage.slice(-100);
      }
      if (this.metrics.cpu.usage.length > 100) {
        this.metrics.cpu.usage = this.metrics.cpu.usage.slice(-100);
      }

    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  recordRequest(duration, isError = false) {
    this.metrics.requests.total++;
    
    if (duration > 1000) { // Slow request threshold: 1 second
      this.metrics.requests.slow++;
    }
    
    if (isError) {
      this.metrics.requests.errors++;
    }
    
    // Update average response time
    const totalTime = this.metrics.requests.averageResponseTime * (this.metrics.requests.total - 1) + duration;
    this.metrics.requests.averageResponseTime = totalTime / this.metrics.requests.total;
  }

  recordDatabaseQuery(duration) {
    this.metrics.database.queries++;
    
    if (duration > 100) { // Slow query threshold: 100ms
      this.metrics.database.slowQueries++;
    }
    
    // Update average query time
    const totalTime = this.metrics.database.averageQueryTime * (this.metrics.database.queries - 1) + duration;
    this.metrics.database.averageQueryTime = totalTime / this.metrics.database.queries;
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  getReport() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = Math.round(uptime / 1000 / 60 / 60 * 100) / 100;
    
    const currentMemory = this.metrics.memory.usage.length > 0 
      ? this.metrics.memory.usage[this.metrics.memory.usage.length - 1]
      : { rss: 0, heapUsed: 0, heapTotal: 0 };
    
    const currentCPU = this.metrics.cpu.usage.length > 0
      ? this.metrics.cpu.usage[this.metrics.cpu.usage.length - 1]
      : { total: 0 };

    return {
      uptime: {
        total: uptime,
        hours: uptimeHours,
        formatted: `${Math.floor(uptime / 1000 / 60 / 60)}h ${Math.floor((uptime / 1000 / 60) % 60)}m`
      },
      requests: {
        total: this.metrics.requests.total,
        slow: this.metrics.requests.slow,
        errors: this.metrics.requests.errors,
        averageResponseTime: Math.round(this.metrics.requests.averageResponseTime),
        slowPercentage: this.metrics.requests.total > 0 
          ? Math.round((this.metrics.requests.slow / this.metrics.requests.total) * 100)
          : 0,
        errorRate: this.metrics.requests.total > 0
          ? Math.round((this.metrics.requests.errors / this.metrics.requests.total) * 100)
          : 0
      },
      memory: {
        current: currentMemory,
        peak: this.metrics.memory.peak,
        average: this.metrics.memory.usage.length > 0
          ? Math.round(this.metrics.memory.usage.reduce((sum, m) => sum + m.rss, 0) / this.metrics.memory.usage.length)
          : 0
      },
      cpu: {
        current: currentCPU,
        peak: this.metrics.cpu.peak,
        average: this.metrics.cpu.usage.length > 0
          ? Math.round(this.metrics.cpu.usage.reduce((sum, c) => sum + c.total, 0) / this.metrics.cpu.usage.length * 100) / 100
          : 0
      },
      database: {
        queries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        averageQueryTime: Math.round(this.metrics.database.averageQueryTime),
        slowQueryPercentage: this.metrics.database.queries > 0
          ? Math.round((this.metrics.database.slowQueries / this.metrics.database.queries) * 100)
          : 0
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: Math.round(this.metrics.cache.hitRate * 100) / 100
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        loadAverage: os.loadavg()
      }
    };
  }

  getHealthStatus() {
    const report = this.getReport();
    
    const issues = [];
    
    // Check for performance issues
    if (report.requests.averageResponseTime > 500) {
      issues.push(`High average response time: ${report.requests.averageResponseTime}ms`);
    }
    
    if (report.requests.slowPercentage > 10) {
      issues.push(`High slow request rate: ${report.requests.slowPercentage}%`);
    }
    
    if (report.requests.errorRate > 5) {
      issues.push(`High error rate: ${report.requests.errorRate}%`);
    }
    
    if (report.memory.current.rss > 500) {
      issues.push(`High memory usage: ${report.memory.current.rss}MB`);
    }
    
    if (report.database.slowQueryPercentage > 20) {
      issues.push(`High slow query rate: ${report.database.slowQueryPercentage}%`);
    }
    
    if (report.cache.hitRate < 50) {
      issues.push(`Low cache hit rate: ${report.cache.hitRate}%`);
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        slow: 0,
        errors: 0,
        averageResponseTime: 0
      },
      memory: {
        usage: [],
        peak: 0
      },
      cpu: {
        usage: [],
        peak: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    this.startTime = Date.now();
    logger.info('Performance metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring
performanceMonitor.start();

module.exports = performanceMonitor; 