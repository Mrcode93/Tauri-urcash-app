import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  User, 
  Package, 
  Calculator, 
  CreditCard, 
  Calendar,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building2,
  Users,
  DollarSign,
  Percent,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BillDetailsModalProps {
  bill: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BillDetailsModal: React.FC<BillDetailsModalProps> = ({ 
  bill, 
  open, 
  onOpenChange 
}) => {
  if (!bill) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount || 0);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">مدفوع جزئياً</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">غير مدفوع</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillTypeBadge = (type: string) => {
    switch (type) {
      case 'retail':
        return <Badge className="bg-blue-100 text-blue-800">تجزئة</Badge>;
      case 'wholesale':
        return <Badge className="bg-purple-100 text-purple-800">جملة</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقداً';
      case 'card':
        return 'بطاقة ائتمان';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'check':
        return 'شيك';
      default:
        return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل الفاتورة - {bill.invoice_no}
          </DialogTitle>
          <DialogDescription>
            عرض كافة تفاصيل الفاتورة والمنتجات والمدفوعات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                معلومات الفاتورة الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  رقم الفاتورة
                </div>
                <div className="font-medium">{bill.invoice_no}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  تاريخ الفاتورة
                </div>
                <div className="font-medium">{formatDate(bill.invoice_date)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  تاريخ الاستحقاق
                </div>
                <div className="font-medium">
                  {bill.due_date ? formatDate(bill.due_date) : 'غير محدد'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  نوع الفاتورة
                </div>
                <div>{getBillTypeBadge(bill.bill_type)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  طريقة الدفع
                </div>
                <div className="font-medium">{getPaymentMethodText(bill.payment_method)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  حالة الدفع
                </div>
                <div>{getPaymentStatusBadge(bill.payment_status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  اسم العميل
                </div>
                <div className="font-medium">{bill.customer_name}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف
                </div>
                <div className="font-medium">{bill.customer_phone || 'غير محدد'}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </div>
                <div className="font-medium">{bill.customer_email || 'غير محدد'}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  العنوان
                </div>
                <div className="font-medium">{bill.customer?.address || 'غير محدد'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          {(bill.delegate_name || bill.employee_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  معلومات المهنيين
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bill.delegate_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      المندوب
                    </div>
                    <div className="font-medium">
                      {bill.delegate_name}
                      {bill.delegate_phone && (
                        <span className="text-sm text-gray-500 block">
                          {bill.delegate_phone}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {bill.employee_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      الموظف المسؤول
                    </div>
                    <div className="font-medium">
                      {bill.employee_name}
                      {bill.employee_phone && (
                        <span className="text-sm text-gray-500 block">
                          {bill.employee_phone}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bill Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المنتجات ({bill.items?.length || 0} منتج)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bill.items && bill.items.length > 0 ? (
                <div className="space-y-3">
                  {bill.items.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">المنتج</div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">
                            {item.product_sku} - {item.product_barcode}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">الكمية</div>
                          <div className="font-medium">{item.quantity}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">السعر</div>
                          <div className="font-medium">{formatCurrency(item.price)}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">الإجمالي</div>
                          <div className="font-medium">{formatCurrency(item.total || item.quantity * item.price)}</div>
                        </div>
                      </div>
                      
                      {(item.discount > 0 || item.notes) && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                          {item.discount > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-600">الخصم</div>
                              <div className="font-medium text-red-600">
                                -{formatCurrency(item.discount)}
                              </div>
                            </div>
                          )}
                          
                          {item.notes && (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-600">ملاحظات</div>
                              <div className="text-sm">{item.notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد منتجات في هذه الفاتورة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                الإجماليات والمدفوعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                </div>
                
                {bill.discount_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الخصم:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(bill.discount_amount)}
                    </span>
                  </div>
                )}
                
                {bill.tax_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الضريبة:</span>
                    <span className="font-medium">{formatCurrency(bill.tax_amount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>الإجمالي:</span>
                  <span>{formatCurrency(bill.total_amount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">المبلغ المدفوع:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(bill.paid_amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center font-bold">
                  <span>المتبقي:</span>
                  <span className={bill.total_amount - bill.paid_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(bill.total_amount - bill.paid_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returns Information */}
          {bill.return_count && bill.return_count > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  معلومات الإرجاع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">عدد مرات الإرجاع:</span>
                    <Badge variant="destructive">{bill.return_count}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">إجمالي مبلغ الإرجاع:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(bill.total_returned_amount || 0)}
                    </span>
                  </div>
                  
                  {bill.last_return_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">آخر تاريخ إرجاع:</span>
                      <span className="font-medium">{formatDate(bill.last_return_date)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {bill.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{bill.notes}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillDetailsModal;
