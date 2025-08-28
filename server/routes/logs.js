const express = require('express');
const router = express.Router();
const logViewer = require('../utils/logViewer');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Apply authentication and authorization to all routes
router.use('/', protect);
router.use('/', authorize(['admin'])); // Only admins can view logs

// Get log files list
router.get('/files', (req, res) => {
  try {
    const files = logViewer.getLogFiles();
    res.json({
      success: true,
      data: files,
      message: 'Log files retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get log files',
      error: error.message
    });
  }
});

// Get recent logs with filtering
router.get('/recent', (req, res) => {
  try {
    const {
      hours = 24,
      level = null,
      operation = null,
      userId = null,
      limit = 1000
    } = req.query;

    const logs = logViewer.getRecentLogs({
      hours: parseInt(hours),
      level,
      operation,
      userId: userId ? parseInt(userId) : null,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      message: 'Recent logs retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent logs',
      error: error.message
    });
  }
});

// Get log statistics
router.get('/stats', (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const stats = logViewer.getLogStats(parseInt(hours));

    res.json({
      success: true,
      data: stats,
      message: 'Log statistics retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get log statistics',
      error: error.message
    });
  }
});

// Search logs
router.get('/search', (req, res) => {
  try {
    const { query, hours = 24 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = logViewer.searchLogs(query, parseInt(hours));

    res.json({
      success: true,
      data: results,
      count: results.length,
      message: 'Log search completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search logs',
      error: error.message
    });
  }
});

// Get error logs
router.get('/errors', (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const errors = logViewer.getErrorLogs(parseInt(hours));

    res.json({
      success: true,
      data: errors,
      count: errors.length,
      message: 'Error logs retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get error logs',
      error: error.message
    });
  }
});

// Get performance logs
router.get('/performance', (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const performance = logViewer.getPerformanceLogs(parseInt(hours));

    res.json({
      success: true,
      data: performance,
      count: performance.length,
      message: 'Performance logs retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get performance logs',
      error: error.message
    });
  }
});

// Get user logs
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { hours = 24 } = req.query;
    const logs = logViewer.getUserLogs(parseInt(userId), parseInt(hours));

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      message: 'User logs retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user logs',
      error: error.message
    });
  }
});

// Export logs
router.post('/export', (req, res) => {
  try {
    const { hours = 24, level = null, operation = null, userId = null } = req.body;
    
    const exportPath = logViewer.exportLogs({
      hours: parseInt(hours),
      level,
      operation,
      userId: userId ? parseInt(userId) : null
    });

    res.json({
      success: true,
      data: { exportPath },
      message: 'Logs exported successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export logs',
      error: error.message
    });
  }
});

// Clear old logs
router.delete('/clear', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const deletedCount = logViewer.clearOldLogs(parseInt(days));

    res.json({
      success: true,
      data: { deletedCount },
      message: `Cleared ${deletedCount} old log files`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear old logs',
      error: error.message
    });
  }
});

module.exports = router; 