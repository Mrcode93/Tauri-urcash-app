import React, { useRef } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Printer, Phone, MapPin, ArrowLeft, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from 'react-to-print';
import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { cn } from '@/lib/utils';
import type { Settings } from '@/features/settings/settingsService';

interface SalePrintViewProps {
  sale: SaleData | null;
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
}

const SalePrintView: React.FC<SalePrintViewProps> = ({
  sale,
  customer,
  open,
  onClose
}) => {
  const settings = useSelector((state: RootState) => state.settings.data) as Settings;
  const printRef = useRef<HTMLDivElement>(null);
  // Get printer type from settings instead of local state
  const printerType: 'thermal' | 'a4' = settings?.bill_paper_size === 'thermal' ? 'thermal' : 'a4';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Sale_${sale?.invoice_no || 'Receipt'}`
  });

  if (!open || !sale) return null;
  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && window.process && window.process.type;
    
    if (isElectron) {
      // In Electron, always use localhost with the correct port
      const port = process.env.NODE_ENV === 'production' ? 39000 : 8000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  // Calculate totals considering returns
  const calculateTotals = () => {
    const items = sale.items.map(item => {
      const returnedQuantity = (item as any).returned_quantity || 0;
      const remainingQuantity = item.quantity - returnedQuantity;
      const total = remainingQuantity * item.price;
      return {
        ...item,
        remainingQuantity,
        total,
        returned_quantity: returnedQuantity
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discount = sale.discount_amount || 0;
    const tax = sale.tax_amount || 0;
    const total = subtotal - discount + tax;

    return {
      items,
      subtotal,
      discount,
      tax,
      total
    };
  };

  const { items, subtotal, discount, tax, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0 gap-0 h-[90vh]",
        printerType === 'thermal' ? "max-w-[80mm]" : "max-w-[800px]"
      )}>        {/* Print Options */}        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">نوع الطباعة:</span>
              <span className="text-sm font-medium">
                {printerType === 'thermal' ? 'حراري (80مم)' : 'A4'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 h-full">
          <div className="p-4">
            <div 
              ref={printRef}
              className={cn(
                "bill-content text-right font-arabic bg-white",
                printerType === 'thermal' ? [
                  "p-4 text-sm w-full",
                  "print:w-[80mm] print:max-w-[80mm]"
                ] : [
                  "p-8 text-base",
                  "print:w-[210mm] print:max-w-[210mm]"
                ]
              )}
              dir="rtl"
            >
              {/* Header */}
              <div className={cn(
                "text-center space-y-2",
                printerType === 'thermal' ? "mb-6" : "mb-8"
              )}>
                {settings?.logo_url && (
                  <div className="flex justify-center mb-3">
                    <img 
                      src={getLogoUrl(settings.logo_url)} 
                      alt={settings.company_name} 
                      className="h-16 object-contain"
                    />
                  </div>
                )}
                <h2 className="text-xl font-bold">{settings?.company_name}</h2>
                {settings?.mobile && (
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    {settings.mobile}
                  </div>
                )}                {settings?.address && (
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    {settings.address}
                  </div>
                )}
              </div>

              {/* Sale Status */}
              {sale.status === 'returned' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-center">
                  <ArrowLeft className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-bold">فاتورة مرتجعة</p>
                </div>
              )}
              {sale.status === 'partially_returned' && (
                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-center">
                  <ArrowLeft className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-bold">فاتورة مرتجعة جزئياً</p>
                </div>
              )}

              {/* Bill Info */}
              <div className={cn(
                "border-t border-b space-y-2",
                printerType === 'thermal' ? "py-3 mb-4" : "py-4 mb-6"
              )}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">رقم الفاتورة:</span>
                  <span className="font-medium">{sale.invoice_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">التاريخ:</span>
                  <span>{format(new Date(sale.invoice_date), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">العميل:</span>
                  <span>{customer?.name === 'Anonymous' ? 'زبون نقدي' : customer?.name}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className={cn(
                "w-full",
                printerType === 'thermal' ? "text-sm" : "text-base"
              )}>
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-right">المنتج</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-center">السعر</th>
                    <th className="py-1 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 text-right">
                        <div className="font-medium">{item.product_name}</div>
                        {(item as any).returned_quantity > 0 && (
                          <div className="text-xs text-red-500">
                            تم إرجاع: {(item as any).returned_quantity}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center">{item.remainingQuantity}</td>
                      <td className="py-2 text-center">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-left">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className={cn(
                "border-t space-y-2",
                printerType === 'thermal' ? "pt-3" : "pt-4 mt-4"
              )}>
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>الخصم:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>الضريبة:</span>
                    <span>+{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t text-lg font-bold">
                  <span>الإجمالي:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className={cn(
                "text-center border-t mt-4",
                printerType === 'thermal' ? "py-3" : "py-4"
              )}>
                <p>طريقة الدفع: {
                  sale.payment_method === 'cash' ? 'نقدي' :
                  sale.payment_method === 'card' ? 'بطاقة' :
                  'تحويل بنكي'
                }</p>
                <p>حالة الدفع: {
                  sale.payment_status === 'paid' ? 'مدفوع' :
                  sale.payment_status === 'partial' ? 'مدفوع جزئياً' :
                  'غير مدفوع'
                }</p>
                {sale.payment_status !== 'unpaid' && (
                  <p>المبلغ المدفوع: {formatCurrency(sale.paid_amount)}</p>
                )}
                {sale.payment_status === 'partial' && (
                  <p>المبلغ المتبقي: {formatCurrency(sale.remaining_amount)}</p>
                )}
              </div>

              {/* Footer */}              {settings?.bill_footer_text && (
                <div className={cn(
                  "text-center text-sm text-gray-500 mt-4",
                  printerType === 'thermal' ? "pt-3" : "pt-4"
                )}>
                  {settings.bill_footer_text}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SalePrintView; 