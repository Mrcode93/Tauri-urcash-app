import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Monitor, 
  Wifi, 
  Copy, 
  Check, 
  Loader2,
  Users,
  Activity,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useSettings } from '@/features/settings/useSettings';
import ConnectedDevicesManager from './ConnectedDevicesManager';

interface DeviceInfo {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: string;
  status: string;
  created_at: string;
  last_connected: string;
  last_seen: string;
  permissions: string[];
  cash_balance: number;
  max_cash_limit: number;
}

interface DeviceStats {
  total_devices: number;
  active_devices: number;
  connected_devices: number;
  total_cash: number;
}

const DeviceManagementTab: React.FC = () => {
  const { settings } = useSettings();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIp, setCopiedIp] = useState(false);

  // Load device information
  useEffect(() => {
    loadDeviceInfo();
    loadDeviceStats();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:39000/api/branch-config');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDeviceInfo(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to load device info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeviceStats = async () => {
    try {
      const response = await fetch('http://localhost:39000/api/branch-config/stats');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDeviceStats(result.stats);
        }
      }
    } catch (error) {
      console.error('Failed to load device stats:', error);
    }
  };

  const getLocalIpAddress = () => {
    return deviceInfo?.ip || '192.168.1.100';
  };

  const copyIpAddress = async () => {
    try {
      await navigator.clipboard.writeText(getLocalIpAddress());
      setCopiedIp(true);
      toast.success("تم نسخ عنوان IP بنجاح");
      setTimeout(() => setCopiedIp(false), 2000);
    } catch (error) {
      toast.error("فشل في نسخ عنوان IP");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            معلومات الجهاز الرئيسي
          </CardTitle>
          <CardDescription>
            معلومات الجهاز الرئيسي وإعدادات الشبكة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Status */}
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  الجهاز الرئيسي نشط
                </h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  الجهاز يعمل كجهاز رئيسي
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              نشط
            </Badge>
          </div>

          {/* IP Address Display */}
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200">
                  عنوان IP للجهاز الرئيسي
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  عنوان IP المحلي للجهاز
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-mono font-bold text-blue-800 dark:text-blue-200">
                  {getLocalIpAddress()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyIpAddress}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                >
                  {copiedIp ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm text-blue-700 dark:text-blue-300">
              <strong>معلومات الشبكة:</strong>
              <br />
              المنفذ: {deviceInfo?.port || 39000}
              <br />
              نوع الجهاز: جهاز رئيسي
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Statistics */}
      {deviceStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              إحصائيات الأجهزة
            </CardTitle>
            <CardDescription>
              نظرة عامة على حالة الأجهزة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {deviceStats.total_devices}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">
                  إجمالي الأجهزة
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {deviceStats.active_devices}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  الأجهزة النشطة
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {deviceStats.connected_devices}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-300">
                  الأجهزة المتصلة
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices Manager */}
      <ConnectedDevicesManager />

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            معلومات النظام
          </CardTitle>
          <CardDescription>
            تفاصيل النظام والإعدادات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  نوع الجهاز:
                </span>
                <span className="text-sm font-medium">جهاز رئيسي</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  حالة الاتصال:
                </span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  متصل
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  المنفذ:
                </span>
                <span className="text-sm font-medium">{deviceInfo?.port || 39000}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  عنوان IP:
                </span>
                <span className="text-sm font-mono font-medium">{getLocalIpAddress()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  وقت التشغيل:
                </span>
                <span className="text-sm font-medium">
                  متصل
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  الإصدار:
                </span>
                <span className="text-sm font-medium">1.0.0-beta</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceManagementTab;