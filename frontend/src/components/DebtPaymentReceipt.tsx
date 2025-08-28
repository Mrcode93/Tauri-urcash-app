import React, { useRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, MapPin, Mail, Receipt } from 'lucide-react';

interface DebtPaymentReceiptProps {
  receipt: {
    receipt_number: string;
    amount: number;
    payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
    receipt_date: string;
    reference_number?: string;
    notes?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    sale_invoice_no?: string;
    sale_total_amount?: number;
    sale_remaining_amount?: number;
    created_by_name?: string;
  } | null;
  debt?: {
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
    invoice_no: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    due_date: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

const DebtPaymentReceipt: React.FC<DebtPaymentReceiptProps> = ({
  receipt,
  debt,
  open,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: settingsData } = useSelector((state: RootState) => state.settings);
  const { user } = useSelector((state: RootState) => state.auth);

  // Add a small delay to ensure content is rendered
  const [isContentReady, setIsContentReady] = useState(false);

  useEffect(() => {
    if (open && receipt) {
      const timer = setTimeout(() => {
        setIsContentReady(true);
      }, 200);
      return () => {
        clearTimeout(timer);
        setIsContentReady(false);
      };
    }
  }, [open, receipt]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DebtPayment_Receipt_${receipt?.receipt_number || 'Payment'}`,
    removeAfterPrint: false,
    suppressErrors: false
  });

  const handlePrintClick = () => {
    if (!open || !receipt || !printRef.current || !isContentReady) {
      console.error('Cannot print: dialog not open, receipt not available, ref not ready, or content not ready');
      return;
    }
    
    try {
      handlePrint();
    } catch (error) {
      console.warn('react-to-print failed:', error);
    }
  };

  const handleNativePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>إيصال تسديد دين ${receipt?.receipt_number}</title>
              <style>
                body { 
                  font-family: '${settingsData?.bill_font_body || 'Cairo'}', Arial, sans-serif;
                  font-size: ${settingsData?.bill_font_body_size || 14}px;
                  font-weight: ${settingsData?.bill_font_body_weight || '400'};
                  direction: rtl;
                  margin: ${settingsData?.bill_margin_top || 10}mm ${settingsData?.bill_margin_right || 10}mm ${settingsData?.bill_margin_bottom || 10}mm ${settingsData?.bill_margin_left || 10}mm;
                  color: #000000 !important;
                  text-rendering: optimizeLegibility;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                  background: white;
                }
                * {
                  color: #000000 !important;
                }
                .no-print { display: none; }
                @media print { 
                  .no-print { display: none !important; }
                  body { margin: 0; color: #000000 !important; }
                  * { color: #000000 !important; }
                }
                .receipt-header {
                  font-family: '${settingsData?.bill_font_header || 'Cairo'}', Arial, sans-serif;
                  font-size: ${settingsData?.bill_font_header_size || 18}px;
                  font-weight: ${settingsData?.bill_font_header_weight || '600'};
                  color: #000000 !important;
                  text-rendering: optimizeLegibility;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                }
                .receipt-footer {
                  font-family: '${settingsData?.bill_font_footer || 'Cairo'}', Arial, sans-serif;
                  font-size: ${settingsData?.bill_font_footer_size || 12}px;
                  font-weight: ${settingsData?.bill_font_footer_weight || '400'};
                  color: #000000 !important;
                  text-rendering: optimizeLegibility;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                  border: 1px solid #000000;
                  margin: 10px 0;
                }
                th, td {
                  border: 1px solid #000000;
                  padding: 8px;
                  text-align: center;
                  color: #000000 !important;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                  padding: 5px 0;
                  border-bottom: 1px dotted #ccc;
                }
                .info-label {
                  font-weight: bold;
                  color: #333;
                }
                .info-value {
                  color: #000;
                }
                .amount-highlight {
                  background-color: #f0f8ff;
                  padding: 10px;
                  border: 2px solid #4a90e2;
                  border-radius: 5px;
                  text-align: center;
                  font-size: 18px;
                  font-weight: bold;
                  margin: 15px 0;
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  if (!open || !receipt) return null;

  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && (window as any).process && (window as any).process.versions && (window as any).process.versions.electron;
    
    if (isElectron) {
      const port = process.env.NODE_ENV === 'production' ? 39000 : 39000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  // Get printer type from settings
  const printerType: 'thermal' | 'a4' = settingsData?.bill_print_mode || settingsData?.printMode || 'a4';

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'check': return 'شيك';
      default: return 'غير محدد';
    }
  };

  const getTemplateStyles = () => {
    const template = settingsData?.bill_template || 'modern';
    switch (template) {
      case 'classic':
        return {
          fontFamily: 'Arial, sans-serif',
          border: '2px solid #000',
          padding: '20px'
        };
      case 'minimal':
        return {
          fontFamily: 'Helvetica, Arial, sans-serif',
          border: '1px solid #ccc',
          padding: '15px'
        };
      default: // modern
        return {
          fontFamily: 'Cairo, Arial, sans-serif',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        };
    }
  };

  // Use comprehensive settings from props
  const receiptSettings = {
    company_name: settingsData?.company_name || '',
    logo_url: settingsData?.logo_url || null,
    mobile: settingsData?.mobile || '',
    email: settingsData?.email || '',
    address: settingsData?.address || '',
    bill_print_mode: settingsData?.bill_print_mode || settingsData?.printMode || 'a4',
    bill_template: settingsData?.bill_template || 'modern',
    bill_show_logo: settingsData?.bill_show_logo ?? true,
    bill_show_company_info: settingsData?.bill_show_company_info ?? true,
    bill_margin_top: settingsData?.bill_margin_top || 10,
    bill_margin_right: settingsData?.bill_margin_right || 10,
    bill_margin_bottom: settingsData?.bill_margin_bottom || 10,
    bill_margin_left: settingsData?.bill_margin_left || 10,
    bill_font_header: settingsData?.bill_font_header || 'Cairo',
    bill_font_body: settingsData?.bill_font_body || 'Cairo',
    bill_font_footer: settingsData?.bill_font_footer || 'Cairo',
    rtl_direction: true
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0 gap-0 flex flex-col h-[90vh]",
        printerType === 'thermal' ? "max-w-md" : "max-w-4xl"
      )}>
        {/* Print Options and Close Button */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">نوع الطباعة:</span>
              <span className="text-sm font-medium">
                {printerType === 'thermal' ? 'حراري (80مم)' : 'A4'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrintClick} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button onClick={handleNativePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة مباشرة
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-0">
            <div 
              ref={printRef}
              className={cn(
                "receipt-content font-arabic",
                printerType === 'thermal' ? [
                  "p-2 text-sm w-full max-w-[80mm] mx-auto thermal-preview",
                  "print:w-[80mm] print:max-w-[80mm] print:mx-auto print:p-1"
                ] : [
                  "p-8 text-base m-4",
                  "print:w-[210mm] print:max-w-[210mm]"
                ]
              )}
              style={{
                ...getTemplateStyles(),
                ...(printerType === 'thermal' ? {
                  width: '80mm',
                  maxWidth: '80mm',
                  margin: '0 auto',
                  padding: '2mm',
                  textAlign: 'center',
                  direction: 'rtl',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                } : {
                  marginTop: `${receiptSettings.bill_margin_top}mm`,
                  marginRight: `${receiptSettings.bill_margin_right}mm`,
                  marginBottom: `${receiptSettings.bill_margin_bottom}mm`,
                  marginLeft: `${receiptSettings.bill_margin_left}mm`,
                  direction: 'rtl'
                })
              } as React.CSSProperties}
              dir="rtl"
            >
              {/* Header with Logo and Company Info */}
              <div className={cn(
                "text-center space-y-2",
                printerType === 'thermal' ? "mb-6" : "mb-8"
              )}>
                {receiptSettings.bill_show_logo && receiptSettings.logo_url && (
                  <div className="flex justify-center mb-3">
                    <img 
                      src={getLogoUrl(receiptSettings.logo_url)} 
                      alt={receiptSettings.company_name} 
                      className={cn(
                        "object-contain",
                        printerType === 'thermal' ? "h-12" : "h-16"
                      )}
                    />
                  </div>
                )}
                
                {receiptSettings.bill_show_company_info && (
                  <>
                    <h1 className={cn(
                      "font-bold receipt-header",
                      printerType === 'thermal' ? "text-lg" : "text-2xl"
                    )}>
                      {receiptSettings.company_name}
                    </h1>
                    
                    <div className={cn(
                      "space-y-1",
                      printerType === 'thermal' ? "text-xs" : "text-sm"
                    )}>
                      {receiptSettings.mobile && (
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{receiptSettings.mobile}</span>
                        </div>
                      )}
                      {receiptSettings.email && (
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{receiptSettings.email}</span>
                        </div>
                      )}
                      {receiptSettings.address && (
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{receiptSettings.address}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Receipt Title */}
              <div className={cn(
                "text-center border-b-2 border-gray-300 pb-4 mb-6",
                printerType === 'thermal' ? "mb-4 pb-2" : "mb-6 pb-4"
              )}>
                <h2 className={cn(
                  "font-bold receipt-header",
                  printerType === 'thermal' ? "text-base" : "text-xl"
                )}>
                  إيصال تسديد دين
                </h2>
                <p className={cn(
                  "text-gray-600 flex items-center justify-center gap-1",
                  printerType === 'thermal' ? "text-xs" : "text-sm"
                )}>
                  <Receipt className="h-3 w-3" />
                  Payment Receipt
                </p>
              </div>

              {/* Receipt Information */}
              <div className={cn(
                "space-y-3",
                printerType === 'thermal' ? "space-y-2" : "space-y-3"
              )}>
                <div className="info-row">
                  <span className="info-label">رقم الإيصال:</span>
                  <span className="info-value font-bold">{receipt.receipt_number}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">التاريخ:</span>
                  <span className="info-value">{formatDate(receipt.receipt_date)}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">العميل:</span>
                  <span className="info-value">{receipt.customer_name || debt?.customer_name}</span>
                </div>
                
                {(receipt.customer_phone || debt?.customer_phone) && (
                  <div className="info-row">
                    <span className="info-label">الهاتف:</span>
                    <span className="info-value">{receipt.customer_phone || debt?.customer_phone}</span>
                  </div>
                )}
                
                {(receipt.sale_invoice_no || debt?.invoice_no) && (
                  <div className="info-row">
                    <span className="info-label">رقم الفاتورة:</span>
                    <span className="info-value">{receipt.sale_invoice_no || debt?.invoice_no}</span>
                  </div>
                )}
                
                <div className="info-row">
                  <span className="info-label">طريقة الدفع:</span>
                  <span className="info-value">{getPaymentMethodText(receipt.payment_method)}</span>
                </div>
                
                {receipt.reference_number && (
                  <div className="info-row">
                    <span className="info-label">رقم المرجع:</span>
                    <span className="info-value">{receipt.reference_number}</span>
                  </div>
                )}
              </div>

              {/* Amount Section */}
              <div className={cn(
                "my-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg",
                printerType === 'thermal' ? "my-4 p-2" : "my-6 p-4"
              )}>
                <div className="text-center">
                  <div className={cn(
                    "text-gray-600 mb-2",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    المبلغ المدفوع
                  </div>
                  <div className={cn(
                    "font-bold text-blue-800",
                    printerType === 'thermal' ? "text-lg" : "text-2xl"
                  )}>
                    {formatCurrency(receipt.amount)}
                  </div>
                </div>
              </div>

              {/* Debt Information */}
              {debt && (
                <div className={cn(
                  "mt-6 pt-4 border-t border-gray-300",
                  printerType === 'thermal' ? "mt-4 pt-2" : "mt-6 pt-4"
                )}>
                  <h3 className={cn(
                    "font-bold mb-3",
                    printerType === 'thermal' ? "text-sm mb-2" : "text-base mb-3"
                  )}>
                    تفاصيل الدين
                  </h3>
                  <div className={cn(
                    "space-y-2",
                    printerType === 'thermal' ? "space-y-1" : "space-y-2"
                  )}>
                    <div className="info-row">
                      <span className="info-label">إجمالي الدين:</span>
                      <span className="info-value">{formatCurrency(debt.total_amount)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">المبلغ المدفوع سابقاً:</span>
                      <span className="info-value">{formatCurrency(debt.paid_amount)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">المبلغ المتبقي:</span>
                      <span className="info-value font-bold text-red-600">
                        {formatCurrency(debt.remaining_amount - receipt.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {receipt.notes && (
                <div className={cn(
                  "mt-4 pt-4 border-t border-gray-300",
                  printerType === 'thermal' ? "mt-3 pt-2" : "mt-4 pt-4"
                )}>
                  <h4 className={cn(
                    "font-bold mb-2",
                    printerType === 'thermal' ? "text-sm" : "text-base"
                  )}>
                    ملاحظات:
                  </h4>
                  <p className={cn(
                    "text-gray-700 bg-gray-50 p-2 rounded",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    {receipt.notes}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className={cn(
                "mt-8 pt-4 border-t border-gray-300 text-center",
                printerType === 'thermal' ? "mt-6 pt-2" : "mt-8 pt-4"
              )}>
                <div className={cn(
                  "space-y-2 receipt-footer",
                  printerType === 'thermal' ? "space-y-1" : "space-y-2"
                )}>
                  <div className={cn(
                    "text-gray-600",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    تم الإنشاء بواسطة: {receipt.created_by_name || user?.name || 'النظام'}
                  </div>
                  <div className={cn(
                    "text-gray-600",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    تاريخ الطباعة: {formatDate(new Date().toISOString())}
                  </div>
                  <div className={cn(
                    "text-gray-800 font-bold",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    شكراً لكم
                  </div>
                  <div className={cn(
                    "text-gray-500",
                    printerType === 'thermal' ? "text-xs" : "text-sm"
                  )}>
                    Thank you
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DebtPaymentReceipt; 