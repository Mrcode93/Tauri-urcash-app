import api from '@/lib/api';
import { handleApiError } from '@/lib/errorHandler';

// Comprehensive Settings interface matching the database schema
export interface Settings {
  id: number;
  // Company Information
  company_name: string;
  logo_url?: string | null;
  mobile: string;
  email: string;
  address: string;
  website: string;
  tax_number: string;
  registration_number: string;
  description: string;
  
  // System Configuration
  currency: string;
  language: string;
  timezone: string;
  date_format: string;
  number_format: string;
  rtl_mode: boolean; // Mapped from INTEGER
  
  // UI/UX Settings
  theme: string;
  primary_color: string;
  secondary_color: string;
  dashboard_layout: string;
  dashboard_tile_size: 'small' | 'medium' | 'large';  sidebar_collapsed: boolean; // Mapped from INTEGER
  enable_animations: boolean; // Mapped from INTEGER
  compact_mode: boolean; // Mapped from INTEGER
  rtl_direction: boolean; // Mapped from INTEGER
  
  // Business Rules
  allow_negative_stock: boolean; // Mapped from INTEGER
  require_customer_for_sales: boolean; // Mapped from INTEGER
  auto_generate_barcode: boolean; // Mapped from INTEGER
  default_payment_method: string;
  tax_rate: number; // Mapped from DECIMAL
  enable_loyalty_program: boolean; // Mapped from INTEGER
  loyalty_points_rate: number; // Mapped from DECIMAL
  minimum_order_amount: number; // Mapped from DECIMAL
  
  // Security Settings
  session_timeout: number; // Mapped from INTEGER
  password_min_length: number; // Mapped from INTEGER
  require_strong_password: boolean; // Mapped from INTEGER
  enable_two_factor: boolean; // Mapped from INTEGER
  allow_multiple_sessions: boolean; // Mapped from INTEGER
  login_attempts: number; // Mapped from INTEGER
  lockout_duration: number; // Mapped from INTEGER
  
  // Notification Settings
  email_notifications_enabled: boolean; // Mapped from INTEGER
  email_low_stock_notifications: boolean; // Mapped from INTEGER
  email_new_order_notifications: boolean; // Mapped from INTEGER
  sms_notifications_enabled: boolean; // Mapped from INTEGER
  push_notifications_enabled: boolean; // Mapped from INTEGER
  
  // Receipt/Invoice Settings
  bill_template: 'classic' | 'modern' | 'minimal' | string; // Allow string for custom
  bill_show_logo: boolean; // Mapped from INTEGER
  bill_show_barcode: boolean; // Mapped from INTEGER
  bill_show_company_info: boolean; // Mapped from INTEGER
  bill_show_qr_code: boolean; // Mapped from INTEGER
  bill_footer_text: string;
  bill_paper_size: string;
  bill_orientation: string;
  bill_margin_top: number; // Mapped from INTEGER
  bill_margin_right: number; // Mapped from INTEGER
  bill_margin_bottom: number; // Mapped from INTEGER
  bill_margin_left: number; // Mapped from INTEGER
  bill_font_header: string;
  bill_font_body: string;
  bill_font_footer: string;
  bill_color_primary: string;
  bill_color_secondary: string;
  bill_color_text: string;
  
  // Email Configuration
  email_provider: string;
  email_host: string;
  email_port: number; // Mapped from INTEGER
  email_username: string;
  email_password?: string; // Password might not always be fetched
  email_encryption: string;
  email_from_name: string;
  email_from_email: string;
  
  // Integration Settings
  pos_barcode_scanner_enabled: boolean; // Mapped from INTEGER
  accounting_integration_enabled: boolean; // Mapped from INTEGER
  analytics_integration_enabled: boolean; // Mapped from INTEGER
  
  // Backup Settings
  auto_backup_enabled: boolean; // Mapped from INTEGER
  backup_frequency: string;
  backup_retention_days: number; // Mapped from INTEGER
  last_backup_date?: string | null; // Mapped from DATETIME
  
  // Currency Settings
  exchange_rate: number; // Mapped from DECIMAL
  
  // Sidebar Menu Items (JSON string from DB, parsed in frontend)
  sidebar_menu_items?: string | null; // Keep as string for API, parse in slice/component
  
  created_at: string;
  updated_at: string;
}

// UpdateSettingsData should allow partial updates
export type UpdateSettingsData = Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at' | 'logo_url'>> & {
  logo?: File | null; // For file upload
  // Fields that are boolean in frontend but INTEGER in DB need to be handled during FormData creation
};


export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Get all settings
export const getSettings = async (): Promise<ApiResponse<Settings>> => {  try {
    const response = await api.get<ApiResponse<Settings>>('/settings');
    // Transform integer fields to booleans where appropriate
    const data = response.data.data;
    
    const transformedData = {
        ...data,
        rtl_mode: !!data.rtl_mode,
        sidebar_collapsed: !!data.sidebar_collapsed,
        enable_animations: !!data.enable_animations,
        compact_mode: !!data.compact_mode,
        rtl_direction: !!data.rtl_direction,
        allow_negative_stock: !!data.allow_negative_stock,
        require_customer_for_sales: !!data.require_customer_for_sales,
        auto_generate_barcode: !!data.auto_generate_barcode,
        enable_loyalty_program: !!data.enable_loyalty_program,
        require_strong_password: !!data.require_strong_password,
        enable_two_factor: !!data.enable_two_factor,
        allow_multiple_sessions: !!data.allow_multiple_sessions,
        email_notifications_enabled: !!data.email_notifications_enabled,
        email_low_stock_notifications: !!data.email_low_stock_notifications,
        email_new_order_notifications: !!data.email_new_order_notifications,
        sms_notifications_enabled: !!data.sms_notifications_enabled,
        push_notifications_enabled: !!data.push_notifications_enabled,
        bill_show_logo: !!data.bill_show_logo,
        bill_show_barcode: !!data.bill_show_barcode,
        bill_show_company_info: !!data.bill_show_company_info,
        bill_show_qr_code: !!data.bill_show_qr_code,
        pos_barcode_scanner_enabled: !!data.pos_barcode_scanner_enabled,
        accounting_integration_enabled: !!data.accounting_integration_enabled,
        analytics_integration_enabled: !!data.analytics_integration_enabled,
        auto_backup_enabled: !!data.auto_backup_enabled,
    };
    return { ...response.data, data: transformedData };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Update settings
export const updateSettings = async (settingsData: FormData): Promise<ApiResponse<Settings>> => {
  try {
    // The FormData should already have boolean values converted to '0' or '1' by the component
    const response = await api.put<ApiResponse<Settings>>('/settings', settingsData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });    // Transform response data similar to getSettings
    const data = response.data.data;
    const transformedData = {
        ...data,
        rtl_mode: !!data.rtl_mode,
        sidebar_collapsed: !!data.sidebar_collapsed,
        enable_animations: !!data.enable_animations,
        compact_mode: !!data.compact_mode,
        rtl_direction: !!data.rtl_direction,
        allow_negative_stock: !!data.allow_negative_stock,
        require_customer_for_sales: !!data.require_customer_for_sales,
        auto_generate_barcode: !!data.auto_generate_barcode,
        enable_loyalty_program: !!data.enable_loyalty_program,
        require_strong_password: !!data.require_strong_password,
        enable_two_factor: !!data.enable_two_factor,
        allow_multiple_sessions: !!data.allow_multiple_sessions,
        email_notifications_enabled: !!data.email_notifications_enabled,
        email_low_stock_notifications: !!data.email_low_stock_notifications,
        email_new_order_notifications: !!data.email_new_order_notifications,
        sms_notifications_enabled: !!data.sms_notifications_enabled,
        push_notifications_enabled: !!data.push_notifications_enabled,
        bill_show_logo: !!data.bill_show_logo,
        bill_show_barcode: !!data.bill_show_barcode,
        bill_show_company_info: !!data.bill_show_company_info,
        bill_show_qr_code: !!data.bill_show_qr_code,
        pos_barcode_scanner_enabled: !!data.pos_barcode_scanner_enabled,
        accounting_integration_enabled: !!data.accounting_integration_enabled,
        analytics_integration_enabled: !!data.analytics_integration_enabled,
        auto_backup_enabled: !!data.auto_backup_enabled,
    };
    return { ...response.data, data: transformedData };
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Get specific setting
export const getSetting = async (key: string): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>(`/settings/${key}`);
    return response.data;
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

// Update specific setting
export const updateSetting = async (key: string, value: any): Promise<ApiResponse<Settings>> => {
  try {
    const response = await api.put<ApiResponse<Settings>>(`/settings/${key}`, { value });
    return response.data;
  } catch (error) {
    const apiError = handleApiError(error);
    throw apiError;
  }
};

const settingsService = {
  getSettings,
  updateSettings,
  getSetting,
  updateSetting,
};

export default settingsService;
