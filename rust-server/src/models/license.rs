use chrono::{DateTime, Utc, NaiveDateTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct License {
    pub id: Option<i64>,
    pub license_key: String,
    pub company_name: String,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub max_users: i64,
    pub max_devices: i64,
    pub is_active: Option<i64>,
    pub expires_at: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub last_check: Option<NaiveDateTime>,
    pub check_count: Option<i64>,
    pub features: Option<String>, // JSON string of enabled features
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub id: i64,
    pub license_key: String,
    pub company_name: String,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub max_users: i64,
    pub max_devices: i64,
    pub is_active: bool,
    pub expires_at: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
    pub last_check: Option<NaiveDateTime>,
    pub check_count: Option<i64>,
    pub features: Option<String>,
    pub notes: Option<String>,
    pub days_remaining: Option<i64>,
    pub is_expired: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateLicenseRequest {
    pub license_key: String,
    pub company_name: String,
    pub contact_email: String,
    pub contact_phone: Option<String>,
    pub max_users: i64,
    pub max_devices: i64,
    pub expires_at: Option<NaiveDateTime>,
    pub features: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLicenseRequest {
    pub company_name: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub max_users: Option<i64>,
    pub max_devices: Option<i64>,
    pub is_active: Option<bool>,
    pub expires_at: Option<NaiveDateTime>,
    pub features: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseCheckRequest {
    pub license_key: String,
    pub device_id: Option<String>,
    pub app_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseCheckResponse {
    pub is_valid: bool,
    pub license: Option<LicenseResponse>,
    pub message: String,
    pub error_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStats {
    pub total_licenses: i64,
    pub active_licenses: i64,
    pub expired_licenses: i64,
    pub expiring_soon: i64, // Within 30 days
    pub total_users: i64,
    pub total_devices: i64,
}

impl From<License> for LicenseResponse {
    fn from(license: License) -> Self {
        let now = chrono::Utc::now().naive_utc();
        let is_expired = license.expires_at.map_or(false, |expires| expires < now);
        let days_remaining = license.expires_at.map(|expires| {
            let duration = expires - now;
            duration.num_days()
        });

        Self {
            id: license.id.unwrap_or(0),
            license_key: license.license_key,
            company_name: license.company_name,
            contact_email: license.contact_email,
            contact_phone: license.contact_phone,
            max_users: license.max_users,
            max_devices: license.max_devices,
            is_active: license.is_active.unwrap_or(0) == 1,
            expires_at: license.expires_at,
            created_at: license.created_at,
            last_check: license.last_check,
            check_count: license.check_count,
            features: license.features,
            notes: license.notes,
            days_remaining,
            is_expired,
        }
    }
}

impl License {
    pub fn new(
        license_key: String,
        company_name: String,
        contact_email: String,
        contact_phone: Option<String>,
        max_users: i64,
        max_devices: i64,
        expires_at: Option<NaiveDateTime>,
        features: Option<String>,
        notes: Option<String>,
    ) -> Self {
        let now = Utc::now().naive_utc();
        Self {
            id: None,
            license_key,
            company_name,
            contact_email,
            contact_phone,
            max_users,
            max_devices,
            is_active: Some(1),
            expires_at,
            created_at: Some(now),
            updated_at: Some(now),
            last_check: None,
            check_count: Some(0),
            features,
            notes,
        }
    }

    pub fn is_valid(&self) -> bool {
        if self.is_active.unwrap_or(0) != 1 {
            return false;
        }

        if let Some(expires_at) = self.expires_at {
            if expires_at < chrono::Utc::now().naive_utc() {
                return false;
            }
        }

        true
    }

    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            expires_at < chrono::Utc::now().naive_utc()
        } else {
            false
        }
    }

    pub fn days_until_expiry(&self) -> Option<i64> {
        self.expires_at.map(|expires_at| {
            let now = chrono::Utc::now().naive_utc();
            let duration = expires_at - now;
            duration.num_days()
        })
    }
}
