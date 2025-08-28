use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};
use anyhow::Result;

#[derive(Debug, Clone)]
pub struct CacheEntry<T> {
    pub data: T,
    pub expires_at: Option<Instant>,
}

#[derive(Debug)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub sets: u64,
    pub deletes: u64,
}

#[derive(Clone)]
pub struct CacheService {
    cache: Arc<RwLock<HashMap<String, CacheEntry<String>>>>,
    stats: Arc<RwLock<CacheStats>>,
}

impl CacheService {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            stats: Arc::new(RwLock::new(CacheStats {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
            })),
        }
    }

    pub async fn get(&self, key: &str) -> Option<String> {
        let mut cache = self.cache.write().await;
        let mut stats = self.stats.write().await;

        if let Some(entry) = cache.get(key) {
            // Check if entry has expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    cache.remove(key);
                    stats.misses += 1;
                    return None;
                }
            }
            stats.hits += 1;
            Some(entry.data.clone())
        } else {
            stats.misses += 1;
            None
        }
    }

    pub async fn set(&self, key: String, value: String, ttl: Option<Duration>) -> Result<()> {
        let mut cache = self.cache.write().await;
        let mut stats = self.stats.write().await;

        let expires_at = ttl.map(|duration| Instant::now() + duration);
        
        cache.insert(key, CacheEntry {
            data: value,
            expires_at,
        });
        
        stats.sets += 1;
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        let mut cache = self.cache.write().await;
        let mut stats = self.stats.write().await;

        if cache.remove(key).is_some() {
            stats.deletes += 1;
        }
        
        Ok(())
    }

    pub async fn clear(&self) -> Result<()> {
        let mut cache = self.cache.write().await;
        cache.clear();
        Ok(())
    }

    pub async fn get_stats(&self) -> CacheStats {
        let stats = self.stats.read().await;
        CacheStats {
            hits: stats.hits,
            misses: stats.misses,
            sets: stats.sets,
            deletes: stats.deletes,
        }
    }

    pub async fn get_statistics(&self) -> Result<serde_json::Value> {
        let stats = self.get_stats().await;
        Ok(serde_json::json!({
            "hits": stats.hits,
            "misses": stats.misses,
            "sets": stats.sets,
            "deletes": stats.deletes,
            "hit_rate": if stats.hits + stats.misses > 0 {
                stats.hits as f64 / (stats.hits + stats.misses) as f64
            } else { 0.0 }
        }))
    }

    pub async fn get_all_keys(&self) -> Result<Vec<String>> {
        let cache = self.cache.read().await;
        Ok(cache.keys().cloned().collect())
    }

    pub async fn get_memory_usage(&self) -> Result<serde_json::Value> {
        let cache = self.cache.read().await;
        Ok(serde_json::json!({
            "used_memory": cache.len() * 100, // Rough estimation
            "max_memory": 1000000, // Mock value
            "usage_percentage": (cache.len() as f64 / 10000.0) * 100.0
        }))
    }

    pub async fn flush_all(&self) -> Result<serde_json::Value> {
        let mut cache = self.cache.write().await;
        let count = cache.len();
        cache.clear();
        Ok(serde_json::json!({
            "cleared_keys": count
        }))
    }

    pub async fn delete_key(&self, key: &str) -> Result<serde_json::Value> {
        let mut cache = self.cache.write().await;
        let existed = cache.remove(key).is_some();
        Ok(serde_json::json!({
            "deleted": existed
        }))
    }

    pub async fn invalidate_by_pattern(&self, pattern: &str) -> Result<serde_json::Value> {
        let mut cache = self.cache.write().await;
        let mut count = 0;
        let keys_to_remove: Vec<String> = cache.keys()
            .filter(|key| key.contains(pattern))
            .cloned()
            .collect();
        
        for key in keys_to_remove {
            cache.remove(&key);
            count += 1;
        }
        
        Ok(serde_json::json!({
            "invalidated_keys": count
        }))
    }

    pub async fn get_key_value(&self, key: &str) -> Result<serde_json::Value> {
        if let Some(value) = self.get(key).await {
            Ok(serde_json::json!(value))
        } else {
            Ok(serde_json::json!(null))
        }
    }

    pub async fn set_key(&self, key: &str, value: serde_json::Value, ttl: Option<u64>) -> Result<serde_json::Value> {
        let ttl_duration = ttl.map(|seconds| Duration::from_secs(seconds));
        self.set(key.to_string(), value.to_string(), ttl_duration).await?;
        Ok(serde_json::json!({
            "success": true
        }))
    }

    pub async fn get_health_status(&self) -> Result<serde_json::Value> {
        let cache = self.cache.read().await;
        let stats = self.get_stats().await;
        Ok(serde_json::json!({
            "status": "healthy",
            "entries": cache.len(),
            "hits": stats.hits,
            "misses": stats.misses,
            "uptime": 0
        }))
    }
}
