import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Activity, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Trash2,
  Shield,
  ShieldOff
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useSettings } from '@/features/settings/useSettings';

interface ConnectedDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: string;
  status: string;
  created_at: string;
  last_connected: string;
  last_seen: string;
}

const ConnectedDevicesManager: React.FC = () => {
  const { settings } = useSettings();
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadConnectedDevices();
  }, []);

  const loadConnectedDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:39000/api/branch-config/devices/connected');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConnectedDevices(result.devices || []);
        } else {
          console.error('Failed to load connected devices:', result.error);
          toast.error(result.error || 'فشل في تحميل الأجهزة المتصلة');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load connected devices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في تحميل الأجهزة المتصلة: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDevices = async () => {
    setIsRefreshing(true);
    await loadConnectedDevices();
    setIsRefreshing(false);
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`http://localhost:39000/api/branch-config/devices/${deviceId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("تم فصل الجهاز بنجاح");
          await loadConnectedDevices(); // Refresh the list
        } else {
          toast.error(result.error || 'فشل في فصل الجهاز');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في فصل الجهاز: ${errorMessage}`);
    }
  };

  const blockDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`http://localhost:39000/api/branch-config/devices/${deviceId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'تم الحظر بواسطة الجهاز الرئيسي'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("تم حظر الجهاز بنجاح");
          await loadConnectedDevices(); // Refresh the list
        } else {
          toast.error(result.error || 'فشل في حظر الجهاز');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to block device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في حظر الجهاز: ${errorMessage}`);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:39000/api/branch-config/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success("تم حذف الجهاز بنجاح");
          await loadConnectedDevices(); // Refresh the list
        } else {
          toast.error(result.error || 'فشل في حذف الجهاز');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في حذف الجهاز: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          متصل
        </Badge>;
      case 'disconnected':
        return <Badge variant="secondary">
          غير متصل
        </Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          محظور
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              الأجهزة المتصلة
            </CardTitle>
            <CardDescription>
              الأجهزة الفرعية المتصلة بهذا الجهاز الرئيسي
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDevices}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {connectedDevices.length > 0 ? (
          <div className="space-y-4">
            {connectedDevices.map((device) => (
              <div key={device.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {device.status === 'connected' ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium">{device.name}</span>
                    </div>
                    {getStatusBadge(device.status)}
                  </div>
                  <div className="flex gap-2">
                    {device.status === 'connected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disconnectDevice(device.id)}
                      >
                        <WifiOff className="h-4 w-4 mr-1" />
                        فصل
                      </Button>
                    )}
                    {device.status !== 'blocked' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => blockDevice(device.id)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        حظر
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeDevice(device.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      حذف
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      عنوان IP:
                    </span>
                    <p className="font-mono">{device.ip_address}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      آخر اتصال:
                    </span>
                    <p>{new Date(device.last_connected).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      نوع الجهاز:
                    </span>
                    <p>{device.device_type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              لا توجد أجهزة متصلة حالياً
            </p>
            <p className="text-sm">
              الأجهزة الفرعية ستظهر هنا عند الاتصال
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectedDevicesManager; 