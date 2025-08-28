import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface BillItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface BillItemsProps {
  items: BillItem[];
  className?: string;
}

const BillItems: React.FC<BillItemsProps> = ({ items, className }) => {
  return (
    <div className={cn("mb-6", className)}>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-right font-bold text-gray-600">المنتج</TableHead>
              <TableHead className="text-right font-bold text-gray-600">الكمية</TableHead>
              <TableHead className="text-right font-bold text-gray-600">السعر</TableHead>
              <TableHead className="text-right font-bold text-gray-600">الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={item.id}
                className={cn(
                  "transition-colors duration-150",
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50",
                  "hover:bg-blue-50"
                )}
              >
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.price)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BillItems; 