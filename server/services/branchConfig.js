// branchConfig.js

// get local ip address of the network 
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

const networkInterfaces = os.networkInterfaces();
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');
const DEVICES_CONFIG_PATH = path.join(APP_DATA_DIR, 'devices.json');
const DEVICE_CASH_PATH = path.join(APP_DATA_DIR, 'device-cash.json');

const getLocalIpAddress = () => {
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

// Device Management Service using Cash
class DeviceManagementService {
  constructor() {
    this.ensureConfigFiles();
  }

  // Ensure configuration files exist
  ensureConfigFiles() {
    try {
      if (!fs.existsSync(APP_DATA_DIR)) {
        fs.mkdirSync(APP_DATA_DIR, { recursive: true });
      }

      // Initialize devices.json if it doesn't exist
      if (!fs.existsSync(DEVICES_CONFIG_PATH)) {
        const defaultDevices = {
          devices: [],
          last_updated: new Date().toISOString(),
          total_devices: 0,
          active_devices: 0
        };
        fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(defaultDevices, null, 2));
      }

      // Initialize device-cash.json if it doesn't exist
      if (!fs.existsSync(DEVICE_CASH_PATH)) {
        const defaultCash = {
          device_cash: {},
          total_cash: 0,
          last_updated: new Date().toISOString(),
          cash_history: []
        };
        fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(defaultCash, null, 2));
      }
    } catch (error) {
      logger.error('Error ensuring config files:', error);
    }
  }

  // Generate unique device ID
  generateDeviceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Add a new device to the main branch with persistent device ID support
  addDevice(deviceInfo) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      // Check if device with persistent ID already exists
      if (deviceInfo.persistent_device_id) {
        const existingDevice = devicesConfig.devices.find(d => d.id === deviceInfo.persistent_device_id);
        
        if (existingDevice) {
          // Update existing device with persistent ID
          existingDevice.status = 'connected';
          existingDevice.last_connected = new Date().toISOString();
          existingDevice.last_seen = new Date().toISOString();
          existingDevice.last_updated = new Date().toISOString();
          existingDevice.ip_address = deviceInfo.ip_address || existingDevice.ip_address;
          existingDevice.permissions = deviceInfo.permissions || existingDevice.permissions;
          existingDevice.name = deviceInfo.name || existingDevice.name;

          // Update device cash if needed
          if (!deviceCash.device_cash[existingDevice.id]) {
            deviceCash.device_cash[existingDevice.id] = {
              current_balance: 0,
              max_limit: existingDevice.max_cash_limit,
              last_updated: new Date().toISOString(),
              transactions: []
            };
          }

          // Save configurations
          fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
          fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

       

          return {
            success: true,
            device: existingDevice,
            message: 'Device reconnected successfully with persistent ID',
            isReconnect: true
          };
        }
      }

      // Check if device with same IP already exists (fallback for devices without persistent ID)
      const existingDeviceByIp = devicesConfig.devices.find(d => 
        d.ip_address === deviceInfo.ip_address && 
        (d.status === 'connected' || d.status === 'active')
      );

      if (existingDeviceByIp) {
        // Clean up any disconnected devices with same IP first
        this.cleanupDisconnectedDevices(deviceInfo.ip_address);

        // Update existing device instead of creating new one
        existingDeviceByIp.status = 'connected';
        existingDeviceByIp.last_connected = new Date().toISOString();
        existingDeviceByIp.last_seen = new Date().toISOString();
        existingDeviceByIp.last_updated = new Date().toISOString();
        existingDeviceByIp.permissions = deviceInfo.permissions || existingDeviceByIp.permissions;
        existingDeviceByIp.name = deviceInfo.name || existingDeviceByIp.name;

        // Update device cash if needed
        if (!deviceCash.device_cash[existingDeviceByIp.id]) {
          deviceCash.device_cash[existingDeviceByIp.id] = {
            current_balance: 0,
            max_limit: existingDeviceByIp.max_cash_limit,
            last_updated: new Date().toISOString(),
            transactions: []
          };
        }

        // Save configurations
        fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
        fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

       

        return {
          success: true,
          device: existingDeviceByIp,
          message: 'Device reconnected successfully',
          isReconnect: true
        };
      }

      // Clean up any disconnected devices with same IP before creating new device
      this.cleanupDisconnectedDevices(deviceInfo.ip_address);

      // Create new device with persistent ID if provided, otherwise generate new ID
      const deviceId = deviceInfo.persistent_device_id || this.generateDeviceId();
      
      const newDevice = {
        id: deviceId,
        name: deviceInfo.name || `Device-${Date.now()}`,
        ip_address: deviceInfo.ip_address || getLocalIpAddress(),
        mac_address: deviceInfo.mac_address || '',
        device_type: deviceInfo.device_type || 'secondary',
        status: 'connected',
        cash_balance: 0,
        max_cash_limit: deviceInfo.max_cash_limit || 10000,
        created_at: new Date().toISOString(),
        last_connected: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        permissions: deviceInfo.permissions || ['sales', 'inventory'],
        notes: deviceInfo.notes || '',
        persistent_id: !!deviceInfo.persistent_device_id // Flag to indicate this is a persistent device
      };

      // Add device to devices list
      devicesConfig.devices.push(newDevice);
      devicesConfig.total_devices = devicesConfig.devices.length;
      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active' || d.status === 'connected').length;
      devicesConfig.last_updated = new Date().toISOString();

      // Initialize cash for the device
      deviceCash.device_cash[newDevice.id] = {
        current_balance: 0,
        max_limit: newDevice.max_cash_limit,
        last_updated: new Date().toISOString(),
        transactions: []
      };

      // Save both configurations
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
      fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));


      return {
        success: true,
        device: newDevice,
        message: deviceInfo.persistent_device_id ? 'Device registered with persistent ID' : 'Device added successfully',
        isReconnect: false
      };
    } catch (error) {
      console.error('Failed to add device:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clean up disconnected devices with same IP
  cleanupDisconnectedDevices(ipAddress) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      // Find all devices with same IP that are disconnected
      const disconnectedDevices = devicesConfig.devices.filter(d => 
        d.ip_address === ipAddress && 
        (d.status === 'disconnected' || d.status === 'blocked')
      );

      // Remove disconnected devices
      disconnectedDevices.forEach(device => {
        const deviceIndex = devicesConfig.devices.findIndex(d => d.id === device.id);
        if (deviceIndex !== -1) {
          devicesConfig.devices.splice(deviceIndex, 1);
          delete deviceCash.device_cash[device.id];
          
        }
      });

      // Update stats
      devicesConfig.total_devices = devicesConfig.devices.length;
      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active' || d.status === 'connected').length;
      devicesConfig.last_updated = new Date().toISOString();

      // Save configurations
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
      fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

      return {
        success: true,
        cleanedCount: disconnectedDevices.length,
        message: `Cleaned up ${disconnectedDevices.length} disconnected devices`
      };
    } catch (error) {
      console.error('Failed to cleanup disconnected devices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Remove a device from the main branch
  removeDevice(deviceId) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      const deviceIndex = devicesConfig.devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) {
        return { success: false, error: 'Device not found' };
      }

      const device = devicesConfig.devices[deviceIndex];
      
      // Check if device has cash balance
      const deviceCashInfo = deviceCash.device_cash[deviceId];
      if (deviceCashInfo && deviceCashInfo.current_balance > 0) {
        return { 
          success: false, 
          error: 'Cannot remove device with cash balance. Please withdraw all cash first.',
          current_balance: deviceCashInfo.current_balance
        };
      }

      // Remove device from devices list
      devicesConfig.devices.splice(deviceIndex, 1);
      devicesConfig.total_devices = devicesConfig.devices.length;
      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active').length;
      devicesConfig.last_updated = new Date().toISOString();

      // Remove device cash info
      delete deviceCash.device_cash[deviceId];

      // Save configurations
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
      fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

      logger.info(`Device removed successfully: ${device.name} (${deviceId})`);
      return { success: true, message: 'Device removed successfully' };
    } catch (error) {
      logger.error('Error removing device:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all devices
  getAllDevices() {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      return { success: true, devices: devicesConfig.devices, stats: {
        total_devices: devicesConfig.total_devices,
        active_devices: devicesConfig.active_devices,
        last_updated: devicesConfig.last_updated
      }};
    } catch (error) {
      logger.error('Error getting all devices:', error);
      return { success: false, error: error.message };
    }
  }

  // Get device by ID
  getDeviceById(deviceId) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const cashInfo = deviceCash.device_cash[deviceId] || {
        current_balance: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        last_transaction: null,
        transactions: []
      };

      return { 
        success: true, 
        device: { ...device, cash_info: cashInfo }
      };
    } catch (error) {
      logger.error('Error getting device by ID:', error);
      return { success: false, error: error.message };
    }
  }

  // Update device status
  updateDeviceStatus(deviceId, status) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      
      const deviceIndex = devicesConfig.devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) {
        return {
          success: false,
          error: 'Device not found'
        };
      }

      const device = devicesConfig.devices[deviceIndex];
      const oldStatus = device.status;
      
      // Update device status
      device.status = status;
      device.last_updated = new Date().toISOString();
      
      // Update connection timestamps
      if (status === 'connected') {
        device.last_connected = new Date().toISOString();
        device.last_seen = new Date().toISOString();
      } else if (status === 'disconnected') {
        device.last_disconnected = new Date().toISOString();
      }

      // Update device in the list
      devicesConfig.devices[deviceIndex] = device;
      
      // Update counts
      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active' || d.status === 'connected').length;
      devicesConfig.last_updated = new Date().toISOString();

      // Save updated configuration
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));

      

      return {
        success: true,
        device,
        message: `Device status updated to ${status}`
      };
    } catch (error) {
      console.error('Failed to update device status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Add cash to device
  addCashToDevice(deviceId, amount, reason = 'deposit') {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      if (!deviceCash.device_cash[deviceId]) {
        deviceCash.device_cash[deviceId] = {
          current_balance: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          last_transaction: null,
          transactions: []
        };
      }

      const cashInfo = deviceCash.device_cash[deviceId];
      const previousBalance = cashInfo.current_balance;
      cashInfo.current_balance += amount;
      cashInfo.total_deposited += amount;

      // Add transaction record
      const transaction = {
        id: this.generateDeviceId(),
        type: 'deposit',
        amount: amount,
        previous_balance: previousBalance,
        new_balance: cashInfo.current_balance,
        reason: reason,
        timestamp: new Date().toISOString()
      };

      cashInfo.transactions.push(transaction);
      cashInfo.last_transaction = transaction;

      // Update device cash balance
      device.cash_balance = cashInfo.current_balance;

      // Update total cash
      deviceCash.total_cash = Object.values(deviceCash.device_cash)
        .reduce((total, cash) => total + cash.current_balance, 0);

      // Add to cash history
      deviceCash.cash_history.push({
        device_id: deviceId,
        device_name: device.name,
        transaction: transaction,
        timestamp: new Date().toISOString()
      });

      deviceCash.last_updated = new Date().toISOString();

      // Save configurations
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
      fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

      logger.info(`Cash added to device ${device.name}: ${amount} (${reason})`);
      return { 
        success: true, 
        transaction,
        new_balance: cashInfo.current_balance
      };
    } catch (error) {
      logger.error('Error adding cash to device:', error);
      return { success: false, error: error.message };
    }
  }

  // Withdraw cash from device
  withdrawCashFromDevice(deviceId, amount, reason = 'withdrawal') {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));

      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const cashInfo = deviceCash.device_cash[deviceId];
      if (!cashInfo || cashInfo.current_balance < amount) {
        return { 
          success: false, 
          error: 'Insufficient cash balance',
          current_balance: cashInfo?.current_balance || 0,
          requested_amount: amount
        };
      }

      const previousBalance = cashInfo.current_balance;
      cashInfo.current_balance -= amount;
      cashInfo.total_withdrawn += amount;

      // Add transaction record
      const transaction = {
        id: this.generateDeviceId(),
        type: 'withdrawal',
        amount: amount,
        previous_balance: previousBalance,
        new_balance: cashInfo.current_balance,
        reason: reason,
        timestamp: new Date().toISOString()
      };

      cashInfo.transactions.push(transaction);
      cashInfo.last_transaction = transaction;

      // Update device cash balance
      device.cash_balance = cashInfo.current_balance;

      // Update total cash
      deviceCash.total_cash = Object.values(deviceCash.device_cash)
        .reduce((total, cash) => total + cash.current_balance, 0);

      // Add to cash history
      deviceCash.cash_history.push({
        device_id: deviceId,
        device_name: device.name,
        transaction: transaction,
        timestamp: new Date().toISOString()
      });

      deviceCash.last_updated = new Date().toISOString();

      // Save configurations
      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));
      fs.writeFileSync(DEVICE_CASH_PATH, JSON.stringify(deviceCash, null, 2));

      logger.info(`Cash withdrawn from device ${device.name}: ${amount} (${reason})`);
      return { 
        success: true, 
        transaction,
        new_balance: cashInfo.current_balance
      };
    } catch (error) {
      logger.error('Error withdrawing cash from device:', error);
      return { success: false, error: error.message };
    }
  }

  // Get device cash summary
  getDeviceCashSummary(deviceId) {
    try {
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));

      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const cashInfo = deviceCash.device_cash[deviceId] || {
        current_balance: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        last_transaction: null,
        transactions: []
      };

      // Get recent transactions (last 10)
      const recentTransactions = cashInfo.transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      return {
        success: true,
        device_name: device.name,
        cash_summary: {
          current_balance: cashInfo.current_balance,
          total_deposited: cashInfo.total_deposited,
          total_withdrawn: cashInfo.total_withdrawn,
          last_transaction: cashInfo.last_transaction,
          recent_transactions: recentTransactions,
          total_transactions: cashInfo.transactions.length
        }
      };
    } catch (error) {
      logger.error('Error getting device cash summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Get overall cash summary for all devices
  getOverallCashSummary() {
    try {
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));

      const totalCash = deviceCash.total_cash;
      const totalDevices = devicesConfig.total_devices;
      const activeDevices = devicesConfig.active_devices;

      // Calculate totals from all devices
      let totalDeposited = 0;
      let totalWithdrawn = 0;
      let devicesWithCash = 0;

      Object.values(deviceCash.device_cash).forEach(cash => {
        totalDeposited += cash.total_deposited;
        totalWithdrawn += cash.total_withdrawn;
        if (cash.current_balance > 0) {
          devicesWithCash++;
        }
      });

      // Get recent cash history (last 20 transactions)
      const recentHistory = deviceCash.cash_history
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);

      return {
        success: true,
        summary: {
          total_cash: totalCash,
          total_deposited: totalDeposited,
          total_withdrawn: totalWithdrawn,
          total_devices: totalDevices,
          active_devices: activeDevices,
          devices_with_cash: devicesWithCash,
          last_updated: deviceCash.last_updated,
          recent_history: recentHistory
        }
      };
    } catch (error) {
      logger.error('Error getting overall cash summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Get device transactions
  getDeviceTransactions(deviceId, limit = 50, offset = 0) {
    try {
      const deviceCash = JSON.parse(fs.readFileSync(DEVICE_CASH_PATH, 'utf8'));
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));

      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      const cashInfo = deviceCash.device_cash[deviceId];
      if (!cashInfo) {
        return { success: true, transactions: [], total: 0 };
      }

      const transactions = cashInfo.transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);

      return {
        success: true,
        transactions,
        total: cashInfo.transactions.length,
        device_name: device.name
      };
    } catch (error) {
      logger.error('Error getting device transactions:', error);
      return { success: false, error: error.message };
    }
  }

  // Search devices
  searchDevices(query) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      
      const filteredDevices = devicesConfig.devices.filter(device => 
        device.name.toLowerCase().includes(query.toLowerCase()) ||
        device.ip_address.includes(query) ||
        device.mac_address.toLowerCase().includes(query.toLowerCase()) ||
        device.device_type.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        devices: filteredDevices,
        total_found: filteredDevices.length
      };
    } catch (error) {
      logger.error('Error searching devices:', error);
      return { success: false, error: error.message };
    }
  }
