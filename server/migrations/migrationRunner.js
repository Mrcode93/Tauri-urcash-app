const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Migration Runner
 * 
 * Handles database migrations in a structured way.
 * Migrations are executed in order based on their version number.
 */

class MigrationRunner {
  constructor(db) {
    this.db = db;
    this.migrationsPath = path.join(__dirname);
    this.migrationsTable = 'schema_migrations';
  }

  /**
   * Initialize the migrations table
   */
  async initializeMigrationsTable() {
    try {
      // The migrations table is now created during database initialization
      // Just verify it exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='${this.migrationsTable}'
      `).get();
      
      if (!tableExists) {
        // Fallback: create the table if it doesn't exist
        this.db.prepare(`
          CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
            version TEXT PRIMARY KEY,
            description TEXT,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            execution_time_ms INTEGER,
            status TEXT DEFAULT 'success'
          )
        `).run();
        logger.info('Migrations table created as fallback');
      } else {
        logger.info('Migrations table already exists');
      }
    } catch (error) {
      logger.error('Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Get all migration files
   */
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.js') && file !== 'migrationRunner.js')
        .sort();
      
      return files;
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Get executed migrations
   */
  getExecutedMigrations() {
    try {
      const result = this.db.prepare(`
        SELECT version, description, executed_at, status 
        FROM ${this.migrationsTable} 
        ORDER BY version
      `).all();
      
      return result;
    } catch (error) {
      logger.error('Failed to get executed migrations:', error);
      return [];
    }
  }

  /**
   * Check if migration is executed
   */
  isMigrationExecuted(version) {
    try {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM ${this.migrationsTable} 
        WHERE version = ?
      `).get(version);
      
      return result.count > 0;
    } catch (error) {
      logger.error('Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Record migration execution
   */
  recordMigration(version, description, executionTime, status = 'success') {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO ${this.migrationsTable} 
        (version, description, executed_at, execution_time_ms, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      `).run(version, description, executionTime, status);
      
      logger.info(`Migration ${version} recorded with status: ${status}`);
    } catch (error) {
      logger.error('Failed to record migration:', error);
      throw error;
    }
  }

  /**
   * Load migration module
   */
  loadMigration(filePath) {
    try {
      const migration = require(filePath);
      
      if (!migration.version || !migration.up || !migration.down) {
        throw new Error(`Invalid migration file: ${filePath}`);
      }
      
      return migration;
    } catch (error) {
      logger.error(`Failed to load migration from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      logger.info('Starting migration process...');
      
      // Initialize migrations table
      await this.initializeMigrationsTable();
      
      // Get all migration files
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = this.getExecutedMigrations();
      
      logger.info(`Found ${migrationFiles.length} migration files`);
      logger.info(`Found ${executedMigrations.length} executed migrations`);
      
      let executedCount = 0;
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const migration = this.loadMigration(filePath);
        
        if (this.isMigrationExecuted(migration.version)) {
          logger.info(`Migration ${migration.version} already executed, skipping`);
          continue;
        }
        
        logger.info(`Executing migration ${migration.version}: ${migration.description}`);
        
        const startTime = Date.now();
        
        try {
          // Execute migration
          await migration.up(this.db);
          
          const executionTime = Date.now() - startTime;
          
          // Record successful migration
          this.recordMigration(migration.version, migration.description, executionTime, 'success');
          
          logger.info(`Migration ${migration.version} completed successfully in ${executionTime}ms`);
          executedCount++;
          
        } catch (error) {
          const executionTime = Date.now() - startTime;
          
          // Record failed migration
          this.recordMigration(migration.version, migration.description, executionTime, 'failed');
          
          logger.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
      
      logger.info(`Migration process completed. ${executedCount} migrations executed.`);
      return executedCount;
      
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackLastMigration() {
    try {
      logger.info('Starting rollback process...');
      
      // Get the last executed migration
      const lastMigration = this.db.prepare(`
        SELECT version, description 
        FROM ${this.migrationsTable} 
        WHERE status = 'success'
        ORDER BY executed_at DESC 
        LIMIT 1
      `).get();
      
      if (!lastMigration) {
        logger.info('No migrations to rollback');
        return null;
      }
      
      logger.info(`Rolling back migration ${lastMigration.version}: ${lastMigration.description}`);
      
      // Find and load the migration file
      const migrationFiles = this.getMigrationFiles();
      let migration = null;
      
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const loadedMigration = this.loadMigration(filePath);
        
        if (loadedMigration.version === lastMigration.version) {
          migration = loadedMigration;
          break;
        }
      }
      
      if (!migration) {
        throw new Error(`Migration file not found for version ${lastMigration.version}`);
      }
      
      const startTime = Date.now();
      
      try {
        // Execute rollback
        await migration.down(this.db);
        
        const executionTime = Date.now() - startTime;
        
        // Remove migration record
        this.db.prepare(`
          DELETE FROM ${this.migrationsTable} 
          WHERE version = ?
        `).run(lastMigration.version);
        
        logger.info(`Rollback ${lastMigration.version} completed successfully in ${executionTime}ms`);
        return lastMigration.version;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error(`Rollback ${lastMigration.version} failed:`, error);
        throw error;
      }
      
    } catch (error) {
      logger.error('Rollback process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    try {
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = this.getExecutedMigrations();
      
      const status = {
        total: migrationFiles.length,
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        migrations: []
      };
      
      for (const file of migrationFiles) {
        const migration = this.loadMigration(path.join(this.migrationsPath, file));
        const executed = executedMigrations.find(m => m.version === migration.version);
        
        status.migrations.push({
          version: migration.version,
          description: migration.description,
          file: file,
          executed: !!executed,
          executedAt: executed ? executed.executed_at : null,
          status: executed ? executed.status : 'pending'
        });
      }
      
      return status;
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }
}

module.exports = MigrationRunner; 