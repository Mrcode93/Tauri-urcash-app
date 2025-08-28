const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

/**
 * @route GET /api/cache/stats
 * @desc Get cache statistics
 * @access Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route GET /api/cache/keys
 * @desc Get all cache keys
 * @access Public
 */
router.get('/keys', asyncHandler(async (req, res) => {
  const keys = cacheService.getKeys();
  res.json({
    success: true,
    data: {
      keys,
      count: keys.length
    }
  });
}));

/**
 * @route GET /api/cache/memory
 * @desc Get cache memory usage
 * @access Public
 */
router.get('/memory', asyncHandler(async (req, res) => {
  const memoryUsage = cacheService.getMemoryUsage();
  res.json({
    success: true,
    data: memoryUsage
  });
}));

/**
 * @route POST /api/cache/flush
 * @desc Flush all cache
 * @access Public
 */
router.post('/flush', asyncHandler(async (req, res) => {
  cacheService.flush();
  res.json({
    success: true,
    message: 'Cache flushed successfully'
  });
}));

/**
 * @route DELETE /api/cache/key/:key
 * @desc Delete specific cache key
 * @access Public
 */
router.delete('/key/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const deleted = cacheService.del(key);
  
  if (deleted > 0) {
    res.json({
      success: true,
      message: `Cache key '${key}' deleted successfully`
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Cache key '${key}' not found`
    });
  }
}));

/**
 * @route POST /api/cache/invalidate
 * @desc Invalidate cache by pattern
 * @access Public
 */
router.post('/invalidate', asyncHandler(async (req, res) => {
  const { pattern } = req.body;
  
  if (!pattern) {
    return res.status(400).json({
      success: false,
      message: 'Pattern is required'
    });
  }
  
  const deletedCount = cacheService.invalidatePattern(pattern);
  res.json({
    success: true,
    message: `Cache invalidation completed`,
    data: {
      pattern,
      deletedCount
    }
  });
}));

/**
 * @route GET /api/cache/key/:key
 * @desc Get specific cache key value
 * @access Public
 */
router.get('/key/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const value = cacheService.get(key);
  
  if (value !== undefined) {
    res.json({
      success: true,
      data: {
        key,
        value,
        exists: true
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Cache key '${key}' not found`,
      data: {
        key,
        exists: false
      }
    });
  }
}));

/**
 * @route POST /api/cache/set
 * @desc Set cache key manually
 * @access Public
 */
router.post('/set', asyncHandler(async (req, res) => {
  const { key, value, ttl } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Key and value are required'
    });
  }
  
  const success = cacheService.set(key, value, ttl);
  
  if (success) {
    res.json({
      success: true,
      message: `Cache key '${key}' set successfully`
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to set cache key'
    });
  }
}));

/**
 * @route GET /api/cache/health
 * @desc Get cache health status
 * @access Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const stats = cacheService.getStats();
  const memoryUsage = cacheService.getMemoryUsage();
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      stats,
      memoryUsage,
      timestamp: new Date().toISOString()
    }
  });
}));

module.exports = router; 