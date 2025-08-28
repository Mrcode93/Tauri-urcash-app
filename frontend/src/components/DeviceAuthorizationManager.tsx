import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  AlertTriangle,
  Loader2, 
  RefreshCw,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useSettings } from '@/features/settings/useSettings';

interface PendingDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: string;
  requested_at: string;
  status: string;
  request_source: string;
  additional_info: Record<string, any>;
}

interface AuthorizedDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string;
  device_type: string;
  authorized_at: string;
  authorized_by: string;
  status: string;
  permissions: string[];
  max_cash_limit: number;
}

const DeviceAuthorizationManager: React.FC = () => {
  const { settings } = useSettings();
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [authorizedDevices, setAuthorizedDevices] = useState<AuthorizedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingDevice, setProcessingDevice] = useState<string | null>(null);

  useEffect(() => {
    loadDeviceData();
  }, []);

  const loadDeviceData = async () => {
    try {
      setIsLoading(true);
      
      // Load pending devices
      const pendingResponse = await fetch('http://localhost:39000/api/branch-config/pending-authorizations');
      const pendingResult = await pendingResponse.json();
      
      if (pendingResult.success) {
        setPendingDevices(pendingResult.pending_devices || []);
      } else {
        console.error('Failed to load pending devices:', pendingResult.error);
      }

      // Load authorized devices
      const authorizedResponse = await fetch('http://localhost:39000/api/branch-config/authorized-devices');
      const authorizedResult = await authorizedResponse.json();
      
      if (authorizedResult.success) {
        setAuthorizedDevices(authorizedResult.authorized_devices || []);
      } else {
        console.error('Failed to load authorized devices:', authorizedResult.error);
      }
    } catch (error) {
      console.error('Failed to load device data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في تحميل بيانات الأجهزة: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadDeviceData();
    setIsRefreshing(false);
  };

  const approveDevice = async (pendingId: string) => {
    try {
      setProcessingDevice(pendingId);
      
      const response = await fetch(`http://localhost:39000/api/branch-config/approve-authorization/${pendingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(settings.system.language === 'ar' 
            ? 'تم السماح للجهاز بنجاح' 
            : 'Device approved successfully');
          await loadDeviceData(); // Refresh the data
        } else {
          toast.error(result.error || 'فشل في السماح للجهاز');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to approve device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في السماح للجهاز: ${errorMessage}`);
    } finally {
      setProcessingDevice(null);
    }
  };

  const rejectDevice = async (pendingId: string, reason: string = '') => {
    try {
      setProcessingDevice(pendingId);
      
      const response = await fetch(`http://localhost:39000/api/branch-config/reject-authorization/${pendingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(settings.system.language === 'ar' 
            ? 'تم رفض الجهاز بنجاح' 
            : 'Device rejected successfully');
          await loadDeviceData(); // Refresh the data
        } else {
          toast.error(result.error || 'فشل في رفض الجهاز');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to reject device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`فشل في رفض الجهاز: ${errorMessage}`);
    } finally {
      setProcessingDevice(null);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعة`;
    return `${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة صلاحيات الأجهزة</h2>
          <p className="text-muted-foreground">
            إدارة طلبات الاتصال من الأجهزة الجديدة والتحكم في الصلاحيات
          </p>
        </div>
        <Button onClick={refreshData} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Pending Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            طلبات في انتظار الموافقة
            <Badge variant="secondary">{pendingDevices.length}</Badge>
          </CardTitle>
          <CardDescription>
            الأجهزة الجديدة التي تنتظر موافقة المدير للاتصال
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDevices.length > 0 ? (
            <div className="space-y-4">
              {pendingDevices.map((device) => (
                <div key={device.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          طلب منذ {formatTimeAgo(device.requested_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveDevice(device.id)}
                        disabled={processingDevice === device.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingDevice === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="mr-1">سماح</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectDevice(device.id)}
                        disabled={processingDevice === device.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {processingDevice === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="mr-1">رفض</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">عنوان IP:</span>
                      <p className="font-mono">{device.ip_address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">نوع الجهاز:</span>
                      <p>{device.device_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">MAC Address:</span>
                      <p className="font-mono text-xs">{device.mac_address || 'غير متوفر'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">مصدر الطلب:</span>
                      <p>{device.request_source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات في انتظار الموافقة</p>
              <p className="text-sm">الأجهزة الجديدة ستظهر هنا عند محاولة الاتصال</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorized Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            الأجهزة المصرح لها
            <Badge variant="secondary">{authorizedDevices.length}</Badge>
          </CardTitle>
          <CardDescription>
            قائمة الأجهزة التي تم السماح لها بالاتصال
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authorizedDevices.length > 0 ? (
            <div className="space-y-4">
              {authorizedDevices.map((device) => (
                <div key={device.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                      <div>
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          مصرح منذ {formatTimeAgo(device.authorized_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      مصرح
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">عنوان IP:</span>
                      <p className="font-mono">{device.ip_address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">نوع الجهاز:</span>
                      <p>{device.device_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الصلاحيات:</span>
                      <p className="text-xs">{device.permissions?.join(', ') || 'لا توجد'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الحد الأقصى للنقد:</span>
                      <p>${device.max_cash_limit?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد أجهزة مصرح لها</p>
              <p className="text-sm">الأجهزة المصرح لها ستظهر هنا</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceAuthorizationManager; 