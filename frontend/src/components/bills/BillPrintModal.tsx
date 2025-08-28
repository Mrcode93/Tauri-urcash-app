import React, { useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Printer, 
  Download, 
  X,
  FileText,
  ShoppingCart,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Bill, Purchase, ReturnBill } from '../../features/bills/billsService';
import ReturnDetails from './ReturnDetails';

interface BillPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | Purchase | ReturnBill | null;
  billType: 'sale' | 'purchase' | 'return';
}

const BillPrintModal: React.FC<BillPrintModalProps> = ({ 
  open, 
  onOpenChange, 
  bill, 
  billType 
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0 د.ع';
    }
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return format(date, 'dd/MM/yyyy', { locale: ar });
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Get bill title based on type
  const getBillTitle = () => {
    switch (billType) {
      case 'sale':
        return 'فاتورة بيع';
      case 'purchase':
        return 'فاتورة شراء';
      case 'return':
        return 'فاتورة إرجاع';
      default:
        return 'فاتورة';
    }
  };

  // Get bill icon
  const getBillIcon = () => {
    switch (billType) {
      case 'sale':
        return <FileText className="w-6 h-6" />;
      case 'purchase':
        return <ShoppingCart className="w-6 h-6" />;
      case 'return':
        return <RotateCcw className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  // Get customer/supplier name
  const getCustomerSupplierName = () => {
    if (!bill) return '';
    
    if (billType === 'sale') {
      return (bill as Bill).customer_name;
    } else if (billType === 'purchase') {
      return (bill as Purchase).supplier_name;
    } else if (billType === 'return') {
      const returnBill = bill as ReturnBill;
      return returnBill.customer_name || returnBill.supplier_name || '';
    }
    return '';
  };

  // Get customer/supplier phone
  const getCustomerSupplierPhone = () => {
    if (!bill) return '';
    
    if (billType === 'sale') {
      return (bill as Bill).customer_phone;
    } else if (billType === 'purchase') {
      return (bill as Purchase).supplier_phone;
    }
    return '';
  };

  // Get invoice number
  const getInvoiceNumber = () => {
    if (!bill) return '';
    
    if (billType === 'sale') {
      return (bill as Bill).invoice_no;
    } else if (billType === 'purchase') {
      return (bill as Purchase).invoice_no;
    } else if (billType === 'return') {
      return (bill as ReturnBill).original_invoice_no;
    }
    return '';
  };

  // Get invoice date
  const getInvoiceDate = () => {
    if (!bill) return '';
    
    if (billType === 'sale') {
      return (bill as Bill).invoice_date;
    } else if (billType === 'purchase') {
      return (bill as Purchase).invoice_date;
    } else if (billType === 'return') {
      return (bill as ReturnBill).return_date;
    }
    return '';
  };

  // Get payment status
  const getPaymentStatus = () => {
    if (!bill) return '';
    
    if (billType === 'sale') {
      return (bill as Bill).payment_status;
    } else if (billType === 'purchase') {
      return (bill as Purchase).payment_status;
    } else if (billType === 'return') {
      return (bill as ReturnBill).status;
    }
    return '';
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">غير مدفوع</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">مدفوع جزئياً</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Handle print
  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>${getBillTitle()} - ${getInvoiceNumber()}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                  .no-print { display: none !important; }
                  .print-only { display: block !important; }
                }
                body { font-family: Arial, sans-serif; direction: rtl; }
                .bill-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .bill-items { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f5f5f5; }
                .bill-totals { text-align: left; margin-top: 20px; }
                .total-row { font-weight: bold; font-size: 1.1em; }
                .company-info { text-align: center; margin-bottom: 20px; }
                .bill-number { font-size: 1.2em; font-weight: bold; }
                .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
                .status-paid { background-color: #d4edda; color: #155724; }
                .status-unpaid { background-color: #f8d7da; color: #721c24; }
                .status-partial { background-color: #fff3cd; color: #856404; }
                .status-completed { background-color: #d4edda; color: #155724; }
                .status-pending { background-color: #fff3cd; color: #856404; }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  // Handle download as PDF (placeholder - would need a PDF library)
  const handleDownload = () => {
    // TODO: Implement PDF download functionality
    alert('تحميل PDF سيتم إضافته قريباً');
  };

  if (!bill) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getBillIcon()}
            {getBillTitle()} - {getInvoiceNumber()}
          </DialogTitle>
        </DialogHeader>

        {/* Print Actions */}
        <div className="flex justify-end gap-2 mb-4 no-print">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            تحميل PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            طباعة
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Bill Content */}
        <div ref={printRef} className="bg-white p-6 border rounded-lg">
          {/* Company Header */}
          <div className="company-info">
            <h1 className="text-2xl font-bold mb-2">شركة أوركس</h1>
            <p className="text-gray-600">نظام إدارة المبيعات والمشتريات</p>
            <p className="text-gray-600">UrCash Management System</p>
          </div>

          {/* Bill Header */}
          <div className="bill-header">
            <h2 className="text-xl font-bold mb-2">{getBillTitle()}</h2>
            <div className="bill-number">رقم الفاتورة: {getInvoiceNumber()}</div>
            <div className="text-sm text-gray-600">تاريخ الفاتورة: {formatDate(getInvoiceDate())}</div>
          </div>

          {/* Bill Information */}
          <div className="bill-info">
            <div>
              <h3 className="font-bold mb-2">
                {billType === 'sale' ? 'معلومات العميل' : 
                 billType === 'purchase' ? 'معلومات المورد' : 'معلومات الإرجاع'}
              </h3>
              <p><strong>الاسم:</strong> {getCustomerSupplierName()}</p>
              {getCustomerSupplierPhone() && (
                <p><strong>الهاتف:</strong> {getCustomerSupplierPhone()}</p>
              )}
              {billType === 'return' && (
                <p><strong>نوع الإرجاع:</strong> {(bill as ReturnBill).return_type === 'sale' ? 'إرجاع مبيعات' : 'إرجاع مشتريات'}</p>
              )}
            </div>
            <div>
              <h3 className="font-bold mb-2">معلومات الفاتورة</h3>
              <p><strong>رقم الفاتورة:</strong> {getInvoiceNumber()}</p>
              <p><strong>التاريخ:</strong> {formatDate(getInvoiceDate())}</p>
              <p><strong>الحالة:</strong> {getPaymentStatusBadge(getPaymentStatus())}</p>
              {billType === 'return' && (bill as ReturnBill).refund_method && (
                <p><strong>طريقة الاسترداد:</strong> {(bill as ReturnBill).refund_method === 'cash' ? 'نقداً' : 'تحويل بنكي'}</p>
              )}
            </div>
          </div>

          {/* Bill Items */}
          <div className="bill-items">
            <h3 className="font-bold mb-4">المنتجات</h3>
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {bill.items && bill.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div>
                        <div className="font-medium">{item.product_name || 'غير محدد'}</div>
                        <div className="text-sm text-gray-500">{item.product_sku || 'غير محدد'}</div>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill Totals */}
          <div className="bill-totals">
            <table className="w-64 ml-auto">
              <tbody>
                <tr>
                  <td><strong>المجموع الفرعي:</strong></td>
                  <td>{formatCurrency(bill.total_amount)}</td>
                </tr>
                {billType === 'sale' && (bill as Bill).discount_amount > 0 && (
                  <tr>
                    <td><strong>الخصم:</strong></td>
                    <td>{formatCurrency((bill as Bill).discount_amount)}</td>
                  </tr>
                )}
                {billType === 'sale' && (bill as Bill).tax_amount > 0 && (
                  <tr>
                    <td><strong>الضريبة:</strong></td>
                    <td>{formatCurrency((bill as Bill).tax_amount)}</td>
                  </tr>
                )}
                {billType === 'sale' && (
                  <tr className="total-row">
                    <td><strong>المجموع النهائي:</strong></td>
                    <td>{formatCurrency((bill as Bill).net_amount)}</td>
                  </tr>
                )}
                {billType === 'sale' && (
                  <tr>
                    <td><strong>المدفوع:</strong></td>
                    <td>{formatCurrency((bill as Bill).paid_amount)}</td>
                  </tr>
                )}
                {billType === 'purchase' && (
                  <tr>
                    <td><strong>المدفوع:</strong></td>
                    <td>{formatCurrency((bill as Purchase).paid_amount)}</td>
                  </tr>
                )}
                {billType === 'purchase' && (
                  <tr>
                    <td><strong>المتبقي:</strong></td>
                    <td>{formatCurrency((bill as Purchase).remaining_amount)}</td>
                  </tr>
                )}
                {/* Return Summary */}
                {(billType === 'sale' || billType === 'purchase') && 
                 bill.return_count && bill.return_count > 0 && (
                  <>
                    <tr className="border-t">
                      <td><strong>إجمالي المرتجع:</strong></td>
                      <td className="text-red-600">{formatCurrency(bill.total_returned_amount || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>عدد الإرجاعات:</strong></td>
                      <td>{bill.return_count}</td>
                    </tr>
                  </>
                )}
                {billType === 'return' && (
                  <tr className="total-row">
                    <td><strong>مبلغ الاسترداد:</strong></td>
                    <td>{formatCurrency((bill as ReturnBill).refund_amount || bill.total_amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">ملاحظات:</h3>
              <p>{bill.notes}</p>
            </div>
          )}

          {/* Return Reason */}
          {billType === 'return' && (bill as ReturnBill).reason && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-bold mb-2">سبب الإرجاع:</h3>
              <p>{(bill as ReturnBill).reason}</p>
            </div>
          )}

          {/* Return Details for Sale/Purchase Bills */}
          {(billType === 'sale' || billType === 'purchase') && 
           bill.returns && bill.returns.length > 0 && (
            <div className="mt-6">
              <ReturnDetails
                returns={bill.returns}
                totalReturnedAmount={bill.total_returned_amount || 0}
                returnCount={bill.return_count || 0}
                lastReturnDate={bill.last_return_date}
              />
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-gray-600">
            <p>شكراً لتعاملكم معنا</p>
            <p className="text-sm">تم إنشاء هذه الفاتورة بواسطة نظام UrCash</p>
            <p className="text-sm">تاريخ الطباعة: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillPrintModal; 