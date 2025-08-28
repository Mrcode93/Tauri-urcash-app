import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { systemSettingsService } from '../services/systemSettingsService';
import { 
  MapPin, 
  Settings, 
  Shield, 
  Wifi, 
  Clock, 
  AlertTriangle, 
  Info,
  ExternalLink,
  X,
  Lock
} from 'lucide-react';

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantPermission: () => void;
  onSkip: () => void;
  error?: {
    code: number;
    message: string;
    suggestion?: string;
    systemPermission?: boolean;
  };
}

const LocationPermissionPopup: React.FC<LocationPermissionPopupProps> = ({
  isOpen,
  onClose,
  onGrantPermission,
  onSkip,
  error
}) => {
  if (!isOpen) return null;

  const openSystemSettings = async () => {
    try {
      await systemSettingsService.openSystemSettings('location');
    } catch (error) {
      console.error('Error opening system settings:', error);
    }
  };

  const getErrorInfo = (code: number) => {
    switch (code) {
      case 1:
        return {
          icon: <Shield className="h-5 w-5 text-red-500" />,
          title: 'إذن الموقع مطلوب',
          color: 'border-red-200 bg-red-50',
          action: 'افتح إعدادات النظام'
        };
      case 2:
        return {
          icon: <Wifi className="h-5 w-5 text-orange-500" />,
          title: 'الموقع غير متاح',
          color: 'border-orange-200 bg-orange-50',
          action: 'حاول مرة أخرى'
        };
      case 3:
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          title: 'انتهت مهلة الطلب',
          color: 'border-yellow-200 bg-yellow-50',
          action: 'حاول مرة أخرى'
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 text-gray-500" />,
          title: 'خطأ في الموقع',
          color: 'border-gray-200 bg-gray-50',
          action: 'حاول مرة أخرى'
        };
    }
  };

  const errorInfo = error ? getErrorInfo(error.code) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="relative pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                إذن الموقع مطلوب
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                نحتاج موقعك لتفعيل التطبيق
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Simple explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                موقعك مطلوب للأمان والتحقق من التفعيل. لن يتم مشاركته مع أي طرف ثالث.
              </p>
            </div>
          </div>

          {/* Error display - simplified */}
          {error && (
            <Alert className={errorInfo?.color}>
              <div className="flex items-start gap-2">
                {errorInfo?.icon}
                <div className="flex-1">
                  <AlertDescription className="font-medium text-gray-900 text-sm">
                    {errorInfo?.title}
                  </AlertDescription>
                  {error.suggestion && (
                    <p className="text-xs text-gray-600 mt-1">
                      {error.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Action buttons - simplified */}
          <div className="space-y-2">
            <Button 
              onClick={onGrantPermission}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              <MapPin className="h-4 w-4 mr-2" />
              منح إذن الموقع
            </Button>
            
            {error?.systemPermission && (
              <Button 
                variant="outline" 
                onClick={openSystemSettings}
                className="w-full"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                فتح إعدادات النظام
              </Button>
            )}
          </div>

          {/* Skip option - simplified */}
          <div className="text-center pt-2">
            <Button 
              variant="ghost" 
              onClick={onSkip}
              size="sm"
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              تخطي (قد يؤثر على التفعيل)
            </Button>
          </div>

          {/* Security note - simplified */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-xs text-green-700">
                موقعك محمي ومشفر. لن يتم مشاركته مع أي طرف ثالث.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPermissionPopup; 