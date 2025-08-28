use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBackupRequest {
    pub custom_directory: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreBackupRequest {
    pub backup_file: String,
    pub confirm: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub created_at: DateTime<Utc>,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBackupResponse {
    pub backup_path: String,
    pub timestamp: String,
    pub total_backups: usize,
    pub max_backups: usize,
    pub custom_directory: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreBackupResponse {
    pub backup_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseResetResponse {
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FixMenuItemsResponse {
    pub message: String,
}

// Database error messages (matching Node.js)
pub const DATABASE_MESSAGES: &[(&str, &str)] = &[
    // Success Messages
    ("backup_created", "تم إنشاء نسخة احتياطية من قاعدة البيانات بنجاح"),
    ("backup_restored", "تم استعادة قاعدة البيانات من النسخة الاحتياطية بنجاح"),
    ("database_reset", "تم إعادة تعيين قاعدة البيانات بنجاح"),
    ("menu_items_fixed", "تم إصلاح عناصر القائمة بنجاح"),
    ("backups_fetched", "تم جلب قائمة النسخ الاحتياطية بنجاح"),
    
    // Error Messages
    ("backup_failed", "فشل في إنشاء نسخة احتياطية من قاعدة البيانات"),
    ("restore_failed", "فشل في استعادة قاعدة البيانات من النسخة الاحتياطية"),
    ("reset_failed", "فشل في إعادة تعيين قاعدة البيانات"),
    ("backup_not_found", "ملف النسخة الاحتياطية غير موجود"),
    ("database_busy", "قاعدة البيانات مشغولة حالياً. يرجى إغلاق جميع العمليات وإعادة المحاولة"),
    ("connection_failed", "فشل في الاتصال بقاعدة البيانات"),
    ("file_access_error", "خطأ في الوصول لملف قاعدة البيانات"),
    
    // Info Messages
    ("backup_processing", "جاري إنشاء نسخة احتياطية..."),
    ("restore_processing", "جاري استعادة قاعدة البيانات..."),
    ("reset_processing", "جاري إعادة تعيين قاعدة البيانات..."),
];

pub fn get_database_message(key: &str) -> &str {
    DATABASE_MESSAGES
        .iter()
        .find(|(k, _)| *k == key)
        .map(|(_, v)| *v)
        .unwrap_or(key)
}
