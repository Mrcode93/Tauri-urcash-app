import React, { useState, useEffect } from 'react';
import { licenseService } from '@/services/licenseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LicenseCacheDebugger: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateCacheStats = () => {
    const stats = licenseService.getCacheStats();
    setCacheStats(stats);
  };

  const checkLicense = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    try {
      const status = await licenseService.checkLocalLicense(forceRefresh);
      setLicenseStatus(status);
      updateCacheStats();
    } catch (error) {
      console.error('Error checking license:', error);
      setLicenseStatus({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    licenseService.clearCache();
    updateCacheStats();
    setLicenseStatus(null);
  };

  const refreshCache = async () => {
    setIsLoading(true);
    try {
      const status = await licenseService.refreshCache();
      setLicenseStatus(status);
      updateCacheStats();
    } catch (error) {
      console.error('Error refreshing cache:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateCacheStats();
  }, []);

  const formatTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 License Cache Debugger
            <Badge variant={cacheStats?.hasCachedData ? 'default' : 'secondary'}>
              {cacheStats?.hasCachedData ? 'Cached' : 'No Cache'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cache Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Cache Statistics</h4>
              <div className="space-y-1 text-sm">
                <div>Has Cached Data: {cacheStats?.hasCachedData ? '✅' : '❌'}</div>
                <div>Cache Age: {formatTime(cacheStats?.cacheAge)}</div>
                <div>Session Age: {formatTime(cacheStats?.sessionAge)}</div>
                <div>Is Expired: {cacheStats?.isExpired ? '⚠️' : '✅'}</div>
                <div>Session Valid: {cacheStats?.isSessionValid ? '✅' : '❌'}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">License Status</h4>
              <div className="space-y-1 text-sm">
                <div>Success: {licenseStatus?.success ? '✅' : '❌'}</div>
                <div>Activated: {licenseStatus?.activated ? '✅' : '❌'}</div>
                <div>Source: {licenseStatus?.source || 'N/A'}</div>
                <div>Offline: {licenseStatus?.offline ? '🌐' : '🖥️'}</div>
                <div>Type: {licenseStatus?.type || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => checkLicense(false)} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Checking...' : 'Check License (Cache First)'}
            </Button>
            
            <Button 
              onClick={() => checkLicense(true)} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Checking...' : 'Force Refresh'}
            </Button>
            
            <Button 
              onClick={refreshCache} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Cache'}
            </Button>
            
            <Button 
              onClick={clearCache} 
              variant="destructive"
            >
              Clear Cache
            </Button>
          </div>

          {/* License Details */}
          {licenseStatus && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">License Details</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(licenseStatus, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseCacheDebugger; 