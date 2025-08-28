const licenseService = require('../services/licenseService');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

/**
 * Middleware to check if user has premium access for specific features
 * @param {string} feature - The feature to check access for
 * @returns {Function} Express middleware function
 */
const checkPremiumAccess = (feature) => {
  return async (req, res, next) => {
    try {
      // Generate cache key for premium access check
      const cacheKey = `premium:access:${feature}`;
      
      // Try to get from cache first (cache for 2 minutes to reduce license service calls)
      const cached = cacheService.get(cacheKey);
      if (cached) {
        // Premium access cache hit
        if (cached.granted) {
          next();
        } else {
          return res.status(403).json(cached.response);
        }
        return;
      }
      
      // Check current license status
      const licenseStatus = await licenseService.verifyLicenseAndKey();
      
      // If license is not activated, deny access
      if (!licenseStatus.success) {
        logger.warn(`Premium access denied for feature "${feature}": License not activated`);
        
        const response = {
          success: false,
          message: 'Premium license required to access this feature',
          feature: feature,
          needsActivation: true,
          licenseStatus: licenseStatus.message
        };
        
        // Cache denied access for 2 minutes
        cacheService.set(cacheKey, { granted: false, response }, 120);
        
        return res.status(403).json(response);
      }

      // Check if license has expired
      if (licenseStatus.expires_at) {
        const expirationDate = new Date(licenseStatus.expires_at);
        const now = new Date();
        if (now > expirationDate) {
          logger.warn(`Premium access denied for feature "${feature}": License expired`);
          
          const response = {
            success: false,
            message: 'License has expired. Please renew your premium license.',
            feature: feature,
            needsRenewal: true,
            expiredAt: licenseStatus.expires_at
          };
          
          // Cache denied access for 2 minutes
          cacheService.set(cacheKey, { granted: false, response }, 120);
          
          return res.status(403).json(response);
        }
      }

      // Check if the specific feature is included in the license
      const licenseFeatures = licenseStatus.features || {};
      const featureLicenses = licenseStatus.feature_licenses || [];
      
      // Check if feature exists in the features object or feature_licenses array
      let hasFeature = false;
      
      // Check features object (new structure)
      if (licenseFeatures.hasOwnProperty(feature)) {
        const featureData = licenseFeatures[feature];
        // Check if feature has expired
        if (featureData.expires_at) {
          const expirationDate = new Date(featureData.expires_at);
          const now = new Date();
          if (now > expirationDate) {
            hasFeature = false; // Feature has expired
          } else {
            hasFeature = true;
          }
        } else {
          hasFeature = true; // No expiration date, feature is valid
        }
      }
      
      // Check feature_licenses array (legacy structure)
      if (!hasFeature) {
        hasFeature = featureLicenses.some(f => f.feature === feature);
      }
      
      if (!hasFeature) {
        logger.warn(`Premium access denied for feature "${feature}": Feature not included in license`);
        logger.warn(`Available features: ${JSON.stringify(licenseFeatures)}`);
        logger.warn(`Available feature licenses: ${JSON.stringify(featureLicenses.map(f => f.feature))}`);
        
        const response = {
          success: false,
          message: `Feature "${feature}" is not included in your current license plan`,
          feature: feature,
          needsUpgrade: true,
          availableFeatures: [...Object.keys(licenseFeatures), ...featureLicenses.map(f => f.feature)]
        };
        
        // Cache denied access for 2 minutes
        cacheService.set(cacheKey, { granted: false, response }, 120);
        
        return res.status(403).json(response);
      }

      // Check license type - trial licenses might have restrictions
      if (licenseStatus.type === 'trial') {
        // For trial licenses, you might want to add additional restrictions
        // For now, we'll allow access but log it
        logger.info(`Trial license accessing premium feature "${feature}"`);
      }

      // All checks passed, proceed to the next middleware
      // Premium access granted
      
      // Cache granted access for 2 minutes
      cacheService.set(cacheKey, { granted: true }, 120);
      
      next();

    } catch (error) {
      logger.error(`Error checking premium access for feature "${feature}":`, error);
      
      const response = {
        success: false,
        message: 'Error verifying premium access',
        feature: feature,
        error: error.message
      };
      
      // Cache error for 1 minute
      cacheService.set(cacheKey, { granted: false, response }, 60);
      
      return res.status(500).json(response);
    }
  };
};

/**
 * Middleware for specific premium features
 */
const premiumFeatures = {
  installments: checkPremiumAccess('installments'),
  reports: checkPremiumAccess('reports'),
  debts: checkPremiumAccess('debts'),
  customers: checkPremiumAccess('customers'),
  analytics: checkPremiumAccess('analytics'),
  advancedInventory: checkPremiumAccess('advanced_inventory'),
  multiStore: checkPremiumAccess('multi_store'),
  staffManagement: checkPremiumAccess('staff_management'),
  loyaltyProgram: checkPremiumAccess('loyalty'),
  accountingIntegration: checkPremiumAccess('accounting'),
  mobileLiveData: checkPremiumAccess('mobile_live_data')
};

/**
 * General premium middleware that checks if user has any premium features
 */
const requirePremium = async (req, res, next) => {
  try {
    const licenseStatus = await licenseService.verifyLicenseAndKey();
    
    if (!licenseStatus.success) {
      return res.status(403).json({
        success: false,
        message: 'Premium license required',
        needsActivation: true
      });
    }

    // Check if license is not just a basic trial
    const licenseType = licenseStatus.type;
    const features = licenseStatus.features || {};
    const featureLicenses = licenseStatus.feature_licenses || [];
    
    // Check if there are any premium features (either in features object or feature_licenses array)
    const hasPremiumFeatures = Object.keys(features).length > 0 || featureLicenses.length > 0;
    
    if (licenseType === 'trial' && !hasPremiumFeatures) {
      return res.status(403).json({
        success: false,
        message: 'Premium features not available in basic trial',
        needsUpgrade: true
      });
    }

    next();
  } catch (error) {
    logger.error('Error in requirePremium middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying premium access',
      error: error.message
    });
  }
};

module.exports = {
  checkPremiumAccess,
  premiumFeatures,
  requirePremium
};
