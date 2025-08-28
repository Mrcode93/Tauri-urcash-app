const fs = require('fs');
const path = require('path');
const { handleDatabaseCorruption } = require('./fix-corrupted-database');
const logger = require('./utils/logger');

const APP_DATA_DIR = path.join(process.env.APPDATA || process.env.HOME || process.env.USERPROFILE, '.urcash');
const DB_PATH = path.join(APP_DATA_DIR, 'database.sqlite');
const BACKUP_DIR = path.join(APP_DATA_DIR, 'backups');

console.log('=== Database Corruption Recovery Tool ===\n');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.log('❌ Database file not found at:', DB_PATH);
  console.log('This might be a fresh installation or the database was moved/deleted.');
  process.exit(1);
}

// Check database file size
const stats = fs.statSync(DB_PATH);
console.log(`📊 Database file size: ${stats.size} bytes`);

if (stats.size < 512) {
  console.log('❌ Database file is too small to be valid (< 512 bytes)');
  console.log('This indicates the file is corrupted or incomplete.');
} else {
  console.log('✅ Database file size appears normal');
}

// Check for available backups
console.log('\n🔍 Checking for available backups...');
if (fs.existsSync(BACKUP_DIR)) {
  const backupFiles = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith('.sqlite'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(BACKUP_DIR, a));
      const statB = fs.statSync(path.join(BACKUP_DIR, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

  if (backupFiles.length > 0) {
    console.log(`✅ Found ${backupFiles.length} backup files:`);
    backupFiles.forEach((file, index) => {
      const filePath = path.join(BACKUP_DIR, file);
      const fileStats = fs.statSync(filePath);
      console.log(`   ${index + 1}. ${file} (${fileStats.size} bytes, ${fileStats.mtime.toLocaleString()})`);
    });
  } else {
    console.log('❌ No backup files found in backup directory');
  }
} else {
  console.log('❌ Backup directory not found');
}

console.log('\n🛠️  Recovery Options:');
console.log('1. Try to repair the current database');
console.log('2. Restore from a specific backup file');
console.log('3. Create a new database (will lose all data)');

// Get user input
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nEnter your choice (1-3): ', async (choice) => {
  try {
    switch (choice.trim()) {
      case '1':
        console.log('\n🔄 Attempting to repair current database...');
        const repairSuccess = handleDatabaseCorruption();
        if (repairSuccess) {
          console.log('✅ Database repair successful!');
        } else {
          console.log('❌ Database repair failed. Try option 2 or 3.');
        }
        break;

      case '2':
        if (fs.existsSync(BACKUP_DIR)) {
          const backupFiles = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sqlite'))
            .sort((a, b) => {
              const statA = fs.statSync(path.join(BACKUP_DIR, a));
              const statB = fs.statSync(path.join(BACKUP_DIR, b));
              return statB.mtime.getTime() - statA.mtime.getTime();
            });

          if (backupFiles.length > 0) {
            console.log('\n📋 Available backup files:');
            backupFiles.forEach((file, index) => {
              const filePath = path.join(BACKUP_DIR, file);
              const fileStats = fs.statSync(filePath);
              console.log(`   ${index + 1}. ${file} (${fileStats.size} bytes, ${fileStats.mtime.toLocaleString()})`);
            });

            rl.question('\nEnter backup file number to restore from: ', async (backupChoice) => {
              const backupIndex = parseInt(backupChoice.trim()) - 1;
              if (backupIndex >= 0 && backupIndex < backupFiles.length) {
                const selectedBackup = path.join(BACKUP_DIR, backupFiles[backupIndex]);
                console.log(`\n🔄 Restoring from: ${selectedBackup}`);
                
                try {
                  const restoreSuccess = handleDatabaseCorruption(selectedBackup);
                  if (restoreSuccess) {
                    console.log('✅ Database restored successfully!');
                  } else {
                    console.log('❌ Database restoration failed.');
                  }
                } catch (error) {
                  console.log('❌ Error during restoration:', error.message);
                }
              } else {
                console.log('❌ Invalid backup file number');
              }
              rl.close();
            });
            return; // Don't close rl here
          } else {
            console.log('❌ No backup files available');
          }
        } else {
          console.log('❌ Backup directory not found');
        }
        break;

      case '3':
        console.log('\n⚠️  WARNING: This will delete the current database and create a new one.');
        console.log('All data will be lost!');
        rl.question('Are you sure? (yes/no): ', (confirm) => {
          if (confirm.toLowerCase() === 'yes') {
            try {
              // Backup the corrupted database first
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const corruptedBackupPath = path.join(BACKUP_DIR, `corrupted-db-${timestamp}.sqlite`);
              
              if (!fs.existsSync(BACKUP_DIR)) {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
              }
              
              fs.copyFileSync(DB_PATH, corruptedBackupPath);
              console.log(`📦 Corrupted database backed up to: ${corruptedBackupPath}`);
              
              // Delete the corrupted database
              fs.unlinkSync(DB_PATH);
              console.log('🗑️  Corrupted database deleted');
              
              console.log('✅ New database will be created when the application starts');
            } catch (error) {
              console.log('❌ Error creating new database:', error.message);
            }
          } else {
            console.log('Operation cancelled');
          }
          rl.close();
        });
        return; // Don't close rl here

      default:
        console.log('❌ Invalid choice');
        break;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  rl.close();
});
