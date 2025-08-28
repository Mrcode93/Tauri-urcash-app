import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, Building2, FileText, Calendar, CreditCard, AlertCircle, User, RotateCcw } from "lucide-react";
import { AppDispatch, RootState } from "@/app/store";
import { getSale } from "@/features/sales/salesSlice";
import { getCustomer } from "@/features/customers/customersSlice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { SaleData } from "@/types/sales";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SaleReturnForm } from '@/components/SaleReturnForm';
import { returnSale } from '@/features/sales/salesSlice';
import SalePrintView from '@/components/SalePrintView';

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedSale: sale, loading: isLoading, error } = useSelector((state: RootState) => state.sales);
  const { selectedCustomer: customer } = useSelector((state: RootState) => state.customers);
  
  // Debug logging
  useEffect(() => {
    
    if (sale) {
      
      
      
    }
  }, [sale, isLoading, error]);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Helper function to check if customer is anonymous
  const isAnonymousCustomer = (customerData: any) => {
    return customerData?.customer_id === 999 || 
           customerData?.customer_name?.toLowerCase() === 'anonymous' ||
           customerData?.name?.toLowerCase() === 'anonymous';
  };

  useEffect(() => {
    if (id) {
      
      dispatch(getSale(parseInt(id)))
        .unwrap()
        .then((data) => {
          
          if (data.customer_id) {
            
            dispatch(getCustomer(data.customer_id));
          }
        })
        .catch((error) => {
          console.error('Error loading sale:', error);
          toast.error('حدث خطأ أثناء تحميل بيانات المبيعة');
        });
    }
  }, [dispatch, id]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleReturn = async (returnData: {
    items: Array<{
      sale_item_id: number;
      quantity: number;
      price: number;
    }>;
    reason: string;
    refund_method: string;
  }) => {
    if (!id) return;

    try {
      const result = await dispatch(returnSale({ id: parseInt(id), returnData })).unwrap();
      toast.success('تم إرجاع المبيعة بنجاح');
      setIsReturnModalOpen(false);
      
      toast.info(
        `تم إرجاع المبيعة بنجاح. المبلغ المرتجع: ${formatCurrency(result.total_amount || 0)}`
      );
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إرجاع المبيعة');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-primary bg-primary/10 border-primary/20";
      case "unpaid":
        return "text-red-700 bg-red-50 border-red-200";
      case "partial":
        return "text-amber-700 bg-amber-50 border-amber-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cash":
        return "نقدي";
      case "card":
        return "بطاقة";
      case "bank_transfer":
        return "تحويل بنكي";
      default:
        return method;
    }
  };

  const getSaleStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "مكتملة";
      case "returned":
        return "مرتجعة كلياً";
      case "partially_returned":
        return "مرتجعة جزئياً";
      case "pending":
        return "معلقة";
      case "cancelled":
        return "ملغية";
      default:
        return status;
    }
  };

  const getSaleStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-primary bg-primary/10 border-primary/20";
      case "returned":
        return "text-red-700 bg-red-50 border-red-200";
      case "partially_returned":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "pending":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "cancelled":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  // Calculate item total with returns
  const calculateItemTotal = (item: any) => {
    const returnedQuantity = item.returned_quantity || 0;
    const remainingQuantity = item.quantity - returnedQuantity;
    return remainingQuantity * item.price;
  };

  // Calculate totals from items
  const calculateTotals = () => {
    if (!sale?.items) return { subtotal: 0, discount: 0, tax: 0, net: 0, returns: 0 };
    
    let subtotal = 0;
    let totalReturns = 0;
    
    sale.items.forEach(item => {
      const itemSubtotal = item.quantity * item.price;
      subtotal += itemSubtotal;
      
      const returnedQuantity = item.returned_quantity || 0;
      const returnedAmount = returnedQuantity * item.price;
      totalReturns += returnedAmount;
    });
    
    const discount = sale.discount_amount || 0;
    const tax = sale.tax_amount || 0;
    const net = subtotal - discount + tax - totalReturns;
    
    return { subtotal, discount, tax, net, returns: totalReturns };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل المبيعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="text-red-500 text-lg">حدث خطأ في تحميل بيانات المبيعة</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="text-red-500 text-lg">لم يتم العثور على المبيعة</div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">تفاصيل المبيعة</h1>
              <p className="text-gray-600">عرض تفاصيل فاتورة المبيعة</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            {sale?.status === 'completed' && (
              <Button 
                onClick={() => setIsReturnModalOpen(true)}
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <RotateCcw className="w-5 h-5 ml-2" />
                إرجاع
              </Button>
            )}
            <Button 
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Printer className="w-5 h-5 ml-2" />
              طباعة الفاتورة
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details Card */}
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/90 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">فاتورة مبيعة</h2>
                    <p className="text-primary-100 mt-1">رقم الفاتورة: {sale.invoice_no}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(sale.payment_status)}`}>
                      {sale.payment_status === 'paid' ? 'مدفوع' :
                       sale.payment_status === 'partial' ? 'مدفوع جزئياً' :
                       'غير مدفوع'}
                    </div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getSaleStatusColor(sale.status)}`}>
                      {getSaleStatusText(sale.status)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Items Table */}
                <div className="mb-8">
                  <div className="overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-primary/5 hover:bg-primary/5">
                          <TableHead className="text-right font-semibold text-gray-700 py-4">#</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">المنتج</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الكمية الأصلية</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الكمية المتبقية</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">السعر</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items?.map((item, index) => {
                          const returnedQuantity = item.returned_quantity || 0;
                          const remainingQuantity = item.quantity - returnedQuantity;
                          const totalAmount = calculateItemTotal(item);

                          return (
                            <TableRow key={item.id} className="border-b border-gray-100 hover:bg-primary/5 transition-colors">
                              <TableCell className="text-right py-4 font-medium text-gray-900">{index + 1}</TableCell>
                              <TableCell className="text-right py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">{item.product_name}</p>
                                  {item.sku && (
                                    <p className="text-sm text-gray-500 mt-1">SKU: {item.sku}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4 font-medium">{item.quantity}</TableCell>
                              <TableCell className="text-right py-4">
                                <div className="flex items-center space-x-2 space-x-reverse">
                                  <span className="font-medium">{remainingQuantity}</span>
                                  {returnedQuantity > 0 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      -{returnedQuantity}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4 font-medium">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right py-4 font-bold text-gray-900">{formatCurrency(totalAmount)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">المجموع:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">الخصم:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(totals.discount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">الضريبة:</span>
                        <span className="font-semibold text-primary">{formatCurrency(totals.tax)}</span>
                      </div>
                      {totals.returns > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">المرتجعات:</span>
                          <span className="font-semibold text-red-600">-{formatCurrency(totals.returns)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 border-t border-gray-200">
                        <span className="text-lg font-bold text-gray-900">الصافي:</span>
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(totals.net)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">المبلغ المدفوع:</span>
                        <span className="font-semibold text-primary">{formatCurrency(sale.paid_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-t border-gray-200">
                        <span className="text-lg font-bold text-gray-900">المبلغ المتبقي:</span>
                        <span className="text-xl font-bold text-orange-600">{formatCurrency(sale.remaining_amount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {sale.notes && (
                  <div className="mt-8 p-4 bg-primary/5 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-2">ملاحظات:</h3>
                    <p className="text-gray-700 leading-relaxed">{sale.notes}</p>
                  </div>
                )}

                {/* Return History */}
                {(sale.status === 'returned' || sale.status === 'partially_returned') && sale.returns && sale.returns.length > 0 && (
                  <div className="mt-8 p-4 bg-red-50 rounded-xl border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-4 flex items-center">
                      <RotateCcw className="w-5 h-5 ml-2" />
                      سجل المرتجعات
                    </h3>
                    <div className="space-y-4">
                      {sale.returns.map((returnRecord: any) => (
                        <div key={returnRecord.id} className="bg-white p-4 rounded-lg border border-red-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900">تاريخ الإرجاع: {formatDate(returnRecord.return_date)}</p>
                              <p className="text-sm text-gray-600 mt-1">سبب الإرجاع: {returnRecord.reason}</p>
                            </div>
                            <Badge variant="outline" className="text-red-700 border-red-300">
                              {formatCurrency(returnRecord.total_amount)}
                            </Badge>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-red-50">
                                  <TableHead className="text-right text-sm">المنتج</TableHead>
                                  <TableHead className="text-right text-sm">الكمية</TableHead>
                                  <TableHead className="text-right text-sm">السعر</TableHead>
                                  <TableHead className="text-right text-sm">الإجمالي</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {returnRecord.items.map((item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-right text-sm">{item.product_name}</TableCell>
                                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                    <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-right text-sm font-medium">{formatCurrency(item.total)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/90 p-4 text-white">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <User className="w-6 h-6" />
                  <h3 className="font-semibold">معلومات العميل</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">الاسم</p>
                  <p className="font-semibold text-gray-900">
                    {isAnonymousCustomer(sale) || isAnonymousCustomer(customer) ? 'عميل نقدي' : 
                     customer?.name || sale.customer_name || 'غير محدد'}
                  </p>
                </div>
                {customer?.phone && customer.phone !== 'anonymous' && !isAnonymousCustomer(customer) && (
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium text-gray-900">{customer.phone}</p>
                  </div>
                )}
                {customer?.email && customer.email !== 'anonymous' && !isAnonymousCustomer(customer) && (
                  <div>
                    <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium text-gray-900">{customer.email}</p>
                  </div>
                )}
                {customer?.address && customer.address !== 'anonymous' && !isAnonymousCustomer(customer) && (
                  <div>
                    <p className="text-sm text-gray-500">العنوان</p>
                    <p className="font-medium text-gray-900">{customer.address}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Invoice Info */}
            <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/90 p-4 text-white">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Calendar className="w-6 h-6" />
                  <h3 className="font-semibold">معلومات الفاتورة</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">تاريخ الفاتورة</p>
                  <p className="font-semibold text-gray-900">{formatDate(sale.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ الاستحقاق</p>
                  <p className="font-semibold text-gray-900">{formatDate(sale.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">طريقة الدفع</p>
                  <div className="flex items-center space-x-2 space-x-reverse mt-1">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <p className="font-medium text-gray-900">{getPaymentMethodText(sale.payment_method)}</p>
                  </div>
                </div>
                {sale.barcode && (
                  <div>
                    <p className="text-sm text-gray-500">الباركود</p>
                    <p className="font-mono text-sm font-medium text-gray-900">{sale.barcode}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 print:hidden">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto">
            <p className="text-gray-600 mb-2">شكراً لتعاملكم معنا</p>
            <p className="text-sm text-gray-500">هذه الفاتورة صالحة لمدة 30 يوم من تاريخ الإصدار</p>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <SalePrintView
        sale={sale as unknown as SaleData}
        customer={customer}
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Return Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">إرجاع المبيعة</DialogTitle>
          </DialogHeader>
          {sale && (
            <SaleReturnForm
              sale={sale as unknown as SaleData}
              onSubmit={handleReturn}
              onCancel={() => setIsReturnModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-6xl, .max-w-6xl * {
            visibility: visible;
          }
          .max-w-6xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SaleDetails;