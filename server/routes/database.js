const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  createBackup, 
  resetDatabase, 
  listBackups,
  restoreFromBackup,
  restoreFromCustomBackup,
  fixMenuItems
} = require('../controllers/databaseController');

// Backup database route
router.post('/backup', protect, createBackup);

// Reset database route
router.delete('/reset', protect, resetDatabase);

// List available backups
router.get('/backups', protect, listBackups);

// Restore from backup
router.post('/restore/:backupId', protect, restoreFromBackup);

// Restore from custom backup file
router.post('/restore-custom', protect, restoreFromCustomBackup);

// Fix menu items
router.post('/fix-menu-items', protect, fixMenuItems);

module.exports = router; 