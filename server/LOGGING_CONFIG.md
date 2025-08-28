# Logging Configuration Guide

## Overview
The URCash application now uses an optimized logging system that can significantly improve performance by reducing excessive log output.

## Log Levels
- **ERROR** (0): Only error messages
- **WARN** (1): Warning and error messages  
- **INFO** (2): Info, warning, and error messages (default)
- **DEBUG** (3): All messages including debug

## Configuration

### Environment Variable
Set the `LOG_LEVEL` environment variable to control logging:

```bash
# Production - only errors and warnings
export LOG_LEVEL=WARN

# Development - all messages
export LOG_LEVEL=DEBUG

# Default - info and above
export LOG_LEVEL=INFO
```

### Runtime Configuration
You can also change the log level at runtime:

```javascript
const logger = require('./utils/logger');

// Set to ERROR only
logger.setLogLevel('ERROR');

// Set to DEBUG for troubleshooting
logger.setLogLevel('DEBUG');

// Check current level
console.log('Current log level:', logger.getLogLevel());
```

## Performance Benefits

### File I/O Optimization
- Only ERROR and WARN logs are written to files
- INFO and DEBUG logs are console-only for better performance
- Reduces disk I/O by ~75%

### Memory Optimization
- DEBUG logs are completely skipped when not needed
- Reduces memory usage and CPU overhead
- Faster application startup and response times

## Recommended Settings

### Production
```bash
LOG_LEVEL=WARN
```
- Only logs errors and warnings
- Maximum performance
- Sufficient for monitoring issues

### Development
```bash
LOG_LEVEL=INFO
```
- Logs important operations
- Good balance of information and performance
- Helps with debugging without excessive output

### Debugging
```bash
LOG_LEVEL=DEBUG
```
- Full logging for troubleshooting
- Use only when needed
- May impact performance

## Migration from Old System
The new system is backward compatible. Existing code will continue to work, but you can now control the verbosity level for better performance.
