import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Cloud, Download, Trash2, RefreshCw, Calendar, HardDrive, RotateCcw } from 'lucide-react';
import { toast } from "@/lib/toast";
import api from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface CloudBackupsListProps {
  className?: string;
}

interface Backup {
  _id: string;
  backupName: string;
  description?: string;
  size: number;
  uploadedAt: string;
  createdAt: string;
  user: string;
  device_id: string;
  filename: string;
  originalName: string;
  fileType: string;
  downloadUrl?: string;
}

export function CloudBackupsList({ className }: CloudBackupsListProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [restoringBackups, setRestoringBackups] = useState<Set<string>>(new Set());

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/cloud-backup/user');
      
      if (response.data.success) {
        // Fix: Access the backups array correctly from the response structure
        // The actual backups are nested in response.data.data.data
        const backupsData = response.data.data?.data || [];
        setBackups(backupsData);
      } else {
        toast.error(response.data.message || 'فشل في تحميل النسخ الاحتياطية');
      }
    } catch (error: unknown) {
      console.error('Error loading backups:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحميل النسخ الاحتياطية';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBackups = async () => {
    try {
      setIsRefreshing(true);
      await loadBackups();
      toast.success('تم تحديث النسخ الاحتياطية بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث النسخ الاحتياطية');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      // Note: This would require implementing a delete endpoint on the remote server
      toast.error('وظيفة الحذف غير مفعلة بعد على الخادم البعيد');
    } catch (error: unknown) {
      console.error('Error deleting backup:', error);
      toast.error('فشل في حذف النسخة الاحتياطية');
    }
  };

  const handleRestoreBackup = async (backupId: string, backupName?: string) => {
    // Prevent multiple restores of the same backup
    if (restoringBackups.has(backupId)) {
      toast.warning('الاستعادة قيد التنفيذ بالفعل');
      return;
    }

    try {
      // Add backup to restoring set
      setRestoringBackups(prev => new Set(prev).add(backupId));
      toast.info('بدء استعادة النسخة الاحتياطية...');
      
      // Use the new restore endpoint that handles everything server-side
      const response = await api.post(`/cloud-backup/restore/${backupId}`);

      if (response.data.success) {
        toast.success('تم استعادة النسخة الاحتياطية بنجاح!');
        toast.info('قاعدة البيانات جاهزة للاستخدام الآن');
        
        // Optionally refresh the page to reload with the restored database
        setTimeout(() => {
          if (window.confirm('هل تريد إعادة تحميل الصفحة لتطبيق التغييرات؟')) {
            window.location.reload();
          }
        }, 2000);
      } else {
        throw new Error(response.data.message || 'فشل في استعادة النسخة الاحتياطية');
      }
      
    } catch (error: unknown) {
      console.error('Error restoring backup:', error);
      
      if (error instanceof Error && error.message.includes('404')) {
        toast.error('النسخة الاحتياطية غير موجودة أو تم حذفها');
      } else if (error instanceof Error && error.message.includes('Network')) {
        toast.error('فشل الاتصال بالخادم. تحقق من الاتصال بالإنترنت');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'فشل في استعادة النسخة الاحتياطية';
        toast.error(errorMessage);
      }
    } finally {
      // Remove backup from restoring set
      setRestoringBackups(prev => {
        const newSet = new Set(prev);
        newSet.delete(backupId);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
    if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
    return `منذ ${Math.floor(diffInSeconds / 2592000)} شهر`;
  };

  useEffect(() => {
    loadBackups();
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              النسخ الاحتياطية السحابية
            </CardTitle>
            <CardDescription>
              استعادة وإدارة نسخ قاعدة البيانات الاحتياطية المخزنة على الخادم البعيد
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBackups}
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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">جاري تحميل النسخ الاحتياطية...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد نسخ احتياطية سحابية</p>
            <p className="text-sm">أنشئ أول نسخة احتياطية للبدء</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{backups.length}</div>
                <div className="text-sm text-muted-foreground">إجمالي النسخ</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))}
                </div>
                <div className="text-sm text-muted-foreground">الحجم الإجمالي</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {backups.length > 0 ? getRelativeTime(backups[0].uploadedAt) : 'غير متاح'}
                </div>
                <div className="text-sm text-muted-foreground">آخر نسخة احتياطية</div>
              </div>
            </div>

            {/* Backups Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{backup.backupName || 'نسخة احتياطية بدون اسم'}</div>
                        {backup.description && (
                          <div className="text-sm text-muted-foreground">{backup.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(backup.size)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span title={formatDate(backup.uploadedAt)}>
                          {getRelativeTime(backup.uploadedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {restoringBackups.has(backup._id) ? (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          جاري الاستعادة
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Cloud className="h-3 w-3" />
                          متاح للاستعادة
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={restoringBackups.has(backup._id)}
                              title={restoringBackups.has(backup._id) ? "جاري الاستعادة..." : "استعادة النسخة الاحتياطية"}
                              className="gap-1"
                            >
                              {restoringBackups.has(backup._id) ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-xs">جاري الاستعادة</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3 w-3" />
                                  <span className="text-xs">استعادة</span>
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>استعادة النسخة الاحتياطية</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال قاعدة البيانات الحالية بالكامل.
                                <br /><br />
                                <strong>تحذير:</strong> لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestoreBackup(backup._id, backup.backupName)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                استعادة النسخة الاحتياطية
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="text-xs">حذف</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف النسخة الاحتياطية</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBackup(backup._id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">ℹ</span>
                  </div>
                </div>
                <div className="text-sm text-blue-800">
                  <h4 className="font-medium mb-2">كيفية استخدام النسخ الاحتياطية السحابية:</h4>
                  <ul className="space-y-1 text-blue-700">
                    <li className="flex items-center gap-2">
                      <RotateCcw className="w-3 h-3" />
                      <span><strong>استعادة:</strong> تستبدل قاعدة البيانات الحالية بالنسخة المختارة فوراً</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      <span><strong>حذف:</strong> يحذف النسخة الاحتياطية من الخادم البعيد نهائياً</span>
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-600">
                    ⚠️ عملية الاستعادة لا يمكن التراجع عنها. تأكد من إنشاء نسخة احتياطية حالية قبل الاستعادة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 