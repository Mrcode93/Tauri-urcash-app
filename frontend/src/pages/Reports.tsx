import { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { 
  Calendar, 
  Download, 
  FileText, 
  Printer, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  Star,
  Settings,
  RotateCcw,
  FileTextIcon,
  Warehouse,
} from "lucide-react";
import { RootState, AppDispatch } from "../app/store";
import { getDashboardSummary, getProfitLoss, setDateRange, setActiveTab, setPrintModalOpen } from "@/features/reports/reportsSlice";
import { formatCurrency, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { useReactToPrint } from "react-to-print";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import printReportsUtils from '@/utils/printReportsUtils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Enhanced chart components
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

import { DashboardTab } from "@/features/reports/components/DashboardTab";
import { ProfitLossTab } from "@/features/reports/components/ProfitLossTab";
import { PremiumReportsTab } from "@/features/reports/components/PremiumReportsTab";
import ReturnsTab from "@/features/reports/components/ReturnsTab";
import { StocksReportTab } from "@/features/reports/components/StocksReportTab";
import { ReportSummary, RawDashboardSummary, BestSellingProduct } from "@/features/reports/types";
import { ReportsWrapper } from '@/components/PremiumFeatureWrapper';

// Chart color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

// Quick date range presets
const DATE_PRESETS = [
  { label: 'اليوم', value: 'today', days: 0 },
  { label: 'آخر 7 أيام', value: 'week', days: 7 },
  { label: 'آخر 30 يوم', value: 'month', days: 30 },
  { label: 'آخر 90 يوم', value: 'quarter', days: 90 },
  { label: 'هذا الشهر', value: 'current-month', days: null },
  { label: 'الشهر الماضي', value: 'last-month', days: null },
];

const Reports = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { dashboardSummary, profitLoss, isLoading, dateRange, activeTab, isPrintModalOpen } = useSelector(
    (state: RootState) => state.reports
  );

  const settings = useSelector((state: RootState) => state.settings.data);

  const [reportType, setReportType] = useState<'overview' | 'detailed' | 'analysis'>('overview');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [selectedPreset, setSelectedPreset] = useState('month');
  const [isExporting, setIsExporting] = useState(false);
  const [printModalOpen, setPrintModalOpenLocal] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDashboardSummary(undefined));
  }, [dispatch]);

  // Add effect to refresh dashboard when date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      dispatch(getDashboardSummary({ start: dateRange.start, end: dateRange.end }));
    }
  }, [dateRange, dispatch]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(setDateRange({ ...dateRange, [name]: value }));
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'today':
        start = end = today;
        break;
      case 'week':
        start = subDays(today, 7);
        end = today;
        break;
      case 'month':
        start = subDays(today, 30);
        end = today;
        break;
      case 'quarter':
        start = subDays(today, 90);
        end = today;
        break;
      case 'current-month': {
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      }
      case 'last-month': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      default:
        start = subDays(today, 30);
        end = today;
    }

    const newDateRange = {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };

    dispatch(setDateRange(newDateRange));
    
    // Call dashboard summary with the new date range
    dispatch(getDashboardSummary(newDateRange));
  };

  const handleGenerateReport = () => {
    dispatch(getProfitLoss(dateRange));
    if (activeTab !== 'profit-loss') {
      dispatch(setActiveTab('profit-loss'));
    }
  };

  const handleExportProfitLoss = async (type: 'pdf' | 'excel' | 'print') => {
    setIsExporting(true);
    try {
      if (type === 'print') {
        // Use new print utility with preview
        await printReportsUtils.printReportWithPreview(
          'profit-loss',
          profitLoss,
          settings,
          dateRange,
          'a4',
          'تقرير الأرباح والخسائر',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم فتح معاينة الطباعة');
      } else if (type === 'pdf') {
        // Save as PDF
        await printReportsUtils.saveReportAsPDF(
          'profit-loss',
          profitLoss,
          settings,
          dateRange,
          'تقرير الأرباح والخسائر',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم حفظ التقرير كـ PDF');
      } else if (type === 'excel') {
        // Export to Excel (CSV)
        printReportsUtils.exportReportToExcel(
          'profit-loss',
          profitLoss,
          dateRange,
          'تقرير الأرباح والخسائر'
        );
        toast.success('تم تصدير التقرير إلى Excel');
      }
    } catch (error) {
      console.error('Error exporting profit-loss report:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    dispatch(getDashboardSummary(undefined));
    if (activeTab === 'profit-loss') {
      dispatch(getProfitLoss(dateRange));
    }
    toast.success('تم تحديث البيانات بنجاح');
  };

  const getReportSummary = (): ReportSummary | null => {
    if (!dashboardSummary) return null;
    
    return {
      sales: {
        total: dashboardSummary.sales.total,
        count: dashboardSummary.sales.count,
        paidAmount: dashboardSummary.sales.paid_amount,
        unpaidAmount: dashboardSummary.sales.unpaid_amount,
      },
      expenses: {
        total: dashboardSummary.expenses.total,
        count: dashboardSummary.expenses.count,
      },
      financial: dashboardSummary.financial_summary,
      bestSellers: dashboardSummary.best_selling_products || [],
    };
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `تقرير-${format(new Date(), 'yyyy-MM-dd')}`
  });

  const handlePrintComplete = () => {
    setPrintModalOpenLocal(false);
    toast.success('تم طباعة التقرير بنجاح');
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'print') => {
    setIsExporting(true);
    try {
      const reportSummary = getReportSummary();
      
      if (type === 'print') {
        // Use new print utility with preview
        await printReportsUtils.printReportWithPreview(
          'dashboard',
          reportSummary,
          settings,
          dateRange,
          'a4',
          'تقرير لوحة التحكم الشامل',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم فتح معاينة الطباعة');
      } else if (type === 'pdf') {
        // Save as PDF
        await printReportsUtils.saveReportAsPDF(
          'dashboard',
          reportSummary,
          settings,
          dateRange,
          'تقرير لوحة التحكم الشامل',
          `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
        );
        toast.success('تم حفظ التقرير كـ PDF');
      } else if (type === 'excel') {
        // Export to Excel (CSV)
        printReportsUtils.exportReportToExcel(
          'dashboard',
          reportSummary,
          dateRange,
          'تقرير لوحة التحكم الشامل'
        );
        toast.success('تم تصدير التقرير إلى Excel');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  // Enhanced Statistics Cards Component
  const StatisticsOverview = () => {
    const summary = getReportSummary();
    if (!summary) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const stats = [
      {
        title: 'إجمالي المبيعات',
        value: summary.sales.total,
        icon: DollarSign,
        trend: '+12%',
        trendUp: true,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'صافي الربح',
        value: summary.financial.net_profit,
        icon: TrendingUp,
        trend: '+8%',
        trendUp: true,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'إجمالي الفواتير',
        value: summary.sales.count,
        icon: FileText,
        trend: '+15%',
        trendUp: true,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        format: 'number'
      },
      {
        title: 'المبالغ المعلقة',
        value: summary.sales.unpaidAmount,
        icon: AlertTriangle,
        trend: '-5%',
        trendUp: false,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.format === 'number' 
                      ? stat.value.toLocaleString() 
                      : formatCurrency(stat.value || 0)}
                  </p>
                  <div className="flex items-center space-x-2">
                    {stat.trendUp ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      stat.trendUp ? "text-green-600" : "text-red-600"
                    )}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={cn("p-3 rounded-full", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Enhanced Chart Components
  const SalesChart = () => {
    // Use real data from dashboard summary
    const data = useMemo(() => {
      if (!dashboardSummary?.sales_trend?.labels || !dashboardSummary?.sales_trend?.data) {
        return [];
      }

      return dashboardSummary.sales_trend.labels.map((label: string, index: number) => {
        const salesValue = dashboardSummary.sales_trend.data[index] || 0;
        const purchasesValue = dashboardSummary.purchases_trend?.data[index] || 0;
        const profit = salesValue - purchasesValue;
        
        return {
          name: label,
          sales: salesValue,
          expenses: purchasesValue,
          profit: profit
        };
      });
    }, [dashboardSummary?.sales_trend?.labels, dashboardSummary?.sales_trend?.data, dashboardSummary?.purchases_trend?.data]);

    if (!data.length) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              مخطط المبيعات والأرباح
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد بيانات متاحة للعرض</p>
              <p className="text-sm">سيتم عرض البيانات عند توفرها</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const ChartComponent = {
      line: LineChart,
      bar: BarChart,
      area: AreaChart
    }[chartType];

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            مخطط المبيعات والأرباح
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'line' | 'bar' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">خطي</SelectItem>
                <SelectItem value="bar">أعمدة</SelectItem>
                <SelectItem value="area">منطقة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ChartComponent data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  formatCurrency(value as number), 
                  name === 'sales' ? 'المبيعات' : 'الأرباح'
                ]}
              />
              <Legend />
              {chartType === 'area' ? (
                <>
                  <Area type="monotone" dataKey="sales" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                  <Area type="monotone" dataKey="profit" stackId="1" stroke="#10B981" fill="#10B981" />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} />
                  {chartType === 'bar' && (
                    <>
                      <Bar dataKey="sales" fill="#3B82F6" />
                      <Bar dataKey="profit" fill="#10B981" />
                    </>
                  )}
                </>
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !dashboardSummary) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <ReportsWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="flex items-center gap-4 mb-3 p-4">
          <h1 className="text-2xl font-bold text-gray-900">التقارير والتحليلات</h1>
        </div>
       

        {/* Main Content */}
        <div className="max-w-full mx-auto px-6 py-8">
          {/* Statistics Overview */}
        

          {/* Enhanced Tabs Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Tabs 
              value={activeTab} 
              onValueChange={(val) => dispatch(setActiveTab(val as 'dashboard' | 'profit-loss' | 'returns' | 'premium-reports'))} 
              className="w-full"
            >
              {/* Enhanced Tab Navigation */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-b border-gray-300">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-16 bg-transparent">
                  <TabsTrigger 
                    value="dashboard" 
                    className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-blue-200 data-[state=active]:text-blue-900 data-[state=active]:border-blue-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-blue-300 rounded-lg transition-all duration-200 hover:bg-blue-50"
                  >
                    <div className="p-2 bg-blue-200 rounded-lg data-[state=active]:bg-blue-300">
                      <BarChart3 className="w-5 h-5 text-blue-700 data-[state=active]:text-blue-900" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 data-[state=active]:text-blue-900">لوحة المعلومات</div>
                      <div className="text-xs text-gray-600 font-medium data-[state=active]:text-blue-800">نظرة عامة</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="profit-loss" 
                    className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-green-200 data-[state=active]:text-green-900 data-[state=active]:border-green-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-green-300 rounded-lg transition-all duration-200 hover:bg-green-50"
                  >
                    <div className="p-2 bg-green-200 rounded-lg data-[state=active]:bg-green-300">
                      <TrendingUp className="w-5 h-5 text-green-700 data-[state=active]:text-green-900" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 data-[state=active]:text-green-900">الأرباح والخسائر</div>
                      <div className="text-xs text-gray-600 font-medium data-[state=active]:text-green-800">تحليل مالي</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="returns" 
                    className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900 data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-orange-300 rounded-lg transition-all duration-200 hover:bg-orange-50"
                  >
                    <div className="p-2 bg-orange-200 rounded-lg data-[state=active]:bg-orange-300">
                      <RotateCcw className="w-5 h-5 text-orange-700 data-[state=active]:text-orange-900" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 data-[state=active]:text-orange-900">المرتجعات</div>
                      <div className="text-xs text-gray-600 font-medium data-[state=active]:text-orange-800">إدارة المرتجعات</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="premium-reports" 
                    className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-purple-200 data-[state=active]:text-purple-900 data-[state=active]:border-purple-400 data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-purple-300 rounded-lg transition-all duration-200 hover:bg-purple-50"
                  >
                    <div className="p-2 bg-purple-200 rounded-lg data-[state=active]:bg-purple-300">
                      <Settings className="w-5 h-5 text-purple-700 data-[state=active]:text-purple-900" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 data-[state=active]:text-purple-900">التقارير المميزة</div>
                      <div className="text-xs text-gray-600 font-medium data-[state=active]:text-purple-800">تحليلات متقدمة</div>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

          <TabsContent value="dashboard" className="p-6" dir="rtl">
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-4 mb-6 border border-blue-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-lg shadow-sm">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">لوحة المعلومات الشاملة</h2>
                  <p className="text-blue-800 font-medium">نظرة عامة على أداء أعمالك</p>
                </div>
              </div>
            </div>
            <DashboardTab 
              dashboardSummary={dashboardSummary} 
              getReportSummary={getReportSummary}
              handleExportPDF={() => handleExport('pdf')}
              handleExportExcel={() => handleExport('excel')}
              handleExportPrint={() => handleExport('print')}
            />
          </TabsContent>

          <TabsContent value="profit-loss" className="p-6" dir="rtl">
            <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-4 mb-6 border border-green-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-600 rounded-lg shadow-sm">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-900">تقرير الأرباح والخسائر</h2>
                  <p className="text-green-800 font-medium">تحليل مفصل للأداء المالي</p>
                </div>
              </div>
            </div>
            <ProfitLossTab
              profitLoss={profitLoss}
              dateRange={dateRange}
              handleDateRangeChange={handleDateRangeChange}
              handleGenerateReport={handleGenerateReport}
              getReportSummary={getReportSummary}
              handleExportReport={() => handleExport('print')}
              handleExportPDF={() => handleExportProfitLoss('pdf')}
              handleExportExcel={() => handleExportProfitLoss('excel')}
            />
          </TabsContent>

          <TabsContent value="returns" className="p-6" dir="rtl">
            <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg p-4 mb-6 border border-orange-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-600 rounded-lg shadow-sm">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-orange-900">إدارة المرتجعات</h2>
                  <p className="text-orange-800 font-medium">تتبع وإدارة عمليات الإرجاع</p>
                </div>
              </div>
            </div>
            <ReturnsTab
              dateRange={dateRange}
              handleDateRangeChange={handleDateRangeChange}
            />
          </TabsContent>

          <TabsContent value="inventory" className="p-6" dir="rtl">
            <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg p-4 mb-6 border border-indigo-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 rounded-lg shadow-sm">
                  <Warehouse className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-indigo-900">تقرير المخزون الشامل</h2>
                  <p className="text-indigo-800 font-medium">تحليل شامل لحالة المخزون والمنتجات</p>
                </div>
              </div>
            </div>
            <StocksReportTab
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="premium-reports" className="p-6" dir="rtl">
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg p-4 mb-6 border border-purple-300">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-600 rounded-lg shadow-sm">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-purple-900">التقارير المميزة</h2>
                  <p className="text-purple-800 font-medium">تحليلات متقدمة ورؤى حصرية</p>
                </div>
              </div>
            </div>
            <PremiumReportsTab dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>

        {/* Print Modal */}
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpenLocal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                معاينة الطباعة
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex justify-end gap-2 mb-4 no-print">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button variant="outline" onClick={() => setPrintModalOpenLocal(false)}>
                إلغاء
              </Button>
            </div>

            {/* Print Content */}
            <div ref={printRef} className="print-content bg-white p-8">
              <div className="text-center border-b pb-6 mb-8">
                <h1 className="text-3xl font-bold mb-2">تقرير الأعمال الشامل</h1>
                <p className="text-lg text-gray-600">
                  الفترة من {format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} 
                  إلى {format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  تاريخ الإنشاء: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </p>
              </div>

              {/* Print Statistics */}
              {getReportSummary() && (
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">ملخص المبيعات</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>إجمالي المبيعات:</span>
                        <span className="font-bold">{formatCurrency(getReportSummary()!.sales.total || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>عدد الفواتير:</span>
                        <span className="font-bold">{getReportSummary()!.sales.count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>المدفوع:</span>
                        <span className="font-bold text-green-600">{formatCurrency(getReportSummary()!.sales.paidAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>غير المدفوع:</span>
                        <span className="font-bold text-red-600">{formatCurrency(getReportSummary()!.sales.unpaidAmount || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">الأداء المالي</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>صافي الربح:</span>
                        <span className="font-bold text-green-600">{formatCurrency(getReportSummary()!.financial.net_profit || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>هامش الربح:</span>
                        <span className="font-bold">{getReportSummary()!.financial.profit_margin || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي المصروفات:</span>
                        <span className="font-bold text-red-600">{formatCurrency(getReportSummary()!.expenses.total || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Best Sellers Table */}
              {getReportSummary()?.bestSellers && getReportSummary()!.bestSellers.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4 border-b pb-2">أفضل المنتجات مبيعاً</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-center">الكود</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-center">الإيرادات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getReportSummary()!.bestSellers.map((product: BestSellingProduct) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-center">{product.code}</TableCell>
                          <TableCell className="text-center">{product.total_quantity}</TableCell>
                          <TableCell className="text-center">{formatCurrency(product.total_revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </ReportsWrapper>
  );
};

export default Reports;
