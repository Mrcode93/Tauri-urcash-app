# Cloud Backup Functionality

The Rust server now includes full cloud backup functionality that replicates the Node.js server's remote backup capabilities.

## Features

### ✅ **Remote Server Integration**
- Uploads database backups to remote server
- Downloads backups from remote server
- Fetches backup lists from remote server
- Health checks for remote server connectivity

### ✅ **Local Backup Management**
- Creates local backup copies
- Stores backup metadata in local database
- Tracks backup history and statistics

### ✅ **API Endpoints**
All endpoints match the Node.js implementation:

- `POST /api/cloud-backup/create` - Create and upload backup
- `GET /api/cloud-backup/user/:user_id?` - Get user backups
- `GET /api/cloud-backup/stats/:user_id?` - Get backup statistics
- `GET /api/cloud-backup/health` - Check remote server health
- `GET /api/cloud-backup/license-info` - Get license information
- `GET /api/cloud-backup/download/:backup_id` - Download backup
- `POST /api/cloud-backup/restore/:backup_id` - Restore from backup
- `GET /api/cloud-backup/check-accessibility` - Check database accessibility
- `GET /api/cloud-backup/file-info` - Get database file information
- `GET /api/cloud-backup/check-locks` - Check file locks

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Remote Server Configuration
REMOTE_SERVER_URL=https://urcash.up.railway.app
REMOTE_SERVER_API_KEY=your_api_key_here

# Backup Directory
BACKUP_DIR=~/.urcash/backups

# Database Configuration
DATABASE_URL=sqlite:/Users/amerahmed/.urcash/database.sqlite
```

### Remote Server Settings

- **REMOTE_SERVER_URL**: The URL of the remote backup server
- **REMOTE_SERVER_API_KEY**: API key for authentication (optional)
- **BACKUP_DIR**: Local directory to store backup files

## How It Works

### 1. **Backup Creation**
When creating a backup:
1. Validates database file exists
2. Uploads database file to remote server via multipart form data
3. Creates local backup copy in `~/.urcash/backups/`
4. Stores backup metadata in local database
5. Returns backup information

### 2. **Backup Retrieval**
When fetching backups:
1. Attempts to fetch from remote server first
2. Falls back to local backups if remote server is unavailable
3. Converts remote backup format to local format

### 3. **Remote Server Communication**
- Uses HTTP multipart requests for file uploads
- Includes proper headers and authentication
- Handles timeouts and error conditions
- Provides fallback mechanisms

## Database Schema

The `cloud_backups` table includes:
- `id` - Local backup ID
- `user_id` - User ID
- `backup_name` - Backup name
- `description` - Backup description
- `file_path` - Local file path
- `file_size` - File size in bytes
- `backup_type` - Type of backup (manual, auto, system)
- `status` - Backup status (pending, completed, failed, uploading)
- `remote_backup_id` - Remote server backup ID
- `checksum` - File checksum
- `created_at`, `updated_at`, `uploaded_at` - Timestamps

## Testing

### Health Check
```bash
curl -X GET http://localhost:39000/api/cloud-backup/health
```

### Create Backup
```bash
curl -X POST http://localhost:39000/api/cloud-backup/create \
  -H "Content-Type: application/json" \
  -d '{"backup_name": "test_backup", "description": "test description"}'
```

### Check Database Accessibility
```bash
curl -X GET http://localhost:39000/api/cloud-backup/check-accessibility
```

## Error Handling

The system includes comprehensive error handling:
- Network timeouts and connection failures
- File system errors
- Database errors
- Remote server errors
- Graceful fallbacks to local operations

## Security

- API key authentication for remote server
- Secure file handling
- Input validation
- Error message sanitization

## Performance

- Streaming file uploads (no memory loading)
- Configurable timeouts
- Efficient database queries
- Background processing where possible
