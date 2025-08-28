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
import { Printer, Building2, FileText, Calendar, CreditCard, AlertCircle, RotateCcw } from "lucide-react";
import { AppDispatch, RootState } from "@/app/store";
import { getPurchase } from "@/features/purchases/purchasesSlice";
import { getPurchaseWithReturns } from "@/features/purchases/purchasesService";
import { getSupplier } from "@/features/suppliers/suppliersSlice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { PurchaseItem, Purchase } from "@/features/purchases/purchasesService";
import { Supplier } from "@/features/suppliers/suppliersService";
import PurchasePrintView from "@/components/PurchasePrintView";

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedPurchase: purchase, isLoading } = useSelector((state: RootState) => state.purchases);
  const { selectedSupplier: supplier } = useSelector((state: RootState) => state.suppliers);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [purchaseWithReturns, setPurchaseWithReturns] = useState<any>(null);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);

  useEffect(() => {
    if (id) {
      setIsLoadingReturns(true);
      // Fetch purchase with returns information
      getPurchaseWithReturns(parseInt(id))
        .then((data) => {
          setPurchaseWithReturns(data);
          // Fetch supplier data when purchase is loaded
          if (data.supplier_id) {
            dispatch(getSupplier(data.supplier_id));
          }
        })
        .catch((error) => {
          console.error('Error loading purchase:', error);
          toast.error('حدث خطأ أثناء تحميل تفاصيل المشتريات');
        })
        .finally(() => {
          setIsLoadingReturns(false);
        });
    }
  }, [dispatch, id]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
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

  // Calculate item total with discount and tax
  const calculateItemTotal = (item: PurchaseItem) => {
    const subtotal = item.quantity * item.price;
    const discount = subtotal * ((item.discount_percent || 0) / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * ((item.tax_percent || 0) / 100);
    return afterDiscount + tax;
  };

  // Calculate totals from items
  const calculateTotals = () => {
    if (!displayPurchase?.items) return { subtotal: 0, discount: 0, tax: 0, net: 0 };
    
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    displayPurchase.items.forEach(item => {
      const itemSubtotal = item.quantity * item.price;
      subtotal += itemSubtotal;
      
      const itemDiscount = itemSubtotal * ((item.discount_percent || 0) / 100);
      totalDiscount += itemDiscount;
      
      const afterDiscount = itemSubtotal - itemDiscount;
      const itemTax = afterDiscount * ((item.tax_percent || 0) / 100);
      totalTax += itemTax;
    });
    
    const net = subtotal - totalDiscount + totalTax;
    
    return { subtotal, discount: totalDiscount, tax: totalTax, net };
  };

  if (isLoading || isLoadingReturns) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-600">جاري تحميل تفاصيل المشتريات...</p>
        </div>
      </div>
    );
  }

  if (!purchase && !purchaseWithReturns) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="text-red-500 text-lg">لم يتم العثور على المشتريات</div>
        </div>
      </div>
    );
  }

  // Use purchaseWithReturns if available, otherwise fall back to purchase
  const displayPurchase = purchaseWithReturns || purchase;

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
              <h1 className="text-3xl font-bold text-gray-900">تفاصيل المشتريات</h1>
              <p className="text-gray-600">عرض تفاصيل فاتورة المشتريات</p>
            </div>
          </div>
          <Button 
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Printer className="w-5 h-5 ml-2" />
            طباعة الفاتورة
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details Card */}
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/90 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">فاتورة مشتريات</h2>
                    <p className="text-primary-100 mt-1">رقم الفاتورة: {displayPurchase.invoice_no}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(displayPurchase.payment_status)}`}>
                      {displayPurchase.payment_status === 'paid' ? 'مدفوع' :
                       displayPurchase.payment_status === 'partial' ? 'مدفوع جزئياً' :
                       'غير مدفوع'}
                    </div>
                    {purchaseWithReturns && purchaseWithReturns.status && (
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
                        purchaseWithReturns.status === 'returned' ? 
                          'bg-red-100 text-red-800 border-red-200' :
                          purchaseWithReturns.status === 'partially_returned' ?
                          'bg-orange-100 text-orange-800 border-orange-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {purchaseWithReturns.status === 'returned' ? 'مُرجع بالكامل' :
                         purchaseWithReturns.status === 'partially_returned' ? 'مُرجع جزئياً' :
                         'لا توجد إرجاعات'}
                      </div>
                    )}
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
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الكمية</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">السعر</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الخصم</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">الضريبة</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 py-4">المجموع</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayPurchase.items?.map((item, index) => (
                          <TableRow key={item.id} className="border-b border-gray-100 hover:bg-primary/5 transition-colors">
                            <TableCell className="text-right py-4 font-medium text-gray-900">{index + 1}</TableCell>
                            <TableCell className="text-right py-4">
                              <div>
                                <p className="font-semibold text-gray-900">{item.product_name}</p>
                                {item.product_sku && (
                                  <p className="text-sm text-gray-500 mt-1">SKU: {item.product_sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4 font-medium">{item.quantity}</TableCell>
                            <TableCell className="text-right py-4 font-medium">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right py-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {item.discount_percent || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {item.tax_percent || 0}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-4 font-bold text-gray-900">{formatCurrency(calculateItemTotal(item))}</TableCell>
                          </TableRow>
                        ))}
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
                      <div className="flex justify-between items-center py-3 border-t border-gray-200">
                        <span className="text-lg font-bold text-gray-900">الصافي:</span>
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(totals.net)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">المبلغ المدفوع:</span>
                        <span className="font-semibold text-primary">{formatCurrency(displayPurchase.paid_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-t border-gray-200">
                        <span className="text-lg font-bold text-gray-900">المبلغ المتبقي:</span>
                        <span className="text-xl font-bold text-orange-600">{formatCurrency(displayPurchase.remaining_amount || 0)}</span>
                      </div>
                      {purchaseWithReturns && purchaseWithReturns.return_stats && purchaseWithReturns.return_stats.total_returned_amount > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">المبلغ المرتجع:</span>
                          <span className="font-semibold text-red-600">{formatCurrency(purchaseWithReturns.return_stats.total_returned_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {displayPurchase.notes && (
                  <div className="mt-8 p-4 bg-primary/5 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-2">ملاحظات:</h3>
                    <p className="text-gray-700 leading-relaxed">{displayPurchase.notes}</p>
                  </div>
                )}

                {/* Returns Details */}
                {purchaseWithReturns && purchaseWithReturns.return_stats && purchaseWithReturns.return_stats.total_returns > 0 && (
                  <div className="mt-8">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-t-xl text-white">
                      <h3 className="font-semibold text-lg">تفاصيل الإرجاعات</h3>
                    </div>
                    <div className="border border-red-200 rounded-b-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table className="border-collapse">
                          <TableHeader>
                            <TableRow className="bg-red-50 hover:bg-red-50">
                              <TableHead className="text-right font-semibold text-gray-700 py-4">#</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 py-4">تاريخ الإرجاع</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 py-4">السبب</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 py-4">طريقة الاسترداد</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 py-4">المبلغ</TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 py-4">العناصر</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseWithReturns.return_stats.returns.map((returnRecord: any, index: number) => (
                              <TableRow key={returnRecord.id} className="border-b border-red-100 hover:bg-red-50 transition-colors">
                                <TableCell className="text-right py-4 font-medium text-gray-900">{index + 1}</TableCell>
                                <TableCell className="text-right py-4">
                                  {formatDate(returnRecord.return_date)}
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <span className="text-sm text-gray-700">{returnRecord.reason}</span>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {returnRecord.refund_method === 'cash' ? 'نقدي' : 'تحويل بنكي'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right py-4 font-bold text-red-600">
                                  {formatCurrency(returnRecord.total_amount)}
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <div className="space-y-1">
                                    {returnRecord.items?.map((item: any, itemIndex: number) => (
                                      <div key={itemIndex} className="text-xs text-gray-600">
                                        {item.product_name} - {item.quantity} قطعة
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Supplier Info */}
            <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/90 p-4 text-white">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Building2 className="w-6 h-6" />
                  <h3 className="font-semibold">معلومات المورد</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">الاسم</p>
                  <p className="font-semibold text-gray-900">{displayPurchase.supplier_name}</p>
                </div>
                {displayPurchase.supplier_contact && (
                  <div>
                    <p className="text-sm text-gray-500">المسؤول</p>
                    <p className="font-medium text-gray-900">{displayPurchase.supplier_contact}</p>
                  </div>
                )}
                {displayPurchase.supplier_phone && (
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium text-gray-900">{displayPurchase.supplier_phone}</p>
                  </div>
                )}
                {displayPurchase.supplier_email && (
                  <div>
                    <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium text-gray-900">{displayPurchase.supplier_email}</p>
                  </div>
                )}
                {displayPurchase.supplier_address && (
                  <div>
                    <p className="text-sm text-gray-500">العنوان</p>
                    <p className="font-medium text-gray-900">{displayPurchase.supplier_address}</p>
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
                  <p className="font-semibold text-gray-900">{formatDate(displayPurchase.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ الاستحقاق</p>
                  <p className="font-semibold text-gray-900">{formatDate(displayPurchase.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">طريقة الدفع</p>
                  <div className="flex items-center space-x-2 space-x-reverse mt-1">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <p className="font-medium text-gray-900">{getPaymentMethodText(displayPurchase.payment_method)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Returns Info */}
            {purchaseWithReturns && (
              <Card className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
                <div className={`p-4 text-white ${
                  purchaseWithReturns.status === 'returned' ? 
                    'bg-gradient-to-r from-red-500 to-red-600' :
                    purchaseWithReturns.status === 'partially_returned' ?
                    'bg-gradient-to-r from-orange-500 to-orange-600' :
                    'bg-gradient-to-r from-gray-500 to-gray-600'
                }`}>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <RotateCcw className="w-6 h-6" />
                    <h3 className="font-semibold">معلومات الإرجاعات</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">حالة الإرجاع</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                      purchaseWithReturns.status === 'returned' ? 
                        'bg-red-100 text-red-800' :
                        purchaseWithReturns.status === 'partially_returned' ?
                        'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                      {purchaseWithReturns.status === 'returned' ? 'مُرجع بالكامل' :
                       purchaseWithReturns.status === 'partially_returned' ? 'مُرجع جزئياً' :
                       'لا توجد إرجاعات'}
                    </div>
                  </div>
                  {purchaseWithReturns.return_stats && purchaseWithReturns.return_stats.total_returns > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">عدد الإرجاعات</p>
                        <p className="font-semibold text-gray-900">{purchaseWithReturns.return_stats.total_returns}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">إجمالي المبلغ المرتجع</p>
                        <p className="font-semibold text-red-600">{formatCurrency(purchaseWithReturns.return_stats.total_returned_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">عدد العناصر المرتجعة</p>
                        <p className="font-semibold text-gray-900">{purchaseWithReturns.return_stats.total_returned_items}</p>
                      </div>
                      {purchaseWithReturns.return_stats.last_return_date && (
                        <div>
                          <p className="text-sm text-gray-500">آخر إرجاع</p>
                          <p className="font-semibold text-gray-900">{formatDate(new Date(purchaseWithReturns.return_stats.last_return_date).toISOString())}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

      
      </div>

      {/* Print Modal */}
      <PurchasePrintView
        purchase={displayPurchase as Purchase}
        supplier={supplier}
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

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

export default PurchaseDetails;
