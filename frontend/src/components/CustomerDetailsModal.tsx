import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, FileText, CreditCard, Clock, CheckCircle, AlertCircle, XCircle, Download, RefreshCw } from "lucide-react";
import { Customer, CustomerDetails } from '@/features/customers/customersService';
import customersService from '@/features/customers/customersService';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

const CustomerDetailsModal = ({ open, onOpenChange, customer }: CustomerDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && customer) {
      loadCustomerData();
    } else if (!open) {
      // Reset state when modal closes
      resetState();
    }
  }, [open, customer]);

  const resetState = () => {
    setLoading(false);
    setCustomerDetails(null);
    setError(null);
  };

  const handleRefresh = () => {
    if (customer) {
      loadCustomerData();
    }
  };

  const loadCustomerData = async () => {
    if (!customer) return;
    
    setLoading(true);
    setError(null);
    
    try {
      
      
      // Use the optimized single API call
      const details = await customersService.getCustomerDetails(customer.id);
      
      setCustomerDetails(details);
      
    } catch (error) {
      console.error('❌ Error loading customer details:', error);
      
      // Provide more specific error messages
      let errorMessage = 'حدث خطأ أثناء تحميل بيانات العميل';
      
      if (error instanceof Error) {
        if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorMessage = 'خطأ في الاتصال بالخادم';
        } else if (error.message.includes('404')) {
          errorMessage = 'لم يتم العثور على بيانات العميل';
        } else if (error.message.includes('500')) {
          errorMessage = 'خطأ في الخادم';
        } else {
          errorMessage = `خطأ: ${error.message}`;
        }
      } else if (typeof error === 'object' && error !== null) {
        // Handle API error objects
        const apiError = error as any;
        if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      }
      
      setError(errorMessage);
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
      case 'pending':
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

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[95vh] w-[90vw] h-[95vh] overflow-y-auto flex flex-col justify-between ">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <DialogTitle className="text-center">تفاصيل العميل: {customer.name}</DialogTitle>
            <div></div>
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
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل بيانات العميل...</p>
            </div>
          </div>
        ) : customerDetails ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 overflow-y-auto">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">الملخص المالي</TabsTrigger>
              <TabsTrigger value="debts">
                الديون
                {customerDetails.debts.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {customerDetails.debts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="installments">
                الأقساط
                {customerDetails.installments.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {customerDetails.installments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bills">
                الفواتير
                {customerDetails.bills.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {customerDetails.bills.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                السجل
                {customerDetails.receipts.length > 0 && (
                  <Badge variant="secondary" className="mr-2 text-xs">
                    {customerDetails.receipts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Financial Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              {customerDetails.financialSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">إجمالي الفواتير</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(customerDetails.financialSummary.total_bills)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {customerDetails.financialSummary.total_bills_count} فاتورة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">إجمالي المدفوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(customerDetails.financialSummary.total_paid)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {customerDetails.financialSummary.paid_bills_count} فاتورة مدفوعة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">إجمالي الديون</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(customerDetails.financialSummary.total_debt)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {customerDetails.financialSummary.unpaid_bills_count} فاتورة غير مدفوعة
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">معلومات العميل</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">الهاتف:</span> {customerDetails.financialSummary.phone || 'غير محدد'}
                        </div>
                        <div>
                          <span className="font-medium">البريد الإلكتروني:</span> {customerDetails.financialSummary.email || 'غير محدد'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد بيانات مالية متاحة
                </div>
              )}
            </TabsContent>

            {/* Debts Tab */}
            <TabsContent value="debts" className="space-y-4">
              {customerDetails.debts.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ملخص الديون</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(customerDetails.debts.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي الديون المتبقية</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {customerDetails.debts.filter(d => d.status === 'partial').length}
                          </div>
                          <p className="text-sm text-gray-600">ديون مدفوعة جزئياً</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {customerDetails.debts.filter(d => d.status === 'pending').length}
                          </div>
                          <p className="text-sm text-gray-600">ديون غير مدفوعة</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {customerDetails.debts.map((debt) => (
                      <Card key={debt.sale_id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">فاتورة رقم: {debt.invoice_no}</span>
                                {getStatusBadge(debt.status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">إجمالي الفاتورة:</span>
                                  <span className="font-medium mr-2">{formatCurrency(debt.total_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المدفوع:</span>
                                  <span className="font-medium mr-2">{formatCurrency(debt.paid_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المتبقي:</span>
                                  <span className="font-medium mr-2 text-red-600">{formatCurrency(debt.remaining_amount)}</span>
                                </div>
                              </div>
                              {debt.due_date && (
                                <div className="mt-2 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  تاريخ الاستحقاق: {format(new Date(debt.due_date), 'dd/MM/yyyy', { locale: ar })}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد ديون لهذا العميل
                </div>
              )}
            </TabsContent>

            {/* Installments Tab */}
            <TabsContent value="installments" className="space-y-4">
              {customerDetails.installments.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ملخص الأقساط</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(customerDetails.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي قيمة الأقساط</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(customerDetails.installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي المدفوع</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(customerDetails.installments.reduce((sum, inst) => sum + ((inst.amount || 0) - (inst.paid_amount || 0)), 0))}
                          </div>
                          <p className="text-sm text-gray-600">المتبقي</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {customerDetails.installments.map((installment) => (
                      <Card key={installment.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">قسط رقم: {installment.id}</span>
                                {getStatusBadge(installment.payment_status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">قيمة القسط:</span>
                                  <span className="font-medium mr-2">{formatCurrency(installment.amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المدفوع:</span>
                                  <span className="font-medium mr-2">{formatCurrency(installment.paid_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المتبقي:</span>
                                  <span className="font-medium mr-2 text-red-600">{formatCurrency((installment.amount || 0) - (installment.paid_amount || 0))}</span>
                                </div>
                              </div>
                              {installment.due_date && (
                                <div className="mt-2 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  تاريخ الاستحقاق: {format(new Date(installment.due_date), 'dd/MM/yyyy', { locale: ar })}
                                </div>
                              )}
                              {installment.invoice_no && (
                                <div className="mt-1 text-sm text-gray-500">
                                  <FileText className="h-4 w-4 inline mr-1" />
                                  فاتورة: {installment.invoice_no}
                                </div>
                              )}
                              {installment.notes && (
                                <div className="mt-1 text-sm text-gray-500">
                                  ملاحظات: {installment.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد أقساط لهذا العميل
                </div>
              )}
            </TabsContent>

            {/* Bills Tab */}
            <TabsContent value="bills" className="space-y-4">
              {customerDetails.bills.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ملخص الفواتير</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(customerDetails.bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي قيمة الفواتير</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(customerDetails.bills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي المدفوع</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(customerDetails.bills.reduce((sum, bill) => sum + (bill.remaining_amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">المتبقي</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {customerDetails.bills.map((bill) => (
                      <Card key={bill.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">فاتورة رقم: {bill.invoice_no}</span>
                                {getStatusBadge(bill.payment_status)}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">إجمالي الفاتورة:</span>
                                  <span className="font-medium mr-2">{formatCurrency(bill.total_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المدفوع:</span>
                                  <span className="font-medium mr-2">{formatCurrency(bill.paid_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">المتبقي:</span>
                                  <span className="font-medium mr-2 text-red-600">{formatCurrency(bill.remaining_amount)}</span>
                                </div>
                              </div>
                              {bill.invoice_date && (
                                <div className="mt-2 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  تاريخ الفاتورة: {format(new Date(bill.invoice_date), 'dd/MM/yyyy', { locale: ar })}
                                </div>
                              )}
                              {bill.due_date && (
                                <div className="mt-1 text-sm text-gray-500">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  تاريخ الاستحقاق: {format(new Date(bill.due_date), 'dd/MM/yyyy', { locale: ar })}
                                </div>
                              )}
                              {bill.notes && (
                                <div className="mt-1 text-sm text-gray-500">
                                  ملاحظات: {bill.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد فواتير لهذا العميل
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {customerDetails.receipts.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ملخص المدفوعات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {customerDetails.receipts.length}
                          </div>
                          <p className="text-sm text-gray-600">عدد الإيصالات</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(customerDetails.receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0))}
                          </div>
                          <p className="text-sm text-gray-600">إجمالي المدفوع</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {formatCurrency(customerDetails.receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0) / customerDetails.receipts.length)}
                          </div>
                          <p className="text-sm text-gray-600">متوسط الدفع</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {customerDetails.receipts.map((receipt) => (
                      <Card key={receipt.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">إيصال رقم: {receipt.receipt_number}</span>
                                <div className="flex items-center gap-1">
                                  {getPaymentMethodIcon(receipt.payment_method)}
                                  <span className="text-sm text-gray-600">{receipt.payment_method}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">المبلغ:</span>
                                  <span className="font-medium mr-2 text-green-600">{formatCurrency(receipt.amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">تاريخ الدفع:</span>
                                  <span className="font-medium mr-2">{format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</span>
                                </div>
                              </div>
                              {receipt.sale_invoice_no && (
                                <div className="mt-1 text-sm text-gray-500">
                                  <FileText className="h-4 w-4 inline mr-1" />
                                  فاتورة: {receipt.sale_invoice_no}
                                </div>
                              )}
                              {receipt.reference_number && (
                                <div className="mt-1 text-sm text-gray-500">
                                  رقم المرجع: {receipt.reference_number}
                                </div>
                              )}
                              {receipt.notes && (
                                <div className="mt-1 text-sm text-gray-500">
                                  ملاحظات: {receipt.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد مدفوعات لهذا العميل
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsModal; 