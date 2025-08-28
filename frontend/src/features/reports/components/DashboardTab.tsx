import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent,
  BarChart3,
  Target,
  Star,
  Download
} from "lucide-react";
import { ReportSummary } from '../types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface DashboardTabProps {
  dashboardSummary: any;
  getReportSummary: () => ReportSummary | null;
  handleExportPDF: () => void;
  handleExportExcel: () => void;
  handleExportPrint: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export const DashboardTab: React.FC<DashboardTabProps> = ({ 
  dashboardSummary, 
  getReportSummary,
  handleExportPDF,
  handleExportExcel,
  handleExportPrint
}) => {
  const summary = getReportSummary();

  // Enhanced metrics cards with better design
  const EnhancedMetricsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -translate-y-6 translate-x-6 opacity-20"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(dashboardSummary?.sales?.total || 0)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                <span className="text-sm text-green-600 font-medium">
                  {dashboardSummary?.today_stats?.sales_comparison || 0}%
                </span>
                <span className="text-xs text-muted-foreground mr-2">من الأمس</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -translate-y-6 translate-x-6 opacity-20"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">صافي الربح</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                <span className="text-sm text-green-600 font-medium">
                  {dashboardSummary?.today_stats?.profit_comparison || 0}%
                </span>
                <span className="text-xs text-muted-foreground mr-2">من الأمس</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full -translate-y-6 translate-x-6 opacity-20"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">عدد الفواتير</p>
              <p className="text-2xl font-bold text-purple-600">
                {dashboardSummary?.sales?.count || 0}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                <span className="text-sm text-green-600 font-medium">
                  {dashboardSummary?.today_stats?.invoices_comparison || 0}%
                </span>
                <span className="text-xs text-muted-foreground mr-2">من الأمس</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-full -translate-y-6 translate-x-6 opacity-20"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">المبالغ المعلقة</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(dashboardSummary?.sales?.unpaid_amount || 0)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-red-500 ml-1" />
                <span className="text-sm text-red-600 font-medium">
                  {dashboardSummary?.today_stats?.pending_comparison || 0}%
                </span>
                <span className="text-xs text-muted-foreground mr-2">من الأمس</span>
              </div>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Performance Indicators
  const PerformanceIndicators = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-600" />
            معدل التحصيل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">النسبة المئوية</span>
              <span className="text-lg font-bold text-blue-600">
                {dashboardSummary?.sales?.total > 0 
                  ? Math.round((dashboardSummary.sales.paid_amount / dashboardSummary.sales.total) * 100)
                  : 0}%
              </span>
            </div>
            <Progress 
              value={dashboardSummary?.sales?.total > 0 
                ? (dashboardSummary.sales.paid_amount / dashboardSummary.sales.total) * 100
                : 0} 
              className="h-2"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>المدفوع: {formatCurrency(dashboardSummary?.sales?.paid_amount || 0)}</span>
              <span>الإجمالي: {formatCurrency(dashboardSummary?.sales?.total || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="h-5 w-5 text-green-600" />
            هامش الربح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">النسبة المئوية</span>
              <span className="text-lg font-bold text-green-600">
                {dashboardSummary?.financial_summary?.profit_margin || 0}%
              </span>
            </div>
            <Progress 
              value={dashboardSummary?.financial_summary?.profit_margin || 0} 
              className="h-2"
            />
            <div className="text-sm text-gray-500">
              صافي الربح: {formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-purple-600" />
            متوسط قيمة الفاتورة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">المتوسط</span>
              <span className="text-lg font-bold text-purple-600">
                {dashboardSummary?.sales?.count > 0 
                  ? formatCurrency(dashboardSummary.sales.total / dashboardSummary.sales.count)
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              إجمالي الفواتير: {dashboardSummary?.sales?.count || 0}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Export Controls
  const ExportControls = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          تصدير التقارير
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
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
            onClick={handleExportPrint}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            طباعة
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Best Selling Products
  const BestSellingProducts = () => {
    if (!dashboardSummary?.best_selling_products || dashboardSummary.best_selling_products.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              أفضل المنتجات مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد منتجات مبيعة لهذا الشهر</p>
              <p className="text-sm">سيتم عرض أفضل المنتجات مبيعاً عند توفر بيانات المبيعات</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            أفضل المنتجات مبيعاً
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardSummary.best_selling_products.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">الكود: {product.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(product.total_revenue)}</p>
                  <p className="text-sm text-gray-500">الكمية: {product.total_quantity}</p>
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
      <ExportControls />
      <EnhancedMetricsCards />
      <PerformanceIndicators />
      <BestSellingProducts />
    </div>
  );
};
