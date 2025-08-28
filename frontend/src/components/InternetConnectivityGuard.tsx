import React from 'react';
import { useInternetConnectivity } from '../hooks/useInternetConnectivity';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface InternetConnectivityGuardProps {
  children: React.ReactNode;
  operation: 'license-activation' | 'mobile-sync' | 'cloud-backup';
  onOperationStart?: () => void;
  onOperationComplete?: (success: boolean) => void;
}

export const InternetConnectivityGuard: React.FC<InternetConnectivityGuardProps> = ({
  children,
  operation,
  onOperationStart,
  onOperationComplete
}) => {
  const { isOnline, isChecking, requireInternetConnection } = useInternetConnectivity();

  const handleOperation = async () => {
    const operationNames = {
      'license-activation': 'License activation',
      'mobile-sync': 'Mobile data sync',
      'cloud-backup': 'النسخ الاحتياطي السحابي'
    };

    const operationName = operationNames[operation];
    
    onOperationStart?.();
    
    const hasInternet = await requireInternetConnection(operationName);
    
    if (hasInternet) {
      // Proceed with the operation
      
      onOperationComplete?.(true);
    } else {
      // Operation blocked due to no internet
      
      onOperationComplete?.(false);
    }
  };

  const getOperationDescription = () => {
    switch (operation) {
      case 'license-activation':
        return 'License activation requires an internet connection to verify with the remote server.';
      case 'mobile-sync':
        return 'Mobile data sync requires an internet connection to synchronize with the remote server.';
      case 'cloud-backup':
        return 'يتطلب النسخ الاحتياطي السحابي اتصال بالإنترنت لرفع البيانات إلى الخادم السحابي.';
      default:
        return 'This operation requires an internet connection.';
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Checking internet connection...</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>No Internet Connection</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
            <p className="text-sm mt-2">{getOperationDescription()}</p>
          </AlertDescription>
        </Alert>
        
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="font-medium mb-2">What you can do:</h3>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>• Check your internet connection</li>
            <li>• Try connecting to a different network</li>
            <li>• Contact your network administrator</li>
            <li>• Try again when connection is restored</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Wifi className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Internet Connection Available</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-sm mt-2">You can proceed with {operation.replace('-', ' ')}.</p>
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        {children}
        <Button 
          onClick={handleOperation}
          className="w-full"
          disabled={!isOnline}
        >
          {operation === 'license-activation' && 'Activate License'}
          {operation === 'mobile-sync' && 'Start Mobile Sync'}
          {operation === 'cloud-backup' && 'إنشاء نسخة احتياطية سحابية'}
        </Button>
      </div>
    </div>
  );
};

// Example usage components
export const LicenseActivationExample: React.FC = () => {
  const handleActivationStart = () => {
    
  };

  const handleActivationComplete = (success: boolean) => {
    if (success) {
      
    } else {
      
    }
  };

  return (
    <InternetConnectivityGuard
      operation="license-activation"
      onOperationStart={handleActivationStart}
      onOperationComplete={handleActivationComplete}
    >
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-2">License Activation</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter your license key to activate the application.
        </p>
        <input
          type="text"
          placeholder="Enter license key"
          className="w-full p-2 border rounded"
        />
      </div>
    </InternetConnectivityGuard>
  );
};

export const MobileSyncExample: React.FC = () => {
  const handleSyncStart = () => {
    
  };

  const handleSyncComplete = (success: boolean) => {
    if (success) {
      
    } else {
      
    }
  };

  return (
    <InternetConnectivityGuard
      operation="mobile-sync"
      onOperationStart={handleSyncStart}
      onOperationComplete={handleSyncComplete}
    >
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-2">Mobile Data Sync</h3>
        <p className="text-sm text-gray-600 mb-4">
          Synchronize your data with the remote server.
        </p>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="sync-sales" />
            <label htmlFor="sync-sales">Sync sales data</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="sync-inventory" />
            <label htmlFor="sync-inventory">Sync inventory</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="sync-customers" />
            <label htmlFor="sync-customers">Sync customers</label>
          </div>
        </div>
      </div>
    </InternetConnectivityGuard>
  );
};

export const CloudBackupExample: React.FC = () => {
  const handleBackupStart = () => {
    
  };

  const handleBackupComplete = (success: boolean) => {
    if (success) {
      
    } else {
      
    }
  };

  return (
    <InternetConnectivityGuard
      operation="cloud-backup"
      onOperationStart={handleBackupStart}
      onOperationComplete={handleBackupComplete}
    >
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-2">النسخ الاحتياطي السحابي</h3>
        <p className="text-sm text-gray-600 mb-4">
          إنشاء نسخة احتياطية من بياناتك في السحابة.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="اسم النسخة الاحتياطية (اختياري)"
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="وصف النسخة الاحتياطية (اختياري)"
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      </div>
    </InternetConnectivityGuard>
  );
}; 