// Add window electron type declaration
  // Block a device
  blockDevice(deviceId, reason = '') {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      
      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      device.status = 'blocked';
      device.blocked_at = new Date().toISOString();
      device.block_reason = reason;
      device.last_updated = new Date().toISOString();

      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active').length;
      devicesConfig.last_updated = new Date().toISOString();

      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));

      logger.info(`Device blocked: ${device.name} (${deviceId}) - Reason: ${reason}`);
      return { success: true, device };
    } catch (error) {
      logger.error('Error blocking device:', error);
      return { success: false, error: error.message };
    }
  }

  // Unblock a device
  unblockDevice(deviceId) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      
      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      device.status = 'active';
      delete device.blocked_at;
      delete device.block_reason;
      device.last_updated = new Date().toISOString();

      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active').length;
      devicesConfig.last_updated = new Date().toISOString();

      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));

      logger.info(`Device unblocked: ${device.name} (${deviceId})`);
      return { success: true, device };
    } catch (error) {
      logger.error('Error unblocking device:', error);
      return { success: false, error: error.message };
    }
  }

  // Disconnect a device
  disconnectDevice(deviceId) {
    try {
      const devicesConfig = JSON.parse(fs.readFileSync(DEVICES_CONFIG_PATH, 'utf8'));
      
      const device = devicesConfig.devices.find(d => d.id === deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      device.status = 'disconnected';
      device.disconnected_at = new Date().toISOString();
      device.last_updated = new Date().toISOString();

      devicesConfig.active_devices = devicesConfig.devices.filter(d => d.status === 'active').length;
      devicesConfig.last_updated = new Date().toISOString();

      fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));

      logger.info(`Device disconnected: ${device.name} (${deviceId})`);
      return { success: true, device };
    } catch (error) {
      logger.error('Error disconnecting device:', error);
      return { success: false, error: error.message };
    }
  }

  // Get device statistics
  async getDeviceStats() {
    try {
      const devices = await this.getAllDevices();
      
      if (!devices.success) {
        throw new Error(devices.error);
      }

      const allDevices = devices.devices;
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = {
        total: allDevices.length,
        connected: allDevices.filter(d => d.status === 'connected').length,
        blocked: allDevices.filter(d => d.status === 'blocked').length,
        pending: allDevices.filter(d => d.status === 'pending').length,
        disconnected: allDevices.filter(d => d.status === 'disconnected').length,
        activeLastHour: allDevices.filter(d => 
          d.last_seen && new Date(d.last_seen) > oneHourAgo
        ).length,
        activeLastDay: allDevices.filter(d => 
          d.last_seen && new Date(d.last_seen) > oneDayAgo
        ).length,
        registrationSources: {},
        deviceTypes: {}
      };

      // Count by registration source
      allDevices.forEach(device => {
        const source = device.registration_source || 'unknown';
        stats.registrationSources[source] = (stats.registrationSources[source] || 0) + 1;
      });

      // Count by device type
      allDevices.forEach(device => {
        const type = device.device_type || 'unknown';
        stats.deviceTypes[type] = (stats.deviceTypes[type] || 0) + 1;
      });

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Failed to get device stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set device configuration
  async setDeviceConfig(config) {
    try {
      if (!fs.existsSync(APP_DATA_DIR)) {
        fs.mkdirSync(APP_DATA_DIR, { recursive: true });
      }

      const appConfigPath = path.join(APP_DATA_DIR, 'appConfig.json');
      let currentConfig = {};

      // Read existing config
      if (fs.existsSync(appConfigPath)) {
        try {
          currentConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
        } catch (parseError) {
          console.warn('Failed to parse existing config, starting fresh:', parseError);
        }
      }

      // Merge with new config
      const updatedConfig = {
        ...currentConfig,
        ...config,
        updated_at: new Date().toISOString()
      };

      // Write updated config
      fs.writeFileSync(appConfigPath, JSON.stringify(updatedConfig, null, 2));

      return {
        success: true,
        config: updatedConfig,
        message: 'Device configuration updated successfully'
      };
    } catch (error) {
      console.error('Failed to set device config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get connected devices only
  async getConnectedDevices() {
    try {
      const allDevicesResult = await this.getAllDevices();
      
      if (!allDevicesResult.success) {
        return allDevicesResult;
      }

      const connectedDevices = allDevicesResult.devices
        .filter(device => device.status === 'connected')
        .map(device => {
          // Remove unwanted fields from device info
          const { permissions, cash_balance, max_cash_limit, ...cleanDevice } = device;
          return cleanDevice;
        });

      return {
        success: true,
        devices: connectedDevices,
        count: connectedDevices.length
      };
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Request device authorization
  async requestDeviceAuthorization(deviceInfo) {
    try {
      const pendingDevicesPath = path.join(APP_DATA_DIR, 'pending_devices.json');
      
      // Ensure pending devices file exists
      if (!fs.existsSync(pendingDevicesPath)) {
        const defaultPending = {
          pending_devices: [],
          last_updated: new Date().toISOString()
        };
        fs.writeFileSync(pendingDevicesPath, JSON.stringify(defaultPending, null, 2));
      }

      // Read existing pending devices
      const pendingData = JSON.parse(fs.readFileSync(pendingDevicesPath, 'utf8'));
      
      // Check if device is already pending
      const existingPending = pendingData.pending_devices.find(
        device => device.ip_address === deviceInfo.ip_address || 
                 device.mac_address === deviceInfo.mac_address
      );

      if (existingPending) {
        return {
          success: false,
          error: 'Device authorization already pending',
          pending_id: existingPending.id
        };
      }

      // Create pending device entry
      const pendingDevice = {
        id: this.generateDeviceId(),
        name: deviceInfo.name || `Device-${Date.now()}`,
        ip_address: deviceInfo.ip_address,
        mac_address: deviceInfo.mac_address || '',
        device_type: deviceInfo.device_type || 'secondary',
        requested_at: new Date().toISOString(),
        status: 'pending',
        request_source: deviceInfo.request_source || 'api',
        additional_info: deviceInfo.additional_info || {}
      };

      // Add to pending devices
      pendingData.pending_devices.push(pendingDevice);
      pendingData.last_updated = new Date().toISOString();
      
      // Save updated pending devices
      fs.writeFileSync(pendingDevicesPath, JSON.stringify(pendingData, null, 2));

    

      return {
        success: true,
        pending_id: pendingDevice.id,
        message: 'Authorization request submitted successfully',
        estimated_wait_time: '5-10 minutes'
      };
    } catch (error) {
      console.error('Failed to request device authorization:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get pending device authorization requests
  async getPendingDeviceRequests() {
    try {
      const pendingDevicesPath = path.join(APP_DATA_DIR, 'pending_devices.json');
      
      if (!fs.existsSync(pendingDevicesPath)) {
        return {
          success: true,
          pending_devices: [],
          count: 0
        };
      }

      const pendingData = JSON.parse(fs.readFileSync(pendingDevicesPath, 'utf8'));
      
      return {
        success: true,
        pending_devices: pendingData.pending_devices,
        count: pendingData.pending_devices.length
      };
    } catch (error) {
      console.error('Failed to get pending device requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Approve device authorization
  async approveDeviceAuthorization(pendingId) {
    try {
      const pendingDevicesPath = path.join(APP_DATA_DIR, 'pending_devices.json');
      const authorizedDevicesPath = path.join(APP_DATA_DIR, 'authorized_devices.json');
      
      if (!fs.existsSync(pendingDevicesPath)) {
        return {
          success: false,
          error: 'No pending devices found'
        };
      }

      // Read pending devices
      const pendingData = JSON.parse(fs.readFileSync(pendingDevicesPath, 'utf8'));
      
      // Find the pending device
      const pendingIndex = pendingData.pending_devices.findIndex(device => device.id === pendingId);
      
      if (pendingIndex === -1) {
        return {
          success: false,
          error: 'Pending device not found'
        };
      }

      const pendingDevice = pendingData.pending_devices[pendingIndex];

      // Ensure authorized devices file exists
      if (!fs.existsSync(authorizedDevicesPath)) {
        const defaultAuthorized = {
          authorized_devices: [],
          last_updated: new Date().toISOString()
        };
        fs.writeFileSync(authorizedDevicesPath, JSON.stringify(defaultAuthorized, null, 2));
      }

      // Read authorized devices
      const authorizedData = JSON.parse(fs.readFileSync(authorizedDevicesPath, 'utf8'));

      // Check if device is already authorized
      const alreadyAuthorized = authorizedData.authorized_devices.find(
        device => device.ip_address === pendingDevice.ip_address || 
                 device.mac_address === pendingDevice.mac_address
      );

      if (alreadyAuthorized) {
        // Remove from pending
        pendingData.pending_devices.splice(pendingIndex, 1);
        pendingData.last_updated = new Date().toISOString();
        fs.writeFileSync(pendingDevicesPath, JSON.stringify(pendingData, null, 2));

        return {
          success: false,
          error: 'Device is already authorized'
        };
      }

      // Add to authorized devices
      const authorizedDevice = {
        id: this.generateDeviceId(),
        name: pendingDevice.name,
        ip_address: pendingDevice.ip_address,
        mac_address: pendingDevice.mac_address,
        device_type: pendingDevice.device_type,
        authorized_at: new Date().toISOString(),
        authorized_by: 'admin',
        status: 'authorized',
        permissions: ['sales', 'inventory'], // Default permissions
        max_cash_limit: 10000 // Default cash limit
      };

      authorizedData.authorized_devices.push(authorizedDevice);
      authorizedData.last_updated = new Date().toISOString();

      // Save authorized devices
      fs.writeFileSync(authorizedDevicesPath, JSON.stringify(authorizedData, null, 2));

      // Remove from pending devices
      pendingData.pending_devices.splice(pendingIndex, 1);
      pendingData.last_updated = new Date().toISOString();
      fs.writeFileSync(pendingDevicesPath, JSON.stringify(pendingData, null, 2));


      return {
        success: true,
        device: authorizedDevice,
        message: 'Device authorized successfully'
      };
    } catch (error) {
      console.error('Failed to approve device authorization:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reject device authorization
  async rejectDeviceAuthorization(pendingId, reason = '') {
    try {
      const pendingDevicesPath = path.join(APP_DATA_DIR, 'pending_devices.json');
      
      if (!fs.existsSync(pendingDevicesPath)) {
        return {
          success: false,
          error: 'No pending devices found'
        };
      }

      // Read pending devices
      const pendingData = JSON.parse(fs.readFileSync(pendingDevicesPath, 'utf8'));
      
      // Find the pending device
      const pendingIndex = pendingData.pending_devices.findIndex(device => device.id === pendingId);
      
      if (pendingIndex === -1) {
        return {
          success: false,
          error: 'Pending device not found'
        };
      }

      const pendingDevice = pendingData.pending_devices[pendingIndex];

      // Remove from pending devices
      pendingData.pending_devices.splice(pendingIndex, 1);
      pendingData.last_updated = new Date().toISOString();
      fs.writeFileSync(pendingDevicesPath, JSON.stringify(pendingData, null, 2));



      return {
        success: true,
        message: 'Device authorization rejected',
        rejected_device: {
          name: pendingDevice.name,
          ip_address: pendingDevice.ip_address,
          reason: reason
        }
      };
    } catch (error) {
      console.error('Failed to reject device authorization:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if device is authorized
  async isDeviceAuthorized(deviceInfo) {
    try {
      const authorizedDevicesPath = path.join(APP_DATA_DIR, 'authorized_devices.json');
      
      if (!fs.existsSync(authorizedDevicesPath)) {
        return {
          success: true,
          authorized: false,
          reason: 'No authorized devices list found'
        };
      }

      const authorizedData = JSON.parse(fs.readFileSync(authorizedDevicesPath, 'utf8'));
      
      const authorizedDevice = authorizedData.authorized_devices.find(
        device => device.ip_address === deviceInfo.ip_address || 
                 device.mac_address === deviceInfo.mac_address
      );

      if (authorizedDevice) {
        return {
          success: true,
          authorized: true,
          device: authorizedDevice
        };
      } else {
        return {
          success: true,
          authorized: false,
          reason: 'Device not found in authorized list'
        };
      }
    } catch (error) {
      console.error('Failed to check device authorization:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get device connection history
  async getDeviceConnectionHistory(deviceId, limit = 50) {
    try {
      const device = await this.getDevice(deviceId);
      
      if (!device.success) {
        return device;
      }

      // For now, return a mock history. In a real implementation,
      // you would store connection events in a separate table
      const mockHistory = [
        {
          id: 1,
          event_type: 'connected',
          timestamp: new Date().toISOString(),
          details: 'Device connected successfully'
        },
        {
          id: 2,
          event_type: 'heartbeat',
          timestamp: new Date(Date.now() - 30000).toISOString(),
          details: 'Heartbeat received'
        }
      ];

      return {
        success: true,
        history: mockHistory.slice(0, limit),
        device_id: deviceId
      };
    } catch (error) {
      console.error('Failed to get device connection history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

     // Helper method to get a single device
   async getDevice(deviceId) {
     try {
       const allDevicesResult = await this.getAllDevices();
       
       if (!allDevicesResult.success) {
         return allDevicesResult;
       }

       const device = allDevicesResult.devices.find(d => 
         d.id === deviceId || d.mac_address === deviceId
       );

       if (!device) {
         return {
           success: false,
           error: 'Device not found'
         };
       }

       return {
         success: true,
         device
       };
     } catch (error) {
       console.error('Failed to get device:', error);
       return {
         success: false,
         error: error.message
       };
     }
   }

   // Check device connection status
   async checkDeviceStatus(deviceId) {
     try {
       const allDevicesResult = await this.getAllDevices();
       
       if (!allDevicesResult.success) {
         return allDevicesResult;
       }

       const device = allDevicesResult.devices.find(d => d.id === deviceId);
       if (!device) {
         return {
           success: false,
           error: 'Device not found',
           status: 'not_found'
         };
       }

       return {
         success: true,
         status: device.status,
         device: device
       };
     } catch (error) {
       console.error('Failed to check device status:', error);
       return {
         success: false,
         error: error.message,
         status: 'error'
       };
     }
   }

   // Update device status
   async updateDeviceStatus(deviceId, status) {
     try {
       const allDevicesResult = await this.getAllDevices();
       
       if (!allDevicesResult.success) {
         return allDevicesResult;
       }

       const device = allDevicesResult.devices.find(d => d.id === deviceId);
       if (!device) {
         return { success: false, error: 'Device not found' };
       }

       // Update status and timestamp
       device.status = status || 'connected';
       device.last_connected = new Date().toISOString();
       device.last_updated = new Date().toISOString();
       device.last_seen = new Date().toISOString();

       // Save updated devices
       const devicesConfig = {
         devices: allDevicesResult.devices,
         total_devices: allDevicesResult.devices.length,
         active_devices: allDevicesResult.devices.filter(d => d.status === 'connected').length,
         last_updated: new Date().toISOString()
       };

       fs.writeFileSync(DEVICES_CONFIG_PATH, JSON.stringify(devicesConfig, null, 2));


       return { success: true, device };
     } catch (error) {
       console.error('Error updating device status:', error);
       return { success: false, error: error.message };
     }
   }
}

// Create instance
const deviceManagementService = new DeviceManagementService();

module.exports = {
  getLocalIpAddress,
  deviceManagementService
};