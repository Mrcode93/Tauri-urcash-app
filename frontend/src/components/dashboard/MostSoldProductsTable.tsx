import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ShoppingBag } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { MostSoldProductsTableProps } from '@/types/dashboard';

export const MostSoldProductsTable: React.FC<MostSoldProductsTableProps> = ({ products, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">أكثر المنتجات مبيعاً</h3>
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">أكثر المنتجات مبيعاً</h3>
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>لا توجد بيانات مبيعات</p>
        </div>
      </Card>
    );
  }

  const totalRevenue = products.reduce((sum, p) => sum + (p.total_revenue || 0), 0);

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">أكثر المنتجات مبيعاً</h3>
        <TrendingUp className="h-6 w-6 text-primary" />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">#</TableHead>
              <TableHead className="text-right">المنتج</TableHead>
              <TableHead className="text-center">الكمية المباعة</TableHead>
              <TableHead className="text-center">الإيراد</TableHead>
              <TableHead className="text-center">المخزون</TableHead>
              <TableHead className="text-center">الحصة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => {
              const share = totalRevenue > 0 ? ((product.total_revenue / totalRevenue) * 100) : 0;
              return (
                <TableRow key={product.id} className={cn(
                  "transition-colors hover:bg-gray-50",
                  index < 3 && "bg-gradient-to-r from-amber-50 to-transparent"
                )}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 && "bg-yellow-400 text-white",
                        index === 1 && "bg-gray-400 text-white", 
                        index === 2 && "bg-amber-600 text-white",
                        index > 2 && "bg-gray-100 text-gray-600"
                      )}>
                        {index + 1}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{product.total_quantity}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold">{formatCurrency(product.total_revenue)}</TableCell>
                  <TableCell className="text-center">{product.current_stock}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{share.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}; 