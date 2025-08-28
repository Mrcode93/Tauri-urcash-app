import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, FileText, TrendingUp, Package, AlertTriangle, Download, BarChart3 } from 'lucide-react';
import { generateMonthlyInventoryReport, generateYearlyInventoryReport, generateCustomInventoryReport } from '@/features/inventory/inventoryService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface InventoryReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReportType = 'monthly' | 'yearly' | 'custom';

interface ReportData {
  period: {
    type: string;
    year?: number;
    month?: number;
    start_date: string;
    end_date: string;
    month_name?: string;
  };
  summary: {
    total_products: number;
    total_stock_value: number;
    low_stock_products: number;
    out_of_stock_products: number;
    total_movements: number;
    purchases_count: number;
    sales_count: number;
    adjustments_count: number;
    returns_count: number;
  };
  movements?: Array<{
    product_id: number;
    movement_type: string;
    quantity: number;
    created_at: string;
    product_name: string;
  }>;
  current_inventory?: Array<{
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    stock_quantity: number;
    stock_value: number;
  }>;
  beginning_inventory?: Array<{
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    stock_quantity: number;
    stock_value: number;
  }>;
  ending_inventory?: Array<{
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    stock_quantity: number;
    stock_value: number;
  }>;
  monthly_breakdown?: Array<{
    month: number;
    month_name: string;
    movements: Array<{
      movement_type: string;
      count: number;
      total_quantity: number;
    }>;
    inventory: {
      total_products: number;
      total_stock: number;
      total_value: number;
      low_stock: number;
      out_of_stock: number;
    };
  }>;
  yearly_summary?: {
    movements: Array<{
      movement_type: string;
      count: number;
      total_quantity: number;
    }>;
    inventory: {
      total_products: number;
      total_stock: number;
      total_value: number;
      low_stock: number;
      out_of_stock: number;
    };
  };
  top_products?: Array<{
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    movement_count: number;
    total_purchased: number;
    total_sold: number;
    total_adjusted: number;
    current_stock: number;
  }>;
}

