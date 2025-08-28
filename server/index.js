require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { requestLogger, authLogger, securityLogger, databaseLogger } = require('./middleware/loggingMiddleware');
const path = require('path');
const os = require('os');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 39000;
const { getLocalIpAddress } = require('./services/branchConfig');
const { networkDiscoveryService } = require('./services/networkDiscoveryService');
const cacheService = require('./services/cacheService');
const ip = getLocalIpAddress(); // Get local IP address for logging

// Check if this is a main device and start discovery service
const isMainDevice = () => {
  try {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const appConfigPath = path.join(os.homedir(), '.urcash', 'appConfig.json');
    
    if (fs.existsSync(appConfigPath)) {
      const config = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      return config.branch === 'main';
    }
    return true; // Default to main device if no config exists
  } catch (error) {
    console.error('Error checking device type:', error);
    return true; // Default to main device on error
  }
};

// At the top of your server file
const { initDb } = require('./initDb');
// const licenseService = require('./services/licenseService');
const backupScheduler = require('./services/backupScheduler');
const settingsService = require('./services/settingsService');
const licenseService = require('./services/licenseService');
const schedulerService = require('./services/schedulerService');
const { optimizeDatabase } = require('./optimize-database');

// Use app data directory for logs and uploads
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');
const UPLOADS_DIR = path.join(APP_DATA_DIR, 'uploads');
const PUBLIC_KEY_DIR= path.join(APP_DATA_DIR, 'license');

