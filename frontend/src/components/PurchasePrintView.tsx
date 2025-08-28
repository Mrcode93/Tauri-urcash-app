import React, { useRef } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Printer, Phone, MapPin, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReactToPrint } from 'react-to-print';
import type { Purchase } from '@/features/purchases/purchasesService';
import type { Supplier } from '@/features/suppliers/suppliersService';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { cn } from '@/lib/utils';
import type { Settings } from '@/features/settings/settingsService';

interface PurchasePrintViewProps {
  purchase: Purchase | null;
  supplier: Supplier | null;
  open: boolean;
  onClose: () => void;
}

const PurchasePrintView: React.FC<PurchasePrintViewProps> = ({
  purchase,
  supplier,
  open,
  onClose
}) => {
  const settings = useSelector((state: RootState) => state.settings.data) as Settings;
  const printRef = useRef<HTMLDivElement>(null);
  // Get printer type from settings instead of local state
  const printerType: 'thermal' | 'a4' = settings?.bill_paper_size === 'thermal' ? 'thermal' : 'a4';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase_${purchase?.invoice_no || 'Receipt'}`
  });

  if (!open || !purchase) return null;
  
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

  // Calculate totals
  const calculateTotals = () => {
    const items = purchase.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    let totalDiscount = 0;
    let totalTax = 0;
    
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.price;
      const itemDiscount = itemSubtotal * ((item.discount_percent || 0) / 100);
      totalDiscount += itemDiscount;
      
      const afterDiscount = itemSubtotal - itemDiscount;
      const itemTax = afterDiscount * ((item.tax_percent || 0) / 100);
      totalTax += itemTax;
    });
    
    const net = subtotal - totalDiscount + totalTax;
    
    return {
      items,
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      net
    };
  };

  const { items, subtotal, discount, tax, net } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0 gap-0 h-[90vh]",
        printerType === 'thermal' ? "max-w-[80mm]" : "max-w-[800px]"
      )}>
        {/* Print Options */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
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
                )}
                {settings?.address && (
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    {settings.address}
                  </div>
                )}
              </div>

              {/* Purchase Title */}
              <div className={cn(
                "text-center mb-4",
                printerType === 'thermal' ? "mb-4" : "mb-6"
              )}>
                <h3 className="text-lg font-bold">فاتورة مشتريات</h3>
              </div>

              {/* Bill Info */}
              <div className={cn(
                "border-t border-b space-y-2",
                printerType === 'thermal' ? "py-3 mb-4" : "py-4 mb-6"
              )}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">رقم الفاتورة:</span>
                  <span className="font-medium">{purchase.invoice_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">التاريخ:</span>
                  <span>{format(new Date(purchase.invoice_date), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">تاريخ الاستحقاق:</span>
                  <span>{format(new Date(purchase.due_date), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المورد:</span>
                  <span>{supplier?.name || purchase.supplier_name}</span>
                </div>
                {supplier?.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">هاتف المورد:</span>
                    <span>{supplier.phone}</span>
                  </div>
                )}
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
                    <th className="py-1 text-center">الخصم</th>
                    <th className="py-1 text-center">الضريبة</th>
                    <th className="py-1 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => {
                    const itemSubtotal = item.quantity * item.price;
                    const itemDiscount = itemSubtotal * ((item.discount_percent || 0) / 100);
                    const afterDiscount = itemSubtotal - itemDiscount;
                    const itemTax = afterDiscount * ((item.tax_percent || 0) / 100);
                    const itemTotal = afterDiscount + itemTax;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 text-right">
                          <div className="font-medium">{item.product_name}</div>
                          {item.product_sku && (
                            <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                          )}
                        </td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-center">{formatCurrency(item.price)}</td>
                        <td className="py-2 text-center">
                          {item.discount_percent ? `${item.discount_percent}%` : '-'}
                        </td>
                        <td className="py-2 text-center">
                          {item.tax_percent ? `${item.tax_percent}%` : '-'}
                        </td>
                        <td className="py-2 text-left">{formatCurrency(itemTotal)}</td>
                      </tr>
                    );
                  })}
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
                  <span>الصافي:</span>
                  <span>{formatCurrency(net)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className={cn(
                "text-center border-t mt-4",
                printerType === 'thermal' ? "py-3" : "py-4"
              )}>
                <p>طريقة الدفع: {
                  purchase.payment_method === 'cash' ? 'نقدي' :
                  purchase.payment_method === 'card' ? 'بطاقة' :
                  'تحويل بنكي'
                }</p>
                <p>حالة الدفع: {
                  purchase.payment_status === 'paid' ? 'مدفوع' :
                  purchase.payment_status === 'partial' ? 'مدفوع جزئياً' :
                  'غير مدفوع'
                }</p>
                {purchase.payment_status !== 'unpaid' && (
                  <p>المبلغ المدفوع: {formatCurrency(purchase.paid_amount || 0)}</p>
                )}
                {purchase.payment_status === 'partial' && (
                  <p>المبلغ المتبقي: {formatCurrency(purchase.remaining_amount || 0)}</p>
                )}
              </div>

              {/* Notes */}
              {purchase.notes && (
                <div className={cn(
                  "border-t mt-4",
                  printerType === 'thermal' ? "py-3" : "py-4"
                )}>
                  <p className="text-sm font-medium mb-2">ملاحظات:</p>
                  <p className="text-sm text-gray-600">{purchase.notes}</p>
                </div>
              )}

              {/* Footer */}
              {settings?.bill_footer_text && (
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

export default PurchasePrintView; 