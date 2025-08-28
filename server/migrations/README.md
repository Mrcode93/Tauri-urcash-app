# Database Migrations

This directory contains database migrations for the URCash application. Migrations allow you to make changes to the database schema in a controlled and versioned way.

## Migration Files

Migrations are JavaScript files that export an object with the following structure:

```javascript
module.exports = {
  version: '001',           // Unique version identifier
  description: 'Description of what this migration does',
  up: async (db) => {      // Function to apply the migration
    // Migration logic here
  },
  down: async (db) => {    // Function to rollback the migration
    // Rollback logic here
  },
  dependencies: []          // Array of migration versions this depends on
};
```

## Available Migrations

### 001_add_is_dolar_to_products.js
- **Version**: 001
- **Description**: Add is_dolar column to products table
- **Purpose**: Adds a boolean column to indicate if a product is priced in dollars instead of local currency
- **Column**: `is_dolar BOOLEAN DEFAULT FALSE`

### 002_add_exchange_rate_to_settings.js
- **Version**: 002
- **Description**: Add exchange_rate column to settings table
- **Purpose**: Adds a decimal column to store exchange rate for currency conversion
- **Column**: `exchange_rate DECIMAL(10,4) DEFAULT 1.0000`

## Running Migrations

### Using the CLI Script

```bash
# Run all pending migrations
node runMigrations.js run

# Check migration status
node runMigrations.js status

# Rollback last migration
node runMigrations.js rollback

# Reset all migrations (dangerous!)
node runMigrations.js reset
```

### Programmatically

```javascript
const MigrationRunner = require('./migrations/migrationRunner');
const { db } = require('./database');

const runner = new MigrationRunner(db);

// Run all pending migrations
await runner.runMigrations();

// Get migration status
const status = runner.getMigrationStatus();

// Rollback last migration
await runner.rollbackLastMigration();
```

## Migration Status

The migration system tracks executed migrations in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success'
);
```

## Creating New Migrations

1. Create a new file in the `migrations` directory with a descriptive name
2. Use the next available version number (e.g., `002_`, `003_`, etc.)
3. Follow the migration file structure shown above
4. Test your migration thoroughly before deploying

### Example Migration

```javascript
const logger = require('../utils/logger');

function up(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting migration: Add new column to table');
      
      // Check if column already exists
      const tableInfo = db.prepare("PRAGMA table_info(your_table)").all();
      const columnExists = tableInfo.some(col => col.name === 'new_column');
      
      if (columnExists) {
        logger.info('Column already exists, skipping migration');
        resolve();
        return;
      }
      
      // Add the column
      db.prepare(`
        ALTER TABLE your_table 
        ADD COLUMN new_column TEXT DEFAULT ''
      `).run();
      
      logger.info('Migration completed successfully');
      resolve();
      
    } catch (error) {
      logger.error('Migration failed:', error);
      reject(error);
    }
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Rolling back migration');
      
      // Implement rollback logic here
      // Note: SQLite doesn't support DROP COLUMN directly
      // You may need to recreate the table without the column
      
      logger.info('Rollback completed');
      resolve();
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      reject(error);
    }
  });
}

module.exports = {
  version: '002',
  description: 'Add new column to table',
  up,
  down,
  dependencies: []
};
```

## Best Practices

1. **Always check if changes already exist** before applying them
2. **Use transactions** for complex migrations when possible
3. **Test migrations** on a copy of production data
4. **Keep migrations small and focused** on a single change
5. **Document your migrations** with clear descriptions
6. **Handle errors gracefully** and provide meaningful error messages
7. **Consider rollback scenarios** when designing migrations

## SQLite Limitations

SQLite has some limitations compared to other databases:

- **No DROP COLUMN**: You cannot directly drop columns. You need to recreate the table.
- **Limited ALTER TABLE**: Only ADD COLUMN, RENAME TABLE, and RENAME COLUMN are supported.
- **No schema changes in transactions**: Some schema changes cannot be done in transactions.

## Troubleshooting

### Migration Already Applied
If a migration shows as already applied but the changes aren't visible:
1. Check the `schema_migrations` table
2. Verify the migration actually ran successfully
3. Consider resetting migrations if needed

### Failed Migrations
If a migration fails:
1. Check the logs for error details
2. Manually fix the database state if needed
3. Update the migration status in `schema_migrations` table
4. Re-run the migration

### Rollback Issues
If rollback fails:
1. SQLite limitations may prevent automatic rollback
2. Manual intervention may be required
3. Consider recreating the table without the problematic column

## Integration with Application

The migration system is automatically integrated into the database initialization process. When the application starts:

1. Database tables are created/initialized
2. Migrations are automatically run
3. Any failed migrations are logged but don't prevent application startup

This ensures that all database schema changes are applied consistently across all deployments. 