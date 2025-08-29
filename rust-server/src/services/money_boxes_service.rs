use crate::database::Database;
use sqlx::{Row};
use serde_json::{Value, json};
use serde::Deserialize;
use crate::routes::money_boxes_routes::MoneyBoxQuery;
use anyhow::Result;

// Internal structs for service communication
#[derive(Debug, Deserialize)]
pub struct InternalCreateMoneyBoxRequest {
    pub name: String,
    pub notes: Option<String>,
    pub initial_balance: Option<f64>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct InternalUpdateMoneyBoxRequest {
    pub name: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InternalAddTransactionRequest {
    pub transaction_type: String,
    pub amount: f64,
    pub notes: Option<String>,
    pub reference_id: Option<i32>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct InternalTransferRequest {
    pub from_box_id: i32,
    pub to_box_id: i32,
    pub amount: f64,
    pub notes: Option<String>,
    pub created_by: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct InternalTransactionQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InternalReconcileMoneyBoxRequest {
    pub expected_balance: f64,
    pub actual_balance: f64,
    pub adjustment_reason: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone)]
pub struct MoneyBoxesService;

impl MoneyBoxesService {
    pub fn new() -> Self {
        Self
    }

    // Get all money boxes
    pub async fn get_money_boxes(&self, db: &Database, _query: &MoneyBoxQuery) -> Result<Value> {
        println!("Fetching money boxes from database...");
        let rows = sqlx::query(
            r#"
            SELECT mb.*, u.name as created_by_name
            FROM money_boxes mb
            LEFT JOIN users u ON mb.created_by = u.id
            ORDER BY mb.created_at DESC
            "#
        )
        .fetch_all(&db.pool)
        .await?;
        
        println!("Found {} money boxes in database", rows.len());

        let money_boxes: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                let created_at_str: String = row.get("created_at");
                let updated_at_str: String = row.get("updated_at");
                
                // Convert SQLite datetime to proper ISO format
                let created_at = if created_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = created_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        created_at_str
                    }
                } else {
                    created_at_str
                };
                
                let updated_at = if updated_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = updated_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        updated_at_str
                    }
                } else {
                    updated_at_str
                };
                
