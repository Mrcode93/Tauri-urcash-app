use crate::database::Database;
use crate::models::{
    ApiResponse, CashBox, CashBoxTransaction, UserCashBoxSettings, CashBoxSummary,
    CashBoxWithMoneyBoxSummary, CashBoxIntegration, CashBoxReport, CashBoxReportSummary,
    ComprehensiveCashBoxReport, ComprehensiveReportSummary, MoneyBox, MoneyBoxTransaction,
    OpenCashBoxRequest, CloseCashBoxRequest, AddTransactionRequest, ManualTransactionRequest,
    UpdateCashBoxSettingsRequest, ForceCloseCashBoxRequest, TransferToMoneyBoxRequest,
    CashBoxTransactionsQuery, CashBoxHistoryQuery, CashBoxReportQuery,
    TRANSACTION_TYPES, REFERENCE_TYPES, CASH_BOX_STATUSES
};
use anyhow::Result;
use chrono::{Utc, DateTime};
use sqlx::{Row, SqlitePool};
use tracing::{info, warn, error};

#[derive(Clone)]
pub struct CashBoxService;

impl CashBoxService {
    pub fn new() -> Self {
        Self
    }
    // ==================== CASH BOX OPERATIONS ====================
    
    pub async fn get_user_cash_box(&self, db: &Database, user_id: i64) -> Result<Option<CashBox>> {
        let query = r#"
            SELECT cb.*, u.name as user_name, u.username
            FROM cash_boxes cb
            JOIN users u ON cb.user_id = u.id
            WHERE cb.user_id = ? AND cb.status = 'open'
            ORDER BY cb.opened_at DESC
            LIMIT 1
        "#;
        
        let row = sqlx::query(query).bind(user_id).fetch_optional(&db.pool).await?;
        
        if let Some(row) = row {
            let cash_box = CashBox {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                initial_amount: row.get("initial_amount"),
                current_amount: row.get("current_amount"),
                status: row.get("status"),
                opened_at: row.get("opened_at"),
                closed_at: row.get("closed_at"),
                opened_by: row.get("opened_by"),
                closed_by: row.get("closed_by"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                user_name: row.get("user_name"),
                username: row.get("username"),
                opened_by_name: None,
                closed_by_name: None,
            };
            Ok(Some(cash_box))
        } else {
            Ok(None)
        }
    }

    pub async fn get_user_cash_box_settings(&self, db: &Database, user_id: i64) -> Result<UserCashBoxSettings> {
        let query = "SELECT * FROM user_cash_box_settings WHERE user_id = ?";
        let row = sqlx::query(query).bind(user_id).fetch_optional(&db.pool).await?;
        
        if let Some(row) = row {
            let settings = UserCashBoxSettings {
                id: row.get("id"),
                user_id: row.get("user_id"),
                default_opening_amount: row.get("default_opening_amount"),
                require_opening_amount: row.get("require_opening_amount"),
                require_closing_count: row.get("require_closing_count"),
                allow_negative_balance: row.get("allow_negative_balance"),
                max_withdrawal_amount: row.get("max_withdrawal_amount"),
                require_approval_for_withdrawal: row.get("require_approval_for_withdrawal"),
                auto_close_at_end_of_day: row.get("auto_close_at_end_of_day"),
                auto_close_time: row.get("auto_close_time"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            Ok(settings)
        } else {
            // Create default settings
            let insert_query = r#"
                INSERT INTO user_cash_box_settings (
                    user_id, default_opening_amount, require_opening_amount, require_closing_count,
                    allow_negative_balance, max_withdrawal_amount, require_approval_for_withdrawal,
                    auto_close_at_end_of_day, auto_close_time
                )
                VALUES (?, 0, 1, 1, 0, 0, 0, 0, '23:59:59')
            "#;
            
            sqlx::query(insert_query).bind(user_id).execute(&db.pool).await?;
            
            // Return the newly created settings by querying again
            let row = sqlx::query(query).bind(user_id).fetch_one(&db.pool).await?;
            
            let settings = UserCashBoxSettings {
                id: row.get("id"),
                user_id: row.get("user_id"),
                default_opening_amount: row.get("default_opening_amount"),
                require_opening_amount: row.get("require_opening_amount"),
                require_closing_count: row.get("require_closing_count"),
                allow_negative_balance: row.get("allow_negative_balance"),
                max_withdrawal_amount: row.get("max_withdrawal_amount"),
                require_approval_for_withdrawal: row.get("require_approval_for_withdrawal"),
                auto_close_at_end_of_day: row.get("auto_close_at_end_of_day"),
                auto_close_time: row.get("auto_close_time"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            Ok(settings)
        }
    }

    pub async fn open_cash_box(&self, db: &Database, user_id: i64, opening_amount: f64, notes: Option<String>) -> Result<CashBox> {
        // Check if user already has an open cash box
        let existing_cash_box = self.get_user_cash_box(db, user_id).await?;
        if existing_cash_box.is_some() {
            return Err(anyhow::anyhow!("User already has an open cash box"));
        }

        // Get user info
        let user_query = "SELECT * FROM users WHERE id = ?";
        let user_row = sqlx::query(user_query).bind(user_id).fetch_one(&db.pool).await?;
        let user_name: String = user_row.get("name");

        // Create new cash box
        let insert_query = r#"
            INSERT INTO cash_boxes (
                user_id, name, initial_amount, current_amount, status, opened_at, opened_by, notes
            )
            VALUES (?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, ?, ?)
        "#;
        
        let cash_box_id =         sqlx::query(insert_query)
            .bind(user_id)
            .bind(format!("{} - صندوق", user_name))
            .bind(opening_amount)
            .bind(opening_amount)
            .bind(user_id)
            .bind(&notes)
            .execute(&db.pool)
            .await?
            .last_insert_rowid();

        // Record opening transaction if amount > 0
        if opening_amount > 0.0 {
            let transaction_query = r#"
                INSERT INTO cash_box_transactions (
                    cash_box_id, user_id, transaction_type, amount, balance_before, balance_after,
                    reference_type, description, notes
                )
                VALUES (?, ?, 'opening', ?, 0, ?, 'opening', 'فتح الصندوق', ?)
            "#;
            
            sqlx::query(transaction_query)
                .bind(cash_box_id)
                .bind(user_id)
                .bind(opening_amount)
                .bind(opening_amount)
                .bind(&notes)
                .execute(&db.pool)
                .await?;
        }

        self.get_cash_box_by_id(db, cash_box_id).await
    }

    pub async fn close_cash_box(&self, db: &Database, user_id: i64, closing_amount: f64, notes: Option<String>) -> Result<CashBox> {
        let cash_box = self.get_user_cash_box(db, user_id).await?;
        if cash_box.is_none() {
            return Err(anyhow::anyhow!("No open cash box found"));
        }
        let cash_box = cash_box.unwrap();

        // Update cash box status
        let update_query = r#"
            UPDATE cash_boxes 
            SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?, notes = ?
            WHERE id = ?
        "#;
        
        sqlx::query(update_query)
            .bind(user_id)
            .bind(&notes)
            .bind(cash_box.id)
            .execute(&db.pool)
            .await?;

        // Record closing transaction only if there's a difference
        let difference = closing_amount - cash_box.current_amount;
        if difference.abs() > 0.01 {
            let transaction_query = r#"
                INSERT INTO cash_box_transactions (
                    cash_box_id, user_id, transaction_type, amount, balance_before, balance_after,
                    reference_type, description, notes
                )
                VALUES (?, ?, 'closing', ?, ?, ?, 'closing', 'إغلاق الصندوق', ?)
            "#;
            
            sqlx::query(transaction_query)
                .bind(cash_box.id)
                .bind(user_id)
                .bind(difference)
                .bind(cash_box.current_amount)
                .bind(closing_amount)
                .bind(&notes)
                .execute(&db.pool)
                .await?;
        }

        self.get_cash_box_by_id(db, cash_box.id).await
    }

    pub async fn add_transaction(
        &self,
        db: &Database,
        cash_box_id: i64,
        user_id: i64,
        transaction_type: String,
        amount: f64,
        reference_type: String,
        reference_id: Option<i64>,
        description: Option<String>,
        notes: Option<String>,
    ) -> Result<ApiResponse<serde_json::Value>> {
        // Validate amount is not zero
        if amount.abs() < 0.01 {
            return Err(anyhow::anyhow!("Transaction amount cannot be zero"));
        }

        // Get cash box
        let cash_box = self.get_cash_box_by_id(db, cash_box_id).await?;
        if cash_box.status != "open" {
            return Err(anyhow::anyhow!("Cash box is not open"));
        }

        let balance_before = cash_box.current_amount;
        let mut balance_after = balance_before;

        // Calculate new balance based on transaction type
        match transaction_type.as_str() {
            "deposit" | "sale" | "customer_receipt" | "purchase_return" | "cash_deposit" |
            "transfer_from" | "transfer_from_cash_box" | "transfer_from_daily_box" | "transfer_from_money_box" |
            "expense_reversal" => {
                balance_after += amount;
            }
            "withdrawal" | "purchase" | "expense" | "expense_update" | "supplier_payment" |
            "sale_return" | "transfer_to_cashier" | "transfer_to_money_box" | "transfer_to_bank" |
            "cash_box_closing" => {
                balance_after -= amount;
            }
            "adjustment" => {
                balance_after = amount; // Direct adjustment
            }
            _ => {
                return Err(anyhow::anyhow!("Invalid transaction type"));
            }
        }

        // Check for negative balance if not allowed
        let settings = self.get_user_cash_box_settings(db, cash_box.user_id).await?;
        if balance_after < 0.0 && settings.allow_negative_balance == 0 {
            return Err(anyhow::anyhow!("Transaction would result in negative balance"));
        }

        // Update cash box balance
        let update_query = "UPDATE cash_boxes SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        sqlx::query(update_query)
            .bind(balance_after)
            .bind(cash_box_id)
            .execute(&db.pool)
            .await?;

        // Record transaction
        let transaction_query = r#"
            INSERT INTO cash_box_transactions (
                cash_box_id, user_id, transaction_type, amount, balance_before, balance_after,
                reference_type, reference_id, description, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#;
        
        let transaction_id = sqlx::query(transaction_query)
            .bind(cash_box_id)
            .bind(user_id)
            .bind(transaction_type)
            .bind(amount)
            .bind(balance_before)
            .bind(balance_after)
            .bind(reference_type)
            .bind(reference_id)
            .bind(description)
            .bind(notes)
            .execute(&db.pool)
            .await?
            .last_insert_rowid();

        let result = serde_json::json!({
            "success": true,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "transaction_id": transaction_id
        });

        Ok(ApiResponse::success(result))
    }

    pub async fn get_cash_box_by_id(&self, db: &Database, cash_box_id: i64) -> Result<CashBox> {
        let query = r#"
            SELECT cb.*, u.name as user_name, u.username,
                   opener.name as opened_by_name,
                   closer.name as closed_by_name
            FROM cash_boxes cb
            JOIN users u ON cb.user_id = u.id
            LEFT JOIN users opener ON cb.opened_by = opener.id
            LEFT JOIN users closer ON cb.closed_by = closer.id
            WHERE cb.id = ?
        "#;
        
        let row = sqlx::query(query).bind(cash_box_id).fetch_one(&db.pool).await?;
        
        let cash_box = CashBox {
            id: row.get("id"),
            user_id: row.get("user_id"),
            name: row.get("name"),
            initial_amount: row.get("initial_amount"),
            current_amount: row.get("current_amount"),
            status: row.get("status"),
            opened_at: row.get("opened_at"),
            closed_at: row.get("closed_at"),
            opened_by: row.get("opened_by"),
            closed_by: row.get("closed_by"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            user_name: row.get("user_name"),
            username: row.get("username"),
            opened_by_name: row.get("opened_by_name"),
            closed_by_name: row.get("closed_by_name"),
        };
        
        Ok(cash_box)
    }

    pub async fn get_cash_box_transactions(
        &self,
        db: &Database,
        cash_box_id: i64,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<CashBoxTransaction>> {
        let query = r#"
            SELECT cbt.*, u.name as user_name
            FROM cash_box_transactions cbt
            JOIN users u ON cbt.user_id = u.id
            WHERE cbt.cash_box_id = ?
            ORDER BY cbt.created_at DESC
            LIMIT ? OFFSET ?
        "#;
        
        let rows = sqlx::query(query)
            .bind(cash_box_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;
        
        let mut transactions = Vec::new();
        for row in rows {
            let transaction = CashBoxTransaction {
                id: row.get("id"),
                cash_box_id: row.get("cash_box_id"),
                user_id: row.get("user_id"),
                transaction_type: row.get("transaction_type"),
                amount: row.get("amount"),
                balance_before: row.get("balance_before"),
                balance_after: row.get("balance_after"),
                reference_type: row.get("reference_type"),
                reference_id: row.get("reference_id"),
                sale_id: row.get("sale_id"),
                purchase_id: row.get("purchase_id"),
                expense_id: row.get("expense_id"),
                customer_receipt_id: row.get("customer_receipt_id"),
                supplier_receipt_id: row.get("supplier_receipt_id"),
                description: row.get("description"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                user_name: row.get("user_name"),
            };
            transactions.push(transaction);
        }
        
        Ok(transactions)
    }

    pub async fn get_user_cash_box_history(
        &self,
        db: &Database,
        user_id: i64,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<CashBox>> {
        let query = r#"
            SELECT cb.*, u.name as user_name,
                   opener.name as opened_by_name,
                   closer.name as closed_by_name
            FROM cash_boxes cb
            JOIN users u ON cb.user_id = u.id
            LEFT JOIN users opener ON cb.opened_by = opener.id
            LEFT JOIN users closer ON cb.closed_by = closer.id
            WHERE cb.user_id = ?
            ORDER BY cb.created_at DESC
            LIMIT ? OFFSET ?
        "#;
        
        let rows = sqlx::query(query)
            .bind(user_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;
        
        let mut cash_boxes = Vec::new();
        for row in rows {
            let cash_box = CashBox {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                initial_amount: row.get("initial_amount"),
                current_amount: row.get("current_amount"),
                status: row.get("status"),
                opened_at: row.get("opened_at"),
                closed_at: row.get("closed_at"),
                opened_by: row.get("opened_by"),
                closed_by: row.get("closed_by"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                user_name: row.get("user_name"),
                username: None,
                opened_by_name: row.get("opened_by_name"),
                closed_by_name: row.get("closed_by_name"),
            };
            cash_boxes.push(cash_box);
        }
        
        Ok(cash_boxes)
    }

    pub async fn update_user_cash_box_settings(
        &self,
        db: &Database,
        user_id: i64,
        settings: UpdateCashBoxSettingsRequest,
    ) -> Result<UserCashBoxSettings> {
        let current_settings = self.get_user_cash_box_settings(db, user_id).await?;
        
        let update_query = r#"
            UPDATE user_cash_box_settings
            SET default_opening_amount = ?,
                require_opening_amount = ?,
                require_closing_count = ?,
                allow_negative_balance = ?,
                max_withdrawal_amount = ?,
                require_approval_for_withdrawal = ?,
                auto_close_at_end_of_day = ?,
                auto_close_time = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        "#;
        
        sqlx::query(update_query)
            .bind(settings.default_opening_amount.unwrap_or(current_settings.default_opening_amount))
            .bind(settings.require_opening_amount.map(|v| if v { 1 } else { 0 }).unwrap_or(current_settings.require_opening_amount))
            .bind(settings.require_closing_count.map(|v| if v { 1 } else { 0 }).unwrap_or(current_settings.require_closing_count))
            .bind(settings.allow_negative_balance.map(|v| if v { 1 } else { 0 }).unwrap_or(current_settings.allow_negative_balance))
            .bind(settings.max_withdrawal_amount.unwrap_or(current_settings.max_withdrawal_amount))
            .bind(settings.require_approval_for_withdrawal.map(|v| if v { 1 } else { 0 }).unwrap_or(current_settings.require_approval_for_withdrawal))
            .bind(settings.auto_close_at_end_of_day.map(|v| if v { 1 } else { 0 }).unwrap_or(current_settings.auto_close_at_end_of_day))
            .bind(settings.auto_close_time.unwrap_or(current_settings.auto_close_time))
            .bind(user_id)
            .execute(&db.pool)
            .await?;
        
        self.get_user_cash_box_settings(db, user_id).await
    }

    pub async fn get_cash_box_summary(&self, db: &Database, user_id: i64) -> Result<CashBoxSummary> {
        let cash_box = self.get_user_cash_box(db, user_id).await?;
        
        if cash_box.is_none() {
            return Ok(CashBoxSummary {
                has_open_cash_box: false,
                cash_box_id: None,
                current_amount: 0.0,
                opened_at: None,
                today_transactions: 0,
                today_amount: 0.0,
            });
        }
        
        let cash_box = cash_box.unwrap();
        
        // Get today's transactions
        let today_query = r#"
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM cash_box_transactions
            WHERE cash_box_id = ? AND DATE(created_at) = DATE('now')
        "#;
        
        let row = sqlx::query(today_query)
            .bind(cash_box.id)
            .fetch_one(&db.pool)
            .await?;
        
        let today_transactions: i64 = row.get("count");
        let today_amount: i64 = row.get("total");
        let today_amount_f64 = today_amount as f64;
        
        Ok(CashBoxSummary {
            has_open_cash_box: true,
            cash_box_id: Some(cash_box.id),
            current_amount: cash_box.current_amount,
            opened_at: cash_box.opened_at,
            today_transactions,
            today_amount: today_amount_f64,
        })
    }

    // ==================== ADMIN OPERATIONS ====================
    
    pub async fn get_all_open_cash_boxes(&self, db: &Database) -> Result<Vec<CashBox>> {
        let query = r#"
            SELECT 
                cb.*,
                u.name as user_name,
                u.username,
                u.email
            FROM cash_boxes cb
            JOIN users u ON cb.user_id = u.id
            WHERE cb.status = 'open'
            ORDER BY cb.opened_at ASC
        "#;
        
        let rows = sqlx::query(query).fetch_all(&db.pool).await?;
        
        let mut cash_boxes = Vec::new();
        for row in rows {
            let cash_box = CashBox {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                initial_amount: row.get("initial_amount"),
                current_amount: row.get("current_amount"),
                status: row.get("status"),
                opened_at: row.get("opened_at"),
                closed_at: row.get("closed_at"),
                opened_by: row.get("opened_by"),
                closed_by: row.get("closed_by"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                user_name: row.get("user_name"),
                username: row.get("username"),
                opened_by_name: None,
                closed_by_name: None,
            };
            cash_boxes.push(cash_box);
        }
        
        Ok(cash_boxes)
    }

    pub async fn force_close_cash_box(
        &self,
        db: &Database,
        cash_box_id: i64,
        admin_user_id: i64,
        reason: Option<String>,
        money_box_id: Option<i64>,
    ) -> Result<CashBox> {
        let cash_box = self.get_cash_box_by_id(db, cash_box_id).await?;
        
        if cash_box.status == "closed" {
            return Err(anyhow::anyhow!("Cash box is already closed"));
        }

        // Update cash box status
        let update_query = r#"
            UPDATE cash_boxes 
            SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?, notes = ?
            WHERE id = ?
        "#;
        
        sqlx::query(update_query)
            .bind(admin_user_id)
            .bind(&reason)
            .bind(cash_box_id)
            .execute(&db.pool)
            .await?;

        // Record closing transaction if there's money
        if cash_box.current_amount > 0.0 {
            let transaction_query = r#"
                INSERT INTO cash_box_transactions (
                    cash_box_id, user_id, transaction_type, amount, balance_before, balance_after,
                    reference_type, description, notes
                )
                VALUES (?, ?, 'closing', ?, ?, 0, 'closing', 'إغلاق إجباري بواسطة المدير', ?)
            "#;
            
            sqlx::query(transaction_query)
                .bind(cash_box_id)
                .bind(admin_user_id)
                .bind(cash_box.current_amount)
                .bind(cash_box.current_amount)
                .bind(&reason)
                .execute(&db.pool)
                .await?;
        }

        // TODO: Implement money box transfer if money_box_id is provided
        // This would require implementing the money box service first

        self.get_cash_box_by_id(db, cash_box_id).await
    }

    pub async fn get_all_users_cash_box_history(
        &self,
        db: &Database,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<CashBox>> {
        let query = r#"
            SELECT 
                cb.*,
                u.name as user_name,
                u.username,
                u.email,
                opened_by_user.name as opened_by_name,
                closed_by_user.name as closed_by_name
            FROM cash_boxes cb
            JOIN users u ON cb.user_id = u.id
            LEFT JOIN users opened_by_user ON cb.opened_by = opened_by_user.id
            LEFT JOIN users closed_by_user ON cb.closed_by = closed_by_user.id
            ORDER BY cb.opened_at DESC
            LIMIT ? OFFSET ?
        "#;
        
        let rows = sqlx::query(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&db.pool)
            .await?;
        
        let mut cash_boxes = Vec::new();
        for row in rows {
            let cash_box = CashBox {
                id: row.get("id"),
                user_id: row.get("user_id"),
                name: row.get("name"),
                initial_amount: row.get("initial_amount"),
                current_amount: row.get("current_amount"),
                status: row.get("status"),
                opened_at: row.get("opened_at"),
                closed_at: row.get("closed_at"),
                opened_by: row.get("opened_by"),
                closed_by: row.get("closed_by"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                user_name: row.get("user_name"),
                username: row.get("username"),
                opened_by_name: row.get("opened_by_name"),
                closed_by_name: row.get("closed_by_name"),
            };
            cash_boxes.push(cash_box);
        }
        
        Ok(cash_boxes)
    }

    // ==================== MONEY BOX INTEGRATION ====================
    
    pub async fn get_daily_money_box(&self, db: &Database) -> Result<Option<MoneyBox>> {
        let query = "SELECT * FROM money_boxes WHERE name = 'الصندوق اليومي'";
        let row = sqlx::query(query).fetch_optional(&db.pool).await?;
        
        if let Some(row) = row {
            let money_box = MoneyBox {
                id: row.get("id"),
                name: row.get("name"),
                amount: row.get("amount"),
                notes: row.get("notes"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            Ok(Some(money_box))
        } else {
            Ok(None)
        }
    }

    pub async fn get_cash_box_with_money_box_summary(&self, db: &Database, user_id: i64) -> Result<CashBoxWithMoneyBoxSummary> {
        let cash_box = self.get_user_cash_box(db, user_id).await?;
        let daily_money_box = self.get_daily_money_box(db).await?;
        let cash_box_summary = self.get_cash_box_summary(db, user_id).await?;

        let integration = CashBoxIntegration {
            can_transfer_to_daily: cash_box.is_some() && cash_box.as_ref().unwrap().current_amount > 0.0,
            can_transfer_from_daily: daily_money_box.is_some() && daily_money_box.as_ref().unwrap().amount > 0.0,
            daily_box_balance: daily_money_box.as_ref().map(|mb| mb.amount).unwrap_or(0.0),
        };

        Ok(CashBoxWithMoneyBoxSummary {
            cash_box,
            daily_money_box,
            cash_box_summary,
            integration,
        })
    }

    // ==================== HELPER METHODS ====================
    
    pub async fn add_sale_transaction(
        &self,
        db: &Database,
        cash_box_id: i64,
        user_id: i64,
        amount: f64,
        sale_id: i64,
        description: Option<String>,
    ) -> Result<ApiResponse<serde_json::Value>> {
        self.add_transaction(
            db,
            cash_box_id,
            user_id,
            "sale".to_string(),
            amount,
            "sale".to_string(),
            Some(sale_id),
            description,
            None,
        ).await
    }

    pub async fn add_purchase_transaction(
        &self,
        db: &Database,
        cash_box_id: i64,
        user_id: i64,
        amount: f64,
        purchase_id: i64,
        description: Option<String>,
    ) -> Result<ApiResponse<serde_json::Value>> {
        self.add_transaction(
            db,
            cash_box_id,
            user_id,
            "purchase".to_string(),
            amount,
            "purchase".to_string(),
            Some(purchase_id),
            description,
            None,
        ).await
    }

    pub async fn add_expense_transaction(
        &self,
        db: &Database,
        cash_box_id: i64,
        user_id: i64,
        amount: f64,
        expense_id: i64,
        description: Option<String>,
    ) -> Result<ApiResponse<serde_json::Value>> {
        self.add_transaction(
            db,
            cash_box_id,
            user_id,
            "expense".to_string(),
            amount,
            "expense".to_string(),
            Some(expense_id),
            description,
            None,
        ).await
    }
}
