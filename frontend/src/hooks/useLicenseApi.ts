import { useState, useCallback } from 'react';
import { licenseService, LicenseStatus } from '../services/licenseService';

export const useLicenseApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async (): Promise<LicenseStatus | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await licenseService.checkStatus();
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const activate = useCallback(async (): Promise<LicenseStatus | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await licenseService.activate();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    checkStatus,
    activate,
  };
};

export default useLicenseApi;
