const { deviceManagementService } = require('../services/branchConfig');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

const deviceController = {
  // Get all devices
  getAllDevices: asyncHandler(async (req, res) => {
    const result = deviceManagementService.getAllDevices();
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.devices,
      stats: result.stats
    });
  }),

  // Get device by ID
  getDeviceById: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const result = deviceManagementService.getDeviceById(deviceId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.device
    });
  }),

  // Add new device
  addDevice: asyncHandler(async (req, res) => {
    const deviceInfo = req.body;
    
    // Validate required fields
    if (!deviceInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الجهاز مطلوب'
      });
    }

    const result = deviceManagementService.addDevice(deviceInfo);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'تم إضافة الجهاز بنجاح',
      data: result.device
    });
  }),

  // Remove device
  removeDevice: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const result = deviceManagementService.removeDevice(deviceId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        current_balance: result.current_balance
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  }),

  // Update device status
  updateDeviceStatus: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة الجهاز غير صحيحة'
      });
    }

    const result = deviceManagementService.updateDeviceStatus(deviceId, status);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'تم تحديث حالة الجهاز بنجاح',
      data: result.device
    });
  }),

  // Add cash to device
  addCashToDevice: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    const result = deviceManagementService.addCashToDevice(deviceId, amount, reason);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'تم إضافة النقود للجهاز بنجاح',
      data: {
        transaction: result.transaction,
        new_balance: result.new_balance
      }
    });
  }),

  // Withdraw cash from device
  withdrawCashFromDevice: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    const result = deviceManagementService.withdrawCashFromDevice(deviceId, amount, reason);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        current_balance: result.current_balance,
        requested_amount: result.requested_amount
      });
    }
    
    res.json({
      success: true,
      message: 'تم سحب النقود من الجهاز بنجاح',
      data: {
        transaction: result.transaction,
        new_balance: result.new_balance
      }
    });
  }),

  // Get device cash summary
  getDeviceCashSummary: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const result = deviceManagementService.getDeviceCashSummary(deviceId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        device_name: result.device_name,
        cash_summary: result.cash_summary
      }
    });
  }),

  // Get overall cash summary
  getOverallCashSummary: asyncHandler(async (req, res) => {
    const result = deviceManagementService.getOverallCashSummary();
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.summary
    });
  }),

  // Get device transactions
  getDeviceTransactions: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = deviceManagementService.getDeviceTransactions(
      deviceId, 
      parseInt(limit), 
      parseInt(offset)
    );
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        transactions: result.transactions,
        total: result.total,
        device_name: result.device_name
      }
    });
  }),

  // Search devices
  searchDevices: asyncHandler(async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال نص للبحث (حرفين على الأقل)'
      });
    }

    const result = deviceManagementService.searchDevices(query.trim());
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        devices: result.devices,
        total_found: result.total_found
      }
    });
  }),

  // Get device statistics
  getDeviceStatistics: asyncHandler(async (req, res) => {
    const devicesResult = deviceManagementService.getAllDevices();
    const cashResult = deviceManagementService.getOverallCashSummary();
    
    if (!devicesResult.success || !cashResult.success) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في جلب الإحصائيات'
      });
    }
    
    const stats = {
      devices: devicesResult.stats,
      cash: cashResult.summary,
      summary: {
        total_devices: devicesResult.stats.total_devices,
        active_devices: devicesResult.stats.active_devices,
        total_cash: cashResult.summary.total_cash,
        devices_with_cash: cashResult.summary.devices_with_cash
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  })
};

module.exports = deviceController; 