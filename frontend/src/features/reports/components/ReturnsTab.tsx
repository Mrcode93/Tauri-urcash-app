import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer,
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
  LineChart,
  Line,
} from 'recharts';
import {
  RotateCcw,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RootState, AppDispatch } from '@/app/store';
import { getReturnsReport } from '@/features/reports/reportsSlice';
import type { SaleData } from '@/features/sales/salesService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/lib/toast';

interface ReturnsTabProps {
  dateRange: { start: string; end: string };
  handleDateRangeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ReturnsTab: React.FC<ReturnsTabProps> = ({
  dateRange,
  handleDateRangeChange,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { returnsReport, isLoading } = useSelector((state: RootState) => state.reports);
  const { items: sales } = useSelector((state: RootState) => state.sales);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [chartView, setChartView] = useState<'monthly' | 'trend'>('monthly');
  const [dataSource, setDataSource] = useState<'backend' | 'frontend'>('backend');

  // Load returns data when component mounts or date range changes
  useEffect(() => {
    if (dataSource === 'backend' && dateRange.start && dateRange.end) {
      dispatch(getReturnsReport(dateRange));
    }
  }, [dispatch, dateRange, dataSource]);

  // Fallback to frontend data if backend data is not available
  const useFrontendData = dataSource === 'frontend' || !returnsReport;

  // Filter sales with returns (frontend fallback)
  const returnsSales = sales.filter(sale => 
    sale.status === 'returned' || sale.status === 'partially_returned'
  );

  // Filter by date range ONLY if user has set a custom range
  const isDefaultRange = !dateRange.start || !dateRange.end || dateRange.start === '1970-01-01';
  const filteredByDate = isDefaultRange
    ? returnsSales
    : returnsSales.filter(sale => {
        const saleDate = new Date(sale.invoice_date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return saleDate >= startDate && saleDate <= endDate;
      });

  // Filter by search term
  const filteredBySearch = filteredByDate.filter(sale => {
    const customer = sale.customer_name || '';
    const invoiceNo = sale.invoice_no || '';
    return customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
           invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter by return type
  const finalFiltered = filteredBySearch.filter(sale => {
    if (filterType === 'all') return true;
    if (filterType === 'full') return sale.status === 'returned';
    if (filterType === 'partial') return sale.status === 'partially_returned';
    return true;
  });

  // Use backend data or calculate from frontend data
  const summary = useFrontendData ? {
    total_returns: finalFiltered.length,
    full_returns: finalFiltered.filter(s => s.status === 'returned').length,
    partial_returns: finalFiltered.filter(s => s.status === 'partially_returned').length,
    total_return_value: finalFiltered.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => 
        itemSum + ((item.returned_quantity || 0) * item.price), 0
      ), 0
    ),
    customers_with_returns: new Set(finalFiltered.map(s => s.customer_id)).size,
    average_return_value: finalFiltered.length > 0 ? 
      finalFiltered.reduce((sum, sale) => 
        sum + sale.items.reduce((itemSum, item) => 
          itemSum + ((item.returned_quantity || 0) * item.price), 0
        ), 0
      ) / finalFiltered.length : 0
  } : returnsReport?.summary;

  const totalReturnedItems = useFrontendData ? 
    finalFiltered.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.returned_quantity || 0), 0), 0
    ) : 
    returnsReport?.top_products?.reduce((sum, product) => sum + product.total_returned_quantity, 0) || 0;

