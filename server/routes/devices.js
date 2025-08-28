const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validationMiddleware');

// Get all devices
router.get('/', deviceController.getAllDevices);

// Get device statistics
router.get('/statistics', deviceController.getDeviceStatistics);

// Search devices
router.get('/search', [
  query('query').isString().isLength({ min: 2 }).withMessage('يجب إدخال نص للبحث (حرفين على الأقل)')
], validateRequest, deviceController.searchDevices);

// Get device by ID
router.get('/:deviceId', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب')
], validateRequest, deviceController.getDeviceById);

// Add new device
router.post('/', [
  body('name').isString().notEmpty().withMessage('اسم الجهاز مطلوب'),
  body('ip_address').optional().isIP().withMessage('عنوان IP غير صحيح'),
  body('mac_address').optional().isString().withMessage('عنوان MAC غير صحيح'),
  body('device_type').optional().isIn(['pos', 'kiosk', 'tablet', 'desktop']).withMessage('نوع الجهاز غير صحيح'),
  body('max_cash_limit').optional().isFloat({ min: 0 }).withMessage('الحد الأقصى للنقود يجب أن يكون رقم موجب'),
  body('permissions').optional().isArray().withMessage('الصلاحيات يجب أن تكون مصفوفة'),
  body('notes').optional().isString().withMessage('الملاحظات يجب أن تكون نص')
], validateRequest, deviceController.addDevice);

// Update device status
router.patch('/:deviceId/status', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب'),
  body('status').isIn(['active', 'inactive', 'maintenance']).withMessage('حالة الجهاز غير صحيحة')
], validateRequest, deviceController.updateDeviceStatus);

// Add cash to device
router.post('/:deviceId/cash/add', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب'),
  body('amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون أكبر من صفر'),
  body('reason').optional().isString().withMessage('السبب يجب أن يكون نص')
], validateRequest, deviceController.addCashToDevice);

// Withdraw cash from device
router.post('/:deviceId/cash/withdraw', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب'),
  body('amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون أكبر من صفر'),
  body('reason').optional().isString().withMessage('السبب يجب أن يكون نص')
], validateRequest, deviceController.withdrawCashFromDevice);

// Get device cash summary
router.get('/:deviceId/cash/summary', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب')
], validateRequest, deviceController.getDeviceCashSummary);

// Get device transactions
router.get('/:deviceId/transactions', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('الحد يجب أن يكون رقم بين 1 و 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('الإزاحة يجب أن تكون رقم موجب')
], validateRequest, deviceController.getDeviceTransactions);

// Get overall cash summary
router.get('/cash/summary', deviceController.getOverallCashSummary);

// Remove device
router.delete('/:deviceId', [
  param('deviceId').isString().notEmpty().withMessage('معرف الجهاز مطلوب')
], validateRequest, deviceController.removeDevice);

module.exports = router; 