#!/usr/bin/env node

/**
 * Send Test Notification
 * 
 * This script sends a test notification to see the modal in action
 * Uses the test endpoint that works correctly
 */

const http = require('http');

async function sendTestNotification() {
  try {
    console.log('🧪 === SENDING TEST NOTIFICATION ===');
    
    const options = {
      hostname: 'localhost',
      port: 39000,
      path: '/api/license/notifications/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log(`✅ Test notification sent successfully!`);
        console.log(`📊 Response: ${body}`);
        console.log(`📱 Check your frontend to see the modal notification`);
        console.log(`🔗 Frontend URL: http://localhost:3000`);
        console.log(`⏱️  Modal should appear within 10 seconds...`);
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Failed to send test notification:', err.message);
      console.log('💡 Make sure the server is running: node index.js');
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error.message);
  }
}

// Send the test notification
sendTestNotification(); 