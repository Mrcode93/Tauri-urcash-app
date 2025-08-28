import React, { useState, useMemo } from 'react';
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
  PieChart,
  LineChart,
  Filter,
  Eye,
  Target,
  AlertTriangle,
  CheckCircle
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
import { ReportSummary, ProfitLossEntry, DateRange } from '../types';
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";

interface ProfitLossTabProps {
  profitLoss: ProfitLossEntry[] | null;
  dateRange: DateRange;
  handleDateRangeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerateReport: () => void;
  getReportSummary: () => ReportSummary | null;
  handleExportReport: () => void;
  handleExportPDF: () => void;
  handleExportExcel: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export const ProfitLossTab: React.FC<ProfitLossTabProps> = ({
  profitLoss,
  dateRange,
  handleDateRangeChange,
  handleGenerateReport,
  getReportSummary,
  handleExportReport,
  handleExportPDF,
  handleExportExcel,
}) => {
  const summary = getReportSummary();
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('composed');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'trends'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await handleGenerateReport();
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced Performance Metrics
  const PerformanceMetrics = () => {
    if (!summary) return null;

    const metrics = [
      {
        title: 'إجمالي المبيعات',
        value: summary.sales.total,
        icon: DollarSign,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: '+12%',
        trendUp: true
      },
      {
        title: 'صافي الربح',
        value: summary.financial.net_profit,
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        trend: '+8%',
        trendUp: true
      },
      {
        title: 'هامش الربح',
        value: `${summary.financial.profit_margin || 0}%`,
        icon: Target,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        trend: '+2%',
        trendUp: true,
        isPercentage: true
      },
      {
        title: 'إجمالي المصروفات',
        value: summary.expenses.total,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        trend: '-5%',
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
                    {metric.isPercentage ? metric.value : formatCurrency(metric.value || 0)}
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

  // Enhanced Charts Section
  const ChartsSection = () => {
    // Use real data from profitLoss entries or generate from date range
    const chartData = useMemo(() => {
      if (profitLoss && profitLoss.length > 0) {
        return profitLoss.map((entry: any) => ({
          name: format(new Date(entry.date || entry.period_start || new Date()), 'dd/MM', { locale: ar }),
          sales: entry.sales || entry.total_sales || 0,
          expenses: entry.expenses || entry.total_expenses || 0,
          profit: (entry.sales || entry.total_sales || 0) - (entry.expenses || entry.total_expenses || 0)
        }));
      }
      
      // If no profitLoss data, show summary as single point
      if (summary) {
        return [{
          name: 'الإجمالي',
          sales: summary.sales.total || 0,
          expenses: summary.expenses.total || 0,
          profit: (summary.sales.total || 0) - (summary.expenses.total || 0)
        }];
      }
      
      return [];
    }, [profitLoss, summary]);

    const pieData = [
      { name: 'المبيعات', value: summary?.sales.total || 0, color: COLORS[0] },
      { name: 'المصروفات', value: summary?.expenses.total || 0, color: COLORS[3] },
    ];

    if (!chartData.length) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                تحليل الأرباح والخسائر
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">لا توجد بيانات متاحة</p>
                <p className="text-sm">قم بإنشاء التقرير لعرض البيانات التفصيلية</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                توزيع الإيرادات
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
              <div className="text-center text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد بيانات</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const renderChart = () => {
      const commonProps = {
        data: chartData,
        margin: { top: 5, right: 30, left: 20, bottom: 5 }
      };

      switch (chartType) {
        case 'line':
          return (
            <RechartsLineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke={COLORS[0]} strokeWidth={2} name="المبيعات" />
              <Line type="monotone" dataKey="expenses" stroke={COLORS[3]} strokeWidth={2} name="المصروفات" />
              <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={2} name="الربح" />
            </RechartsLineChart>
          );
        
        case 'bar':
          return (
            <RechartsBarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="sales" fill={COLORS[0]} name="المبيعات" />
              <Bar dataKey="expenses" fill={COLORS[3]} name="المصروفات" />
              <Bar dataKey="profit" fill={COLORS[1]} name="الربح" />
            </RechartsBarChart>
          );
        
        case 'area':
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Area type="monotone" dataKey="sales" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} name="المبيعات" />
              <Area type="monotone" dataKey="expenses" stackId="2" stroke={COLORS[3]} fill={COLORS[3]} name="المصروفات" />
            </AreaChart>
          );
        
        case 'composed':
        default:
          return (
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="sales" fill={COLORS[0]} name="المبيعات" />
              <Bar dataKey="expenses" fill={COLORS[3]} name="المصروفات" />
              <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={3} name="صافي الربح" />
            </ComposedChart>
          );
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              تحليل الأرباح والخسائر
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composed">مركب</SelectItem>
                  <SelectItem value="line">خطي</SelectItem>
                  <SelectItem value="bar">أعمدة</SelectItem>
                  <SelectItem value="area">منطقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              {renderChart()}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              توزيع الإيرادات
            </CardTitle>
          </CardHeader>
                      <CardContent>
              {pieData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد بيانات للعرض</p>
                    <p className="text-sm">سيتم عرض توزيع الإيرادات عند توفر البيانات</p>
                  </div>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    );
  };

  // Enhanced Financial Details Table
  const FinancialDetailsTable = () => {
    if (!summary) return null;

    const details = [
      {
        category: 'المبيعات',
        items: [
          { name: 'إجمالي المبيعات', value: summary.sales.total, type: 'positive' },
          { name: 'عدد الفواتير', value: summary.sales.count, type: 'neutral', format: 'number' },
          { name: 'متوسط قيمة الفاتورة', value: summary.sales.count > 0 ? summary.sales.total / summary.sales.count : 0, type: 'neutral' },
        ]
      },
      {
        category: 'التحصيل',
        items: [
          { name: 'المبالغ المدفوعة', value: summary.sales.paidAmount, type: 'positive' },
          { name: 'المبالغ غير المدفوعة', value: summary.sales.unpaidAmount, type: 'negative' },
          { name: 'معدل التحصيل', value: summary.sales.total > 0 ? (summary.sales.paidAmount / summary.sales.total) * 100 : 0, type: 'neutral', format: 'percentage' },
        ]
      },
      {
        category: 'المصروفات',
        items: [
          { name: 'إجمالي المصروفات', value: summary.expenses.total, type: 'negative' },
          { name: 'عدد المصروفات', value: summary.expenses.count, type: 'neutral', format: 'number' },
          { name: 'متوسط المصروف', value: summary.expenses.count > 0 ? summary.expenses.total / summary.expenses.count : 0, type: 'neutral' },
        ]
      },
      {
        category: 'الأداء',
        items: [
          { name: 'صافي الربح', value: summary.financial.net_profit, type: summary.financial.net_profit >= 0 ? 'positive' : 'negative' },
          { name: 'هامش الربح', value: summary.financial.profit_margin, type: 'neutral', format: 'percentage' },
          { name: 'العائد على المبيعات', value: summary.sales.total > 0 ? (summary.financial.net_profit / summary.sales.total) * 100 : 0, type: 'neutral', format: 'percentage' },
        ]
      }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            التحليل المالي التفصيلي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {details.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="font-bold text-lg mb-3 text-gray-800 border-b border-gray-200 pb-2">
                  {section.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">{item.name}</p>
                      <p className={cn(
                        "text-xl font-bold",
                        item.type === 'positive' && "text-green-600",
                        item.type === 'negative' && "text-red-600",
                        item.type === 'neutral' && "text-gray-800"
                      )}>
                        {item.format === 'number' 
                          ? item.value.toLocaleString() 
                          : item.format === 'percentage' 
                          ? `${item.value.toFixed(1)}%` 
                          : formatCurrency(item.value || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Enhanced Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TrendingUp className="h-6 w-6 text-primary" />
                تقرير الأرباح والخسائر
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                تحليل شامل للأداء المالي والربحية
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                تصدير Excel
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportReport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                طباعة
              </Button>
              
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">ملخص</SelectItem>
                  <SelectItem value="detailed">تفصيلي</SelectItem>
                  <SelectItem value="trends">الاتجاهات</SelectItem>
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
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                {isGenerating ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <PerformanceMetrics />

      {/* Charts Section */}
      {(viewMode === 'summary' || viewMode === 'trends') && <ChartsSection />}

      {/* Detailed Analysis */}
      {(viewMode === 'detailed' || viewMode === 'summary') && summary && (
        <FinancialDetailsTable />
      )}

      {/* Data Table */}
      {summary && profitLoss && profitLoss.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                بيانات تفصيلية
              </span>
              <Badge variant="secondary">
                {profitLoss.length} سجل
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-bold">التاريخ</TableHead>
                    <TableHead className="text-center font-bold">المبيعات</TableHead>
                    <TableHead className="text-center font-bold">المصروفات</TableHead>
                    <TableHead className="text-center font-bold">صافي الربح</TableHead>
                    <TableHead className="text-center font-bold">هامش الربح</TableHead>
                    <TableHead className="text-center font-bold">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitLoss.map((entry, index) => {
                    const profit = (entry as any).net_profit || 0;
                    const margin = (entry as any).profit_margin || 0;
                    
                    return (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {format(new Date((entry as any).date || new Date()), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-blue-600">
                          {formatCurrency((entry as any).sales || 0)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600">
                          {formatCurrency((entry as any).expenses || 0)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center font-bold",
                          profit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(profit)}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={profit >= 0 ? "default" : "destructive"}>
                            {profit >= 0 ? (
                              <CheckCircle className="h-3 w-3 ml-1" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 ml-1" />
                            )}
                            {profit >= 0 ? 'ربح' : 'خسارة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {summary && (!profitLoss || profitLoss.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات متاحة</h3>
            <p className="text-gray-500 mb-4">
              قم بتحديد فترة زمنية وإنشاء التقرير لعرض البيانات
            </p>
            <Button onClick={handleGenerate} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              إنشاء التقرير
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Example type definitions (consider moving to frontend/src/features/reports/types.ts)
// export interface ProfitLossEntry {
//   id: string | number; // Or whatever identifies a profit/loss entry
//   // ... other properties
// }

// export interface DateRange {
//   start: string;
//   end: string;
// }
