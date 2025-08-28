import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  AlertTriangle,
  RefreshCw,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import reportsService, { SalesAnalysis } from '../reportsService';
import { exportToPDF, exportToExcel, convertReportDataToExportFormat } from '@/lib/exportUtils';
import { useSettings } from '@/features/settings/useSettings';
import { getLogoUrlSafe } from '@/utils/logoUrl';

interface SalesAnalysisTabProps {
  dateRange?: {
    start: string;
    end: string;
  };
}

// Using SalesAnalysis interface from reportsService

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export const SalesAnalysisTab: React.FC<SalesAnalysisTabProps> = ({ dateRange }) => {
  const [salesData, setSalesData] = useState<SalesAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('overview');
  const [timeframe, setTimeframe] = useState('daily');
  const [exporting, setExporting] = useState(false);
  
  // Get settings for logo
  const { settings } = useSettings();

  // Real API call to get sales analysis data

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Real API call to get sales analysis data
        const data = await reportsService.getSalesAnalysis(dateRange);
        setSalesData(data);
      } catch (err) {
        setError('فشل في تحميل بيانات تحليل المبيعات');
        toast.error('فشل في تحميل بيانات تحليل المبيعات');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [dateRange]);

    const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'نظرة عامة';
      case 'trends': return 'الاتجاهات';
      case 'products': return 'المنتجات';
      case 'customers': return 'العملاء';
      case 'analytics': return 'تحليلات متقدمة';
      default: return 'تقرير';
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!salesData) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    setExporting(true);
    try {
      const exportData = {
        title: 'تقرير تحليل المبيعات المتقدم',
        description: `تحليل شامل لأداء المبيعات من ${dateRange?.start ? formatDate(dateRange.start) : 'البداية'} إلى ${dateRange?.end ? formatDate(dateRange.end) : 'النهاية'}`,
        dateRange: dateRange,
        sections: [
          {
            title: 'ملخص الأداء',
            type: 'summary' as const,
            data: {
              'إجمالي المبيعات': `${salesData.summary.total_sales} IQD`,
              'عدد الطلبات': salesData.summary.total_orders,
              'متوسط قيمة الطلب': `${salesData.summary.average_order_value} IQD`,
              'إجمالي العملاء': salesData.summary.total_customers,
              'العملاء الجدد': salesData.summary.new_customers,
              'العملاء المتكررون': salesData.summary.repeat_customers,
              'معدل التحويل': `${salesData.summary.conversion_rate}%`,
              'إجمالي الربح': `${salesData.summary.total_profit} IQD`,
              'هامش الربح': `${salesData.summary.profit_margin}%`
            }
          },
          {
            title: 'أفضل المنتجات مبيعاً',
            type: 'table' as const,
            data: salesData.top_products.map(product => ({
              'اسم المنتج': product.name,
              'رمز المنتج': product.sku,
              'الكمية المباعة': product.quantity_sold,
              'الإيرادات': `${product.revenue} IQD`,
              'الربح': `${product.profit} IQD`,
              'هامش الربح': `${product.profit_margin}%`
            }))
          },
          {
            title: 'أفضل العملاء',
            type: 'table' as const,
            data: salesData.top_customers.map(customer => ({
              'اسم العميل': customer.name,
              'رقم الهاتف': customer.phone,
              'عدد الطلبات': customer.total_orders,
              'إجمالي الإنفاق': `${customer.total_spent} IQD`,
              'متوسط الطلب': `${customer.average_order} IQD`,
              'آخر طلب': formatDate(customer.last_order_date)
            }))
          },
          {
            title: 'المبيعات حسب الفئة',
            type: 'table' as const,
            data: salesData.sales_by_category.map(category => ({
              'الفئة': category.category,
              'المبيعات': `${category.sales} IQD`,
              'عدد الطلبات': category.orders,
              'عدد المنتجات': category.products
            }))
          },
          {
            title: 'تحليل طرق الدفع',
            type: 'table' as const,
            data: salesData.payment_analysis.payment_methods.map(method => ({
              'طريقة الدفع': method.method,
              'عدد المعاملات': method.count,
              'المبلغ': `${method.amount} IQD`,
              'النسبة المئوية': `${method.percentage}%`
            }))
          },
          {
            title: 'حالة الدفع',
            type: 'table' as const,
            data: salesData.payment_analysis.payment_status.map(status => ({
              'الحالة': status.status,
              'عدد المعاملات': status.count,
              'المبلغ': `${status.amount} IQD`,
              'النسبة المئوية': `${status.percentage}%`
            }))
          },
          {
            title: 'مؤشرات الأداء',
            type: 'summary' as const,
            data: {
              'نمو المبيعات': `${salesData.performance_metrics.sales_growth}%`,
              'نمو العملاء': `${salesData.performance_metrics.customer_growth}%`,
              'نمو متوسط الطلب': `${salesData.performance_metrics.average_order_growth}%`,
              'نمو الأرباح': `${salesData.performance_metrics.profit_growth}%`
            }
          }
        ]
      };

              const filename = `sales-analysis-${format}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'csv'}`;

      if (format === 'pdf') {
        const logoUrl = settings?.logo_url ? getLogoUrlSafe(settings.logo_url) : undefined;
        await exportToPDF(exportData, filename, logoUrl);
        toast.success('تم تصدير التقرير بصيغة PDF بنجاح');
      } else {
        await exportToExcel(exportData, filename);
        toast.success('تم تصدير التقرير بصيغة CSV بنجاح (يمكن فتحه في Excel)');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !salesData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</p>
          <p className="text-gray-500 mb-4">{error || 'حدث خطأ غير متوقع'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">تحليل المبيعات</h3>
          <p className="text-sm text-muted-foreground">
            تحليل شامل لأداء المبيعات من {dateRange?.start ? formatDate(dateRange.start) : 'البداية'} إلى {dateRange?.end ? formatDate(dateRange.end) : 'النهاية'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">يومي</SelectItem>
              <SelectItem value="weekly">أسبوعي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting || !salesData}>
                {exporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    تصدير البيانات
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExport('excel')} disabled={exporting}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  تصدير CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={exporting}>
                <FileText className="h-4 w-4 mr-2" />
                تصدير PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.summary.total_sales)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{salesData.performance_metrics.sales_growth}% مقارنة بالفترة السابقة
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.summary.total_orders}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              متوسط {salesData.summary.average_order_value.toFixed(0)} ريال للطلب
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.summary.total_customers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-3 w-3 mr-1 text-blue-500" />
              {salesData.summary.new_customers} عملاء جدد
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الربح الإجمالي</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.summary.total_profit)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1 text-green-500" />
              هامش ربح {salesData.summary.profit_margin}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="analytics">تحليلات متقدمة</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  اتجاه المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData.trends.daily_sales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  المبيعات حسب الفئة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={salesData.sales_by_category}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                    >
                      {salesData.sales_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                مؤشرات الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{salesData.performance_metrics.sales_growth}%
                  </div>
                  <div className="text-sm text-muted-foreground">نمو المبيعات</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    +{salesData.performance_metrics.customer_growth}%
                  </div>
                  <div className="text-sm text-muted-foreground">نمو العملاء</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    +{salesData.performance_metrics.average_order_growth}%
                  </div>
                  <div className="text-sm text-muted-foreground">متوسط الطلب</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    +{salesData.performance_metrics.profit_growth}%
                  </div>
                  <div className="text-sm text-muted-foreground">نمو الأرباح</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>المبيعات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData.trends.monthly_sales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="sales" fill="#3B82F6" />
                    <Bar dataKey="profit" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Orders Trend */}
            <Card>
              <CardHeader>
                <CardTitle>الطلبات اليومية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData.trends.daily_sales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="orders" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="customers" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                أفضل المنتجات مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>الكمية المباعة</TableHead>
                    <TableHead>الإيرادات</TableHead>
                    <TableHead>الربح</TableHead>
                    <TableHead>هامش الربح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.top_products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.quantity_sold}</TableCell>
                      <TableCell>{formatCurrency(product.revenue)}</TableCell>
                      <TableCell>{formatCurrency(product.profit)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.profit_margin}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                أفضل العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>عدد الطلبات</TableHead>
                    <TableHead>إجمالي الإنفاق</TableHead>
                    <TableHead>متوسط الطلب</TableHead>
                    <TableHead>آخر طلب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.top_customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.total_orders}</TableCell>
                      <TableCell>{formatCurrency(customer.total_spent)}</TableCell>
                      <TableCell>{formatCurrency(customer.average_order)}</TableCell>
                      <TableCell>{formatDate(customer.last_order_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>طرق الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={salesData.payment_analysis.payment_methods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }) => `${method} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {salesData.payment_analysis.payment_methods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Status Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>حالة الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData.payment_analysis.payment_status}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="amount" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Customer Insights */}
          <Card>
            <CardHeader>
              <CardTitle>رؤى العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{salesData.summary.new_customers}</div>
                  <div className="text-sm text-muted-foreground">عملاء جدد</div>
                  <div className="text-xs text-green-600 mt-1">
                    +{((salesData.summary.new_customers / salesData.summary.total_customers) * 100).toFixed(1)}% من إجمالي العملاء
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{salesData.summary.repeat_customers}</div>
                  <div className="text-sm text-muted-foreground">عملاء متكررون</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {((salesData.summary.repeat_customers / salesData.summary.total_customers) * 100).toFixed(1)}% من إجمالي العملاء
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{salesData.summary.conversion_rate}%</div>
                  <div className="text-sm text-muted-foreground">معدل التحويل</div>
                  <div className="text-xs text-orange-600 mt-1">
                    نسبة العملاء الذين عادوا للشراء
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
