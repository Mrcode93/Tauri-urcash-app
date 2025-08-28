const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const { protect } = require('../middleware/authMiddleware');

// Database backup and restore routes
router.post('/backup', protect, databaseController.createBackup);
router.post('/restore/:backupId', protect, databaseController.restoreFromBackup);
router.get('/backups', protect, databaseController.listBackups);
router.post('/reset', protect, databaseController.resetDatabase);
router.post('/fix-menu-items', protect, databaseController.fixMenuItems);

module.exports = router; 