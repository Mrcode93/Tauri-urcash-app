import React from 'react';
import { useLicense, PREMIUM_FEATURES } from '@/contexts/LicenseContext';

const LicenseTest: React.FC = () => {
  const { 
    isActivated, 
    isLoading, 
    licenseData, 
    hasFeatureAccess, 
    isPremium,
    premiumFeatures 
  } = useLicense();

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">License Test</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p>Loading license data...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">License Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">License Status</h2>
          <p><strong>Activated:</strong> {isActivated ? 'Yes' : 'No'}</p>
          <p><strong>Premium:</strong> {isPremium ? 'Yes' : 'No'}</p>
          <p><strong>License Type:</strong> {licenseData?.type || 'None'}</p>
          <p><strong>Expires At:</strong> {licenseData?.expires_at || 'Never'}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Available Features</h2>
          <p><strong>Features Array:</strong> {licenseData?.features?.join(', ') || 'None'}</p>
          <p><strong>Feature Licenses:</strong> {licenseData?.feature_licenses?.join(', ') || 'None'}</p>
          <p><strong>Premium Features:</strong> {premiumFeatures?.join(', ') || 'None'}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Feature Access Tests</h2>
          {Object.entries(PREMIUM_FEATURES).map(([key, feature]) => (
            <div key={key} className="flex items-center space-x-2">
              <span className="font-medium">{key}:</span>
              <span className={hasFeatureAccess(feature) ? 'text-green-600' : 'text-red-600'}>
                {hasFeatureAccess(feature) ? '✓ Access' : '✗ No Access'}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Raw License Data</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(licenseData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default LicenseTest; 