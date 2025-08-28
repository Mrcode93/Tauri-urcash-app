const settingsService = require('../services/settingsService');
const backupScheduler = require('../services/backupScheduler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use app data directory for uploads
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const UPLOADS_DIR = path.join(APP_DATA_DIR, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class SettingsController {
  // Get all settings
  getSettings = async (req, res) => {
    try {
      const settings = await settingsService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      logger.error('Error getting settings:', error);
      res.status(500).json({ success: false, message: 'Failed to get settings' });
    }
  };

  // Update settings with logo handling pattern from old version
  updateSettings = async (req, res) => {
    try {
      
      
      
      
      

      let logo_url = req.body.logo_url;

      // Handle file upload if present
      if (req.file) {
        
        

        // Verify file was actually saved
        if (fs.existsSync(req.file.path)) {
          
        } else {
          console.error('File was NOT saved to disk!');
        }

        // Set new logo URL
        logo_url = `/uploads/${req.file.filename}`;
        
      }

      // Handle logo removal
      if (req.body.logo_url === 'null' || req.body.logo_url === '') {
        
        const currentSettings = await settingsService.getSettings();
        if (currentSettings && currentSettings.logo_url) {
          const oldLogoPath = path.join(UPLOADS_DIR, path.basename(currentSettings.logo_url));
          
          if (fs.existsSync(oldLogoPath)) {
            try {
              fs.unlinkSync(oldLogoPath);
              
              logger.info(`Logo ${currentSettings.logo_url} deleted.`);
            } catch (deleteError) {
              console.error('Failed to delete logo for removal:', deleteError);
              logger.warn(`Failed to delete logo: ${deleteError.message}`);
            }
          }
        }
        logo_url = null;
      }

      // Prepare update data
      const updateData = { ...req.body };
      if (logo_url !== undefined) {
        updateData.logo_url = logo_url;
      }
      delete updateData.logo; // Remove the 'logo' field if it was part of FormData

      // Convert boolean-like strings from FormData to 0 or 1 for INTEGER fields
      const booleanFields = [
        'rtl_mode', 'sidebar_collapsed', 'enable_animations', 
        'compact_mode', 'rtl_direction', 'allow_negative_stock', 'require_customer_for_sales', 
        'auto_generate_barcode', 'enable_loyalty_program', 'require_strong_password', 
        'enable_two_factor', 'allow_multiple_sessions', 'email_notifications_enabled', 
        'email_low_stock_notifications', 'email_new_order_notifications', 
        'sms_notifications_enabled', 'push_notifications_enabled', 'bill_show_logo', 
        'bill_show_barcode', 'bill_show_company_info', 'bill_show_qr_code', 
        'pos_barcode_scanner_enabled', 'accounting_integration_enabled', 
        'analytics_integration_enabled', 'auto_backup_enabled'
      ];

      for (const field of booleanFields) {
        if (updateData.hasOwnProperty(field)) {
          updateData[field] = (updateData[field] === 'true' || updateData[field] === true || updateData[field] === '1' || updateData[field] === 1) ? 1 : 0;
        }
      }
      
      // Convert numeric strings from FormData to numbers
      const numericFields = [
          'tax_rate', 'loyalty_points_rate', 'minimum_order_amount', 'session_timeout',
          'password_min_length', 'login_attempts', 'lockout_duration', 'bill_margin_top',
          'bill_margin_right', 'bill_margin_bottom', 'bill_margin_left', 'email_port',
          'backup_retention_days'
      ];
      for (const field of numericFields) {
        if (updateData.hasOwnProperty(field) && updateData[field] !== '' && updateData[field] !== null && updateData[field] !== undefined) {
            const numValue = Number(updateData[field]);
            updateData[field] = isNaN(numValue) ? null : numValue;
        } else if (updateData.hasOwnProperty(field) && (updateData[field] === '' || updateData[field] === null)) {
            updateData[field] = null; 
        }
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      
      
      const updated = await settingsService.updateSettings(updateData);

      
      
      // Update backup scheduler if backup settings changed
      if (updateData.hasOwnProperty('auto_backup_enabled') || updateData.hasOwnProperty('backup_frequency') || updateData.hasOwnProperty('backup_time')) {
        try {
          logger.info('Backup settings changed, updating scheduler...', {
            auto_backup_enabled: updated.auto_backup_enabled,
            backup_frequency: updated.backup_frequency,
            backup_time: updated.backup_time
          });
          backupScheduler.updateScheduler({
            auto_backup_enabled: updated.auto_backup_enabled,
            backup_frequency: updated.backup_frequency,
            backup_time: updated.backup_time
          });
        } catch (schedulerError) {
          logger.error('Failed to update backup scheduler:', schedulerError);
          // Don't fail the settings update if scheduler update fails
        }
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('=== Error in updateSettings ===', error);
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  };

  // Get specific setting
  getSetting = async (req, res) => {
    try {
      const { key } = req.params;
      const value = await settingsService.getSetting(key);
      res.json({
        success: true,
        message: 'Setting fetched successfully',
        data: { [key]: value }
      });
    } catch (err) {
      logger.error('Error getting setting:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch setting'
      });
    }
  };

  // Update specific setting
  updateSetting = async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const settings = await settingsService.updateSetting(key, value);
      
      // Update backup scheduler if backup settings changed
      if (key === 'auto_backup_enabled' || key === 'backup_frequency' || key === 'backup_time') {
        try {
          logger.info('Backup setting changed, updating scheduler...', { key, value });
          backupScheduler.updateScheduler({
            auto_backup_enabled: settings.auto_backup_enabled,
            backup_frequency: settings.backup_frequency,
            backup_time: settings.backup_time
          });
        } catch (schedulerError) {
          logger.error('Failed to update backup scheduler:', schedulerError);
        }
      }
      
      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: settings
      });
    } catch (err) {
      logger.error('Error updating setting:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to update setting'
      });
    }
  };

  // Get backup scheduler status
  getBackupSchedulerStatus = async (req, res) => {
    try {
      const status = backupScheduler.getSchedulerStatus();
      const nextBackupTime = backupScheduler.getNextBackupTime();
      
      res.json({
        success: true,
        data: {
          ...status,
          nextBackupTime: nextBackupTime ? nextBackupTime.toISOString() : null,
          nextBackupTimeFormatted: nextBackupTime ? nextBackupTime.toLocaleString('ar-IQ', {
            timeZone: 'Asia/Baghdad',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : null
        }
      });
    } catch (error) {
      logger.error('Error getting backup scheduler status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get backup scheduler status'
      });
    }
  };
}

module.exports = new SettingsController();