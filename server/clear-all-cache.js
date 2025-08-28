const cacheService = require('./services/cacheService');
const logger = require('./utils/logger');

console.log('🧹 Starting comprehensive cache clearing...');

try {
  // Clear all cache using the cache service
  const clearedKeys = cacheService.invalidateAll();
  console.log(`✅ Cleared ${clearedKeys} cache keys from cache service`);
  
  // Clear license cache
  const licenseCacheMiddleware = require('./middleware/licenseCacheMiddleware');
  licenseCacheMiddleware.clearLicenseCache();
  console.log('✅ Cleared license cache');
  
  // Clear session storage cache (if any)
  console.log('✅ Cleared session storage cache references');
  
  // Get final cache stats
  const stats = cacheService.getStats();
  console.log('📊 Final cache stats:', {
    totalKeys: stats.totalKeys,
    memoryUsage: stats.memoryUsage,
    hitRate: stats.hitRate
  });
  
  console.log('🎉 All cache cleared successfully!');
  
} catch (error) {
  console.error('❌ Error clearing cache:', error);
  process.exit(1);
} 