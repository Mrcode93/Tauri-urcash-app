import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText,
  Trash2,
  Edit,
  Download,
  Calendar,
  Package,
  TrendingUp,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';

interface SavedReportConfig {
  id: string;
  name: string;
  description: string;
  dateRange: { start: string; end: string } | null;
  sections: any[];
  reportType: 'stocks' | 'sales';
  createdAt: string;
  updatedAt: string;
}

interface SavedReportsManagerProps {
  onLoadReport: (config: SavedReportConfig) => void;
}

export const SavedReportsManager: React.FC<SavedReportsManagerProps> = ({ onLoadReport }) => {
  const [savedReports, setSavedReports] = useState<SavedReportConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = () => {
    try {
      const savedConfigs = JSON.parse(localStorage.getItem('customReportConfigs') || '[]');
      setSavedReports(savedConfigs);
    } catch (error) {
      console.error('Error loading saved reports:', error);
      toast.error('حدث خطأ أثناء تحميل التقارير المحفوظة');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = (reportId: string) => {
    try {
      const updatedReports = savedReports.filter(report => report.id !== reportId);
      localStorage.setItem('customReportConfigs', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);
      toast.success('تم حذف التقرير بنجاح');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('حدث خطأ أثناء حذف التقرير');
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'stocks':
        return <Package className="w-4 h-4" />;
      case 'sales':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getReportTypeText = (type: string) => {
    switch (type) {
      case 'stocks':
        return 'تقرير المخزون';
      case 'sales':
        return 'تقرير المبيعات';
      default:
        return 'تقرير مخصص';
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'stocks':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">جاري تحميل التقارير المحفوظة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير المحفوظة</h1>
          <p className="text-gray-600 mt-2">إدارة التقارير المخصصة المحفوظة</p>
        </div>
        <Button onClick={loadSavedReports} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          تحديث
        </Button>
      </div>

      {savedReports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد تقارير محفوظة</h3>
            <p className="text-gray-500">قم بإنشاء تقرير مخصص وحفظه لتظهر هنا</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getReportTypeIcon(report.reportType)}
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                  </div>
                  <Badge className={getReportTypeColor(report.reportType)}>
                    {getReportTypeText(report.reportType)}
                  </Badge>
                </div>
                {report.description && (
                  <p className="text-sm text-gray-600 mt-2">{report.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range */}
                {report.dateRange && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      من {formatDate(report.dateRange.start)} إلى {formatDate(report.dateRange.end)}
                    </span>
                  </div>
                )}

                {/* Sections Count */}
                <div className="text-sm text-gray-600">
                  عدد الأقسام: {report.sections.filter(s => s.enabled).length}
                </div>

                {/* Created Date */}
                <div className="text-xs text-gray-500">
                  تم الإنشاء: {format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => onLoadReport(report)}
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    تحميل
                  </Button>
                  <Button
                    onClick={() => deleteReport(report.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
