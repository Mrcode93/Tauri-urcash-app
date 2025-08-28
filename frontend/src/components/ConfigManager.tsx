import React, { useState, useEffect } from 'react';
import { useTauriServices } from '@/lib/tauriServices';

interface ConfigManagerProps {
  className?: string;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ className }) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState('');
  const [message, setMessage] = useState('');
  
  const {
    getAllConfig,
    setConfigValue,
    updateApiKey,
    getGoogleGeolocationApiKey,
    showToastNotification
  } = useTauriServices();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const allConfig = await getAllConfig();
      setConfig(allConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      setMessage('Please enter a valid API key');
      return;
    }

    try {
      await updateApiKey(newApiKey);
      await loadConfig(); // Reload config
      setNewApiKey('');
      setMessage('API key updated successfully');
      
      // Show toast notification
      await showToastNotification(
        'Success',
        'Google Geolocation API key updated successfully',
        'success'
      );
    } catch (error) {
      console.error('Failed to update API key:', error);
      setMessage('Failed to update API key');
      
      await showToastNotification(
        'Error',
        'Failed to update API key',
        'error'
      );
    }
  };

  const handleSetCustomValue = async (key: string, value: string) => {
    try {
      await setConfigValue(key, value);
      await loadConfig(); // Reload config
      setMessage(`Custom setting '${key}' updated successfully`);
    } catch (error) {
      console.error('Failed to set custom value:', error);
      setMessage(`Failed to update '${key}'`);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
        <h2 className="text-xl font-semibold mb-4">Configuration Manager</h2>
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Configuration Manager</h2>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${
          message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Google Geolocation API Key Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Google Geolocation API Key</h3>
        <div className="flex gap-2">
          <input
            type="password"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            placeholder="Enter new API key"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUpdateApiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Update
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Current: {config.GOOGLE_GEOLOCATION_API_KEY ? '***' + config.GOOGLE_GEOLOCATION_API_KEY.slice(-4) : 'Not set'}
        </div>
      </div>

      {/* All Configuration Section */}
      <div>
        <h3 className="text-lg font-medium mb-3">All Configuration</h3>
        <div className="space-y-2">
          {Object.entries(config).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <span className="font-medium text-sm min-w-[200px]">{key}:</span>
              <span className="text-sm text-gray-600 flex-1">
                {key.includes('API_KEY') ? '***' + value.slice(-4) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Setting Example */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Add Custom Setting</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Setting name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                const value = target.value.trim();
                if (value) {
                  handleSetCustomValue(value, 'custom-value');
                  target.value = '';
                }
              }
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={loadConfig}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Refresh Configuration
        </button>
      </div>
    </div>
  );
};

export default ConfigManager;
