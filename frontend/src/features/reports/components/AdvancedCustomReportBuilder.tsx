import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Package, 
  TrendingUp, 
  Building2, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  CreditCard,
  Calculator,
  Download,
  Eye,
  Settings,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Phone,
  Mail,
  Table
} from 'lucide-react';
import { 
  Table as UITable, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import reportsService, { 
  DelegatesReport,
  CustomerReport,
  SupplierReport,
  SalesReport,
  SpecificProductReport,
  CompanyReport,
  StockReport,
  DebtsReport,
  MoneyBoxReport,
  ExpensesReport,
  CustomerDebtsDetailedReport
} from '../reportsService';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { useSettings } from '@/features/settings/useSettings';
import { getLogoUrlSafe } from '@/utils/logoUrl';

interface ReportConfig {
  id?: number;
  name: string;
  description: string;
  reportType: string;
  dateRange: { start: string; end: string };
  filters: Record<string, any>;
  sections: string[];
}

const REPORT_TYPES = [
  { value: 'delegates', label: 'تقرير المندوبين', icon: Users, color: 'bg-blue-500' },
  { value: 'customers', label: 'تقرير العملاء', icon: Users, color: 'bg-green-500' },
  { value: 'suppliers', label: 'تقرير الموردين', icon: Building2, color: 'bg-purple-500' },
  { value: 'sales', label: 'تقرير المبيعات', icon: TrendingUp, color: 'bg-orange-500' },
  { value: 'specific-product', label: 'تقرير منتج محدد', icon: Package, color: 'bg-red-500' },
  { value: 'company', label: 'تقرير شركة محددة', icon: Building2, color: 'bg-indigo-500' },
  { value: 'stock', label: 'تقرير المخزون', icon: Package, color: 'bg-yellow-500' },
  { value: 'debts', label: 'تقرير الديون', icon: CreditCard, color: 'bg-pink-500' },
  { value: 'money-box', label: 'تقرير الصناديق', icon: DollarSign, color: 'bg-emerald-500' },
  { value: 'expenses', label: 'تقرير المصروفات', icon: Calculator, color: 'bg-rose-500' },
  { value: 'customer-debts', label: 'تقرير ديون العملاء', icon: AlertTriangle, color: 'bg-amber-500' },
];

const CUSTOMER_DEBT_STATUSES = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'paid', label: 'الفواتير المدفوعة' },
  { value: 'due', label: 'الفواتير المستحقة' },
  { value: 'partial', label: 'الفواتير المدفوعة جزئياً' },
  { value: 'unpaid', label: 'الفواتير غير المدفوعة' },
];

const DEBT_TYPES = [
  { value: 'all', label: 'جميع الديون' },
  { value: 'customers', label: 'ديون العملاء' },
  { value: 'suppliers', label: 'ديون الموردين' },
];

