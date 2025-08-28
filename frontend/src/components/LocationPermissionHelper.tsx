import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  MapPin, 
  Settings, 
  Shield, 
  Wifi, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ExternalLink,
  Copy
} from 'lucide-react';

interface LocationPermissionHelperProps {
  error?: {
    code: number;
    message: string;
    suggestion?: string;
    systemPermission?: boolean;
  };
  onRetry?: () => void;
  onSkip?: () => void;
}

const LocationPermissionHelper: React.FC<LocationPermissionHelperProps> = ({
  error,
  onRetry,
  onSkip
}) => {
  const [copied, setCopied] = useState(false);

  const getErrorIcon = (code: number) => {
    switch (code) {
      case 1:
        return <Shield className="h-5 w-5 text-red-500" />;
      case 2:
        return <Wifi className="h-5 w-5 text-orange-500" />;
      case 3:
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getErrorColor = (code: number) => {
    switch (code) {
      case 1:
        return 'border-red-200 bg-red-50';
      case 2:
        return 'border-orange-200 bg-orange-50';
      case 3:
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getErrorTitle = (code: number) => {
    switch (code) {
      case 1:
        return 'Location Permission Required';
      case 2:
        return 'Location Unavailable';
      case 3:
        return 'Location Request Timeout';
      default:
        return 'Location Error';
    }
  };

  const getStepsForCode = (code: number) => {
    switch (code) {
      case 1:
        return [
          {
            step: 1,
            title: 'Open System Preferences',
            description: 'Click on the Apple menu and select "System Preferences"',
            icon: <Settings className="h-4 w-4" />
          },
          {
            step: 2,
            title: 'Go to Security & Privacy',
            description: 'Click on "Security & Privacy" in the System Preferences window',
            icon: <Shield className="h-4 w-4" />
          },
          {
            step: 3,
            title: 'Select Location Services',
            description: 'Click on the "Privacy" tab, then select "Location Services" from the left sidebar',
            icon: <MapPin className="h-4 w-4" />
          },
          {
            step: 4,
            title: 'Enable Location Services',
            description: 'Make sure "Enable Location Services" is checked at the top of the window',
            icon: <CheckCircle className="h-4 w-4" />
          },
          {
            step: 5,
            title: 'Find Your App',
            description: 'Scroll down and find "Urcash" or "Electron" in the list of apps',
            icon: <Info className="h-4 w-4" />
          },
          {
            step: 6,
            title: 'Allow Location Access',
            description: 'Check the box next to your app to allow location access',
            icon: <CheckCircle className="h-4 w-4" />
          }
        ];
      case 2:
        return [
          {
            step: 1,
            title: 'Check Internet Connection',
            description: 'Make sure you have a stable internet connection',
            icon: <Wifi className="h-4 w-4" />
          },
          {
            step: 2,
            title: 'Move to Better Location',
            description: 'Try moving to an area with better GPS signal (near a window or outdoors)',
            icon: <MapPin className="h-4 w-4" />
          },
          {
            step: 3,
            title: 'Wait and Retry',
            description: 'Wait a few seconds and try again',
            icon: <Clock className="h-4 w-4" />
          }
        ];
      case 3:
        return [
          {
            step: 1,
            title: 'Check Network Connection',
            description: 'Ensure you have a stable internet connection',
            icon: <Wifi className="h-4 w-4" />
          },
          {
            step: 2,
            title: 'Try Again',
            description: 'Click the retry button to attempt location detection again',
            icon: <Clock className="h-4 w-4" />
          },
          {
            step: 3,
            title: 'Contact Support',
            description: 'If the problem persists, contact technical support',
            icon: <Info className="h-4 w-4" />
          }
        ];
      default:
        return [
          {
            step: 1,
            title: 'Try Again',
            description: 'Click the retry button to attempt location detection again',
            icon: <Clock className="h-4 w-4" />
          },
          {
            step: 2,
            title: 'Contact Support',
            description: 'If the problem persists, contact technical support',
            icon: <Info className="h-4 w-4" />
          }
        ];
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!error) {
    return null;
  }

  const steps = getStepsForCode(error.code);

  return (
    <div className="space-y-4">
      <Alert className={getErrorColor(error.code)}>
        <div className="flex items-start gap-3">
          {getErrorIcon(error.code)}
          <div className="flex-1">
            <AlertDescription className="font-medium text-gray-900">
              {getErrorTitle(error.code)}
            </AlertDescription>
            <p className="text-sm text-gray-700 mt-1">
              {error.message}
            </p>
            {error.suggestion && (
              <p className="text-sm text-gray-600 mt-2">
                {error.suggestion}
              </p>
            )}
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            How to Fix This Issue
          </CardTitle>
          <CardDescription>
            Follow these steps to resolve the location permission problem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.step} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="shrink-0">
                  {step.step}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {step.icon}
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            {onRetry && (
              <Button onClick={onRetry} className="flex-1">
                <MapPin className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {onSkip && (
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip Location
              </Button>
            )}
          </div>

          {error.systemPermission && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">System Permission Required</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    This app needs system-level location permission to work properly. 
                    The permission must be granted through macOS System Preferences.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('System Preferences > Security & Privacy > Location Services')}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copied ? 'Copied!' : 'Copy Path'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_Location')}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPermissionHelper; 