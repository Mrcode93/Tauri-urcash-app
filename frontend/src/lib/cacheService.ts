interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl: number = 300000): void {
    try {
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl
      });
      this.stats.sets++;
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key);
      if (!item) {
        this.stats.misses++;
        return null;
      }

      // Check if item has expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return item.value as T;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
      }
      return deleted;
    } catch (error) {
      console.warn('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    try {
      const item = this.cache.get(key);
      if (!item) return false;

      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Cache has error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Cache wrapper for async functions
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number = 300000): Promise<T> {
    try {
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.warn('Cache wrap error:', error);
      return await fn();
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService; 