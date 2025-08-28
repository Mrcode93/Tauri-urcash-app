import React, { useState } from 'react';
import { Purchase, PurchaseItem } from '@/features/purchases/purchasesService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Package, ArrowLeft, AlertTriangle } from 'lucide-react';

interface PurchaseReturnFormProps {
  purchase: Purchase;
  onSubmit: (returnData: {
    items: Array<{
      purchase_item_id: number;
      quantity: number;
      price: number;
    }>;
    reason: string;
    refund_method: string;
  }) => void;
  onCancel: () => void;
}

export const PurchaseReturnForm: React.FC<PurchaseReturnFormProps> = ({
  purchase,
  onSubmit,
  onCancel
}) => {
  const [returnItems, setReturnItems] = useState<Array<{
    purchase_item_id: number;
    quantity: number;
    price: number;
  }>>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');

  const handleQuantityChange = (itemId: number, quantity: number) => {
    const item = purchase.items.find(i => i.id === itemId);
    if (!item) return;

    const newReturnItems = [...returnItems];
    const existingItemIndex = newReturnItems.findIndex(i => i.purchase_item_id === itemId);

    // Calculate remaining quantity (original - already returned)
    const alreadyReturned = item.returned_quantity || 0;
    const maxReturnable = item.quantity - alreadyReturned;

    if (quantity > maxReturnable) {
      quantity = maxReturnable;
    }

    if (existingItemIndex >= 0) {
      if (quantity === 0) {
        newReturnItems.splice(existingItemIndex, 1);
      } else {
        newReturnItems[existingItemIndex] = {
          ...newReturnItems[existingItemIndex],
          quantity
        };
      }
    } else if (quantity > 0) {
      newReturnItems.push({
        purchase_item_id: itemId,
        quantity,
        price: item.price
      });
    }

    setReturnItems(newReturnItems);
  };

  const calculateTotal = () => {
    return returnItems.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) return;

    onSubmit({
      items: returnItems,
      reason,
      refund_method: refundMethod
    });
  };

  const getRemainingQuantity = (item: PurchaseItem) => {
    const alreadyReturned = item.returned_quantity || 0;
    return item.quantity - alreadyReturned;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            إرجاع مشتريات - فاتورة #{purchase.invoice_no || 'غير محدد'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">المورد:</span> {purchase.supplier_name}
            </div>
            <div>
              <span className="font-medium">تاريخ الفاتورة:</span> {new Date(purchase.invoice_date).toLocaleDateString('ar-IQ')}
            </div>
            <div>
              <span className="font-medium">المبلغ الإجمالي:</span> {formatCurrency(purchase.net_amount)}
            </div>
            <div>
              <span className="font-medium">حالة الدفع:</span> {
                purchase.payment_status === 'paid' ? 'مدفوع' :
                purchase.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            المنتجات المراد إرجاعها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {purchase.items && purchase.items.length > 0 ? (
            purchase.items.map((item) => {
              const remainingQuantity = getRemainingQuantity(item);
              const isFullyReturned = remainingQuantity === 0;
              
              return (
                <div key={item.id} className={`p-4 border rounded-lg ${isFullyReturned ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-gray-500">SKU: {item.product_sku || 'غير محدد'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.price)}</p>
                      <p className="text-sm text-gray-500">لكل قطعة</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">الكمية الأصلية:</span>
                      <p className="font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">الكمية المرتجعة:</span>
                      <p className="font-medium text-red-600">{item.returned_quantity || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">المتبقي للإرجاع:</span>
                      <p className="font-medium text-green-600">{remainingQuantity}</p>
                    </div>
                  </div>

                  {!isFullyReturned && (
                    <div className="mt-3">
                      <Label htmlFor={`quantity-${item.id}`} className="text-sm font-medium">
                        كمية الإرجاع:
                      </Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="0"
                        max={remainingQuantity}
                        value={returnItems.find(i => i.purchase_item_id === item.id)?.quantity || 0}
                        onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                        className="mt-1 w-32"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {isFullyReturned && (
                    <div className="mt-2 flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">تم إرجاع جميع الكميات لهذا المنتج</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد منتجات في هذه المشتريات</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الإرجاع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب الإرجاع:</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="يرجى تحديد سبب إرجاع المنتجات"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-method">طريقة الاسترداد:</Label>
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة الاسترداد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="card">بطاقة ائتمان</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Return Summary */}
          {returnItems.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">ملخص الإرجاع</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>عدد المنتجات المراد إرجاعها:</span>
                  <span className="font-medium">{returnItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي الكمية:</span>
                  <span className="font-medium">{returnItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-orange-700">
                  <span>المبلغ الإجمالي للإرجاع:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <span className="font-medium">المبلغ الإجمالي للإرجاع:</span>
              <span className="text-lg font-bold mr-2 text-red-600">{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={returnItems.length === 0 || !reason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                تأكيد الإرجاع
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}; 