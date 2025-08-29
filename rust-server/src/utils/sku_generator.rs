use anyhow::Result;
use sqlx::SqlitePool;
use rand::{thread_rng, Rng};
use futures::future::BoxFuture;

/// Generates a unique SKU based on product name
/// Format: XXX-YYY where:
/// XXX: First 3 letters of product name
/// YYY: Random 3-digit number
pub fn generate_unique_sku<'a>(product_name: &'a str, db: &'a SqlitePool) -> BoxFuture<'a, Result<String>> {
    // Get first 3 letters of product name
    let prefix = product_name
        .chars()
        .take(3)
        .collect::<String>()
        .to_uppercase();
    
    // Generate a random 3-digit number
    let mut rng = thread_rng();
    let random_num = rng.gen_range(100..1000);
    
    Box::pin(async move {
    
    // Combine to form SKU
    let sku = format!("{}-{}", prefix, random_num);
    
    // Check if SKU already exists
    let existing_sku = sqlx::query("SELECT id FROM products WHERE sku = ?")
        .bind(&sku)
        .fetch_optional(db)
        .await?;
    
    if existing_sku.is_some() {
        // If SKU exists, try again with a different random number
        return generate_unique_sku(product_name, db).await;
    }
    
    Ok(sku)
    })
}