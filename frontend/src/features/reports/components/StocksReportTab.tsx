import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign,
  BarChart3,
  Activity,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useReactToPrint } from "react-to-print";
import reportsService, { 
  StocksReport, 
  ExpiryAlert, 
  LowStockAlert, 
  TopSellingProduct,
  StockMovement,
  StockValueByCategory,
  RecentStockActivity
} from '../reportsService';
import { toast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { useSettings } from '@/features/settings/useSettings';
import { getLogoUrlSafe } from '@/utils/logoUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, FileSpreadsheet } from 'lucide-react';
import '@/styles/print.css';

interface StocksReportTabProps {
  dateRange?: { start: string; end: string };
}

export const StocksReportTab: React.FC<StocksReportTabProps> = ({ dateRange }) => {
  const [stocksReport, setStocksReport] = useState<StocksReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(dateRange || null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Get settings for logo
  const { settings } = useSettings();

  // Print functionality
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handlePrintClick = () => {
    setShowDatePicker(false);
    handlePrint();
    toast.success('تم طباعة التقرير بنجاح');
  };

  useEffect(() => {
    loadStocksReport();
  }, [selectedDateRange, currentPage, pageSize]);

  const loadStocksReport = async () => {
    try {
      setLoading(true);
      const report = await reportsService.getStocksReport(selectedDateRange, currentPage, pageSize);
      setStocksReport(report);
    } catch (error) {
      console.error('Error loading stocks report:', error);
      toast.error('حدث خطأ أثناء تحميل تقرير المخزون');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setSelectedDateRange({ start, end });
    setCurrentPage(1); // Reset to first page when changing date range
    setShowDatePicker(false);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!stocksReport) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    setExporting(true);
    try {
      const exportData = {
        title: 'تقرير المخزون الشامل',
        description: `تقرير شامل للمخزون من ${selectedDateRange?.start ? formatDate(selectedDateRange.start) : 'البداية'} إلى ${selectedDateRange?.end ? formatDate(selectedDateRange.end) : 'النهاية'}`,
        dateRange: selectedDateRange,
        sections: [
          {
            title: 'ملخص المخزون',
            type: 'summary' as const,
            data: {
              'إجمالي المنتجات': stocksReport.summary.total_products,
              'إجمالي الكمية': stocksReport.summary.total_quantity,
              'إجمالي القيمة': `${stocksReport.summary.total_value} IQD`,
              'المنتجات نفذت': stocksReport.summary.out_of_stock_count,
              'المنتجات منخفضة المخزون': stocksReport.summary.low_stock_count,
              'المنتجات جيدة المخزون': stocksReport.summary.good_stock_count,
              'متوسط المخزون لكل منتج': stocksReport.summary.average_stock_per_product.toFixed(1)
            }
          },
          {
            title: 'تنبيهات انتهاء الصلاحية',
            type: 'table' as const,
            data: stocksReport.expiry_alerts.map(alert => ({
              'اسم المنتج': alert.product_name,
              'رمز المنتج': alert.product_sku,
              'المخزون الحالي': alert.current_stock,
              'تاريخ الانتهاء': alert.expiry_date,
              'الأيام المتبقية': alert.days_until_expiry,
              'التصنيف': alert.category_name,
              'الحالة': alert.expiry_status_text,
              'قيمة المخزون': `${alert.stock_value} IQD`
            }))
          },
          {
            title: 'تنبيهات المخزون المنخفض',
            type: 'table' as const,
            data: stocksReport.low_stock_alerts.map(alert => ({
              'اسم المنتج': alert.product_name,
              'رمز المنتج': alert.product_sku,
              'المخزون الحالي': alert.current_stock,
              'الحد الأدنى': alert.min_stock_level,
              'التصنيف': alert.category_name,
              'الحالة': alert.stock_status_text,
              'قيمة المخزون': `${alert.stock_value} IQD`
            }))
          },
          {
            title: 'المنتجات الأكثر مبيعاً',
            type: 'table' as const,
            data: stocksReport.top_selling_products.map(product => ({
              'اسم المنتج': product.product_name,
              'رمز المنتج': product.product_sku,
              'المخزون الحالي': product.current_stock,
              'الكمية المباعة': product.total_sold_quantity,
              'قيمة المبيعات': `${product.total_sold_value} IQD`,
              'الربح': `${product.total_profit} IQD`,
              'عدد المبيعات': product.sales_count,
              'متوسط الكمية': product.average_quantity_per_sale.toFixed(1)
            }))
          },
          {
            title: 'تحليل حركة المخزون',
            type: 'table' as const,
            data: stocksReport.stock_movements.map(movement => ({
              'اسم المنتج': movement.product_name,
              'رمز المنتج': movement.product_sku,
              'المخزون الحالي': movement.current_stock,
              'إجمالي المشتريات': movement.total_purchased,
              'إجمالي المبيعات': movement.total_sold,
              'إجمالي المرتجعات': movement.total_returned,
              'إجمالي التعديلات': movement.total_adjusted
            }))
          },
          {
            title: 'قيمة المخزون حسب التصنيف',
            type: 'table' as const,
            data: stocksReport.stock_value_by_category.map(category => ({
              'التصنيف': category.category_name,
              'عدد المنتجات': category.products_count,
              'إجمالي الكمية': category.total_quantity,
              'قيمة المخزون': `${category.total_value} IQD`,
              'متوسط المخزون لكل منتج': category.average_stock_per_product.toFixed(1)
            }))
          }
        ]
      };

              const filename = `stocks-report-${format}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'csv'}`;

      if (format === 'pdf') {
        const logoUrl = settings?.logo_url ? getLogoUrlSafe(settings.logo_url) : undefined;
        await exportToPDF(exportData, filename, logoUrl);
        toast.success('تم تصدير التقرير بصيغة PDF بنجاح');
      } else {
        await exportToExcel(exportData, filename);
        toast.success('تم تصدير التقرير بصيغة CSV بنجاح (يمكن فتحه في Excel)');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };



  const getExpiryStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring_soon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expiring_later': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'below_minimum': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'adequate': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExpiryStatusText = (status: string) => {
    switch (status) {
      case 'expired': return 'منتهي الصلاحية';
      case 'expiring_soon': return 'ينتهي قريباً';
      case 'expiring_later': return 'ينتهي لاحقاً';
      case 'safe': return 'آمن';
      case 'no_expiry': return 'بدون صلاحية';
      default: return 'غير محدد';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'نفذ المخزون';
      case 'below_minimum': return 'أقل من الحد الأدنى';
      case 'low_stock': return 'مخزون منخفض';
      case 'adequate': return 'مخزون كافي';
      default: return 'غير محدد';
    }
  };

  const getMovementTypeText = (type: string) => {
    switch (type) {
      case 'purchase': return 'شراء';
      case 'sale': return 'بيع';
      case 'return': return 'إرجاع';
      case 'adjustment': return 'تعديل';
      case 'transfer': return 'نقل';
      default: return type;
    }
  };

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'no_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'very_low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stocksReport) {
    return (
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">لا توجد بيانات متاحة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header with Date Range, Print, and Refresh */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">تقرير المخزون</h2>
          {selectedDateRange && (
            <Badge variant="secondary" className="text-sm">
              {formatDate(selectedDateRange.start)} - {formatDate(selectedDateRange.end)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <div className="relative">
            <Button 
              onClick={() => setShowDatePicker(!showDatePicker)} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <Filter className="w-4 h-4" />
              تحديد الفترة
            </Button>
            
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-white border rounded-lg shadow-lg z-50 min-w-80">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="start-date">من تاريخ</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={selectedDateRange?.start || ''}
                      onChange={(e) => {
                        const newRange = { 
                          start: e.target.value, 
                          end: selectedDateRange?.end || e.target.value 
                        };
                        setSelectedDateRange(newRange);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">إلى تاريخ</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={selectedDateRange?.end || ''}
                      onChange={(e) => {
                        const newRange = { 
                          start: selectedDateRange?.start || e.target.value, 
                          end: e.target.value 
                        };
                        setSelectedDateRange(newRange);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleDateRangeChange(selectedDateRange?.start || '', selectedDateRange?.end || '')}
                      size="sm"
                      className="flex-1"
                    >
                      تطبيق
                    </Button>
                    <Button 
                      onClick={() => setShowDatePicker(false)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        const today = new Date();
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        handleDateRangeChange(
                          weekAgo.toISOString().split('T')[0],
                          today.toISOString().split('T')[0]
                        );
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      آخر أسبوع
                    </Button>
                    <Button 
                      onClick={() => {
                        const today = new Date();
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        handleDateRangeChange(
                          monthAgo.toISOString().split('T')[0],
                          today.toISOString().split('T')[0]
                        );
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      آخر شهر
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

         

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 ml-2" />
                    تصدير
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')} disabled={exporting}>
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                تصدير CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={exporting}>
                <FileText className="w-4 h-4 ml-2" />
                تصدير PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
        <Button onClick={loadStocksReport} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
        </div>
      </div>

      {/* Print Content */}
      <div ref={printRef} className="print-content">
        {/* Print Header */}
        <div className="hidden print:block print-header mb-6">
          <div className="text-center">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-800 mb-3">تقرير المخزون الشامل</h1>
              <div className="w-24 h-1 bg-blue-600 mx-auto mb-4"></div>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="text-right">
                <p className="font-semibold text-gray-700 mb-1">الفترة الزمنية:</p>
                <p className="text-gray-600">
                  {selectedDateRange ? 
                    `من ${formatDate(selectedDateRange.start)} إلى ${formatDate(selectedDateRange.end)}` : 
                    'جميع البيانات'
                  }
                </p>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-700 mb-1">تاريخ الطباعة:</p>
                <p className="text-gray-600">{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="print-section mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">ملخص المخزون</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-summary-grid">
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي المنتجات</p>
                    <p className="text-2xl font-bold text-gray-800">{stocksReport.summary.total_products}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
          </CardContent>
        </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي الكمية</p>
                    <p className="text-2xl font-bold text-gray-800">{stocksReport.summary.total_quantity}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
          </CardContent>
        </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي القيمة</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(stocksReport.summary.total_value)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">متوسط المخزون</p>
                    <p className="text-2xl font-bold text-gray-800">{stocksReport.summary.average_stock_per_product.toFixed(1)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stock Status Summary */}
        <div className="print-section mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">حالة المخزون</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-summary-grid">
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">نفذ المخزون</p>
                    <p className="text-2xl font-bold text-red-600">{stocksReport.summary.out_of_stock_count}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
          </CardContent>
        </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">مخزون منخفض</p>
                    <p className="text-2xl font-bold text-orange-600">{stocksReport.summary.low_stock_count}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">مخزون جيد</p>
                    <p className="text-2xl font-bold text-green-600">{stocksReport.summary.good_stock_count}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="print-summary-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي القيمة</p>
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(stocksReport.summary.total_value)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Expiry Alerts Section */}
        {stocksReport.expiry_alerts.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">تنبيهات انتهاء الصلاحية</h2>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>الأيام المتبقية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocksReport.expiry_alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.product_name}</TableCell>
                    <TableCell>{alert.current_stock}</TableCell>
                    <TableCell>{formatDate(alert.expiry_date)}</TableCell>
                    <TableCell>{alert.days_until_expiry}</TableCell>
                    <TableCell>
                      <Badge className={getExpiryStatusColor(alert.expiry_status)}>
                        {getExpiryStatusText(alert.expiry_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(alert.stock_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      

        {/* Top Selling Products Section */}
        {stocksReport.top_selling_products.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">المنتجات الأكثر مبيعاً</h2>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>المخزون الحالي</TableHead>
                  <TableHead>الكمية المباعة</TableHead>
                  <TableHead>قيمة المبيعات</TableHead>
                  <TableHead>الربح</TableHead>
                  <TableHead>عدد المبيعات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocksReport.top_selling_products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.current_stock}</TableCell>
                    <TableCell>{product.total_sold_quantity}</TableCell>
                    <TableCell>{formatCurrency(product.total_sold_value)}</TableCell>
                    <TableCell>{formatCurrency(product.total_profit)}</TableCell>
                    <TableCell>{product.sales_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Inventory Aging Section */}
       

        {/* Stock Value Analysis Section */}
        {stocksReport.stock_value_analysis && stocksReport.stock_value_analysis.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">تحليل قيمة المخزون حسب التصنيف</h2>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>عدد المنتجات</TableHead>
                  <TableHead>إجمالي الكمية</TableHead>
                  <TableHead>قيمة الشراء</TableHead>
                  <TableHead>قيمة البيع</TableHead>
                  <TableHead>الربح المحتمل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocksReport.stock_value_analysis.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.category_name}</TableCell>
                    <TableCell>{item.products_count}</TableCell>
                    <TableCell>{item.total_quantity}</TableCell>
                    <TableCell>{formatCurrency(item.total_purchase_value)}</TableCell>
                    <TableCell>{formatCurrency(item.total_selling_value)}</TableCell>
                    <TableCell>{formatCurrency(item.potential_profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Stock Movement Summary Section */}
        {stocksReport.stock_movement_summary && stocksReport.stock_movement_summary.length > 0 && (
          <div className="print-section mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 print-section-title">ملخص حركة المخزون</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-summary-grid">
              {stocksReport.stock_movement_summary.map((movement, index) => (
                <Card key={index} className="print-summary-card">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">{movement.movement_type_text}</p>
                      <p className="text-2xl font-bold text-gray-800">{movement.movement_count}</p>
                      <p className="text-xs text-gray-500">الكمية: {movement.total_quantity}</p>
                    </div>
          </CardContent>
        </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities Section */}
      
      </div>

      {/* Tabs for Different Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="summary">الملخص</TabsTrigger>
          <TabsTrigger value="expiry">تنبيهات الصلاحية</TabsTrigger>
          <TabsTrigger value="low-stock">مخزون منخفض</TabsTrigger>
          <TabsTrigger value="top-selling">الأكثر مبيعاً</TabsTrigger>
          <TabsTrigger value="movements">حركة المخزون</TabsTrigger>
          <TabsTrigger value="aging">تحليل المخزون</TabsTrigger>
          <TabsTrigger value="value-analysis">تحليل القيمة</TabsTrigger>
          <TabsTrigger value="activities">الأنشطة الأخيرة</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stock Value by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  قيمة المخزون حسب التصنيف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>المنتجات</TableHead>
                      <TableHead>القيمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocksReport.stock_value_by_category.map((category) => (
                      <TableRow key={category.category_name}>
                        <TableCell>{category.category_name}</TableCell>
                        <TableCell>{category.products_count}</TableCell>
                        <TableCell>{formatCurrency(category.total_value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Quick Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  التنبيهات السريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stocksReport.expiry_alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{alert.product_name}</p>
                      <p className="text-xs text-gray-500">{alert.product_sku}</p>
                    </div>
                    <Badge className={getExpiryStatusColor(alert.expiry_status)}>
                      {getExpiryStatusText(alert.expiry_status)}
                    </Badge>
                  </div>
                ))}
                {stocksReport.low_stock_alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{alert.product_name}</p>
                      <p className="text-xs text-gray-500">المخزون: {alert.current_stock}</p>
                    </div>
                    <Badge className={getStockStatusColor(alert.stock_status)}>
                      {getStockStatusText(alert.stock_status)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expiry Alerts Tab */}
        <TabsContent value="expiry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                تنبيهات انتهاء الصلاحية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>المخزون</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>الأيام المتبقية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.expiry_alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.product_name}</TableCell>
                      <TableCell>{alert.product_sku}</TableCell>
                      <TableCell>{alert.current_stock}</TableCell>
                      <TableCell>
                        {alert.expiry_date ? format(new Date(alert.expiry_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                      </TableCell>
                      <TableCell>
                        {alert.days_until_expiry !== null ? (
                          <span className={alert.days_until_expiry <= 0 ? 'text-red-600 font-bold' : ''}>
                            {alert.days_until_expiry <= 0 ? 'منتهي' : `${Math.floor(alert.days_until_expiry)} يوم`}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getExpiryStatusColor(alert.expiry_status)}>
                          {getExpiryStatusText(alert.expiry_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(alert.stock_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Alerts Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                تنبيهات المخزون المنخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    يتم عرض أول 100 منتج منخفض المخزون فقط لتحسين الأداء
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  إجمالي المنتجات منخفضة المخزون: {stocksReport.low_stock_alerts.length} منتج
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>المخزون الحالي</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                    <TableHead>سعر الشراء</TableHead>
                    <TableHead>سعر البيع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.low_stock_alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.product_name}</TableCell>
                      <TableCell>{alert.product_sku}</TableCell>
                      <TableCell>
                        <span className={alert.current_stock === 0 ? 'text-red-600 font-bold' : ''}>
                          {alert.current_stock}
                        </span>
                      </TableCell>
                      <TableCell>{alert.min_stock_level || '-'}</TableCell>
                      <TableCell>{formatCurrency(alert.purchase_price)}</TableCell>
                      <TableCell>{formatCurrency(alert.selling_price)}</TableCell>
                      <TableCell>
                        <Badge className={getStockStatusColor(alert.stock_status)}>
                          {getStockStatusText(alert.stock_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(alert.stock_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Selling Products Tab */}
        <TabsContent value="top-selling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                المنتجات الأكثر مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>المخزون الحالي</TableHead>
                    <TableHead>الكمية المباعة</TableHead>
                    <TableHead>قيمة المبيعات</TableHead>
                    <TableHead>الربح</TableHead>
                    <TableHead>عدد المبيعات</TableHead>
                    <TableHead>متوسط الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.top_selling_products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.product_sku}</TableCell>
                      <TableCell>{product.current_stock}</TableCell>
                      <TableCell className="font-bold">{product.total_sold_quantity}</TableCell>
                      <TableCell>{formatCurrency(product.total_sold_value)}</TableCell>
                      <TableCell className="text-green-600 font-bold">
                        {formatCurrency(product.total_profit)}
                      </TableCell>
                      <TableCell>{product.sales_count}</TableCell>
                      <TableCell>{product.average_quantity_per_sale.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                تحليل حركة المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>المخزون الحالي</TableHead>
                    <TableHead>إجمالي المشتريات</TableHead>
                    <TableHead>إجمالي المبيعات</TableHead>
                    <TableHead>إجمالي المرتجعات</TableHead>
                    <TableHead>التعديلات</TableHead>
                    <TableHead>عدد الحركات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.stock_movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.product_name}</TableCell>
                      <TableCell>{movement.product_sku}</TableCell>
                      <TableCell>{movement.current_stock}</TableCell>
                      <TableCell className="text-green-600">
                        <div className="flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          {movement.total_purchased}
                        </div>
                      </TableCell>
                      <TableCell className="text-red-600">
                        <div className="flex items-center gap-1">
                          <Minus className="w-3 h-3" />
                          {movement.total_sold}
                        </div>
                      </TableCell>
                      <TableCell className="text-blue-600">
                        <div className="flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          {movement.total_returned}
                        </div>
                      </TableCell>
                      <TableCell>{movement.total_adjusted}</TableCell>
                      <TableCell>
                        {movement.purchase_movements + movement.sale_movements + 
                         movement.return_movements + movement.adjustment_movements}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                الأنشطة الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>نوع الحركة</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.recent_activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell className="font-medium">{activity.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getMovementTypeText(activity.movement_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className={activity.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {activity.quantity > 0 ? '+' : ''}{activity.quantity}
                      </TableCell>
                      <TableCell>
                        {activity.reference_type && activity.reference_number ? 
                          `${activity.reference_type}: ${activity.reference_number}` : '-'}
                      </TableCell>
                      <TableCell>{activity.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Aging Analysis Tab */}
        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                تحليل المخزون حسب المستوى
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>المخزون الحالي</TableHead>
                    <TableHead>سعر الشراء</TableHead>
                    <TableHead>سعر البيع</TableHead>
                    <TableHead>قيمة المخزون</TableHead>
                    <TableHead>مستوى المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.inventory_aging?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_sku}</TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      <TableCell>
                        <span className={item.current_stock === 0 ? 'text-red-600 font-bold' : ''}>
                          {item.current_stock}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                      <TableCell>{formatCurrency(item.selling_price)}</TableCell>
                      <TableCell>{formatCurrency(item.stock_value)}</TableCell>
                      <TableCell>
                        <Badge className={getStockLevelColor(item.stock_level)}>
                          {item.stock_level_text}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Value Analysis Tab */}
        <TabsContent value="value-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                تحليل قيمة المخزون حسب الفئة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفئة</TableHead>
                    <TableHead>عدد المنتجات</TableHead>
                    <TableHead>إجمالي الكمية</TableHead>
                    <TableHead>قيمة الشراء</TableHead>
                    <TableHead>قيمة البيع</TableHead>
                    <TableHead>الربح المحتمل</TableHead>
                    <TableHead>متوسط المخزون</TableHead>
                    <TableHead>متوسط سعر الشراء</TableHead>
                    <TableHead>متوسط سعر البيع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.stock_value_analysis?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.category_name}</TableCell>
                      <TableCell>{item.products_count}</TableCell>
                      <TableCell>{item.total_quantity.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(item.total_purchase_value)}</TableCell>
                      <TableCell>{formatCurrency(item.total_selling_value)}</TableCell>
                      <TableCell className="text-green-600 font-bold">
                        {formatCurrency(item.potential_profit)}
                      </TableCell>
                      <TableCell>{item.average_stock_per_product.toFixed(1)}</TableCell>
                      <TableCell>{formatCurrency(item.average_purchase_price)}</TableCell>
                      <TableCell>{formatCurrency(item.average_selling_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Stock Movement Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                ملخص حركة المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stocksReport.stock_movement_summary?.map((item, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{item.movement_count}</div>
                    <div className="text-sm text-muted-foreground">{item.movement_type_text}</div>
                    <div className="text-xs text-gray-500">الكمية: {item.total_quantity}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activities Tab */}
        {/* <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                الأنشطة الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>نوع الحركة</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>المرجع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocksReport.recent_activities?.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{formatDate(activity.created_at)}</TableCell>
                      <TableCell className="font-medium">{activity.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {activity.movement_type_text}
                        </Badge>
                      </TableCell>
                      <TableCell>{activity.quantity}</TableCell>
                      <TableCell>{activity.category_name}</TableCell>
                      <TableCell>{activity.reference_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  );
};