export const AdvancedCustomReportBuilder: React.FC = () => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    reportType: 'delegates',
    dateRange: { start: '', end: '' },
    filters: {},
    sections: ['summary', 'details']
  });

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  
  // Get settings for logo
  const { settings } = useSettings();

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = () => {
    const saved = localStorage.getItem('savedCustomReports');
    if (saved) {
      setSavedReports(JSON.parse(saved));
    }
  };

  const handleReportTypeChange = (type: string) => {
    setReportConfig(prev => ({
      ...prev,
      reportType: type,
      filters: {}
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      let data;
      const { start, end } = reportConfig.dateRange;

      switch (reportConfig.reportType) {
        case 'delegates':
          data = await reportsService.getDelegatesReport({ start, end });
          break;
        case 'customers':
          data = await reportsService.getCustomerReport({ start, end }, reportConfig.filters.paymentStatus);
          break;
        case 'suppliers':
          data = await reportsService.getSupplierReport({ start, end });
          break;
        case 'sales':
          data = await reportsService.getSalesReport({ start, end }, reportConfig.filters.productId, reportConfig.filters.customerId);
          break;
        case 'specific-product':
          if (reportConfig.filters.productId) {
            data = await reportsService.getSpecificProductReport(reportConfig.filters.productId, { start, end });
          }
          break;
        case 'company':
          if (reportConfig.filters.companyId) {
            data = await reportsService.getCompanyReport(reportConfig.filters.companyId, { start, end });
          }
          break;
        case 'stock':
          data = await reportsService.getStockReport({ start, end }, reportConfig.filters.categoryId);
          break;
        case 'debts':
          data = await reportsService.getDebtsReport({ start, end }, reportConfig.filters.debtType);
          break;
        case 'money-box':
          data = await reportsService.getMoneyBoxReport({ start, end }, reportConfig.filters.boxId);
          break;
        case 'expenses':
          data = await reportsService.getExpensesReport({ start, end }, reportConfig.filters.categoryId);
          break;
        case 'customer-debts':
          data = await reportsService.getCustomerDebtsDetailedReport({ start, end }, reportConfig.filters.debtStatus);
          break;
        default:
          data = null;
      }

      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToPDF = async () => {
    if (!reportData) return;
    
    try {
      let sections = [];
      
      if (reportConfig.reportType === 'delegates') {
        // For delegate reports, create separate sections for summary and products
        sections = [
          {
            title: 'ملخص المندوبين',
            type: 'table' as const,
            data: reportData.map((delegate: any) => ({
              'اسم المندوب': delegate.name,
              'الهاتف': delegate.phone || '-',
              'البريد الإلكتروني': delegate.email || '-',
              'إجمالي المبيعات': delegate.total_sales,
              'إجمالي الإيرادات': delegate.total_revenue,
              'متوسط قيمة البيع': delegate.avg_sale_value,
              'العملاء الفريدون': delegate.unique_customers,
              'آخر عملية بيع': delegate.last_sale_date ? new Date(delegate.last_sale_date).toLocaleDateString('ar-IQ') : '-',
              'عدد المنتجات المباعة': delegate.products?.length || 0,
              'عدد سندات القبض': delegate.customer_receipts?.length || 0
            }))
          }
        ];
        
        // Add products sections for each delegate
        reportData.forEach((delegate: any) => {
          if (delegate.products && delegate.products.length > 0) {
            sections.push({
              title: `المنتجات المباعة بواسطة ${delegate.name}`,
              type: 'table' as const,
              data: delegate.products.map((product: any) => ({
                'اسم المنتج': product.product_name,
                'رمز المنتج': product.product_sku,
                'الباركود': product.product_barcode || '-',
                'الكمية المباعة': product.total_quantity_sold,
                'إجمالي الإيرادات': product.total_revenue,
                'متوسط السعر': product.avg_price,
                'عدد المبيعات': product.number_of_sales
              }))
            });
          }
        });

        // Add customer receipts sections for each delegate
        reportData.forEach((delegate: any) => {
          if (delegate.customer_receipts && delegate.customer_receipts.length > 0) {
            sections.push({
              title: `سندات القبض للمندوب ${delegate.name}`,
              type: 'table' as const,
              data: delegate.customer_receipts.map((receipt: any) => ({
                'رقم السند': receipt.receipt_number,
                'التاريخ': receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString('ar-IQ') : '-',
                'اسم العميل': receipt.customer_name,
                'هاتف العميل': receipt.customer_phone || '-',
                'المبلغ': receipt.amount,
                'طريقة الدفع': receipt.payment_method === 'cash' ? 'نقدي' : 
                               receipt.payment_method === 'card' ? 'بطاقة' :
                               receipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                               receipt.payment_method === 'check' ? 'شيك' : receipt.payment_method,
                'ملاحظات': receipt.notes || '-'
              }))
            });
          }
        });
      } else {
        // For other report types, use the data as is
        sections = [
          {
            title: 'تفاصيل البيانات',
            type: 'table' as const,
            data: reportData
          }
        ];
      }
      
      const exportData = {
        title: reportConfig.name || `تقرير ${REPORT_TYPES.find(t => t.value === reportConfig.reportType)?.label}`,
        description: reportConfig.description,
        dateRange: reportConfig.dateRange,
        sections
      };
      
      const logoUrl = settings?.logo_url ? getLogoUrlSafe(settings.logo_url) : undefined;
      await exportToPDF(exportData, undefined, logoUrl);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const handleExportToExcel = async () => {
    if (!reportData) return;
    
    try {
      let sections = [];
      
      if (reportConfig.reportType === 'delegates') {
        // For delegate reports, create separate sections for summary and products
        sections = [
          {
            title: 'ملخص المندوبين',
            type: 'table' as const,
            data: reportData.map((delegate: any) => ({
              'اسم المندوب': delegate.name,
              'الهاتف': delegate.phone || '-',
              'البريد الإلكتروني': delegate.email || '-',
              'إجمالي المبيعات': delegate.total_sales,
              'إجمالي الإيرادات': delegate.total_revenue,
              'متوسط قيمة البيع': delegate.avg_sale_value,
              'العملاء الفريدون': delegate.unique_customers,
              'آخر عملية بيع': delegate.last_sale_date ? new Date(delegate.last_sale_date).toLocaleDateString('ar-IQ') : '-',
              'عدد المنتجات المباعة': delegate.products?.length || 0,
              'عدد سندات القبض': delegate.customer_receipts?.length || 0
            }))
          }
        ];
        
        // Add products sections for each delegate
        reportData.forEach((delegate: any) => {
          if (delegate.products && delegate.products.length > 0) {
            sections.push({
              title: `المنتجات المباعة بواسطة ${delegate.name}`,
              type: 'table' as const,
              data: delegate.products.map((product: any) => ({
                'اسم المنتج': product.product_name,
                'رمز المنتج': product.product_sku,
                'الباركود': product.product_barcode || '-',
                'الكمية المباعة': product.total_quantity_sold,
                'إجمالي الإيرادات': product.total_revenue,
                'متوسط السعر': product.avg_price,
                'عدد المبيعات': product.number_of_sales
              }))
            });
          }
        });

        // Add customer receipts sections for each delegate
        reportData.forEach((delegate: any) => {
          if (delegate.customer_receipts && delegate.customer_receipts.length > 0) {
            sections.push({
              title: `سندات القبض للمندوب ${delegate.name}`,
              type: 'table' as const,
              data: delegate.customer_receipts.map((receipt: any) => ({
                'رقم السند': receipt.receipt_number,
                'التاريخ': receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString('ar-IQ') : '-',
                'اسم العميل': receipt.customer_name,
                'هاتف العميل': receipt.customer_phone || '-',
                'المبلغ': receipt.amount,
                'طريقة الدفع': receipt.payment_method === 'cash' ? 'نقدي' : 
                               receipt.payment_method === 'card' ? 'بطاقة' :
                               receipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                               receipt.payment_method === 'check' ? 'شيك' : receipt.payment_method,
                'ملاحظات': receipt.notes || '-'
              }))
            });
          }
        });
      } else {
        // For other report types, use the data as is
        sections = [
          {
            title: 'تفاصيل البيانات',
            type: 'table' as const,
            data: reportData
          }
        ];
      }
      
      const exportData = {
        title: reportConfig.name || `تقرير ${REPORT_TYPES.find(t => t.value === reportConfig.reportType)?.label}`,
        description: reportConfig.description,
        dateRange: reportConfig.dateRange,
        sections
      };
      
      await exportToExcel(exportData);
    } catch (error) {
              console.error('Error exporting to CSV:', error);
    }
  };

  const saveReportConfig = () => {
    const newReport = { ...reportConfig, id: Date.now() };
    const updatedReports = [...savedReports, newReport];
    setSavedReports(updatedReports);
    localStorage.setItem('savedCustomReports', JSON.stringify(updatedReports));
  };

  const loadSavedReport = (report: ReportConfig) => {
    setReportConfig(report);
    setShowSavedReports(false);
  };

  const deleteSavedReport = (id: number) => {
    const updatedReports = savedReports.filter(r => r.id !== id);
    setSavedReports(updatedReports);
    localStorage.setItem('savedCustomReports', JSON.stringify(updatedReports));
  };

  const renderFilterSection = () => {
    const { reportType, filters } = reportConfig;

    switch (reportType) {
      case 'customers':
        return (
          <div className="space-y-4">
            <div>
              <Label>حالة الدفع</Label>
              <Select value={filters.paymentStatus || 'all'} onValueChange={(value) => handleFilterChange('paymentStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_DEBT_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="space-y-4">
            <div>
              <Label>معرف المنتج (اختياري)</Label>
              <Input 
                type="number" 
                placeholder="أدخل معرف المنتج"
                value={filters.productId || ''}
                onChange={(e) => handleFilterChange('productId', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label>معرف العميل (اختياري)</Label>
              <Input 
                type="number" 
                placeholder="أدخل معرف العميل"
                value={filters.customerId || ''}
                onChange={(e) => handleFilterChange('customerId', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
        );

      case 'specific-product':
        return (
          <div>
            <Label>معرف المنتج *</Label>
            <Input 
              type="number" 
              placeholder="أدخل معرف المنتج"
              value={filters.productId || ''}
              onChange={(e) => handleFilterChange('productId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        );

      case 'company':
        return (
          <div>
            <Label>معرف الشركة *</Label>
            <Input 
              type="number" 
              placeholder="أدخل معرف الشركة"
              value={filters.companyId || ''}
              onChange={(e) => handleFilterChange('companyId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        );

      case 'stock':
        return (
          <div>
            <Label>معرف الفئة (اختياري)</Label>
            <Input 
              type="number" 
              placeholder="أدخل معرف الفئة"
              value={filters.categoryId || ''}
              onChange={(e) => handleFilterChange('categoryId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        );

      case 'debts':
        return (
          <div>
            <Label>نوع الديون</Label>
            <Select value={filters.debtType || 'all'} onValueChange={(value) => handleFilterChange('debtType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'money-box':
        return (
          <div>
            <Label>معرف الصندوق (اختياري)</Label>
            <Input 
              type="number" 
              placeholder="أدخل معرف الصندوق"
              value={filters.boxId || ''}
              onChange={(e) => handleFilterChange('boxId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        );

      case 'expenses':
        return (
          <div>
            <Label>معرف فئة المصروفات (اختياري)</Label>
            <Input 
              type="number" 
              placeholder="أدخل معرف فئة المصروفات"
              value={filters.categoryId || ''}
              onChange={(e) => handleFilterChange('categoryId', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        );

      case 'customer-debts':
        return (
          <div>
            <Label>حالة الديون</Label>
            <Select value={filters.debtStatus || 'all'} onValueChange={(value) => handleFilterChange('debtStatus', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_DEBT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const renderReportPreview = () => {
    if (!reportData) return null;

    const reportType = REPORT_TYPES.find(t => t.value === reportConfig.reportType);
    
    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-blue-900">{reportConfig.name || reportType?.label}</h3>
              <p className="text-blue-700 mt-1">{reportConfig.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                <span>📅 الفترة: {reportConfig.dateRange.start} - {reportConfig.dateRange.end}</span>
                <span>📊 تم إنشاؤه: {new Date().toLocaleDateString('ar-IQ')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportToPDF} variant="outline" size="sm" className="bg-white">
                <Download className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
              <Button onClick={handleExportToExcel} variant="outline" size="sm" className="bg-white">
                <Download className="w-4 h-4 ml-2" />
                                  تصدير CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.isArray(reportData) && reportData.length > 0 && (
            <>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">إجمالي السجلات</p>
                      <p className="text-2xl font-bold text-green-800">{reportData.length}</p>
                    </div>
                    <div className="p-2 bg-green-200 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {reportData[0]?.total_revenue && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">إجمالي الإيرادات</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(
                            reportData.reduce((sum, item) => sum + (item.total_revenue || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-200 rounded-lg">
                        <DollarSign className="w-6 h-6 text-blue-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {reportData[0]?.total_sales && (
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">إجمالي المبيعات</p>
                        <p className="text-2xl font-bold text-purple-800">
                          {reportData.reduce((sum, item) => sum + (item.total_sales || 0), 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-purple-200 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-purple-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {reportData[0]?.unique_customers && (
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">العملاء الفريدون</p>
                        <p className="text-2xl font-bold text-orange-800">
                          {reportData.reduce((sum, item) => sum + (item.unique_customers || 0), 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-orange-200 rounded-lg">
                        <Users className="w-6 h-6 text-orange-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UITable className="w-5 h-5" />
              تفاصيل البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(reportData) && reportData.length > 0 ? (
              reportConfig.reportType === 'delegates' ? (
                // Delegate-specific table with expandable products
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <UITable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الاسم</TableHead>
                          <TableHead>الهاتف</TableHead>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>إجمالي المبيعات</TableHead>
                          <TableHead>إجمالي الإيرادات</TableHead>
                          <TableHead>متوسط قيمة البيع</TableHead>
                          <TableHead>العملاء الفريدون</TableHead>
                          <TableHead>آخر عملية بيع</TableHead>
                          <TableHead>المنتجات المباعة</TableHead>
                          <TableHead>سندات القبض</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((item: any, index) => (
                          <TableRow key={item.id || index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              {item.phone ? (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  {item.phone}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.email ? (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-500" />
                                  {item.email}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {item.total_sales || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(item.total_revenue || 0)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(item.avg_sale_value || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {item.unique_customers || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString('ar-IQ') : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                {item.products?.length || 0} منتج
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {item.customer_receipts?.length || 0} سند
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </UITable>
                  </div>

                  {/* Products Details for Each Delegate */}
                  {reportData.map((delegate: any) => (
                    <Card key={delegate.id} className="mt-4">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="w-5 h-5" />
                          المنتجات المباعة بواسطة: {delegate.name}
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {delegate.products?.length || 0} منتج
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {delegate.products && delegate.products.length > 0 ? (
                          <div className="overflow-x-auto">
                            <UITable>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>اسم المنتج</TableHead>
                                  <TableHead>رمز المنتج</TableHead>
                                  <TableHead>الباركود</TableHead>
                                  <TableHead>الكمية المباعة</TableHead>
                                  <TableHead>إجمالي الإيرادات</TableHead>
                                  <TableHead>متوسط السعر</TableHead>
                                  <TableHead>عدد المبيعات</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {delegate.products.map((product: any, productIndex: number) => (
                                  <TableRow key={product.product_id || productIndex} className="hover:bg-gray-50">
                                    <TableCell className="font-medium">{product.product_name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                        {product.product_sku}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {product.product_barcode ? (
                                        <span className="font-mono text-sm">{product.product_barcode}</span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        {product.total_quantity_sold}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-green-600">
                                      {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(product.total_revenue || 0)}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(product.avg_price || 0)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        {product.number_of_sales}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </UITable>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>لا توجد منتجات مباعة لهذا المندوب</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Customer Receipts Details for Each Delegate */}
                  {reportData.map((delegate: any) => (
                    <Card key={`receipts-${delegate.id}`} className="mt-4">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="w-5 h-5" />
                          سندات القبض للمندوب: {delegate.name}
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {delegate.customer_receipts?.length || 0} سند
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {delegate.customer_receipts && delegate.customer_receipts.length > 0 ? (
                          <div className="overflow-x-auto">
                            <UITable>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>رقم السند</TableHead>
                                  <TableHead>التاريخ</TableHead>
                                  <TableHead>العميل</TableHead>
                                  <TableHead>المبلغ</TableHead>
                                  <TableHead>طريقة الدفع</TableHead>
                                  <TableHead>ملاحظات</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {delegate.customer_receipts.map((receipt: any, receiptIndex: number) => (
                                  <TableRow key={receipt.receipt_id || receiptIndex} className="hover:bg-gray-50">
                                    <TableCell className="font-medium">
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        {receipt.receipt_number}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString('ar-IQ') : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">{receipt.customer_name}</div>
                                        {receipt.customer_phone && (
                                          <div className="text-sm text-gray-500 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {receipt.customer_phone}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-green-600">
                                      {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(receipt.amount || 0)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                        {receipt.payment_method === 'cash' ? 'نقدي' : 
                                         receipt.payment_method === 'card' ? 'بطاقة' :
                                         receipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                         receipt.payment_method === 'check' ? 'شيك' : receipt.payment_method}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                                      {receipt.notes || '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </UITable>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>لا توجد سندات قبض لهذا المندوب</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Generic table for other report types
                <div className="overflow-x-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>البريد الإلكتروني</TableHead>
                        <TableHead>إجمالي المبيعات</TableHead>
                        <TableHead>إجمالي الإيرادات</TableHead>
                        <TableHead>متوسط قيمة البيع</TableHead>
                        <TableHead>العملاء الفريدون</TableHead>
                        <TableHead>آخر عملية بيع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((item: any, index) => (
                        <TableRow key={item.id || index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                {item.phone}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                {item.email}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {item.total_sales || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(item.total_revenue || 0)}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(item.avg_sale_value || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {item.unique_customers || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString('ar-IQ') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد بيانات متاحة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Insights */}
        {Array.isArray(reportData) && reportData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                رؤى الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Performer */}
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                  <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-yellow-700" />
                  </div>
                  <h4 className="font-semibold text-yellow-800 mb-2">أفضل أداء</h4>
                  {(() => {
                    const topPerformer = reportData.reduce((max, item) => 
                      (item.total_revenue || 0) > (max.total_revenue || 0) ? item : max
                    );
                    return (
                      <div>
                        <p className="font-bold text-yellow-900">{topPerformer.name}</p>
                        <p className="text-sm text-yellow-700">
                          {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(topPerformer.total_revenue || 0)}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Average Performance */}
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-blue-700" />
                  </div>
                  <h4 className="font-semibold text-blue-800 mb-2">متوسط الأداء</h4>
                  <div>
                    <p className="font-bold text-blue-900">
                      {new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(
                        reportData.reduce((sum, item) => sum + (item.total_revenue || 0), 0) / reportData.length
                      )}
                    </p>
                    <p className="text-sm text-blue-700">متوسط الإيرادات</p>
                  </div>
                </div>

                {/* Total Customers */}
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-green-700" />
                  </div>
                  <h4 className="font-semibold text-green-800 mb-2">إجمالي العملاء</h4>
                  <div>
                    <p className="font-bold text-green-900">
                      {reportData.reduce((sum, item) => sum + (item.unique_customers || 0), 0)}
                    </p>
                    <p className="text-sm text-green-700">عميل فريد</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">منشئ التقارير المتقدم</h2>
          <p className="text-gray-600">إنشاء تقارير مخصصة ومتخصصة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSavedReports(!showSavedReports)} variant="outline">
            <Settings className="w-4 h-4 ml-2" />
            التقارير المحفوظة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات التقرير
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>اسم التقرير</Label>
                  <Input 
                    value={reportConfig.name}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم التقرير"
                  />
                </div>
                <div>
                  <Label>وصف التقرير</Label>
                  <Input 
                    value={reportConfig.description}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="أدخل وصف التقرير"
                  />
                </div>
              </div>

              <Separator />

              {/* Report Type */}
              <div>
                <Label>نوع التقرير</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {REPORT_TYPES.map(type => (
                    <Button
                      key={type.value}
                      variant={reportConfig.reportType === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleReportTypeChange(type.value)}
                      className="justify-start"
                    >
                      <type.icon className="w-4 h-4 ml-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date Range */}
              <div className="space-y-4">
                <div>
                  <Label>تاريخ البداية</Label>
                  <Input 
                    type="date"
                    value={reportConfig.dateRange.start}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>تاريخ النهاية</Label>
                  <Input 
                    type="date"
                    value={reportConfig.dateRange.end}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Filters */}
              {renderFilterSection()}

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <Button onClick={loadReportData} disabled={loading} className="w-full">
                  {loading ? 'جاري التحميل...' : 'تحميل البيانات'}
                </Button>
                <Button onClick={saveReportConfig} variant="outline" className="w-full">
                  حفظ التقرير
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Reports */}
          {showSavedReports && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>التقارير المحفوظة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedReports.map(report => (
                    <div key={report.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-gray-600">{report.description}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => loadSavedReport(report)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteSavedReport(report.id!)}>
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                معاينة التقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">جاري تحميل البيانات...</p>
                </div>
              ) : reportData ? (
                renderReportPreview()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>قم بتحديد إعدادات التقرير والضغط على "تحميل البيانات"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
