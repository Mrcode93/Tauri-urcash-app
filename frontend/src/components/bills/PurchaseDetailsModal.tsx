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
  Truck,
  DollarSign,
  Percent,
  Receipt,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PurchaseDetailsModalProps {
  purchase: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ 
  purchase, 
  open, 
  onOpenChange 
}) => {
  if (!purchase) return null;

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
      currency: 'د.ع'
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
            <ShoppingCart className="h-5 w-5" />
            تفاصيل فاتورة الشراء - {purchase.invoice_no}
          </DialogTitle>
          <DialogDescription>
            عرض كافة تفاصيل فاتورة الشراء والمنتجات والمدفوعات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Header Information */}
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
                <div className="font-medium">{purchase.invoice_no}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  تاريخ الفاتورة
                </div>
                <div className="font-medium">{formatDate(purchase.invoice_date)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  تاريخ الاستحقاق
                </div>
                <div className="font-medium">
                  {purchase.due_date ? formatDate(purchase.due_date) : 'غير محدد'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  طريقة الدفع
                </div>
                <div className="font-medium">{getPaymentMethodText(purchase.payment_method)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  حالة الدفع
                </div>
                <div>{getPaymentStatusBadge(purchase.payment_status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                معلومات المورد
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  اسم المورد
                </div>
                <div className="font-medium">{purchase.supplier_name}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف
                </div>
                <div className="font-medium">{purchase.supplier_phone || 'غير محدد'}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </div>
                <div className="font-medium">{purchase.supplier_email || 'غير محدد'}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  العنوان
                </div>
                <div className="font-medium">{purchase.supplier?.address || 'غير محدد'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المنتجات ({purchase.items?.length || 0} منتج)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchase.items && purchase.items.length > 0 ? (
                <div className="space-y-3">
                  {purchase.items.map((item: any, index: number) => (
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
                          <div className="text-sm text-gray-600">سعر الشراء</div>
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

          {/* Purchase Totals */}
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
                  <span className="font-medium">{formatCurrency(purchase.total_amount)}</span>
                </div>
                
                {purchase.discount_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الخصم:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(purchase.discount_amount)}
                    </span>
                  </div>
                )}
                
                {purchase.tax_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الضريبة:</span>
                    <span className="font-medium">{formatCurrency(purchase.tax_amount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>الإجمالي:</span>
                  <span>{formatCurrency(purchase.total_amount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">المبلغ المدفوع:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(purchase.paid_amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center font-bold">
                  <span>المتبقي:</span>
                  <span className={purchase.total_amount - purchase.paid_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(purchase.total_amount - purchase.paid_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {purchase.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{purchase.notes}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailsModal;
