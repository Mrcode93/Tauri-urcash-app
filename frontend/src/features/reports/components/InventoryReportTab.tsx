import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent,
  Filter,
  Eye,
  Target,
  Star,
  Warehouse,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import printInventoryUtils, { type InventoryReportData } from '@/utils/printInventoryUtils';
import { getInventoryReport } from '@/features/inventory/inventoryService';

interface InventoryReportTabProps {
  dateRange: {
    start: string;
    end: string;
  };
  handleDateRangeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export const InventoryReportTab: React.FC<InventoryReportTabProps> = ({
  dateRange,
  handleDateRangeChange,
}) => {
  const settings = useSelector((state: RootState) => state.settings.data);
  const [reportType, setReportType] = useState<'comprehensive' | 'stock-levels' | 'movements' | 'low-stock' | 'expiry'>('comprehensive');
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load inventory report data
  const loadInventoryReport = async () => {
    setIsLoading(true);
    try {
      const response = await getInventoryReport(dateRange.start, dateRange.end, reportType);
      setInventoryData(response);
    } catch (error) {
      console.error('Error loading inventory report:', error);
      toast.error('حدث خطأ أثناء تحميل تقرير المخزون');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadInventoryReport();
    }
  }, [dateRange, reportType]);

  // Handle export functions
  const handleExportInventory = async (type: 'pdf' | 'excel' | 'print') => {
    if (!inventoryData) {
      toast.error('لا توجد بيانات متاحة للتصدير');
      return;
    }

    setIsExporting(true);
    try {
      if (type === 'print') {
        await printInventoryUtils.printInventoryWithPreview(
          reportType,
          inventoryData,
          settings,
          dateRange,
          'a4',
          'تقرير المخزون الشامل',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم فتح معاينة الطباعة');
      } else if (type === 'pdf') {
        await printInventoryUtils.saveInventoryAsPDF(
          reportType,
          inventoryData,
          settings,
          dateRange,
          'تقرير المخزون الشامل',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم حفظ التقرير كـ PDF');
      } else if (type === 'excel') {
        printInventoryUtils.exportInventoryToExcel(
          reportType,
          inventoryData,
          dateRange,
          'تقرير المخزون الشامل'
        );
        toast.success('تم تصدير التقرير إلى Excel');
      }
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  // Enhanced metrics cards
  const InventoryMetricsCards = () => {
    if (!inventoryData) return null;

    const summary = inventoryData.summary;
    const metrics = [
      {
        title: 'إجمالي المنتجات',
        value: summary.total_products,
        icon: Package,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: '+5%',
        trendUp: true
      },
      {
        title: 'قيمة المخزون',
        value: formatCurrency(summary.total_stock_value),
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        trend: '+12%',
        trendUp: true
      },
      {
        title: 'منخفضة المخزون',
        value: summary.low_stock_products,
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        trend: '-3%',
        trendUp: false
      },
      {
        title: 'نفذت من المخزون',
        value: summary.out_of_stock_products,
        icon: Clock,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        trend: '-8%',
        trendUp: false
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {metric.value}
                  </p>
                  <div className="flex items-center gap-1">
                    {metric.trendUp ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      metric.trendUp ? "text-green-600" : "text-red-600"
                    )}>
                      {metric.trend}
                    </span>
                  </div>
                </div>
                <div className={cn("p-3 rounded-full", metric.bgColor)}>
                  <metric.icon className={cn("h-6 w-6", metric.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Stock levels overview
  const StockLevelsOverview = () => {
    if (!inventoryData) return null;

    const inventory = inventoryData.current_inventory;
    const normalStock = inventory.filter(p => p.current_stock > p.min_stock);
    const lowStock = inventory.filter(p => p.current_stock <= p.min_stock && p.current_stock > 0);
    const outOfStock = inventory.filter(p => p.current_stock === 0);

    const levels = [
      {
        title: 'مخزون طبيعي',
        count: normalStock.length,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: CheckCircle
      },
      {
        title: 'منخفضة المخزون',
        count: lowStock.length,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        icon: AlertTriangle
      },
      {
        title: 'نفذت من المخزون',
        count: outOfStock.length,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: Clock
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {levels.map((level, index) => (
          <Card key={index} className="text-center">
            <CardContent className="p-6">
              <div className={cn("w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center", level.bgColor)}>
                <level.icon className={cn("h-6 w-6", level.color)} />
              </div>
              <h3 className="text-lg font-bold mb-2">{level.title}</h3>
              <p className={cn("text-3xl font-bold", level.color)}>{level.count}</p>
              <p className="text-sm text-muted-foreground mt-1">منتج</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Low stock products table
  const LowStockProductsTable = () => {
    if (!inventoryData) return null;

    const lowStockProducts = inventoryData.current_inventory.filter(
      p => p.current_stock <= p.min_stock && p.current_stock > 0
    );

    if (lowStockProducts.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات منخفضة المخزون</h3>
            <p className="text-gray-500">جميع المنتجات لديها مخزون كافي</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            المنتجات منخفضة المخزون
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {lowStockProducts.length} منتج
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-center">الكود</TableHead>
                  <TableHead className="text-center">الكمية الحالية</TableHead>
                  <TableHead className="text-center">الحد الأدنى</TableHead>
                  <TableHead className="text-center">سعر الشراء</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-center">{product.sku}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        {product.current_stock} {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{product.min_stock} {product.unit}</TableCell>
                    <TableCell className="text-center">{formatCurrency(product.purchase_price)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="bg-amber-100 text-amber-800">
                        تحتاج طلب
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Inventory movements summary
  const InventoryMovementsSummary = () => {
    if (!inventoryData) return null;

    const summary = inventoryData.summary;
    const movements = [
      {
        title: 'المشتريات',
        count: summary.purchases_count,
        icon: ShoppingCart,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'المبيعات',
        count: summary.sales_count,
        icon: TrendingDown,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      {
        title: 'التعديلات',
        count: summary.adjustments_count,
        icon: BarChart3,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'المرتجعات',
        count: summary.returns_count,
        icon: ArrowUpRight,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ملخص حركة المخزون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {movements.map((movement, index) => (
              <div key={index} className="text-center">
                <div className={cn("w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center", movement.bgColor)}>
                  <movement.icon className={cn("h-5 w-5", movement.color)} />
                </div>
                <p className="text-sm text-muted-foreground">{movement.title}</p>
                <p className={cn("text-xl font-bold", movement.color)}>{movement.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Warehouse className="h-6 w-6 text-primary" />
                تقرير المخزون الشامل
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                تحليل شامل لحالة المخزون والمنتجات
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleExportInventory('pdf')}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExportInventory('excel')}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير Excel
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleExportInventory('print')}
                disabled={isExporting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                طباعة
              </Button>
              
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">تقرير شامل</SelectItem>
                  <SelectItem value="stock-levels">مستويات المخزون</SelectItem>
                  <SelectItem value="movements">حركة المخزون</SelectItem>
                  <SelectItem value="low-stock">منخفضة المخزون</SelectItem>
                  <SelectItem value="expiry">منتهية الصلاحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Date Range Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تاريخ البداية
              </Label>
              <Input
                id="start-date"
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تاريخ النهاية
              </Label>
              <Input
                id="end-date"
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                onClick={loadInventoryReport}
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isLoading ? 'جاري التحديث...' : 'تحديث التقرير'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جاري تحميل تقرير المخزون...</p>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && inventoryData && (
        <>
          <InventoryMetricsCards />
          <StockLevelsOverview />
          <InventoryMovementsSummary />
          <LowStockProductsTable />
        </>
      )}

      {/* Empty State */}
      {!isLoading && !inventoryData && (
        <Card>
          <CardContent className="text-center py-12">
            <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات متاحة</h3>
            <p className="text-gray-500 mb-4">
              قم بتحديد فترة زمنية وتحديث التقرير لعرض بيانات المخزون
            </p>
            <Button onClick={loadInventoryReport} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              تحميل التقرير
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
