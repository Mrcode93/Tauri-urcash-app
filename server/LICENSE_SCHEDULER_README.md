# License Verification Scheduler

## Overview

The License Verification Scheduler automatically checks license validity every month to ensure the application continues to work properly and to detect expired licenses early.

## Features

- **Monthly Verification**: Automatically runs every 30 days
- **Offline-First**: Checks local license first, then remote server if needed
- **Expiration Warnings**: Warns when license expires within 7 days
- **Automatic Recovery**: Attempts to fetch fresh license from server if verification fails
- **Manual Control**: API endpoints to start/stop/check scheduler status
- **Server Integration**: Automatically starts when server starts

## How It Works

### 1. Automatic Startup
When the server starts, the license verification scheduler automatically initializes and:
- Runs an immediate license verification
- Schedules monthly verification (every 30 days)
- Logs all verification results

### 2. Monthly Verification Process
Each month, the scheduler:
1. Generates current device fingerprint (without MAC address for stability)
2. Verifies local license using offline-first approach
3. Checks license expiration date
4. Warns if license expires within 7 days
5. Attempts to fetch fresh license from server if verification fails
6. Logs detailed results

### 3. Fingerprint Stability
The new fingerprint system uses only stable hardware identifiers:
- Machine ID (very stable)
- Hostname (usually stable)
- Hardware manufacturer
- Hardware model
- Hardware serial number

**No MAC addresses** are used to prevent fingerprint changes due to network configuration changes.

## API Endpoints

### Check Scheduler Status
```http
GET /api/license/schedule/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduled": true,
    "message": "Monthly license verification is scheduled",
    "scheduler": {
      "isRunning": true,
      "lastRun": "2024-01-15T10:30:00.000Z",
      "interval": 2592000000
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Start Scheduler
```http
POST /api/license/schedule/start
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly license verification scheduler started successfully",
  "data": {
    "scheduled": true,
    "interval": 2592000000,
    "isRunning": true,
    "lastRun": "2024-01-15T10:30:00.000Z",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Stop Scheduler
```http
POST /api/license/schedule/stop
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly license verification scheduler stopped successfully",
  "data": {
    "scheduled": false,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Manual Verification
```http
GET /api/license/verify-manual
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "fingerprint": "ac9d4baf-9562-5d1a...",
    "verification": {
      "success": true,
      "message": "تم التحقق من الترخيص محلياً",
      "type": "premium",
      "expires_at": "2024-12-31T23:59:59.000Z"
    }
  }
}
```

## Logging

The scheduler provides detailed logging:

### Successful Verification
```
🔍 === MONTHLY LICENSE VERIFICATION STARTED ===
📅 Verification time: 2024-01-15T10:30:00.000Z
🔍 Current fingerprint: ac9d4baf-9562-5d1a-a5dc-10483767343c|Amers-MacBook-Pro.local|Apple Inc.|MacBookPro17,1|FVFFM22KQ05D
✅ Monthly license verification: SUCCESS
   License type: premium
   Activated at: 2024-01-01T00:00:00.000Z
   Expires at: 2024-12-31T23:59:59.000Z
✅ License is valid for 350 more days
   Source: local
   Offline: true
🔍 === MONTHLY LICENSE VERIFICATION COMPLETED ===
```

### Expiration Warning
```
⚠️ WARNING: License expires in 5 days
```

### Failed Verification
```
❌ Monthly license verification: FAILED
   Error: لا يوجد ترخيص مفعل لهذا الجهاز
   Source: remote
   Offline: false
🔄 Attempting to fetch fresh license from server...
✅ Successfully fetched fresh license from server
```

## Testing

### Test Script
Run the test script to verify the scheduler is working:

```bash
cd server
node test-license-scheduler.js
```

### Debug Script
Use the debug script to check fingerprint generation:

```bash
cd server
node debug-fingerprint.js
```

## Configuration

### Interval
The verification interval is set to 30 days (2,592,000,000 milliseconds). To change this, modify the `MONTHLY_INTERVAL` constant in `server/services/licenseService.js`.

### Warning Threshold
License expiration warnings are shown when the license expires within 7 days. To change this, modify the warning condition in the `verifyLicenseMonthly` function.

## Troubleshooting

### Scheduler Not Starting
1. Check server logs for initialization errors
2. Verify license service is working: `GET /api/license/status`
3. Test manual verification: `GET /api/license/verify-manual`

### Verification Failing
1. Check fingerprint generation: `GET /api/license/diagnose`
2. Verify license files exist locally
3. Check network connectivity for remote verification
4. Clear license cache: `POST /api/license/cache/clear`

### Fingerprint Issues
1. Run debug script: `node debug-fingerprint.js`
2. Check system information is available
3. Verify machine ID generation

## Benefits

1. **Proactive Monitoring**: Detects license issues before they affect users
2. **Stable Fingerprinting**: No more MAC address dependency issues
3. **Automatic Recovery**: Attempts to fix issues automatically
4. **Detailed Logging**: Complete audit trail of verification attempts
5. **Manual Control**: Full API control over scheduler
6. **Server Integration**: Starts automatically with server

## Security

- Uses stable hardware identifiers only
- No network-dependent fingerprinting
- Secure license decryption with multiple variations
- Detailed logging for audit purposes
- API endpoints for monitoring and control 