const InventoryReportsModal: React.FC<InventoryReportsModalProps> = ({ open, onOpenChange }) => {
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      let data: ReportData;

      switch (reportType) {
        case 'monthly':
          data = await generateMonthlyInventoryReport(year, month);
          break;
        case 'yearly':
          data = await generateYearlyInventoryReport(year);
          break;
        case 'custom':
          if (!startDate || !endDate) {
            toast.error('يرجى تحديد تاريخ البداية والنهاية');
            return;
          }
          data = await generateCustomInventoryReport(startDate, endDate);
          break;
        default:
          throw new Error('نوع التقرير غير صحيح');
      }

      // Ensure data has the expected structure
      if (!data) {
        throw new Error('No data received from server');
      }
      
      // Ensure summary exists
      if (!data.summary) {
        data.summary = {
          total_products: 0,
          total_stock_value: 0,
          low_stock_products: 0,
          out_of_stock_products: 0,
          total_movements: 0,
          purchases_count: 0,
          sales_count: 0,
          adjustments_count: 0,
          returns_count: 0
        };
      }

      setReportData(data);
      toast.success('تم إنشاء التقرير بنجاح');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = generateReportContent();
    const blob = new Blob([reportContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${reportType}_${year}_${month || ''}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReportContent = () => {
    if (!reportData) return '';

    let content = `تقرير المنتجات - ${reportData.period.type}\n`;
    content += `الفترة: ${reportData.period.start_date} إلى ${reportData.period.end_date}\n\n`;
    
    content += `الملخص:\n`;
    content += `إجمالي المنتجات: ${reportData.summary?.total_products || 0}\n`;
    content += `قيمة المخزون: ${formatCurrency(reportData.summary?.total_stock_value || 0)}\n`;
    content += `المنتجات منخفضة المخزون: ${reportData.summary?.low_stock_products || 0}\n`;
    content += `المنتجات نافدة المخزون: ${reportData.summary?.out_of_stock_products || 0}\n`;
    content += `إجمالي الحركات: ${reportData.summary?.total_movements || 0}\n\n`;

    if (reportData.current_inventory) {
      content += `المخزون الحالي:\n`;
      content += `الاسم,الباركود,الوحدة,الكمية,سعر الشراء,قيمة المخزون\n`;
      reportData.current_inventory.forEach(item => {
        content += `${item.name},${item.barcode || ''},${item.unit},${item.stock_quantity},${item.purchase_price},${item.stock_value}\n`;
      });
    }

    return content;
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تقارير المنتجات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                نوع التقرير
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع التقرير</Label>
                  <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">تقرير شهري</SelectItem>
                      <SelectItem value="yearly">تقرير سنوي</SelectItem>
                      <SelectItem value="custom">تقرير مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reportType === 'monthly' && (
                  <>
                    <div className="space-y-2">
                      <Label>السنة</Label>
                      <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        min="1900"
                        max="2100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الشهر</Label>
                      <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <SelectItem key={m} value={m.toString()}>
                              {getMonthName(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {reportType === 'yearly' && (
                  <div className="space-y-2">
                    <Label>السنة</Label>
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      min="1900"
                      max="2100"
                    />
                  </div>
                )}

                {reportType === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label>تاريخ البداية</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ النهاية</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <Button 
                onClick={generateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'جاري إنشاء التقرير...' : 'إنشاء التقرير'}
              </Button>
            </CardContent>
          </Card>

          {/* Report Results */}
          {reportData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    نتائج التقرير
                  </CardTitle>
                  <Button onClick={exportReport} variant="outline" size="sm">
                    <Download className="h-4 w-4 ml-2" />
                    تصدير
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">معلومات الفترة</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">النوع:</span>
                      <span className="mr-2">{reportData.period.type === 'monthly' ? 'شهري' : reportData.period.type === 'yearly' ? 'سنوي' : 'مخصص'}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">من:</span>
                      <span className="mr-2">{formatDate(reportData.period.start_date)}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">إلى:</span>
                      <span className="mr-2">{formatDate(reportData.period.end_date)}</span>
                    </div>
                    {reportData.period.month_name && (
                      <div>
                        <span className="text-blue-600">الشهر:</span>
                        <span className="mr-2">{reportData.period.month_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">إجمالي المنتجات</p>
                          <p className="text-lg font-bold">{reportData.summary?.total_products || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">قيمة المخزون</p>
                          <p className="text-lg font-bold">{formatCurrency(reportData.summary?.total_stock_value || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-sm text-gray-600">منخفضة المخزون</p>
                          <p className="text-lg font-bold">{reportData.summary?.low_stock_products || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-600">نافدة المخزون</p>
                          <p className="text-lg font-bold">{reportData.summary?.out_of_stock_products || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Movements Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>ملخص الحركات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600">المشتريات</p>
                        <p className="text-lg font-bold text-green-700">{reportData.summary?.purchases_count || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">المبيعات</p>
                        <p className="text-lg font-bold text-blue-700">{reportData.summary?.sales_count || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600">التعديلات</p>
                        <p className="text-lg font-bold text-orange-700">{reportData.summary?.adjustments_count || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600">المرتجعات</p>
                        <p className="text-lg font-bold text-purple-700">{reportData.summary?.returns_count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Inventory Table */}
                {reportData.current_inventory && reportData.current_inventory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>المخزون الحالي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الاسم</TableHead>
                              <TableHead>الباركود</TableHead>
                              <TableHead>الوحدة</TableHead>
                              <TableHead>الكمية</TableHead>
                              <TableHead>سعر الشراء</TableHead>
                              <TableHead>قيمة المخزون</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.current_inventory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.barcode || '-'}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{item.stock_quantity}</span>
                                    {item.stock_quantity <= 10 && item.stock_quantity > 0 && (
                                      <Badge variant="destructive" className="text-xs">منخفض</Badge>
                                    )}
                                    {item.stock_quantity === 0 && (
                                      <Badge variant="destructive" className="text-xs">نافد</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{formatCurrency(item.purchase_price)}</TableCell>
                                <TableCell className="font-bold">{formatCurrency(item.stock_value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Breakdown for Yearly Reports */}
                {reportData.monthly_breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle>التفصيل الشهري</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الشهر</TableHead>
                              <TableHead>إجمالي المنتجات</TableHead>
                              <TableHead>إجمالي المخزون</TableHead>
                              <TableHead>قيمة المخزون</TableHead>
                              <TableHead>منخفضة المخزون</TableHead>
                              <TableHead>نافدة المخزون</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.monthly_breakdown.map((month, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{month.month_name}</TableCell>
                                <TableCell>{month.inventory?.total_products || 0}</TableCell>
                                <TableCell>{month.inventory?.total_stock || 0}</TableCell>
                                <TableCell>{formatCurrency(month.inventory?.total_value || 0)}</TableCell>
                                <TableCell>{month.inventory?.low_stock || 0}</TableCell>
                                <TableCell>{month.inventory?.out_of_stock || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryReportsModal; 