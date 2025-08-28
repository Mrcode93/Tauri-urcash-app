const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use app data directory for uploads
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const UPLOADS_DIR = path.join(APP_DATA_DIR, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// File filter for XLSX files
const xlsxFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  
  if (allowedMimeTypes.includes(file.mimetype) || 
      file.originalname.endsWith('.xlsx') || 
      file.originalname.endsWith('.xls') || 
      file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed!'), false);
  }
};

// Configure multer for XLSX files
const uploadXLSX = multer({
  storage: storage,
  fileFilter: xlsxFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for large files
  }
});

module.exports = { upload, uploadXLSX };
