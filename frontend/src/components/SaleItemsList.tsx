import React from 'react';
import { formatCurrency } from '@/lib/utils';
import type { SaleItem } from '@/features/sales/salesService';

interface SaleItemsListProps {
  items: SaleItem[];
  showTotals?: boolean;
}

export const SaleItemsList: React.FC<SaleItemsListProps> = ({ 
  items,
  showTotals = true 
}) => {
  const calculateItemTotal = (item: SaleItem) => {
    const baseTotal = item.quantity * item.price;
    const discount = (baseTotal * (item.discount_percent || 0)) / 100;
    const tax = (baseTotal * (item.tax_percent || 0)) / 100;
    return baseTotal - discount + tax;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const baseTotal = item.quantity * item.price;
    return sum + (baseTotal * (item.discount_percent || 0)) / 100;
  }, 0);
  const totalTax = items.reduce((sum, item) => {
    const baseTotal = item.quantity * item.price;
    return sum + (baseTotal * (item.tax_percent || 0)) / 100;
  }, 0);

  return (
    <div className="space-y-4">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-right py-2">المنتج</th>
            <th className="text-center py-2">الكمية</th>
            <th className="text-left py-2">السعر</th>
            <th className="text-left py-2">المجموع</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const itemTotal = calculateItemTotal(item);
            return (
              <tr key={item.id} className="border-b">
                <td className="py-2">
                  <div className="font-medium">{item.product_name}</div>
                  {item.unit && (
                    <div className="text-xs text-gray-500">{item.unit}</div>
                  )}
                </td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-left py-2">{formatCurrency(item.price)}</td>
                <td className="text-left py-2">{formatCurrency(itemTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showTotals && (
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>الخصم:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between">
              <span>الضريبة:</span>
              <span>+{formatCurrency(totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t text-lg font-bold">
            <span>الإجمالي:</span>
            <span>{formatCurrency(subtotal - totalDiscount + totalTax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 