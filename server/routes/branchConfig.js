// branchConfig.js

const express = require('express');
const router = express.Router();
const { getLocalIpAddress, deviceManagementService } = require('../services/branchConfig');
const fs = require('fs');
const path = require('path');
const os = require('os');
const APP_DATA_DIR = path.join(os.homedir(), '.urcash');

// Get main device configuration
router.get('/', (req, res) => {
  try {
    const ipAddress = getLocalIpAddress();
    const mainDeviceConfig = {
      branch: 'main',
      ip: ipAddress,
      port: 39000,
      device_type: 'main',
      status: 'active',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mainDeviceConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get local IP address
router.get('/ip', (req, res) => {
  try {
    const ipAddress = getLocalIpAddress();
    res.json({
      success: true,
      ip_address: ipAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get device statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await deviceManagementService.getDeviceStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all devices (for main device management)
router.get('/devices', async (req, res) => {
  try {
    const result = await deviceManagementService.getAllDevices();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get connected devices only
router.get('/devices/connected', async (req, res) => {
  try {
    const result = await deviceManagementService.getConnectedDevices();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Block a device
router.post('/devices/:deviceId/block', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { reason } = req.body;
    const result = await deviceManagementService.blockDevice(deviceId, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Unblock a device
router.post('/devices/:deviceId/unblock', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceManagementService.unblockDevice(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect a device
router.post('/devices/:deviceId/disconnect', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceManagementService.disconnectDevice(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove a device
router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceManagementService.removeDevice(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update device status (for heartbeat from secondary devices)
router.put('/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;
    
    const result = await deviceManagementService.updateDeviceStatus(deviceId, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check device status (for secondary devices to check if they're still connected)
router.get('/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const result = await deviceManagementService.checkDeviceStatus(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Register a secondary device (for when secondary devices connect)
router.post('/register-device', async (req, res) => {
  try {
    const { name, ip_address, mac_address, device_type, permissions, port } = req.body;
    
    // Get device IP from request if not provided
    const deviceIp = ip_address || req.ip || req.connection.remoteAddress;
    
    const deviceInfo = {
      name: name || `Secondary-${Date.now()}`,
      ip_address: deviceIp,
      mac_address: mac_address || '',
      device_type: device_type || 'secondary',
      permissions: permissions || ['sales', 'inventory'],
      port: port || 39000,
      registration_source: 'api',
      registered_at: new Date().toISOString()
    };
    
    const result = await deviceManagementService.addDevice(deviceInfo);
    
    if (result.success) {
      res.json({
        success: true,
        device: result.device,
        message: 'Secondary device registered successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Request device authorization (for new devices trying to connect)
router.post('/request-authorization', async (req, res) => {
  try {
    const { name, ip_address, mac_address, device_type, additional_info } = req.body;
    
    // Get device IP from request if not provided
    const deviceIp = ip_address || req.ip || req.connection.remoteAddress;
    
    const deviceInfo = {
      name: name || `Device-${Date.now()}`,
      ip_address: deviceIp,
      mac_address: mac_address || '',
      device_type: device_type || 'secondary',
      request_source: 'api',
      additional_info: additional_info || {}
    };
    
    const result = await deviceManagementService.requestDeviceAuthorization(deviceInfo);
    
    if (result.success) {
      res.json({
        success: true,
        pending_id: result.pending_id,
        message: result.message,
        estimated_wait_time: result.estimated_wait_time
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        pending_id: result.pending_id
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending device authorization requests (for admin dashboard)
router.get('/pending-authorizations', async (req, res) => {
  try {
    const result = await deviceManagementService.getPendingDeviceRequests();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Approve device authorization (admin action)
router.post('/approve-authorization/:pendingId', async (req, res) => {
  try {
    const { pendingId } = req.params;
    const result = await deviceManagementService.approveDeviceAuthorization(pendingId);
    
    if (result.success) {
      res.json({
        success: true,
        device: result.device,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reject device authorization (admin action)
router.post('/reject-authorization/:pendingId', async (req, res) => {
  try {
    const { pendingId } = req.params;
    const { reason } = req.body;
    
    const result = await deviceManagementService.rejectDeviceAuthorization(pendingId, reason);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        rejected_device: result.rejected_device
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check device authorization status (for devices checking if they're authorized)
router.post('/check-authorization', async (req, res) => {
  try {
    const { ip_address, mac_address } = req.body;
    
    const deviceInfo = {
      ip_address: ip_address || req.ip || req.connection.remoteAddress,
      mac_address: mac_address || ''
    };
    
    const result = await deviceManagementService.isDeviceAuthorized(deviceInfo);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get authorized devices list
router.get('/authorized-devices', async (req, res) => {
  try {
    const authorizedDevicesPath = path.join(APP_DATA_DIR, 'authorized_devices.json');
    
    if (!fs.existsSync(authorizedDevicesPath)) {
      res.json({
        success: true,
        authorized_devices: [],
        count: 0
      });
      return;
    }

    const authorizedData = JSON.parse(fs.readFileSync(authorizedDevicesPath, 'utf8'));
    
    res.json({
      success: true,
      authorized_devices: authorizedData.authorized_devices,
      count: authorizedData.authorized_devices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;