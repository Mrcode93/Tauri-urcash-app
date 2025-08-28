const dgram = require('dgram');
const os = require('os');
const logger = require('../utils/logger');

// Get local IP address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
};

class NetworkDiscoveryService {
  constructor() {
    this.discoverySocket = null;
    this.discoveryPort = 39002;
    this.responsePort = 39001;
    this.isListening = false;
    this.appVersion = '1.0.0';
  }

  // Start listening for device discovery requests
  startDiscoveryListener() {
    if (this.isListening) {
      
      return;
    }

    try {
      this.discoverySocket = dgram.createSocket('udp4');

      this.discoverySocket.on('message', (msg, rinfo) => {
        try {
          const request = JSON.parse(msg.toString());
          
          if (request.type === 'discover_main_device') {
            this.respondToDiscovery(rinfo.address, rinfo.port);
          }
        } catch (error) {
          
        }
      });

      this.discoverySocket.on('listening', () => {
        const address = this.discoverySocket.address();
        
        this.isListening = true;
      });

      this.discoverySocket.on('error', (err) => {
        console.error('Discovery socket error:', err);
        this.stopDiscoveryListener();
      });

      this.discoverySocket.bind(this.discoveryPort);
    } catch (error) {
      console.error('Failed to start discovery listener:', error);
    }
  }

  // Respond to discovery requests
  respondToDiscovery(requestorIp, requestorPort) {
    try {
      const response = JSON.stringify({
        type: 'main_device_response',
        branch: 'main',
        ip: getLocalIpAddress(),
        port: process.env.PORT || 39000,
        name: `Main Device (${os.hostname()})`,
        version: this.appVersion,
        hostname: os.hostname(),
        platform: os.platform(),
        timestamp: new Date().toISOString()
      });

      const responseSocket = dgram.createSocket('udp4');
      
      responseSocket.send(response, requestorPort, requestorIp, (err) => {
        if (err) {
          console.error('Failed to send discovery response to', requestorIp, ':', err.message);
        } else {
          
        }
        responseSocket.close();
      });
    } catch (error) {
      console.error('Error responding to discovery:', error);
    }
  }

  // Stop listening for discovery requests
  stopDiscoveryListener() {
    if (this.discoverySocket) {
      try {
        this.discoverySocket.close();
        this.isListening = false;
        
      } catch (error) {
        console.error('Error stopping discovery service:', error);
      }
    }
  }

  // Set app version for discovery responses
  setAppVersion(version) {
    this.appVersion = version;
  }

  // Check if service is running
  isRunning() {
    return this.isListening;
  }
}

// Export singleton instance
const networkDiscoveryService = new NetworkDiscoveryService();

module.exports = {
  networkDiscoveryService,
  NetworkDiscoveryService
};
