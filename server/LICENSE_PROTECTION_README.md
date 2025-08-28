# License Protection System

## 🛡️ Overview

This system provides license verification to protect your app. The automatic scheduler has been **disabled** to prevent infinite loops, but we provide multiple ways to verify licenses safely.

## ✅ Problem Solved

- **❌ No more infinite loops** - Automatic scheduler disabled
- **✅ Server starts safely** - No crashes or overload
- **✅ Manual control** - Start/stop when you want
- **✅ Standalone script** - Safe monthly verification
- **✅ Proper data extraction** - Shows `activated_at` and `expires_at`

## 🚀 How to Use

### 1. Start Server (Safe - No Automatic Scheduler)

```bash
cd server
node index.js
```

**Output:**
```
📋 License verification scheduler disabled on startup to prevent infinite loops
🔧 Use POST /api/license/schedule/start to start manually when needed
🛡️ This prevents server crashes and infinite loops
```

### 2. Manual License Verification

#### A. Check License Status
```bash
curl http://localhost:39000/api/license/status
```

#### B. Manual Verification
```bash
curl http://localhost:39000/api/license/verify-manual
```

#### C. Start Scheduler Manually (Optional)
```bash
curl -X POST http://localhost:39000/api/license/schedule/start
```

#### D. Check Scheduler Status
```bash
curl http://localhost:39000/api/license/schedule/status
```

#### E. Stop Scheduler
```bash
curl -X POST http://localhost:39000/api/license/schedule/stop
```

### 3. Standalone Monthly Verification Script

#### A. Run Manually
```bash
cd server
node check-license-monthly.js
```

#### B. Set Up Cron Job (Recommended for Production)
Add to your crontab to run monthly:

```bash
# Edit crontab
crontab -e

# Add this line to run on the 1st of every month at midnight
0 0 1 * * cd /path/to/your/server && node check-license-monthly.js >> /var/log/license-check.log 2>&1
```

## 📊 License Data Structure

The system properly extracts and displays:

```json
{
  "success": true,
  "device_id": "fingerprint...",
  "type": "trial|premium|etc",
  "features": {},
  "activated_at": "2024-01-01T00:00:00.000Z",
  "expires_at": "2024-12-31T23:59:59.000Z",
  "userId": "user_id",
  "message": "تم التحقق من الترخيص محلياً"
}
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/license/status` | Check license status |
| GET | `/api/license/verify-manual` | Manual verification |
| GET | `/api/license/schedule/status` | Check scheduler status |
| POST | `/api/license/schedule/start` | Start scheduler manually |
| POST | `/api/license/schedule/stop` | Stop scheduler |
| GET | `/api/license/diagnose` | Diagnose fingerprint issues |

## 🛡️ Safety Features

### 1. No Automatic Startup
- Scheduler never starts automatically with server
- Prevents infinite loops and server crashes
- Full manual control

### 2. Retry Limits
- Development: 20 verifications max
- Production: 1000 verifications max
- Auto-stops when limit reached

### 3. Proper Error Handling
- Continues running even if verification fails
- Detailed logging for debugging
- Graceful degradation

### 4. Standalone Script
- Can be run independently
- Safe for cron jobs
- No interference with main server

## 📅 Recommended Setup for Production

### Option 1: Cron Job (Recommended)
```bash
# Add to crontab
0 0 1 * * cd /path/to/server && node check-license-monthly.js >> /var/log/license-check.log 2>&1
```

### Option 2: Manual Scheduler
```bash
# Start server
node index.js

# Start scheduler manually
curl -X POST http://localhost:39000/api/license/schedule/start

# Monitor status
curl http://localhost:39000/api/license/schedule/status
```

### Option 3: Manual Verification
```bash
# Run verification manually when needed
node check-license-monthly.js
```

## 🔍 Troubleshooting

### Check if Server is Running
```bash
ps aux | grep "node.*index.js"
```

### Check License Files
```bash
ls -la ~/.urcash/license/
```

### Diagnose Fingerprint Issues
```bash
curl http://localhost:39000/api/license/diagnose
```

### View Logs
```bash
# If using cron
tail -f /var/log/license-check.log

# Server logs
# Check your server console output
```

## 🎯 Benefits

1. **🛡️ App Protection** - License verification every 30 days
2. **🚀 Safe Operation** - No infinite loops or crashes
3. **🔧 Full Control** - Manual start/stop when needed
4. **📊 Proper Data** - Shows activation and expiration dates
5. **⚡ Efficient** - Offline-first verification
6. **🛠️ Flexible** - Multiple verification methods
7. **📝 Logged** - All activities are logged

## 🚨 Important Notes

- **Automatic scheduler is DISABLED** to prevent infinite loops
- **Use cron job** for automatic monthly verification
- **Manual control** available via API endpoints
- **Standalone script** for safe independent verification
- **Proper data extraction** shows `activated_at` and `expires_at`

## ✅ Success Indicators

- Server starts without infinite loops
- License verification works correctly
- `activated_at` and `expires_at` are properly displayed
- Manual and automated verification both work
- No server crashes or overload

Your app is now **protected** with safe license verification! 🎉 