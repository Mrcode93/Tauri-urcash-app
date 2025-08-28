import React, { useState } from 'react';
import { SaleData } from '@/types/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SaleReturnFormProps {
  sale: SaleData;
  onSubmit: (returnData: {
    items: Array<{
      sale_item_id: number;
      quantity: number;
      price: number;
    }>;
    reason: string;
    refund_method: string;
  }) => void;
  onCancel: () => void;
}

export const SaleReturnForm: React.FC<SaleReturnFormProps> = ({
  sale,
  onSubmit,
  onCancel
}) => {
  const [returnItems, setReturnItems] = useState<Array<{
    sale_item_id: number;
    quantity: number;
    price: number;
  }>>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');

  const handleQuantityChange = (itemId: number, quantity: number) => {
    const item = sale.items.find(i => i.id === itemId);
    if (!item) return;

    const newReturnItems = [...returnItems];
    const existingItemIndex = newReturnItems.findIndex(i => i.sale_item_id === itemId);

    if (quantity > item.quantity) {
      quantity = item.quantity;
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
        sale_item_id: itemId,
        quantity,
        price: item.unit_price
      });
    }

    setReturnItems(newReturnItems);
  };

  const calculateTotal = () => {
    return returnItems.reduce((total, item) => {
      const saleItem = sale.items.find(i => i.id === item.sale_item_id);
      if (!saleItem) return total;
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إرجاع المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sale.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product_name}</h4>
                  <p className="text-sm text-gray-500">
                    الكمية المتاحة: {item.quantity} | السعر: {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`quantity-${item.id}`}>الكمية:</Label>
                  <Input
                    id={`quantity-${item.id}`}
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={returnItems.find(i => i.sale_item_id === item.id)?.quantity || 0}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                </div>
              </div>
            ))}
          </div>
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

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <span className="font-medium">المبلغ الإجمالي:</span>
              <span className="text-lg font-bold mr-2">{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
              <Button type="submit" disabled={returnItems.length === 0}>
                تأكيد الإرجاع
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}; 