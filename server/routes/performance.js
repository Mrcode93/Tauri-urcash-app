const express = require('express');
const router = express.Router();
const { performanceMonitor } = require('../database_performance_monitor');
const logger = require('../utils/logger');

/**
 * Performance Monitoring API Routes
 * Provides database performance metrics via HTTP endpoints
 */

// Middleware to check if performance monitoring is enabled
const checkPerformanceEnabled = (req, res, next) => {
  // You can add authentication/authorization here if needed
  next();
};

/**
 * GET /api/performance/overview
 * Get performance overview
 */
router.get('/overview', checkPerformanceEnabled, async (req, res) => {
  try {
    const performanceReport = performanceMonitor.getPerformanceReport();
    
    // Calculate performance indicators
    const { summary } = performanceReport;
    const avgResponseTime = summary.averageQueryTime.toFixed(2);
    const slowQueryPercentage = summary.totalQueries > 0 
      ? ((summary.slowQueries / summary.totalQueries) * 100).toFixed(1)
      : '0.0';
    
    // Performance status
    let performanceStatus = 'excellent';
    if (summary.averageQueryTime > 100) {
      performanceStatus = 'poor';
    } else if (summary.averageQueryTime > 50) {
      performanceStatus = 'good';
    }
    
    const overview = {
      status: performanceStatus,
      metrics: {
        totalQueries: summary.totalQueries,
        averageResponseTime: parseFloat(avgResponseTime),
        slowQueries: summary.slowQueries,
        slowQueryPercentage: parseFloat(slowQueryPercentage),
        peakQueryTime: summary.peakQueryTime,
        totalQueryTime: summary.totalQueryTime
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: overview
    });
    
  } catch (error) {
    logger.error('Error getting performance overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance overview'
    });
  }
});

/**
 * GET /api/performance/database-stats
 * Get database statistics
 */
router.get('/database-stats', checkPerformanceEnabled, async (req, res) => {
  try {
    const dbStats = await performanceMonitor.getDatabaseStats();
    
    // Calculate additional metrics
    const totalColumns = Object.values(dbStats.tables).reduce((sum, table) => sum + table.columns, 0);
    const indexCoverage = totalColumns > 0 ? ((Object.keys(dbStats.indexes).length / totalColumns) * 100).toFixed(1) : '0.0';
    
    // Get largest tables
    const largestTables = Object.entries(dbStats.tables)
      .sort((a, b) => b[1].rowCount - a[1].rowCount)
      .slice(0, 10)
      .map(([name, info]) => ({
        name,
        rows: info.rowCount,
        columns: info.columns
      }));
    
    const stats = {
      storage: dbStats.storage,
      tables: {
        count: Object.keys(dbStats.tables).length,
        largest: largestTables
      },
      indexes: {
        count: Object.keys(dbStats.indexes).length,
        coverage: parseFloat(indexCoverage)
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database statistics'
    });
  }
});

/**
 * GET /api/performance/slow-queries
 * Get recent slow queries
 */
router.get('/slow-queries', checkPerformanceEnabled, (req, res) => {
  try {
    const { slowQueries } = performanceMonitor.getPerformanceReport();
    
    // Limit the number of queries returned
    const limit = parseInt(req.query.limit) || 10;
    const recentSlowQueries = slowQueries.slice(-limit);
    
    res.json({
      success: true,
      data: {
        queries: recentSlowQueries,
        total: slowQueries.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting slow queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get slow queries'
    });
  }
});

/**
 * GET /api/performance/top-queries
 * Get top queries by execution time
 */
router.get('/top-queries', checkPerformanceEnabled, (req, res) => {
  try {
    const { topQueries } = performanceMonitor.getPerformanceReport();
    
    // Limit the number of queries returned
    const limit = parseInt(req.query.limit) || 10;
    const topQueriesLimited = topQueries.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        queries: topQueriesLimited,
        total: topQueries.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting top queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top queries'
    });
  }
});

/**
 * GET /api/performance/suggestions
 * Get optimization suggestions
 */
router.get('/suggestions', checkPerformanceEnabled, async (req, res) => {
  try {
    const suggestions = await performanceMonitor.generateOptimizationSuggestions();
    
    res.json({
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting optimization suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization suggestions'
    });
  }
});

/**
 * GET /api/performance/full-report
 * Get complete performance report
 */
router.get('/full-report', checkPerformanceEnabled, async (req, res) => {
  try {
    const performanceReport = performanceMonitor.getPerformanceReport();
    const dbStats = await performanceMonitor.getDatabaseStats();
    const suggestions = await performanceMonitor.generateOptimizationSuggestions();
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: performanceReport.summary,
      database: {
        size: dbStats.storage.size_mb,
        tables: Object.keys(dbStats.tables).length,
        indexes: Object.keys(dbStats.indexes).length,
        largestTables: Object.entries(dbStats.tables)
          .sort((a, b) => b[1].rowCount - a[1].rowCount)
          .slice(0, 10)
          .map(([name, info]) => ({ name, rows: info.rowCount }))
      },
      slowQueries: performanceReport.slowQueries.slice(-10),
      topQueries: performanceReport.topQueries.slice(0, 10),
      suggestions: suggestions
    };
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    logger.error('Error getting full performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get full performance report'
    });
  }
});

/**
 * POST /api/performance/reset
 * Reset performance metrics
 */
router.post('/reset', checkPerformanceEnabled, (req, res) => {
  try {
    performanceMonitor.reset();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error resetting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance metrics'
    });
  }
});

/**
 * GET /api/performance/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  try {
    const performanceReport = performanceMonitor.getPerformanceReport();
    const { summary } = performanceReport;
    
    // Determine health status
    let status = 'healthy';
    let issues = [];
    
    if (summary.averageQueryTime > 100) {
      status = 'degraded';
      issues.push('High average query response time');
    }
    
    if (summary.slowQueries > 0) {
      status = 'degraded';
      issues.push(`${summary.slowQueries} slow queries detected`);
    }
    
    res.json({
      success: true,
      data: {
        status,
        issues,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
    
  } catch (error) {
    logger.error('Error checking performance health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check performance health'
    });
  }
});

module.exports = router; 