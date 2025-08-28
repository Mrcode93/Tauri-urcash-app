import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ReturnBill } from '../../features/bills/billsService';

interface ReturnDetailsProps {
  returns: ReturnBill[];
  totalReturnedAmount: number;
  returnCount: number;
  lastReturnDate?: string;
}

const ReturnDetails: React.FC<ReturnDetailsProps> = ({
  returns,
  totalReturnedAmount,
  returnCount,
  lastReturnDate
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'غير محدد';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
    } catch {
      return 'تاريخ غير صحيح';
    }
  };

  const getReturnStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string } } = {
      'completed': { variant: 'default', label: 'مكتمل' },
      'pending': { variant: 'secondary', label: 'قيد الانتظار' },
      'cancelled': { variant: 'destructive', label: 'ملغي' },
      'processing': { variant: 'outline', label: 'قيد المعالجة' }
    };

    const statusInfo = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (returnCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            تفاصيل الإرجاع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            لا توجد إرجاعات لهذه الفاتورة
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5" />
          تفاصيل الإرجاع ({returnCount})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">إجمالي المبلغ المرتجع</div>
              <div className="font-semibold text-blue-600">{formatCurrency(totalReturnedAmount)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <RotateCcw className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">عدد الإرجاعات</div>
              <div className="font-semibold text-green-600">{returnCount}</div>
            </div>
          </div>
          {lastReturnDate && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm text-gray-600">آخر إرجاع</div>
                <div className="font-semibold text-orange-600">{formatDate(lastReturnDate)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Returns Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الإرجاع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((returnBill) => (
                <TableRow key={returnBill.id}>
                  <TableCell className="font-medium">
                    {returnBill.return_number || `RET-${returnBill.id}`}
                  </TableCell>
                  <TableCell>{formatDate(returnBill.return_date)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(returnBill.total_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={returnBill.reason || 'غير محدد'}>
                      {returnBill.reason || 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getReturnStatusBadge(returnBill.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Return Items Summary */}
        {returns.some(r => r.items && r.items.length > 0) && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">المنتجات المرتجعة</h4>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية المرتجعة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.flatMap(returnBill => 
                    returnBill.items?.map((item, index) => (
                      <TableRow key={`${returnBill.id}-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.product_sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.total || item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    )) || []
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReturnDetails; 