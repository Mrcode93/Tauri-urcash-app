# License Caching System

This document describes the session storage caching system implemented for license information to improve app performance and reduce server calls.

## Overview

The license caching system stores license information in the browser's session storage to avoid making server calls on every app reload. This significantly improves app startup time and reduces server load.

## How It Works

### Cache Storage
- **License Data**: Stored in `urcash_license_data`
- **Cache Timestamp**: Stored in `urcash_license_timestamp`
- **Session ID**: Stored in `urcash_license_session`
- **App Startup Flag**: Stored in `urcash_app_startup`

### Cache TTL (Time To Live)
- **License Cache**: 30 minutes
- **Session Cache**: 24 hours (browser session)

### Cache Flow
1. **App Startup**: Check if license data exists in session storage
2. **Cache Hit**: If valid cached data exists, use it immediately
3. **Cache Miss**: If no cache or expired, fetch from server
4. **Cache Update**: Store successful server responses in cache
5. **Fallback**: If server is unavailable, use cached data as fallback

## Usage

### Basic License Check
```typescript
import { licenseService } from '@/services/licenseService';

// This will check cache first, then server if needed
const licenseStatus = await licenseService.checkLocalLicense();

// Force refresh from server (ignores cache)
const freshStatus = await licenseService.checkLocalLicense(true);
```

### Cache Management
```typescript
// Clear all cache
licenseService.clearCache();

// Get cache statistics
const stats = licenseService.getCacheStats();

// Validate cache manually
const cachedData = licenseService.validateCache();

// Force refresh cache
const freshData = await licenseService.refreshCache();
```

### Cache Statistics
```typescript
const stats = licenseService.getCacheStats();

// {
//   hasCachedData: true,
//   cacheAge: 1800000, // 30 minutes in milliseconds
//   sessionAge: 3600000, // 1 hour in milliseconds
//   isExpired: false,
//   isSessionValid: true
// }
```

## Cache Keys

| Key | Purpose | TTL |
|-----|---------|-----|
| `urcash_license_data` | License information | 30 minutes |
| `urcash_license_timestamp` | Cache timestamp | 30 minutes |
| `urcash_license_session` | Session identifier | 24 hours |
| `urcash_app_startup` | App startup flag | Session |

## Cache Invalidation

Cache is automatically invalidated when:
- Cache TTL expires (30 minutes)
- Session expires (24 hours)
- License is activated/deactivated
- Manual cache clear is called
- Server returns error (fallback to cached data)

## Benefits

1. **Faster App Startup**: No server calls needed if valid cache exists
2. **Reduced Server Load**: Fewer API requests to license server
3. **Offline Support**: App can work with cached license data when offline
4. **Better UX**: Instant license validation on app reload

## Debugging

### Console Logs
The system provides detailed console logs:
- `📋 Using cached license data` - Cache hit
- `🌐 Fetching license data from server...` - Cache miss
- `🕐 License cache expired, fetching fresh data` - Cache expired
- `🔄 Session expired, clearing cache` - Session expired
- `💾 License data cached in session storage` - Data saved to cache

### Cache Source Tracking
License responses include a `source` field:
- `session_cache` - Data loaded from cache
- `local` - Data loaded from server
- `remote` - Data loaded from remote server

## Integration with LicenseContext

The `LicenseContext` automatically uses the caching system:
- Initial load checks cache first
- Force refresh bypasses cache
- Activation clears cache and refetches
- Error handling falls back to cached data

## Best Practices

1. **Use Default Behavior**: Most cases should use `checkLocalLicense()` without parameters
2. **Force Refresh Sparingly**: Only use `checkLocalLicense(true)` when you need fresh data
3. **Clear Cache on Activation**: Always clear cache after license changes
4. **Monitor Cache Stats**: Use `getCacheStats()` for debugging cache issues
5. **Handle Offline Mode**: The system automatically falls back to cached data when offline

## Troubleshooting

### Cache Not Working
1. Check if session storage is available
2. Verify cache keys are being set
3. Check console logs for cache operations
4. Use `getCacheStats()` to inspect cache state

### Stale Data
1. Clear cache manually: `licenseService.clearCache()`
2. Force refresh: `await licenseService.refreshCache()`
3. Check if TTL settings are appropriate

### Performance Issues
1. Monitor cache hit/miss ratios
2. Adjust TTL settings if needed
3. Check for memory leaks in long sessions 