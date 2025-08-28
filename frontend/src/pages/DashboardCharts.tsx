import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DashboardPeriod } from '@/types/dashboard';

// Modern chart components
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

// Import modular components
import {
  DashboardPeriodSelector,
  DashboardStatsGrid,
  SalesOverviewChart,
  RevenueBreakdownChart,
  MostSoldProductsTable,
  PerformanceIndicators,
  ProfitAnalysisSection
} from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

const DashboardCharts = () => {
  const navigate = useNavigate();
  
  // Date picker state
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Use custom hook for data fetching
  const { dashboardSummary, mostSoldProducts, isLoading, isInitialized } = useDashboardData({
    selectedPeriod,
    startDate,
    endDate
  });

  const handlePeriodChange = (period: DashboardPeriod) => {
    setSelectedPeriod(period);
    
    if (period === 'custom') {
      setIsDatePickerOpen(true);
    } else {
      // Set default dates based on period
      const now = new Date();
      let newStartDate: Date;
      let newEndDate: Date;
      
      switch (period) {
        case 'week': {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          newStartDate = new Date(now.setDate(diff));
          newEndDate = new Date(newStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
          break;
        }
        case 'month': {
          newStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          newEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        }
        case 'year': {
          newStartDate = new Date(now.getFullYear(), 0, 1);
          newEndDate = new Date(now.getFullYear(), 11, 31);
          break;
        }
        default: {
          newStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          newEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
      }
      
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  };

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dashboardSummary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const salesData = [
    { name: 'المبيعات', value: dashboardSummary?.sales?.total || 0, color: '#10B981' },
    { name: 'المشتريات', value: dashboardSummary?.purchases?.total || 0, color: '#F59E0B' },
    { name: 'المصروفات', value: dashboardSummary?.expenses?.total || 0, color: '#EF4444' }
  ];

  const inventoryData = [
    { name: 'إجمالي المنتجات', value: dashboardSummary?.inventory?.total_products || 0, color: '#3B82F6' },
    { name: 'مخزون منخفض', value: dashboardSummary?.inventory?.low_stock_products || 0, color: '#F59E0B' },
    { name: 'نفاد المخزون', value: dashboardSummary?.inventory?.out_of_stock_products || 0, color: '#EF4444' }
  ];

  const cashFlowData = [
    { name: 'المبيعات النقدية', value: dashboardSummary?.cash_flow?.cash_sales || 0, color: '#10B981' },
    { name: 'المقبوضات من العملاء', value: dashboardSummary?.cash_flow?.cash_receipts || 0, color: '#06B6D4' },
    { name: 'المشتريات النقدية', value: dashboardSummary?.cash_flow?.cash_purchases || 0, color: '#F59E0B' },
    { name: 'المصروفات النقدية', value: dashboardSummary?.cash_flow?.cash_expenses || 0, color: '#EF4444' },
    { name: 'المدفوعات للموردين', value: dashboardSummary?.cash_flow?.cash_supplier_payments || 0, color: '#8B5CF6' }
  ];

  // Show low stock alert
  const showLowStockAlert = (dashboardSummary?.inventory?.low_stock_products || 0) > 0;

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-gray-600 mt-1">نظرة عامة على أداء عملك</p>
        </div>
        
        <DashboardPeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          startDate={startDate}
          endDate={endDate}
          isDatePickerOpen={isDatePickerOpen}
          setIsDatePickerOpen={setIsDatePickerOpen}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
        </div>
      </div>

      {/* Low Stock Alert */}
      {showLowStockAlert && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 font-medium">
              تنبيه: {dashboardSummary?.inventory?.low_stock_products || 0} منتجات قريبة من النفاد
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardSummary?.sales?.total || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">صافي الربح</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardSummary?.customers?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
        </Card>

        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المنتجات</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardSummary?.inventory?.total_products || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
        </div>
      </div>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Overview Chart */}
        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">نظرة عامة على المبيعات</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'المبلغ']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Cash Flow Chart */}
        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">حركة النقدية</h3>
              <p className="text-sm text-gray-600 mt-1">صافي النقد: {formatCurrency(
                (dashboardSummary?.cash_flow?.cash_sales || 0) + 
                (dashboardSummary?.cash_flow?.cash_receipts || 0) - 
                (dashboardSummary?.cash_flow?.cash_purchases || 0) - 
                (dashboardSummary?.cash_flow?.cash_expenses || 0) - 
                (dashboardSummary?.cash_flow?.cash_supplier_payments || 0)
              )}</p>
            </div>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'المبلغ']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">إجمالي الدخل:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency((dashboardSummary?.cash_flow?.cash_sales || 0) + (dashboardSummary?.cash_flow?.cash_receipts || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">إجمالي المصروفات:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency((dashboardSummary?.cash_flow?.cash_purchases || 0) + (dashboardSummary?.cash_flow?.cash_expenses || 0) + (dashboardSummary?.cash_flow?.cash_supplier_payments || 0))}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Inventory and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Inventory Status */}
        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">حالة المخزون</h3>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'الكمية']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Most Sold Products */}
        <MostSoldProductsTable 
          products={mostSoldProducts} 
          isLoading={false} 
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الملخص المالي</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">إجمالي المبيعات:</span>
              <span className="font-semibold">{formatCurrency(dashboardSummary?.financial_summary?.total_sales || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">تكلفة البضائع:</span>
              <span className="font-semibold">{formatCurrency(dashboardSummary?.financial_summary?.cost_of_goods || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">صافي الربح:</span>
              <span className="font-semibold text-green-600">{formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">هامش الربح:</span>
              <span className="font-semibold">{(dashboardSummary?.financial_summary?.profit_margin || 0).toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الديون</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ديون العملاء:</span>
              <span className="font-semibold text-red-600">{formatCurrency(dashboardSummary?.debts?.total_remaining || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ديون الموردين:</span>
              <span className="font-semibold text-orange-600">{formatCurrency(dashboardSummary?.supplier_debts?.total_remaining || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">متأخرات العملاء:</span>
              <span className="font-semibold text-red-500">{dashboardSummary?.debts?.overdue_debts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">متأخرات الموردين:</span>
              <span className="font-semibold text-orange-500">{dashboardSummary?.supplier_debts?.overdue_debts || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات اليوم</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">الفواتير المدفوعة:</span>
              <span className="font-semibold text-green-600">{dashboardSummary?.today_stats?.paid_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">الفواتير الجزئية:</span>
              <span className="font-semibold text-yellow-600">{dashboardSummary?.today_stats?.partial_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">الفواتير غير المدفوعة:</span>
              <span className="font-semibold text-red-600">{dashboardSummary?.today_stats?.unpaid_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">إجمالي الفواتير:</span>
              <span className="font-semibold">{dashboardSummary?.sales?.count || 0}</span>
            </div>
          </div>
        </Card>
      </div>

        {/* Quick Actions */}
      <Card className="p-6 bg-white rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <button 
              onClick={() => navigate('/sales')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center"
          >
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-blue-700">مبيعات جديدة</span>
          </button>
          
          <button 
            onClick={() => navigate('/customers')}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center"
          >
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-green-700">إضافة عميل</span>
          </button>
          
          <button 
            onClick={() => navigate('/inventory')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center"
          >
            <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-purple-700">إدارة المخزون</span>
            </button>
          
            <button 
              onClick={() => navigate('/expenses')}
            className="p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-center"
          >
            <DollarSign className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-red-700">تسجيل مصروفات</span>
            </button>
          
            <button 
              onClick={() => navigate('/suppliers')}
            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center"
          >
            <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-orange-700">إدارة الموردين</span>
            </button>
          
            <button 
            onClick={() => navigate('/reports')}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center"
          >
            <BarChart3 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">التقارير</span>
            </button>
          </div>
        </Card>
    </div>
  );
};

export default DashboardCharts;