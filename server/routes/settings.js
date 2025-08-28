const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Use app data directory for uploads
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const UPLOADS_DIR = path.join(APP_DATA_DIR, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Apply authentication middleware to all routes
router.use(protect);

// Get all settings
router.get('/', settingsController.getSettings);

// Update all settings (with file upload support)
router.put('/', (req, res, next) => {
  
  
  
  
  next();
}, upload.single('logo'), (req, res, next) => {
  
  
  
  next();
}, settingsController.updateSettings);

// Get specific setting
router.get('/:key', settingsController.getSetting);

// Update specific setting
router.put('/:key', settingsController.updateSetting);

// Get backup scheduler status
router.get('/backup/scheduler-status', settingsController.getBackupSchedulerStatus);

module.exports = router;