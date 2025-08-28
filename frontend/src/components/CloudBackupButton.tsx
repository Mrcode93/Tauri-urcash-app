import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Cloud, Download, Info } from 'lucide-react';
import { toast } from "@/lib/toast";
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface CloudBackupButtonProps {
  className?: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup: string | null;
}

export function CloudBackupButton({ className }: CloudBackupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [description, setDescription] = useState('');
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const handleCloudBackup = async () => {
    try {
      setIsLoading(true);
      
      const response = await api.post('/cloud-backup/create', {
        backupName: backupName || undefined,
        description: description || undefined
      });

      if (response.data.success) {
        toast.success('تم إنشاء النسخة الاحتياطية السحابية بنجاح');
        setIsDialogOpen(false);
        setBackupName('');
        setDescription('');
        // Refresh stats
        loadBackupStats();
      } else {
        toast.error(response.data.message || 'فشل في إنشاء النسخة الاحتياطية السحابية');
      }
    } catch (error: unknown) {
      console.error('Cloud backup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء النسخة الاحتياطية السحابية';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBackupStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await api.get('/cloud-backup/stats');
      if (response.data.success) {
        setBackupStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading backup stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setIsDialogOpen(true);
            loadBackupStats();
          }}
          className={className}
          variant="outline"
        >
          <Cloud className="ml-2 h-4 w-4" />
          النسخ الاحتياطي السحابي
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء نسخة احتياطية سحابية</DialogTitle>
          <DialogDescription>
            إرسال النسخة الاحتياطية لقاعدة البيانات إلى الخادم البعيد للحفظ الآمن.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Backup Statistics */}
          {backupStats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">إحصائيات النسخ الاحتياطية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">إجمالي النسخ الاحتياطية:</span>
                  <Badge variant="secondary">{backupStats.totalBackups}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">الحجم الإجمالي:</span>
                  <span className="text-sm font-medium">{formatFileSize(backupStats.totalSize)}</span>
                </div>
                {backupStats.lastBackup && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">آخر نسخة احتياطية:</span>
                    <span className="text-sm font-medium">{formatDate(backupStats.lastBackup)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Backup Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="backupName">اسم النسخة الاحتياطية (اختياري)</Label>
              <Input
                id="backupName"
                placeholder="مثال: النسخة الاحتياطية الشهرية - ديسمبر 2024"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                placeholder="صف محتويات هذه النسخة الاحتياطية..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2 space-x-reverse">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">ما الذي سيتم نسخه احتياطياً؟</p>
                    <p className="text-blue-700 mt-1">
                      ستتم مزامنة قاعدة البيانات بالكامل بما في ذلك جميع المبيعات والمخزون والعملاء والإعدادات بأمان إلى خادمنا البعيد.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCloudBackup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري إنشاء النسخة الاحتياطية...
                </>
              ) : (
                <>
                  <Cloud className="ml-2 h-4 w-4" />
                  إنشاء نسخة احتياطية سحابية
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 