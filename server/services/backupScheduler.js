const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const logger = require('../utils/logger');
const database = require('../database');

// Use the same database path configuration
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const BACKUP_DIR = path.join(APP_DATA_DIR, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupScheduler {
  constructor() {
    this.scheduledTask = null;
    this.isAutoBackupEnabled = false;
    this.backupFrequency = 'daily';
    this.backupTime = '20:00'; // 8 PM default
  }

  // Helper function to get existing backups
  async getExistingBackups() {
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      return files
        .filter(file => file.endsWith('.db'))
        .map(file => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          return {
            id: file,
            name: file,
            size: stats.size,
            createdAt: stats.birthtime,
            path: path.join(BACKUP_DIR, file)
          };
        });
    } catch (error) {
      logger.error('Error getting existing backups:', error);
      return [];
    }
  }

  // Perform automatic backup with cleanup
  async performAutomaticBackup() {
    try {
      logger.info('Starting automatic backup process...');

      // Check existing backups and manage the 5-backup limit
      const existingBackups = await this.getExistingBackups();
      
      // If we have 5 or more backups, remove the oldest ones to keep only 4
      if (existingBackups.length >= 5) {
        const backupsToRemove = existingBackups
          .sort((a, b) => a.createdAt - b.createdAt) // Sort by creation time (oldest first)
          .slice(0, existingBackups.length - 4); // Keep only the 4 newest, remove the rest
        
        for (const backup of backupsToRemove) {
          try {
            fs.unlinkSync(backup.path);
            logger.info('Removed old backup to maintain limit (automatic)', { 
              removedBackup: backup.name,
              createdAt: backup.createdAt 
            });
          } catch (removeError) {
            logger.warn('Failed to remove old backup (automatic)', { 
              backup: backup.name, 
              error: removeError.message 
            });
          }
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `auto-backup-${timestamp}.db`);
      
      // Get the current database connection
      let db = database.db;
      
      // If database is not available or not open, try to reconnect
      if (!db || !db.open) {
        logger.info('Database connection not available for automatic backup, attempting to reconnect...');
        try {
          db = database.reconnect();
        } catch (reconnectError) {
          logger.error('Failed to reconnect to database for automatic backup:', reconnectError);
          throw new Error('Failed to establish database connection for automatic backup');
        }
      }

      // Double-check that we have a valid connection
      if (!db || !db.open) {
        logger.error('Database connection is still not available after reconnection attempt (automatic backup)');
        throw new Error('Database connection is not available for automatic backup');
      }

      // Test the connection with a simple query
      try {
        db.prepare('SELECT 1').get();
      } catch (testError) {
        logger.error('Database connection test failed for automatic backup:', testError);
        throw new Error('Database connection is not functioning properly for automatic backup');
      }

      // Use the built-in backup method from the db instance (synchronous)
      db.backup(backupPath);

      // Get updated backup count after creation
      const updatedBackups = await this.getExistingBackups();

      logger.info('Automatic database backup created successfully', { 
        backupPath,
        totalBackups: updatedBackups.length,
        maxBackups: 5,
        type: 'automatic'
      });

      return {
        success: true,
        backupPath,
        timestamp,
        totalBackups: updatedBackups.length,
        type: 'automatic'
      };
    } catch (error) {
      logger.error('Error creating automatic database backup:', error);
      throw error;
    }
  }

  // Start the backup scheduler
  startScheduler(settings) {
    try {
      // Stop existing scheduler if running
      this.stopScheduler();

      this.isAutoBackupEnabled = settings.auto_backup_enabled || false;
      this.backupFrequency = settings.backup_frequency || 'daily';
      this.backupTime = settings.backup_time || '20:00';

      if (!this.isAutoBackupEnabled) {
        logger.info('Auto backup is disabled, scheduler not started');
        return;
      }

      // Parse backup time (format: HH:MM)
      const [hours, minutes] = this.backupTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        logger.error('Invalid backup time format:', this.backupTime);
        this.backupTime = '20:00'; // Fallback to default
      }

      let cronExpression;
      let scheduleDescription;

      switch (this.backupFrequency) {
        case 'daily':
          // Every day at specified time
          cronExpression = `${minutes} ${hours} * * *`;
          scheduleDescription = `Daily at ${this.backupTime}`;
          break;
        case 'weekly':
          // Every Sunday at specified time
          cronExpression = `${minutes} ${hours} * * 0`;
          scheduleDescription = `Weekly on Sunday at ${this.backupTime}`;
          break;
        case 'monthly':
          // First day of every month at specified time
          cronExpression = `${minutes} ${hours} 1 * *`;
          scheduleDescription = `Monthly on the 1st at ${this.backupTime}`;
          break;
        default:
          cronExpression = `${minutes} ${hours} * * *`; // Default to daily
          scheduleDescription = `Daily at ${this.backupTime} (default)`;
      }

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        logger.error('Invalid cron expression:', cronExpression);
        return;
      }

      // Schedule the backup task
      this.scheduledTask = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Executing scheduled backup...', { frequency: this.backupFrequency });
          await this.performAutomaticBackup();
          // Scheduled backup completed
        } catch (error) {
          logger.error('Scheduled backup failed:', error);
        }
      }, {
        scheduled: true,
        timezone: 'Asia/Baghdad' // Set timezone to Iraq
      });


    } catch (error) {
      logger.error('Error starting backup scheduler:', error);
    }
  }

  // Stop the backup scheduler
  stopScheduler() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask.destroy();
      this.scheduledTask = null;
      logger.info('Backup scheduler stopped');
    }
  }

  // Update scheduler settings
  updateScheduler(settings) {
    logger.info('Updating backup scheduler settings', settings);
    this.startScheduler(settings);
  }

  // Get scheduler status
  getSchedulerStatus() {
    return {
      isRunning: this.scheduledTask !== null,
      isAutoBackupEnabled: this.isAutoBackupEnabled,
      backupFrequency: this.backupFrequency,
      backupTime: this.backupTime,
      nextRun: this.scheduledTask ? 'Scheduled' : 'Not scheduled'
    };
  }

  // Get next backup time based on frequency
  getNextBackupTime() {
    if (!this.isAutoBackupEnabled || !this.scheduledTask) {
      return null;
    }

    const now = new Date();
    const nextRun = new Date();

    // Parse backup time
    const [hours, minutes] = this.backupTime.split(':').map(Number);

    switch (this.backupFrequency) {
      case 'daily':
        nextRun.setHours(hours, minutes, 0, 0); // Today at specified time
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1); // Tomorrow at specified time
        }
        break;
      case 'weekly':
        // Next Sunday at specified time
        const daysUntilSunday = (7 - now.getDay()) % 7;
        nextRun.setDate(now.getDate() + daysUntilSunday);
        nextRun.setHours(hours, minutes, 0, 0);
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7); // Next week
        }
        break;
      case 'monthly':
        // First day of next month at specified time
        nextRun.setMonth(nextRun.getMonth() + 1, 1);
        nextRun.setHours(hours, minutes, 0, 0);
        break;
    }

    return nextRun;
  }
}

// Create a singleton instance
const backupScheduler = new BackupScheduler();

module.exports = backupScheduler; 