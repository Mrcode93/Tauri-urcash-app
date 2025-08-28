/**
 * Test utility for customer feature activation in POS
 * This can be used to test different license scenarios
 */

// Test scenarios for license status
export const testLicenseScenarios = {
  // Scenario 1: No license (basic/trial)
  basicLicense: {
    success: true,
    activated: true,
    verified: true,
    message: 'Basic license active',
    licenseData: {
      device_id: 'test-device',
      status: 'active',
      type: 'trial' as const,
      features: ['basic', 'pos'], // customers feature NOT included
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }
  },

  // Scenario 2: Premium license with customers feature
  premiumLicense: {
    success: true,
    activated: true,
    verified: true,
    message: 'Premium license active',
    licenseData: {
      device_id: 'test-device',
      status: 'active',
      type: 'premium' as const,
      features: ['basic', 'pos', 'customers', 'reports'], // customers feature included
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    }
  },

  // Scenario 3: No license / offline
  noLicense: {
    success: false,
    activated: false,
    verified: false,
    message: 'No license found',
    licenseData: undefined
  }
};

// Instructions for testing:
// 1. Open browser developer tools
// 2. Navigate to POS page
// 3. In console, run:
//    ```javascript
//    // Test basic license (no customers feature)
//    window.testCustomerFeature = 'basic';
//    
//    // Test premium license (with customers feature)
//    window.testCustomerFeature = 'premium';
//    
//    // Test no license
//    window.testCustomerFeature = 'none';
//    ```
// 4. Reload the page to see the effect
// 5. Try to add a customer or select a customer to see the behavior



