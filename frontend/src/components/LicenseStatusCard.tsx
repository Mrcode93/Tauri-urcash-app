import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useLicense } from '@/contexts/LicenseContext';
import { licenseService } from '@/services/licenseService';
import { toast } from '@/lib/toast';

import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Server, 
  Smartphone,
  Download,
  RefreshCw,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface DeviceInfo {
  device_id: string;
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  primary_ip: string;
  cpu_count: number;
  cpu_model: string;
  total_memory: number;
  node_version: string;
  app_version: string;
  timestamp: string;
}

const LicenseStatusCard: React.FC = () => {
  const { 
    isActivated, 
    isLoading, 
    licenseData, 
    error, 
    needsFirstActivation,
    checkLicenseStatus,
    performFirstActivation,
    activateWithCode,
    verifyLicense
  } = useLicense();
  
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);

  // Load device info on component mount
  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const result = await licenseService.getDeviceInfo();
        if (result.success && result.device_info) {
          setDeviceInfo(result.device_info);
        }
      } catch (error) {
        console.error('Failed to load device info:', error);
      }
    };
    
    loadDeviceInfo();
  }, []);

  const handleFirstActivation = async () => {
    setIsActivating(true);
    try {
      const success = await performFirstActivation();
      if (success) {
        toast.success('تم تفعيل الترخيص بنجاح!');
        setShowActivationForm(false);
      }
    } catch (error) {
      toast.error('فشل في تفعيل الترخيص');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCodeActivation = async () => {
    if (!activationCode.trim()) {
      toast.error('يرجى إدخال كود التفعيل');
      return;
    }

    setIsActivating(true);
    try {
      const success = await activateWithCode(activationCode.trim());
      if (success) {
        toast.success('تم تفعيل الاشتراك المميز بنجاح!');
        setShowActivationForm(false);
        setActivationCode('');
      }
    } catch (error) {
      toast.error('فشل في تفعيل الكود');
    } finally {
      setIsActivating(false);
    }
  };

  const handleVerifyLicense = async () => {
    try {
      const success = await verifyLicense(true);
      if (success) {
        toast.success('تم التحقق من صحة الترخيص بنجاح!');
      }
    } catch (error) {
      toast.error('فشل في التحقق من الترخيص');
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (isActivated) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (isActivated) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (isLoading) return 'جاري التحقق...';
    if (error) return 'خطأ في الترخيص';
    if (isActivated) return 'مفعل';
    if (needsFirstActivation) return 'يحتاج تفعيل أولي';
    return 'غير مفعل';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">جاري التحقق من حالة الترخيص...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>License Status</CardTitle>
                <CardDescription>حالة ترخيص النظام</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVerification(!showVerification)}
              >
                {showVerification ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showVerification ? 'Hide Verification' : 'Show Verification'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={checkLicenseStatus}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <Badge variant={getStatusColor()} className="text-sm">
                {getStatusText()}
              </Badge>
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* License Information */}
          {isActivated && licenseData && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-sm">
                    {licenseService.getLicenseTypeDisplayName(licenseData.type)}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Expires:</span>
                  <p className="text-sm">
                    {licenseService.getExpiryInfo(licenseData)}
                  </p>
                </div>
              </div>

              {/* Features */}
              {licenseData.features && licenseData.features.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Features:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {licenseData.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {licenseService.getFeatureDisplayName(feature)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Activation Actions */}
          {!isActivated && (
            <div className="space-y-3">
              {needsFirstActivation ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    النظام يحتاج إلى التفعيل الأولي للحصول على ترخيص تجريبي مجاني.
                  </p>
                  <Button 
                    onClick={handleFirstActivation}
                    disabled={isActivating}
                    className="w-full"
                  >
                    {isActivating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                    تفعيل أولي (ترخيص تجريبي)
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    يمكنك تفعيل النظام باستخدام كود التفعيل أو الحصول على ترخيص تجريبي.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowActivationForm(!showActivationForm)}
                      className="flex-1"
                    >
                      كود التفعيل
                    </Button>
                    <Button 
                      onClick={handleFirstActivation}
                      disabled={isActivating}
                      className="flex-1"
                    >
                      ترخيص تجريبي
                    </Button>
                  </div>
                </div>
              )}

              {/* Activation Code Form */}
              {showActivationForm && (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                  <h4 className="font-medium">تفعيل بكود التفعيل</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="أدخل كود التفعيل (مثال: XXXX-XXXX-XXXX)"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-mono uppercase"
                      disabled={isActivating}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCodeActivation}
                        disabled={isActivating || !activationCode.trim()}
                        className="flex-1"
                      >
                        {isActivating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                        تفعيل
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowActivationForm(false);
                          setActivationCode('');
                        }}
                        disabled={isActivating}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Actions for Activated Licenses */}
          {isActivated && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyLicense}
              >
                <Shield className="h-4 w-4 mr-2" />
                Verify License
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeviceInfo(!showDeviceInfo)}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Device Info
              </Button>
            </div>
          )}

          {/* Device Information */}
          {showDeviceInfo && deviceInfo && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Device ID:</span>
                  <span className="font-mono text-xs">{deviceInfo.device_id.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform:</span>
                  <span>{deviceInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Architecture:</span>
                  <span>{deviceInfo.arch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hostname:</span>
                  <span>{deviceInfo.hostname}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default LicenseStatusCard;