  // Enhanced monthly data calculation with ar-IQ locale
  const monthlyReturnsData = useMemo(() => {
    if (useFrontendData) {
      if (finalFiltered.length === 0) return [];

      // Get date range for the filtered data
      const dates = finalFiltered.map(sale => new Date(sale.invoice_date));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Generate all months in the range
      const months = eachMonthOfInterval({ start: minDate, end: maxDate });

      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const monthReturns = finalFiltered.filter(sale => {
          const saleDate = new Date(sale.invoice_date);
          return saleDate >= monthStart && saleDate <= monthEnd;
        });

        const monthReturnCount = monthReturns.length;
        const monthReturnValue = monthReturns.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => 
            itemSum + ((item.returned_quantity || 0) * item.price), 0
          ), 0
        );
        
        const monthReturnedItems = monthReturns.reduce((sum, sale) => 
          sum + sale.items.reduce((itemSum, item) => itemSum + (item.returned_quantity || 0), 0), 0
        );

        const fullReturnsCount = monthReturns.filter(s => s.status === 'returned').length;
        const partialReturnsCount = monthReturns.filter(s => s.status === 'partially_returned').length;

        return {
          month: format(month, 'MMMM yyyy', { locale: ar }),
          monthKey: format(month, 'yyyy-MM'),
          count: monthReturnCount,
          value: monthReturnValue,
          items: monthReturnedItems,
          fullReturns: fullReturnsCount,
          partialReturns: partialReturnsCount,
          averageValue: monthReturnCount > 0 ? monthReturnValue / monthReturnCount : 0
        };
      });
    } else {
      // Use backend data
      return returnsReport?.monthly_breakdown?.map(month => ({
        month: month.month_name,
        monthKey: month.month_key,
        count: month.return_count,
        value: month.return_value,
        items: 0, // Backend doesn't provide this
        fullReturns: month.full_returns,
        partialReturns: month.partial_returns,
        averageValue: month.average_return_value
      })) || [];
    }
  }, [finalFiltered, returnsReport, useFrontendData]);

  // Chart data
  const returnsByType = [
    { name: 'مرجع كلي', value: summary?.full_returns || 0, color: '#EF4444' },
    { name: 'مرجع جزئي', value: summary?.partial_returns || 0, color: '#F59E0B' },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    if (dataSource === 'backend') {
      dispatch(getReturnsReport(dateRange));
      toast.success('تم تحديث بيانات المرتجعات');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            تصفية المرتجعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-returns">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search-returns"
                  placeholder="البحث بالعميل أو رقم الفاتورة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-type">نوع المرتجعات</Label>
              <select
                id="return-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">جميع المرتجعات</option>
                <option value="full">مرجع كلي</option>
                <option value="partial">مرجع جزئي</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chart-view">عرض المخطط</Label>
              <select
                id="chart-view"
                value={chartView}
                onChange={(e) => setChartView(e.target.value as 'monthly' | 'trend')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="monthly">شهري</option>
                <option value="trend">اتجاه</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-source">مصدر البيانات</Label>
              <select
                id="data-source"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as 'backend' | 'frontend')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="backend">الخادم</option>
                <option value="frontend">المتصفح</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">من تاريخ</Label>
              <Input
                id="start-date"
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">إلى تاريخ</Label>
              <Input
                id="end-date"
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleRefresh} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المرتجعات</p>
                <p className="text-2xl font-bold text-red-600">{summary?.total_returns || 0}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المنتجات المرجعة</p>
                <p className="text-2xl font-bold text-orange-600">{totalReturnedItems}</p>
              </div>
              <Package className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">قيمة المرتجعات</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary?.total_return_value || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوسط المرتجعات</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary?.average_return_value || 0)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              توزيع المرتجعات حسب النوع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={returnsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {returnsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              المرتجعات حسب الشهر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyReturnsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {chartView === 'monthly' ? (
                  <BarChart data={monthlyReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3B82F6" name="عدد المرتجعات" />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="قيمة المرتجعات"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="عدد المرتجعات"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد بيانات مرتجعات للعرض</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Returns Summary Table */}
      {monthlyReturnsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              ملخص المرتجعات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشهر</TableHead>
                    <TableHead className="text-center">عدد المرتجعات</TableHead>
                    <TableHead className="text-center">قيمة المرتجعات</TableHead>
                    <TableHead className="text-center">المنتجات المرجعة</TableHead>
                    <TableHead className="text-center">مرجع كلي</TableHead>
                    <TableHead className="text-center">مرجع جزئي</TableHead>
                    <TableHead className="text-center">متوسط القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReturnsData.map((monthData) => (
                    <TableRow key={monthData.monthKey}>
                      <TableCell className="font-medium">{monthData.month}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">
                        {monthData.count}
                      </TableCell>
                      <TableCell className="text-center font-bold text-red-600">
                        {formatCurrency(monthData.value)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-orange-600">
                        {monthData.items}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="gap-1">
                          {monthData.fullReturns}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="gap-1">
                          {monthData.partialReturns}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">
                        {formatCurrency(monthData.averageValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            تفاصيل المرتجعات ({useFrontendData ? finalFiltered.length : returnsReport?.detailed_returns?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>نوع المرتجعات</TableHead>
                  <TableHead>المنتجات المرجعة</TableHead>
                  <TableHead>قيمة المرتجعات</TableHead>
                  <TableHead>المستخدم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useFrontendData ? (
                  // Frontend data
                  finalFiltered.map((sale) => {
                    const returnedItems = sale.items.reduce((sum, item) => sum + (item.returned_quantity || 0), 0);
                    const returnedValue = sale.items.reduce((sum, item) => 
                      sum + ((item.returned_quantity || 0) * item.price), 0
                    );

                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.invoice_no}</TableCell>
                        <TableCell>{sale.customer_name || 'عميل نقدي'}</TableCell>
                        <TableCell>{formatDate(sale.invoice_date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={sale.status === 'returned' ? 'destructive' : 'secondary'}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {sale.status === 'returned' ? 'مرجع كلي' : 'مرجع جزئي'}
                          </Badge>
                        </TableCell>
                        <TableCell>{returnedItems}</TableCell>
                        <TableCell>{formatCurrency(returnedValue)}</TableCell>
                        <TableCell>{sale.created_by_name || 'غير محدد'}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  // Backend data
                  returnsReport?.detailed_returns?.map((return_item) => (
                    <TableRow key={return_item.id}>
                      <TableCell className="font-mono">{return_item.invoice_no}</TableCell>
                      <TableCell>{return_item.customer_name}</TableCell>
                      <TableCell>{formatDate(return_item.invoice_date)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={return_item.status === 'returned' ? 'destructive' : 'secondary'}
                          className="gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {return_item.status === 'returned' ? 'مرجع كلي' : 'مرجع جزئي'}
                        </Badge>
                      </TableCell>
                      <TableCell>{return_item.total_returned_items}</TableCell>
                      <TableCell>{formatCurrency(return_item.returned_value)}</TableCell>
                      <TableCell>{return_item.created_by_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {((useFrontendData && finalFiltered.length === 0) || (!useFrontendData && (!returnsReport?.detailed_returns || returnsReport.detailed_returns.length === 0))) && (
              <div className="text-center py-8 text-gray-500">
                <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">لا توجد مرتجعات</p>
                <p>لا توجد مرتجعات تطابق معايير البحث الحالية</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnsTab; 