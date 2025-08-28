#!/usr/bin/env node

const { performanceMonitor } = require('./database_performance_monitor');
const db = require('./database');
const logger = require('./utils/logger');

/**
 * Database Performance Dashboard
 * Displays real-time performance metrics and optimization suggestions
 */

class PerformanceDashboard {
  constructor() {
    this.refreshInterval = 5000; // 5 seconds
    this.isRunning = false;
  }

  /**
   * Start the performance dashboard
   */
  async start() {
    console.clear();
    
    
    
    this.isRunning = true;
    
    // Initial display
    await this.displayDashboard();
    
    // Set up auto-refresh
    this.refreshTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.displayDashboard();
      }
    }, this.refreshInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop the dashboard
   */
  stop() {
    this.isRunning = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
  }

  /**
   * Display the main dashboard
   */
  async displayDashboard() {
    try {
      // Get performance data
      const performanceReport = performanceMonitor.getPerformanceReport();
      const dbStats = await performanceMonitor.getDatabaseStats();
      const suggestions = await performanceMonitor.generateOptimizationSuggestions();
      
      // Clear screen and show timestamp
      console.clear();
      
      
      
      
      // Display performance metrics
      this.displayPerformanceMetrics(performanceReport);
      
      // Display database statistics
      this.displayDatabaseStats(dbStats);
      
      // Display optimization suggestions
      this.displayOptimizationSuggestions(suggestions);
      
      // Display recent slow queries
      this.displaySlowQueries(performanceReport.slowQueries);
      
      // Display top queries
      this.displayTopQueries(performanceReport.topQueries);
      
      // Display controls
      this.displayControls();
      
    } catch (error) {
      console.error('❌ Error updating dashboard:', error.message);
    }
  }

  /**
   * Display performance metrics
   */
  displayPerformanceMetrics(report) {
    
    
    
    const { summary } = report;
    
    // Calculate performance indicators
    const avgResponseTime = summary.averageQueryTime.toFixed(2);
    const slowQueryPercentage = summary.totalQueries > 0 
      ? ((summary.slowQueries / summary.totalQueries) * 100).toFixed(1)
      : '0.0';
    
    // Performance status
    let performanceStatus = '🟢 EXCELLENT';
    let statusColor = '\x1b[32m'; // Green
    
    if (summary.averageQueryTime > 100) {
      performanceStatus = '🔴 POOR';
      statusColor = '\x1b[31m'; // Red
    } else if (summary.averageQueryTime > 50) {
      performanceStatus = '🟡 GOOD';
      statusColor = '\x1b[33m'; // Yellow
    }
    
    
    
    
    
    
    
  }

  /**
   * Display database statistics
   */
  displayDatabaseStats(stats) {
    
    
    
    
    
    
    
    // Calculate index coverage
    const totalColumns = Object.values(stats.tables).reduce((sum, table) => sum + table.columns, 0);
    const indexCoverage = totalColumns > 0 ? ((Object.keys(stats.indexes).length / totalColumns) * 100).toFixed(1) : '0.0';
    
    
    
    // Show largest tables
    const largestTables = Object.entries(stats.tables)
      .sort((a, b) => b[1].rowCount - a[1].rowCount)
      .slice(0, 5);
    
    
    largestTables.forEach(([tableName, tableInfo]) => {
      
    });
    
    
  }

  /**
   * Display optimization suggestions
   */
  displayOptimizationSuggestions(suggestions) {
    
    
    
    if (suggestions.length === 0) {
      
      return;
    }
    
    suggestions.forEach((suggestion, index) => {
      const icon = suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
      
      
      if (suggestion.table) {
        
      }
      if (suggestion.column) {
        
      }
    });
    
    
  }

  /**
   * Display recent slow queries
   */
  displaySlowQueries(slowQueries) {
    
    
    
    if (slowQueries.length === 0) {
      
      return;
    }
    
    // Show last 5 slow queries
    const recentSlowQueries = slowQueries.slice(-5);
    
    recentSlowQueries.forEach((query, index) => {
      
      
      if (query.error) {
        
      }
      
    });
  }

  /**
   * Display top queries by execution time
   */
  displayTopQueries(topQueries) {
    
    
    
    if (topQueries.length === 0) {
      
      return;
    }
    
    // Show top 5 queries
    const top5Queries = topQueries.slice(0, 5);
    
    top5Queries.forEach((query, index) => {
      
      
      
      
    });
  }

  /**
   * Display dashboard controls
   */
  displayControls() {
    
    
    
    
    
  }

  /**
   * Generate detailed performance report
   */
  async generateDetailedReport() {
    
    
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
        suggestions: suggestions,
        recommendations: this.generateRecommendations(performanceReport, dbStats)
      };
      
      // Save report to file
      const fs = require('fs');
      const path = require('path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(process.cwd(), `performance_report_${timestamp}.json`);
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      
      
      
      
      
      
      
      
      
      
    } catch (error) {
      console.error('❌ Error generating report:', error.message);
    }
  }

  /**
   * Generate recommendations based on performance data
   */
  generateRecommendations(performanceReport, dbStats) {
    const recommendations = [];
    
    // Performance recommendations
    if (performanceReport.summary.averageQueryTime > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Performance',
        message: 'Average query response time is high. Consider adding indexes or optimizing queries.',
        action: 'Review slow queries and add appropriate indexes'
      });
    }
    
    if (performanceReport.summary.slowQueries > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        message: `${performanceReport.summary.slowQueries} slow queries detected.`,
        action: 'Analyze slow queries and optimize them'
      });
    }
    
    // Database recommendations
    const indexCoverage = Object.keys(dbStats.indexes).length / Object.keys(dbStats.tables).length;
    if (indexCoverage < 2) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Database',
        message: 'Low index coverage detected.',
        action: 'Add indexes for frequently queried columns'
      });
    }
    
    if (parseFloat(dbStats.storage.size_mb) > 100) {
      recommendations.push({
        priority: 'LOW',
        category: 'Database',
        message: 'Database size is large. Consider archiving old data.',
        action: 'Implement data archiving strategy'
      });
    }
    
    return recommendations;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    performanceMonitor.reset();
    
  }
}

// Command line interface
async function main() {
  const dashboard = new PerformanceDashboard();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    process.exit(0);
  }
  
  if (args.includes('--report')) {
    await dashboard.generateDetailedReport();
    process.exit(0);
  }
  
  if (args.includes('--reset')) {
    dashboard.resetMetrics();
    process.exit(0);
  }
  
  // Start the dashboard
  await dashboard.start();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceDashboard; 