                json!({
                    "id": row.get::<i64, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "balance": row.get::<f64, _>("amount"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "created_by": row.get::<Option<i64>, _>("created_by"),
                    "created_at": created_at,
                    "updated_at": updated_at
                })
            })
            .collect();

        Ok(json!(money_boxes))
    }

    // Get all money boxes summary
    pub async fn get_all_money_boxes_summary(&self, db: &Database) -> Result<Value> {
        let rows = sqlx::query(
            r#"
            SELECT 
                mb.id,
                mb.name,
                mb.amount,
                COUNT(mbt.id) as transaction_count,
                COALESCE(SUM(CASE WHEN mbt.type = 'deposit' THEN CAST(mbt.amount AS REAL) ELSE 0.0 END), 0.0) as total_deposits,
                COALESCE(SUM(CASE WHEN mbt.type = 'withdraw' THEN CAST(mbt.amount AS REAL) ELSE 0.0 END), 0.0) as total_withdrawals
            FROM money_boxes mb
            LEFT JOIN money_box_transactions mbt ON mb.id = mbt.box_id
            GROUP BY mb.id, mb.name, mb.amount
            ORDER BY mb.created_at DESC
            "#
        )
        .fetch_all(&db.pool)
        .await?;

        let mut total_balance = 0.0;
        let money_boxes_summary: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                let amount: f64 = row.get("amount");
                total_balance += amount;
                
                json!({
                    "moneyBox": {
                        "id": row.get::<i64, _>("id"),
                        "name": row.get::<String, _>("name"),
                        "amount": amount
                    },
                    "statistics": {
                        "total_transactions": row.get::<i64, _>("transaction_count"),
                        "total_deposits": row.get::<f64, _>("total_deposits"),
                        "total_withdrawals": row.get::<f64, _>("total_withdrawals"),
                        "current_balance": amount
                    }
                })
            })
            .collect();

        Ok(json!({
            "total_boxes": money_boxes_summary.len() as i64,
            "total_balance": total_balance,
            "total_deposits": 0.0, // TODO: Calculate from transactions
            "total_withdrawals": 0.0, // TODO: Calculate from transactions
            "total_transactions": 0 // TODO: Calculate from transactions
        }))
    }

    // Get money box by name
    pub async fn get_money_box_by_name(&self, db: &Database, name: &str) -> Result<Option<Value>> {
        let row = sqlx::query(
            r#"
            SELECT mb.*, u.name as created_by_name
            FROM money_boxes mb
            LEFT JOIN users u ON mb.created_by = u.id
            WHERE mb.name = ?
            "#
        )
        .bind(name)
        .fetch_optional(&db.pool)
        .await?;

        match row {
            Some(row) => {
                let created_at_str: String = row.get("created_at");
                let updated_at_str: String = row.get("updated_at");
                
                // Convert SQLite datetime to proper ISO format
                let created_at = if created_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = created_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        created_at_str
                    }
                } else {
                    created_at_str
                };
                
                let updated_at = if updated_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = updated_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        updated_at_str
                    }
                } else {
                    updated_at_str
                };
                
                Ok(Some(json!({
                    "id": row.get::<i64, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "amount": row.get::<f64, _>("amount"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "created_by": row.get::<Option<i64>, _>("created_by"),
                    "created_by_name": row.get::<Option<String>, _>("created_by_name"),
                    "created_at": created_at,
                    "updated_at": updated_at
                })))
            },
            None => Ok(None),
        }
    }

    // Get money box by ID
    pub async fn get_money_box_by_id(&self, db: &Database, id: i64) -> Result<Option<Value>> {
        let row = sqlx::query(
            r#"
            SELECT mb.*, u.name as created_by_name
            FROM money_boxes mb
            LEFT JOIN users u ON mb.created_by = u.id
            WHERE mb.id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        match row {
            Some(row) => {
                let created_at_str: String = row.get("created_at");
                let updated_at_str: String = row.get("updated_at");
                
                // Convert SQLite datetime to proper ISO format
                let created_at = if created_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = created_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        created_at_str
                    }   
                } else {
                    created_at_str
                };
                
                let updated_at = if updated_at_str.contains(' ') {
                    // Parse SQLite format (YYYY-MM-DD HH:MM:SS) and convert to ISO
                    let parts: Vec<&str> = updated_at_str.split(' ').collect();
                    if parts.len() == 2 {
                        format!("{}T{}.000Z", parts[0], parts[1])
                    } else {
                        updated_at_str
                    }
                } else {
                    updated_at_str
                };
                
                Ok(Some(json!({
                    "id": row.get::<i64, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "balance": row.get::<f64, _>("amount"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "created_by": row.get::<Option<i64>, _>("created_by"),
                    "created_by_name": row.get::<Option<String>, _>("created_by_name"),
                    "created_at": created_at,
                    "updated_at": updated_at
                })))
            },
            None => Ok(None),
        }
    }

    // Get money box summary
    pub async fn get_money_box_summary(&self, db: &Database, id: i64) -> Result<Value> {
        // Get money box details
        let money_box = self.get_money_box_by_id(db, id as i64).await?;
        if money_box.is_none() {
            return Err(anyhow::anyhow!("صندوق المال غير موجود"));
        }

        let money_box_value = money_box.unwrap();

        // Get statistics
        let stats_row = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN type = 'deposit' THEN CAST(amount AS REAL) ELSE 0.0 END), 0.0) as total_deposits,
                COALESCE(SUM(CASE WHEN type = 'withdraw' THEN CAST(amount AS REAL) ELSE 0.0 END), 0.0) as total_withdrawals,
                MAX(created_at) as last_transaction_date
            FROM money_box_transactions 
            WHERE box_id = ?
            "#
        )
        .bind(id)
        .fetch_one(&db.pool)
        .await?;

        let total_transactions: i64 = stats_row.get("total_transactions");
        let total_deposits: f64 = stats_row.get("total_deposits");
        let total_withdrawals: f64 = stats_row.get("total_withdrawals");
        let last_transaction_date: Option<String> = stats_row.get("last_transaction_date");

        Ok(json!({
            "id": money_box_value["id"],
            "name": money_box_value["name"],
            "amount": money_box_value["balance"],
            "total_deposits": total_deposits,
            "total_withdrawals": total_withdrawals,
            "total_transactions": total_transactions
        }))
    }

    // Create money box
    pub async fn create_money_box(&self, db: &Database, payload: InternalCreateMoneyBoxRequest) -> Result<Value> {
        // Check if name already exists
        let existing = sqlx::query(
            "SELECT id FROM money_boxes WHERE name = ?"
        )
        .bind(&payload.name)
        .fetch_optional(&db.pool)
        .await?;

        if existing.is_some() {
            return Err(anyhow::anyhow!("اسم صندوق المال موجود مسبقاً"));
        }

        let result = sqlx::query(
            r#"
            INSERT INTO money_boxes (name, amount, notes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            "#
        )
        .bind(&payload.name)
        .bind(payload.initial_balance.unwrap_or(0.0))
        .bind(&payload.notes)
        .bind(payload.created_by)
        .execute(&db.pool)
        .await?;

        let id = result.last_insert_rowid() as i64;
        
        // Get the created money box
        let money_box = self.get_money_box_by_id(db, id).await?;
        
        Ok(money_box.unwrap())
    }

    // Update money box
    pub async fn update_money_box(&self, db: &Database, id: i64, payload: InternalUpdateMoneyBoxRequest) -> Result<Value> {
        // Check if money box exists
        let existing = self.get_money_box_by_id(db, id as i64).await?;
        if existing.is_none() {
            return Err(anyhow::anyhow!("صندوق المال غير موجود"));
        }

        // Check if name already exists for other money box
        let name_exists = sqlx::query(
            "SELECT id FROM money_boxes WHERE name = ? AND id != ?"
        )
        .bind(&payload.name)
        .bind(id)
        .fetch_optional(&db.pool)
        .await?;

        if name_exists.is_some() {
            return Err(anyhow::anyhow!("اسم صندوق المال موجود مسبقاً"));
        }

        sqlx::query(
            r#"
            UPDATE money_boxes 
            SET name = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?
            "#
        )
        .bind(&payload.name)
        .bind(&payload.notes)
        .bind(id)
        .execute(&db.pool)
        .await?;

        // Get the updated money box
        let money_box = self.get_money_box_by_id(db, id).await?;
        
        Ok(money_box.unwrap())
    }

    // Delete money box
    pub async fn delete_money_box(&self, db: &Database, id: i64) -> Result<Value> {
        // Check if money box exists
        let existing = self.get_money_box_by_id(db, id as i64).await?;
        if existing.is_none() {
            return Err(anyhow::anyhow!("صندوق المال غير موجود"));
        }

        // Check if money box has transactions
        let has_transactions = sqlx::query(
            "SELECT COUNT(*) as count FROM money_box_transactions WHERE box_id = ?"
        )
        .bind(id)
        .fetch_one(&db.pool)
        .await?;

        let count: i64 = has_transactions.get("count");
        if count > 0 {
            return Err(anyhow::anyhow!("لا يمكن حذف صندوق المال لوجود عمليات مرتبطة به"));
        }

        sqlx::query("DELETE FROM money_boxes WHERE id = ?")
            .bind(id)
            .execute(&db.pool)
            .await?;

        Ok(json!({
            "success": true,
            "message": "تم حذف صندوق المال بنجاح"
        }))
    }

    // Get money box transactions
    pub async fn get_money_box_transactions(&self, db: &Database, id: i64, query: &InternalTransactionQuery) -> Result<Value> {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);

        let rows = sqlx::query(
            r#"
            SELECT 
                mbt.*,
                u.name as created_by_name,
                mb.name as box_name
            FROM money_box_transactions mbt
            LEFT JOIN users u ON mbt.created_by = u.id
            LEFT JOIN money_boxes mb ON mbt.box_id = mb.id
            WHERE mbt.box_id = ?
            ORDER BY mbt.created_at DESC
            LIMIT ? OFFSET ?
            "#
        )
        .bind(id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&db.pool)
        .await?;

        let transactions: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "id": row.get::<i32, _>("id"),
                    "box_id": row.get::<i32, _>("box_id"),
                    "type": row.get::<String, _>("type"),
                    "amount": row.get::<f64, _>("amount"),
                    "balance_after": row.get::<f64, _>("balance_after"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "related_box_id": row.get::<Option<i32>, _>("related_box_id"),
                    "created_by": row.get::<Option<i32>, _>("created_by"),
                    "created_by_name": row.get::<Option<String>, _>("created_by_name"),
                    "box_name": row.get::<Option<String>, _>("box_name"),
                    "created_at": row.get::<String, _>("created_at")
                })
            })
            .collect();

        // Get total count
        let count_row = sqlx::query(
            "SELECT COUNT(*) as count FROM money_box_transactions WHERE box_id = ?"
        )
        .bind(id)
        .fetch_one(&db.pool)
        .await?;

        let total: i64 = count_row.get("count");

        Ok(json!({
            "transactions": transactions,
            "total": total,
            "limit": limit,
            "offset": offset
        }))
    }

    // Get transactions by date range
    pub async fn get_transactions_by_date_range(&self, db: &Database, id: i64, query: &InternalTransactionQuery) -> Result<Value> {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);
        let start_date = query.start_date.as_ref().ok_or_else(|| anyhow::anyhow!("تاريخ البداية مطلوب"))?;
        let end_date = query.end_date.as_ref().ok_or_else(|| anyhow::anyhow!("تاريخ النهاية مطلوب"))?;

        let rows = sqlx::query(
            r#"
            SELECT 
                mbt.*,
                u.name as created_by_name,
                mb.name as box_name
            FROM money_box_transactions mbt
            LEFT JOIN users u ON mbt.created_by = u.id
            LEFT JOIN money_boxes mb ON mbt.box_id = mb.id
            WHERE mbt.box_id = ? 
            AND DATE(mbt.created_at) BETWEEN ? AND ?
            ORDER BY mbt.created_at DESC
            LIMIT ? OFFSET ?
            "#
        )
        .bind(id)
        .bind(start_date)
        .bind(end_date)
        .bind(limit)
        .bind(offset)
        .fetch_all(&db.pool)
        .await?;

        let transactions: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "id": row.get::<i32, _>("id"),
                    "box_id": row.get::<i32, _>("box_id"),
                    "type": row.get::<String, _>("type"),
                    "amount": row.get::<f64, _>("amount"),
                    "balance_after": row.get::<f64, _>("balance_after"),
                    "notes": row.get::<Option<String>, _>("notes"),
                    "related_box_id": row.get::<Option<i32>, _>("related_box_id"),
                    "created_by": row.get::<Option<i32>, _>("created_by"),
                    "created_by_name": row.get::<Option<String>, _>("created_by_name"),
                    "box_name": row.get::<Option<String>, _>("box_name"),
                    "created_at": row.get::<String, _>("created_at")
                })
            })
            .collect();

        // Get total count for date range
        let count_row = sqlx::query(
            r#"
            SELECT COUNT(*) as count 
            FROM money_box_transactions 
            WHERE box_id = ? 
            AND DATE(created_at) BETWEEN ? AND ?
            "#
        )
        .bind(id)
        .bind(start_date)
        .bind(end_date)
        .fetch_one(&db.pool)
        .await?;

        let total: i64 = count_row.get("count");

        Ok(json!({
            "transactions": transactions,
            "total": total,
            "limit": limit,
            "offset": offset,
            "dateRange": {
                "startDate": start_date,
                "endDate": end_date
            }
        }))
    }

    // Add transaction to money box
    pub async fn add_transaction(&self, db: &Database, id: i64, payload: InternalAddTransactionRequest) -> Result<Value> {
        // Check if money box exists
        let money_box = self.get_money_box_by_id(db, id as i64).await?;
        if money_box.is_none() {
            return Err(anyhow::anyhow!("صندوق المال غير موجود"));
        }

        let current_balance: f64 = money_box.unwrap()["balance"].as_f64().unwrap_or(0.0);
        let new_balance = match payload.transaction_type.as_str() {
            "deposit" | "transfer_in" => current_balance + payload.amount,
            "withdraw" | "transfer_out" => {
                if current_balance < payload.amount {
                    return Err(anyhow::anyhow!("رصيد صندوق المال غير كافي"));
                }
                current_balance - payload.amount
            }
            _ => return Err(anyhow::anyhow!("نوع العملية غير صحيح")),
        };

        // Insert transaction
        let result = sqlx::query(
            r#"
            INSERT INTO money_box_transactions 
            (box_id, type, amount, balance_after, notes, related_box_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            "#
        )
        .bind(id)
        .bind(&payload.transaction_type)
        .bind(payload.amount)
        .bind(new_balance)
        .bind(&payload.notes)
        .bind(payload.reference_id)
        .bind(payload.created_by)
        .execute(&db.pool)
        .await?;

        let transaction_id = result.last_insert_rowid() as i32;

        // Update money box balance
        sqlx::query(
            "UPDATE money_boxes SET amount = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(new_balance)
        .bind(id)
        .execute(&db.pool)
        .await?;

        // Get the created transaction
        let transaction_row = sqlx::query(
            r#"
            SELECT 
                mbt.*,
                u.name as created_by_name,
                mb.name as box_name
            FROM money_box_transactions mbt
            LEFT JOIN users u ON mbt.created_by = u.id
            LEFT JOIN money_boxes mb ON mbt.box_id = mb.id
            WHERE mbt.id = ?
            "#
        )
        .bind(transaction_id)
        .fetch_one(&db.pool)
        .await?;

        let transaction = json!({
            "id": transaction_row.get::<i32, _>("id"),
            "box_id": transaction_row.get::<i32, _>("box_id"),
            "type": transaction_row.get::<String, _>("type"),
            "amount": transaction_row.get::<f64, _>("amount"),
            "balance_after": transaction_row.get::<f64, _>("balance_after"),
            "notes": transaction_row.get::<Option<String>, _>("notes"),
            "related_box_id": transaction_row.get::<Option<i32>, _>("related_box_id"),
            "created_by": transaction_row.get::<Option<i32>, _>("created_by"),
            "created_by_name": transaction_row.get::<Option<String>, _>("created_by_name"),
            "box_name": transaction_row.get::<Option<String>, _>("box_name"),
            "created_at": transaction_row.get::<String, _>("created_at")
        });

        Ok(json!({
            "transactionId": transaction_id,
            "newBalance": new_balance,
            "transaction": transaction
        }))
    }

    // Transfer between money boxes
    pub async fn transfer(&self, db: &Database, payload: InternalTransferRequest) -> Result<Value> {
        let from_box_id = payload.from_box_id;
        let to_box_id = payload.to_box_id;
        let amount = payload.amount;

        // Validate transfer
        if from_box_id == to_box_id {
            return Err(anyhow::anyhow!("لا يمكن التحويل إلى نفس الصندوق"));
        }

        if amount <= 0.0 {
            return Err(anyhow::anyhow!("المبلغ يجب أن يكون أكبر من صفر"));
        }

        // Check if both boxes exist
        let from_box = self.get_money_box_by_id(db, from_box_id as i64).await?;
        let to_box = self.get_money_box_by_id(db, to_box_id as i64).await?;

        if from_box.is_none() || to_box.is_none() {
            return Err(anyhow::anyhow!("لم يتم العثور على صندوق المال المصدر أو الوجهة"));
        }

        let from_box_value = from_box.unwrap();
        let to_box_value = to_box.unwrap();

        // Check if source box has sufficient balance
        let from_balance: f64 = from_box_value["balance"].as_f64().unwrap_or(0.0);
        if from_balance < amount {
            return Err(anyhow::anyhow!("الرصيد غير كافٍ في الصندوق المصدر"));
        }

        // Start transaction
        let mut tx = db.pool.begin().await?;

        // Withdraw from source box
        let _ = self.add_transaction_to_box(
            &mut tx,
            from_box_id,
            "transfer_out",
            amount,
            &payload.notes.clone().unwrap_or_default(),
            Some(to_box_id),
            payload.created_by,
        ).await?;

        // Deposit to destination box
        let _ = self.add_transaction_to_box(
            &mut tx,
            to_box_id,
            "transfer_in",
            amount,
            &payload.notes.unwrap_or_default(),
            Some(from_box_id),
            payload.created_by,
        ).await?;

        tx.commit().await?;

        let updated_from_box = self.get_money_box_by_id(db, from_box_id as i64).await?.unwrap();
        let updated_to_box = self.get_money_box_by_id(db, to_box_id as i64).await?.unwrap();

        Ok(json!({
            "success": true,
            "message": "تم التحويل بنجاح",
            "fromBox": updated_from_box,
            "toBox": updated_to_box
        }))
    }

    // Internal method for adding transactions within a transaction
    async fn add_transaction_to_box(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
        box_id: i32,
        transaction_type: &str,
        amount: f64,
        notes: &str,
        related_box_id: Option<i32>,
        created_by: Option<i32>,
    ) -> Result<i64> {
        // Get current balance
        let balance_row = sqlx::query("SELECT amount FROM money_boxes WHERE id = ?")
            .bind(box_id)
            .fetch_one(&mut **tx)
            .await?;
        
        let current_balance: f64 = balance_row.get("amount");

        let mut new_balance = current_balance;

        // Calculate new balance
        match transaction_type {
            "deposit" | "transfer_in" | "cash_deposit" | "transfer_from" | 
            "transfer_from_cash_box" | "transfer_from_daily_box" | "transfer_from_money_box" |
            "expense_reversal" | "customer_receipt" | "sale" => {
                new_balance += amount;
            },
            "withdraw" | "withdrawal" | "transfer_out" | "transfer_to_cashier" |
            "transfer_to_money_box" | "transfer_to_bank" | "cash_box_closing" |
            "expense" | "expense_update" | "purchase" | "supplier_payment" => {
                if new_balance < amount {
                    return Err(anyhow::anyhow!("الرصيد غير كافٍ"));
                }
                new_balance -= amount;
            },
            "purchase_return" => {
                new_balance += amount;
            },
            _ => {
                return Err(anyhow::anyhow!("نوع المعاملة غير صالح"));
            }
        }

        // Update money box balance
        sqlx::query(
            r#"
            UPDATE money_boxes 
            SET amount = ?, updated_at = datetime('now')
            WHERE id = ?
            "#
        )
        .bind(new_balance)
        .bind(box_id)
        .execute(&mut **tx)
        .await?;

        // Record transaction
        let result = sqlx::query(
            r#"
            INSERT INTO money_box_transactions (box_id, type, amount, balance_after, notes, related_box_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            "#
        )
        .bind(box_id)
        .bind(transaction_type)
        .bind(amount)
        .bind(new_balance)
        .bind(notes)
        .bind(related_box_id)
        .bind(created_by)
        .execute(&mut **tx)
        .await?;

        let transaction_id = result.last_insert_rowid();

        Ok(transaction_id)
    }

    // Transfer between money boxes (alias for transfer)
    pub async fn transfer_between_money_boxes(&self, db: &Database, payload: InternalTransferRequest) -> Result<Value> {
        self.transfer(db, payload).await
    }

    // Get money box balance
    pub async fn get_money_box_balance(&self, db: &Database, id: i64, _currency: Option<&str>) -> Result<Value> {
        let money_box = self.get_money_box_by_id(db, id as i64).await?;
        match money_box {
            Some(box_data) => Ok(json!({
                "balance": box_data["amount"],
                "currency": "IQD"
            })),
            None => Err(anyhow::anyhow!("صندوق المال غير موجود")),
        }
    }

    // Get money boxes summary (alias for get_all_summary)
    pub async fn get_money_boxes_summary(&self, db: &Database) -> Result<Value> {
        self.get_all_money_boxes_summary(db).await
    }

    // Reconcile money box
    pub async fn reconcile_money_box(&self, db: &Database, id: i64, payload: InternalReconcileMoneyBoxRequest) -> Result<Value> {
        let actual_balance = payload.actual_balance;
        let expected_balance = payload.expected_balance;
        let adjustment_amount = actual_balance - expected_balance;

        if adjustment_amount.abs() < 0.01 {
            return Ok(json!({
                "success": true,
                "message": "لا يوجد فرق في الرصيد"
            }));
        }

        let transaction_type = if adjustment_amount > 0.0 { "deposit" } else { "withdraw" };
        let notes = format!(
            "تسوية رصيد: المتوقع {}, الفعلي {}, الفرق: {} - {}",
            expected_balance,
            actual_balance,
            adjustment_amount.abs(),
            payload.adjustment_reason.as_deref().unwrap_or("")
        );

        let _ = self.add_transaction(
            db,
            id,
            InternalAddTransactionRequest {
                transaction_type: transaction_type.to_string(),
                amount: adjustment_amount.abs(),
                notes: Some(notes.clone()),
                reference_id: None,
                created_by: None, // TODO: Get from auth context
            },
        ).await?;

        Ok(json!({
            "success": true,
            "message": "تم تسوية الرصيد بنجاح",
            "adjustmentAmount": adjustment_amount
        }))
    }

    // Get money boxes dropdown
    pub async fn get_money_boxes_dropdown(&self, db: &Database) -> Result<Value> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, amount
            FROM money_boxes
            ORDER BY name
            "#
        )
        .fetch_all(&db.pool)
        .await?;

        let dropdown_data: Vec<Value> = rows
            .into_iter()
            .map(|row| {
                json!({
                    "id": row.get::<i32, _>("id"),
                    "name": row.get::<String, _>("name"),
                    "amount": row.get::<f64, _>("amount")
                })
            })
            .collect();

        Ok(json!(dropdown_data))
    }
}