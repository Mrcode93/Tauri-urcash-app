import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, FileText, CreditCard, Clock, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { Supplier } from '@/features/suppliers/suppliersService';
import { SupplierPaymentReceipt, SupplierPurchase, SupplierPaymentReceiptSummary, supplierPaymentReceiptsService } from '@/features/supplierPaymentReceipts/supplierPaymentReceiptsService';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SupplierDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

const SupplierDetailsModal = ({ open, onOpenChange, supplier }: SupplierDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [receipts, setReceipts] = useState<SupplierPaymentReceipt[]>([]);
  const [financialSummary, setFinancialSummary] = useState<SupplierPaymentReceiptSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && supplier) {
      loadSupplierData();
    }
  }, [open, supplier]);

  const handleRefresh = () => {
    if (supplier) {
      loadSupplierData();
    }
  };

  const loadSupplierData = async () => {
    if (!supplier) return;
    
    setLoading(true);
    setError(null);
    try {
      
      
      const [
        purchasesData,
        receiptsData,
        summaryData
      ] = await Promise.all([
        supplierPaymentReceiptsService.getSupplierPurchases(supplier.id),
        supplierPaymentReceiptsService.getAll({ supplier_id: supplier.id }),
        supplierPaymentReceiptsService.getSupplierSummary(supplier.id)
      ]);

      
      
      

      setPurchases(purchasesData || []);
      setReceipts(receiptsData.data || []);
      setFinancialSummary(summaryData);
    } catch (error) {
      console.error('❌ Error loading supplier data:', error);
      setError('حدث خطأ أثناء تحميل بيانات المورد');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />مدفوع</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />مدفوع جزئياً</Badge>;
      case 'unpaid':
        return <Badge variant="default" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />غير مدفوع</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <FileText className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <DialogTitle className="text-right">تفاصيل المورد: {supplier.name}</DialogTitle>
          </div>
        </DialogHeader>

        {error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">الملخص المالي</TabsTrigger>
              <TabsTrigger value="purchases">
                المشتريات
                {purchases.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {purchases.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bills">
                الفواتير
                {purchases.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {purchases.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                السجل
                {receipts.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {receipts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Financial Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              {financialSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">إجمالي الإيصالات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {financialSummary.total_receipts}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        إيصال دفع
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">إجمالي المدفوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialSummary.total_amount)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        إجمالي المدفوع للمورد
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">أول إيصال</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {financialSummary.first_receipt_date ? format(new Date(financialSummary.first_receipt_date), 'dd MMM yyyy', { locale: ar }) : 'غير محدد'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        تاريخ أول إيصال
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">معلومات المورد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">الهاتف:</span> {supplier.phone}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">البريد الإلكتروني:</span> {supplier.email}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">العنوان:</span> {supplier.address}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">المسؤول:</span> {supplier.contact_person}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Purchases Tab */}
            <TabsContent value="purchases" className="space-y-4">
              {purchases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">ملخص المشتريات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي قيمة المشتريات</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.paid_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي المدفوع</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.remaining_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي المتبقي</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    جميع المشتريات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length > 0 ? (
                    <div className="space-y-4">
                      {purchases.map((purchase) => (
                        <div key={purchase.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">فاتورة رقم: {purchase.invoice_no}</h4>
                              <p className="text-sm text-gray-600">
                                تاريخ الفاتورة: {format(new Date(purchase.invoice_date), 'dd MMM yyyy', { locale: ar })}
                              </p>
                            </div>
                            {getStatusBadge(purchase.payment_status)}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">إجمالي المبلغ:</span>
                              <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">المدفوع:</span>
                              <div className="font-medium text-green-600">{formatCurrency(purchase.paid_amount)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">المتبقي:</span>
                              <div className="font-medium text-red-600">{formatCurrency(purchase.remaining_amount)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد مشتريات لهذا المورد
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bills Tab (Same as Purchases for suppliers) */}
            <TabsContent value="bills" className="space-y-4">
              {purchases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">ملخص الفواتير</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي قيمة الفواتير</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.paid_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي المدفوع</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.remaining_amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي المتبقي</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    جميع الفواتير
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length > 0 ? (
                    <div className="space-y-4">
                      {purchases.map((purchase) => (
                        <div key={purchase.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">فاتورة رقم: {purchase.invoice_no}</h4>
                              <p className="text-sm text-gray-600">
                                تاريخ الفاتورة: {format(new Date(purchase.invoice_date), 'dd MMM yyyy', { locale: ar })}
                              </p>
                            </div>
                            {getStatusBadge(purchase.payment_status)}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">إجمالي المبلغ:</span>
                              <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">المدفوع:</span>
                              <div className="font-medium text-green-600">{formatCurrency(purchase.paid_amount)}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">المتبقي:</span>
                              <div className="font-medium text-red-600">{formatCurrency(purchase.remaining_amount)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد فواتير لهذا المورد
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {receipts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">ملخص المدفوعات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {receipts.length}
                        </div>
                        <p className="text-xs text-gray-500">عدد الإيصالات</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(receipts.reduce((sum, receipt) => sum + receipt.amount, 0))}
                        </div>
                        <p className="text-xs text-gray-500">إجمالي المدفوع</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(receipts.reduce((sum, receipt) => sum + receipt.amount, 0) / receipts.length)}
                        </div>
                        <p className="text-xs text-gray-500">متوسط المدفوع</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    سجل المدفوعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {receipts.length > 0 ? (
                    <div className="space-y-4">
                      {receipts.map((receipt) => (
                        <div key={receipt.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">إيصال رقم: {receipt.receipt_number}</h4>
                              <p className="text-sm text-gray-600">
                                تاريخ الدفع: {format(new Date(receipt.receipt_date), 'dd MMM yyyy', { locale: ar })}
                                {receipt.purchase_invoice_no && (
                                  <span className="mr-4">
                                    | فاتورة: {receipt.purchase_invoice_no}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(receipt.payment_method)}
                              <span className="text-sm font-medium">{formatCurrency(receipt.amount)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">طريقة الدفع:</span>
                              <div className="font-medium">
                                {receipt.payment_method === 'cash' ? 'نقداً' :
                                 receipt.payment_method === 'card' ? 'بطاقة ائتمان' :
                                 receipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                 receipt.payment_method === 'check' ? 'شيك' : receipt.payment_method}
                              </div>
                            </div>
                            {receipt.reference_number && (
                              <div>
                                <span className="text-gray-600">رقم المرجع:</span>
                                <div className="font-medium">{receipt.reference_number}</div>
                              </div>
                            )}
                          </div>
                          {receipt.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">ملاحظات:</span> {receipt.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      لا يوجد سجل مدفوعات لهذا المورد
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupplierDetailsModal; 