// Create necessary directories (excluding license directory which is created only on activation)
[APP_DATA_DIR, LOGS_DIR, UPLOADS_DIR].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dir}:`, err);
  }
});

// Optimized CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:39000',
      'file://',
      'app://'
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With']
}));

// Optimized rate limiting - less restrictive for better performance
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit significantly for better performance
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Special rate limiting for license endpoints (more restrictive)
const licenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit significantly
  message: {
    error: 'Too many license requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Optimized body parsing - reduced limits for better performance
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply optimized logging middleware - only essential logging
app.use(requestLogger);
app.use(authLogger);
app.use(securityLogger);
app.use(databaseLogger);

// Increase timeout for large uploads
app.use((req, res, next) => {
  // Set longer timeout for upload endpoints
  if (req.path.includes('/import') || req.path.includes('/upload')) {
    req.setTimeout(300000); // 5 minutes for uploads
    res.setTimeout(300000);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Status endpoint for health checks
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Performance monitoring endpoint
app.get('/api/performance', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000) + ' ms',
      system: Math.round(cpuUsage.system / 1000) + ' ms'
    },
    uptime: Math.round(process.uptime()) + ' seconds',
    platform: process.platform,
    nodeVersion: process.version
  });
});

app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, path) => {
    
    // Set proper headers for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.set('Content-Type', `image/${path.split('.').pop()}`);
    }
    // Enable caching
    res.set('Cache-Control', 'public, max-age=31557600'); // Cache for 1 year
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    data: process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }
  });
});

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server with error handling
const startServer = async () => {
  try {
    // Initialize database including bill returns tables
    await initDb();
    
    // Run database optimization
    logger.info('Running database optimization...');
    await optimizeDatabase();
    // Database optimization completed

    // Load and mount routes after DB initialization to prevent race conditions
    const authRoutes = require('./routes/auth');
    const salesRoutes = require('./routes/sales');
    const expensesRoutes = require('./routes/expenses');
    const customersRoutes = require('./routes/customers');
    const suppliersRoutes = require('./routes/suppliers');
    const purchasesRoutes = require('./routes/purchases');
    const inventoryRoutes = require('./routes/inventory');
    const reportsRoutes = require('./routes/reportsRoutes');
    const databaseRoutes = require('./routes/database');
    const debtsRoutes = require('./routes/debts');
    const settingsRoutes = require('./routes/settings');
    const installmentsRoutes = require('./routes/installments');
    const licenseRoutes = require('./routes/license');
    const cloudBackupsRoutes = require('./routes/cloudeBackUps');
    const customerReceiptsRoutes = require('./routes/customerReceipts');
    const supplierPaymentReceiptsRoutes = require('./routes/supplierPaymentReceipts');
    const cashBoxRoutes = require('./routes/cashBox');
    const performanceRoutes = require('./routes/performance');
    const branchConfigRoutes = require('./routes/branchConfig');
    const devicesRoutes = require('./routes/devices');
    const mobileLiveDataRoutes = require('./routes/mobileLiveData');
    const logsRoutes = require('./routes/logs');
    const cacheRoutes = require('./routes/cache');
    const stocksRoutes = require('./routes/stocks');
    const stockMovementsRoutes = require('./routes/stockMovements');
    const billsRoutes = require('./routes/bills');
    const moneyBoxesRoutes = require('./routes/moneyBoxes');

const delegatesRoutes = require('./routes/delegates');
    const employeesRoutes = require('./routes/employees');
    
    // Mount route groups here
    app.use('/api/auth', authRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/expenses', expensesRoutes);
    app.use('/api/customers', customersRoutes);
    app.use('/api/suppliers', suppliersRoutes);
    app.use('/api/purchases', purchasesRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/products', inventoryRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/database', databaseRoutes);
    app.use('/api/debts', debtsRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/installments', installmentsRoutes);
    app.use('/api/cloud-backup', cloudBackupsRoutes);
    app.use('/api/customer-receipts', customerReceiptsRoutes);
    app.use('/api/supplier-payment-receipts', supplierPaymentReceiptsRoutes);
    app.use('/api/cash-box', cashBoxRoutes);
    app.use('/api/license', licenseRoutes);
    app.use('/api/performance', performanceRoutes);
    app.use('/api/branch-config', branchConfigRoutes);
    app.use('/api/devices', devicesRoutes);
    app.use('/api/mobile-live-data', mobileLiveDataRoutes);
    app.use('/api/logs', logsRoutes);
    app.use('/api/cache', cacheRoutes);
    app.use('/api/stocks', stocksRoutes);
    app.use('/api/stock-movements', stockMovementsRoutes);
    app.use('/api/bills', billsRoutes);
    app.use('/api/money-boxes', moneyBoxesRoutes);

app.use('/api/delegates', delegatesRoutes);
    app.use('/api/employees', employeesRoutes);

    // Serve static files from the React app in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // Serve the frontend static files
      app.use(express.static(path.join(__dirname, '../frontend/build')));

      // Handle any requests that don't match the ones above
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
      });
    } else {
      // In development, add a route for the root path
      app.get('/', (req, res) => {
        res.json({ message: 'Sales App API Server. Frontend should be running on a different port.' });
      });
    }

    // Local license verification on server startup (no remote server check)
    try {
      // Initialize cache service silently
    } catch (cacheError) {
      logger.error('❌ Cache service initialization failed:', cacheError);
    }
    
    try {
      // Check license status (local only)
      const licenseResult = await licenseService.verifyLicenseAndKey();
      
      if (licenseResult.success) {
        logger.info('✅ License verified successfully');
      } else {
        logger.warn('⚠️  License not activated');
        logger.warn(`Status: ${licenseResult.message}`);
        
        if (licenseResult.needsFirstActivation) {
          logger.warn('First activation required');
        }
        
        logger.warn('Use /api/license/first-activation endpoint to activate the license');
      }
    } catch (error) {
      logger.error('❌ LOCAL LICENSE VERIFICATION ERROR');
      logger.error(`📄 Error: ${error.message}`);
      logger.warn('Server will continue but license issues may exist');
    }
    
    // License verification scheduler disabled on startup to prevent infinite loops

    // Initialize backup scheduler with current settings
    try {
      const settings = await settingsService.getSettings();
      if (settings) {
        backupScheduler.startScheduler({
          auto_backup_enabled: settings.auto_backup_enabled,
          backup_frequency: settings.backup_frequency,
          backup_time: settings.backup_time
        });
        
        if (settings.auto_backup_enabled) {
          logger.info('✅ Backup scheduler started');
        }
      }
    } catch (schedulerError) {
      logger.error('❌ BACKUP SCHEDULER INITIALIZATION FAILED:', schedulerError);
    }

    // Initialize upload scheduler
    try {
      const mobileLiveDataService = require('./services/mobileLiveDataService');
      schedulerService.start(5, mobileLiveDataService); // Check every 5 minutes
    } catch (schedulerError) {
      logger.error('❌ Upload scheduler initialization failed:', schedulerError);
    }

    app.listen(PORT, (err) => {
      if (err) {
        logger.error(`Failed to start server on port ${PORT}:`, err);
        process.exit(1);
      }
      logger.info(`🚀 Server is running on port ${PORT}`);
      
      // Start network discovery service for main devices
      if (isMainDevice()) {
        try {
          networkDiscoveryService.setAppVersion('1.0.0'); // Set version from package.json if available
          networkDiscoveryService.startDiscoveryListener();
        } catch (discoveryError) {
          logger.error('❌ Failed to start network discovery service:', discoveryError);
        }
      }
    });
  } catch (error) {
    logger.error('Failed during server startup:', error);
    process.exit(1);
  }
};

// Export app for testing
module.exports = app;

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}