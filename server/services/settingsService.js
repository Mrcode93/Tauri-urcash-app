const { query, queryOne, update, insert } = require('../database');
const logger = require('../utils/logger');

class SettingsService {
  // Get all settings
  async getSettings() {
    try {
      let settings = queryOne('SELECT * FROM settings WHERE id = 1');
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = {
          company_name: '',
          logo_url: null,
          mobile: '',
          email: '',
          address: '',
          website: '',
          tax_number: '',
          registration_number: '',
          description: '',
          currency: 'IQD',
          language: 'ar',
          timezone: 'Asia/Baghdad',
          date_format: 'DD/MM/YYYY',
          number_format: 'ar-IQ',
          rtl_mode: 1,
          theme: 'default',
          primary_color: '#1f1f1f',
          secondary_color: '#ededed',
          dashboard_layout: 'grid',
          dashboard_tile_size: 'medium',          sidebar_collapsed: 0,
          enable_animations: 1,
          compact_mode: 0,
          rtl_direction: 1,
          allow_negative_stock: 0,
          require_customer_for_sales: 1,
          auto_generate_barcode: 1,
          default_payment_method: 'cash',
          tax_rate: 0.00,
          enable_loyalty_program: 0,
          loyalty_points_rate: 1.00,
          minimum_order_amount: 0,
          session_timeout: 30,
          password_min_length: 8,
          require_strong_password: 1,
          enable_two_factor: 0,
          allow_multiple_sessions: 1,
          login_attempts: 5,
          lockout_duration: 15,
          email_notifications_enabled: 1,
          email_low_stock_notifications: 1,
          email_new_order_notifications: 1,
          sms_notifications_enabled: 0,
          push_notifications_enabled: 0,
          bill_template: 'modern',
          bill_show_logo: 1,
          bill_show_barcode: 1,
          bill_show_company_info: 1,
          bill_show_qr_code: 0,
          bill_footer_text: 'شكراً لزيارتكم',
          bill_paper_size: 'A4',
          bill_orientation: 'portrait',
          bill_margin_top: 10,
          bill_margin_right: 10,
          bill_margin_bottom: 10,
          bill_margin_left: 10,
          bill_font_header: 'Arial',
          bill_font_body: 'Arial',
          bill_font_footer: 'Arial',
          bill_color_primary: '#1f1f1f',
          bill_color_secondary: '#ededed',
          bill_color_text: '#333333',
          email_provider: 'smtp',
          email_host: '',
          email_port: 587,
          email_username: '',
          email_password: '',
          email_encryption: 'tls',
          email_from_name: '',
          email_from_email: '',
          pos_barcode_scanner_enabled: 1,
          accounting_integration_enabled: 0,
          analytics_integration_enabled: 0,
          auto_backup_enabled: 1,
          backup_frequency: 'daily',
          backup_time: '20:00',
          backup_retention_days: 30,
          last_backup_date: null,
          sidebar_menu_items: null,
          exchange_rate: 1.00
        };

        const columns = Object.keys(defaultSettings).join(', ');
        const placeholders = Object.keys(defaultSettings).map(() => '?').join(', ');
        const values = Object.values(defaultSettings);

        const settingsId = insert(`
          INSERT INTO settings (${columns})
          VALUES (${placeholders})
        `, values);

        settings = queryOne('SELECT * FROM settings WHERE id = ?', [settingsId]);
        logger.info('Created default settings');
      }

      // Transform boolean fields for frontend consistency
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
        if (settings.hasOwnProperty(field)) {
          settings[field] = !!settings[field];
        }
      }

      return settings;
    } catch (error) {
      logger.error('Error in getSettings:', error);
      throw error;
    }
  }

  // Update settings
  async updateSettings(updateData) {
    try {
      const existingSettings = await this.getSettings();
      
      if (!existingSettings) {
        throw new Error('Settings not found');
      }

      // Build dynamic update query
      const fieldsToUpdate = Object.keys(updateData).filter(key => key !== 'id');
      
      if (fieldsToUpdate.length === 0) {
        return existingSettings;
      }

      const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
      const values = fieldsToUpdate.map(field => updateData[field]);
      values.push(existingSettings.id);

      const updateQuery = `UPDATE settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      logger.info('Executing update query:', updateQuery);
      logger.info('With values:', values);
      
      update(updateQuery, values);

      // Return updated settings
      return this.getSettings();
    } catch (error) {
      logger.error('Error in updateSettings:', error);
      throw error;
    }
  }

  // Get specific setting
  async getSetting(key) {
    try {
      const settings = await this.getSettings();
      return settings[key];
    } catch (error) {
      logger.error('Error in getSetting:', error);
      throw error;
    }
  }

  // Update specific setting
  async updateSetting(key, value) {
    try {
      const settings = await this.getSettings();
      
      if (!settings) {
        throw new Error('Settings not found');
      }

      update(
        `UPDATE settings SET ${key} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [value, settings.id]
      );

      return this.getSettings();
    } catch (error) {
      logger.error('Error in updateSetting:', error);
      throw error;
    }
  }
}

module.exports = new SettingsService();
