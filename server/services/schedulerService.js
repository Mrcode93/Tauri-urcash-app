const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * Start the scheduler
   * @param {number} intervalMinutes - Check interval in minutes (default: 5)
   * @param {Object} mobileLiveDataService - Mobile live data service instance
   */
  start(intervalMinutes = 5, mobileLiveDataService = null) {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.mobileLiveDataService = mobileLiveDataService;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Starting upload scheduler

    this.interval = setInterval(async () => {
      await this.checkAndExecuteSchedules(this.mobileLiveDataService);
    }, intervalMs);

    // Run immediately on start
    this.checkAndExecuteSchedules(this.mobileLiveDataService);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('Upload scheduler stopped');
  }

  /**
   * Check for schedules that need to run and execute them
   */
  async checkAndExecuteSchedules(mobileLiveDataService) {
    try {
      // Checking for scheduled uploads
      
      const schedulesToRun = await mobileLiveDataService.getSchedulesToRun();
      
      if (schedulesToRun.length === 0) {
        // No scheduled uploads to execute
        return;
      }

      logger.info(`Found ${schedulesToRun.length} scheduled uploads to execute`);

      for (const schedule of schedulesToRun) {
        try {
          logger.info(`Executing scheduled upload: ${schedule.schedule_name} (ID: ${schedule.id})`);
          
          const result = await mobileLiveDataService.executeScheduledUpload(schedule);
          
          logger.info(`Scheduled upload completed: ${schedule.schedule_name} - ${result.message}`);
        } catch (error) {
          logger.error(`Error executing scheduled upload ${schedule.schedule_name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking scheduled uploads:', error);
    }
  }

  /**
   * Execute all pending schedules immediately (for manual trigger)
   */
  async executeAllPendingSchedules(mobileLiveDataService) {
    try {
      logger.info('Manually executing all pending scheduled uploads...');
      
      const schedulesToRun = await mobileLiveDataService.getSchedulesToRun();
      
      if (schedulesToRun.length === 0) {
        logger.info('No pending scheduled uploads found');
        return { success: true, message: 'No pending scheduled uploads found', count: 0 };
      }

      const results = [];
      
      for (const schedule of schedulesToRun) {
        try {
          const result = await mobileLiveDataService.executeScheduledUpload(schedule);
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.schedule_name,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.schedule_name,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      logger.info(`Manual execution completed: ${successCount}/${results.length} successful`);

      return {
        success: true,
        message: `Executed ${results.length} scheduled uploads`,
        count: results.length,
        results
      };
    } catch (error) {
      logger.error('Error executing pending schedules:', error);
      throw error;
    }
  }

  /**
   * Immediately check for schedules to run (for when schedules are modified)
   */
  async checkSchedulesImmediately(mobileLiveDataService) {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running, cannot check schedules immediately');
      return;
    }
    
    logger.info('Immediately checking for schedules after modification...');
    await this.checkAndExecuteSchedules(mobileLiveDataService);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.interval ? 'active' : 'inactive'
    };
  }
}

module.exports = new SchedulerService(); 