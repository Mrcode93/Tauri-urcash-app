import React, { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { cn } from '@/lib/utils';
import { Package, Phone, MapPin, User, Receipt } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CustomerReceipt } from '@/features/customerReceipts/customerReceiptsService';
import type { Customer } from '@/features/customers/customersService';
import { getLogoUrl } from '@/utils/logoUrl';

interface CustomerReceiptPrintProps {
  receipt: CustomerReceipt | null;
  customer: Customer | null;
  settings: any;
  open: boolean;
  onClose: () => void;
}

const CustomerReceiptPrint: React.FC<CustomerReceiptPrintProps> = ({
  receipt,
  customer,
  settings,
  open,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);

  // Debug logging
  useEffect(() => {
    if (open && receipt) {
      
      
      
      
    }
  }, [open, receipt, settings, customer]);
  
  
  

  // Ensure ref is available when dialog opens
  useEffect(() => {
    if (open && receipt && printRef.current) {
      
    }
  }, [open, receipt]);

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
    documentTitle: `CustomerReceipt_${receipt?.receipt_number || 'Payment'}`,
    onAfterPrint: () => {
      
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
    }
  });

  const handlePrintClick = () => {
    
    
    
    
    
    
    if (!open) {
      console.error('Cannot print: dialog is not open');
      return;
    }
    
    if (!receipt) {
      console.error('Cannot print: receipt is not available');
      return;
    }
    
    // Validate receipt data
    if (!receipt.receipt_number || !receipt.amount || !receipt.receipt_date) {
      console.error('Cannot print: receipt data is incomplete', receipt);
      return;
    }
    
    if (!printRef.current) {
      console.error('Cannot print: print ref is not available');
      return;
    }
    
    if (!isContentReady) {
      console.error('Cannot print: content is not ready yet');
      return;
    }
    
    // Check if print content is properly rendered
    const printContent = printRef.current.innerHTML;
    
    if (!printContent || printContent.trim().length === 0) {
      console.error('Cannot print: print content is empty');
      return;
    }
    
    // Try react-to-print first, fallback to native print
    try {
      
      handlePrint();
    } catch (error) {
      console.warn('react-to-print failed, trying native print:', error);
      try {
        handleNativePrint();
      } catch (nativeError) {
        console.error('Native print also failed, trying fallback:', nativeError);
        handleFallbackPrint();
      }
    }
  };

  // Alternative print function using browser's native print
  const handleNativePrint = () => {
    
    
    if (!printRef.current) {
      console.error('Print ref is not available for native print');
      return;
    }

    const printContent = printRef.current.innerHTML;
    
    
    if (!printContent || printContent.trim().length === 0) {
      console.error('Print content is empty');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      try {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
            <head>
              <title>إيصال دفع ${receipt?.receipt_number || ''}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 20px; }
                  * { box-sizing: border-box; }
                }
                body {
                  font-family: 'Cairo', Arial, sans-serif;
                  direction: rtl;
                  text-align: right;
                  margin: 0;
                  padding: 20px;
                  background: white;
                }
                .print-content {
                  max-width: 80mm;
                  margin: 0 auto;
                  background: white;
                  padding: 10px;
                }
                @media screen {
                  .print-content {
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    margin: 20px auto;
                  }
                }
                * {
                  color: #000000 !important;
                }
                @media print { 
                  * { color: #000000 !important; }
                }
              </style>
            </head>
            <body>
              <div class="print-content">
                ${printContent}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Add a small delay before printing
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
        
        
      } catch (error) {
        console.error('Error in native print:', error);
        printWindow.close();
      }
    } else {
      console.error('Failed to open print window');
    }
  };

  // Fallback print function for when both react-to-print and native print fail
  const handleFallbackPrint = () => {
    
    
    if (!receipt) {
      console.error('No receipt data available for fallback print');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        const printContent = `
          <!DOCTYPE html>
          <html dir="rtl">
            <head>
              <title>إيصال دفع ${receipt.receipt_number}</title>
              <style>
                body {
                  font-family: 'Cairo', Arial, sans-serif;
                  direction: rtl;
                  text-align: right;
                  margin: 20px;
                  background: white;
                  color: #000000;
                }
                .receipt {
                  max-width: 80mm;
                  margin: 0 auto;
                  padding: 10px;
                  border: 1px solid #000;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 10px;
                }
                .amount {
                  text-align: center;
                  font-size: 18px;
                  font-weight: bold;
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 20px 0;
                }
                @media print {
                  body { margin: 0; }
                  * { color: #000000 !important; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">
                <div class="header">
                  <h2>إيصال دفع</h2>
                  <p>${receiptSettings.company_name || 'شركة'}</p>
                </div>
                
                <div class="info-row">
                  <span>رقم الإيصال:</span>
                  <span>${receipt.receipt_number}</span>
                </div>
                
                <div class="info-row">
                  <span>التاريخ:</span>
                  <span>${format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
                
                <div class="info-row">
                  <span>العميل:</span>
                  <span>${receipt.customer_name || 'غير محدد'}</span>
                </div>
                
                <div class="amount">
                  <div>المبلغ المدفوع</div>
                  <div>${formatCurrency(receipt.amount, receiptSettings.currency, receiptSettings.currency_position)}</div>
                </div>
                
                <div class="info-row">
                  <span>طريقة الدفع:</span>
                  <span>${getPaymentMethodText(receipt.payment_method)}</span>
                </div>
                
                ${receipt.reference_number ? `
                <div class="info-row">
                  <span>رقم المرجع:</span>
                  <span>${receipt.reference_number}</span>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px;">
                  <p>تم إنشاء هذا الإيصال بواسطة: ${receipt.created_by_name || 'النظام'}</p>
                  <p>${format(new Date(receipt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
        
        
      } catch (error) {
        console.error('Fallback print failed:', error);
        printWindow.close();
      }
    } else {
      console.error('Failed to open fallback print window');
    }
  };

  const handleDownload = () => {
    // Future implementation for PDF download
    
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'check': return 'شيك';
      default: return method;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'bank_transfer': return '🏦';
      case 'check': return '📄';
      default: return '💰';
    }
  };

  const convertNumberToWords = (num: number): string => {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشر', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    
    if (num === 0) return 'صفر';
    if (num < 10) return ones[num];
    if (num < 20) return num === 10 ? 'عشر' : ones[num - 10] + ' ' + tens[0];
    if (num < 100) return num % 10 === 0 ? tens[Math.floor(num / 10)] : ones[num % 10] + ' و ' + tens[Math.floor(num / 10)];
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return remainder === 0 ? hundreds[hundred] : hundreds[hundred] + ' و ' + convertNumberToWords(remainder);
    }
    if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      const thousandText = thousand === 1 ? 'ألف' : convertNumberToWords(thousand) + ' ألف';
      return remainder === 0 ? thousandText : thousandText + ' و ' + convertNumberToWords(remainder);
    }
    return num.toString();
  };

  const getTemplateStyles = () => {
    const template = settings?.bill_template || 'modern';
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

  // Use comprehensive settings from props (mapped from Redux store)
  const receiptSettings = {
    // Company info from settings
    company_name: settings?.company_name || '',
    logo_url: settings?.logo_url || null,
    mobile: settings?.mobile || '',
    email: settings?.email || '',
    address: settings?.address || '',
    
    // Receipt template settings
    bill_print_mode: settings?.bill_print_mode || settings?.printMode || 'a4',
    bill_template: settings?.bill_template || 'modern',
    bill_show_logo: settings?.bill_show_logo ?? true,
    bill_show_barcode: settings?.bill_show_barcode ?? true,
    bill_show_company_info: settings?.bill_show_company_info ?? true,
    bill_show_qr_code: settings?.bill_show_qr_code ?? false,
    bill_paper_size: settings?.bill_paper_size || 'A4',
    bill_orientation: settings?.bill_orientation || 'portrait',
    
    // Margins
    bill_margin_top: settings?.bill_margin_top || 10,
    bill_margin_right: settings?.bill_margin_right || 10,
    bill_margin_bottom: settings?.bill_margin_bottom || 10,
    bill_margin_left: settings?.bill_margin_left || 10,
    
    // Fonts
    bill_font_header: settings?.bill_font_header || 'Cairo',
    bill_font_body: settings?.bill_font_body || 'Cairo',
    bill_font_footer: settings?.bill_font_footer || 'Cairo',
    bill_font_header_size: settings?.bill_font_header_size || 18,
    bill_font_body_size: settings?.bill_font_body_size || 14,
    bill_font_footer_size: settings?.bill_font_footer_size || 12,
    bill_font_header_weight: settings?.bill_font_header_weight || '700',
    bill_font_body_weight: settings?.bill_font_body_weight || '400',
    bill_font_footer_weight: settings?.bill_font_footer_weight || '400',
    bill_font_header_antialiasing: settings?.bill_font_header_antialiasing ?? true,
    bill_font_body_antialiasing: settings?.bill_font_body_antialiasing ?? true,
    bill_font_footer_antialiasing: settings?.bill_font_footer_antialiasing ?? true,
    
    // RTL support
    rtl_direction: settings?.rtl_direction ?? true,
    
    // Currency
    currency: settings?.currency || 'د.ك',
    currency_position: settings?.currency_position || 'after'
  };

  const printerType = receiptSettings.bill_print_mode === 'thermal' ? 'thermal' : 'a4';

  if (!open || !receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">طباعة إيصال الدفع</DialogTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handlePrintClick} 
                variant="outline" 
                size="sm"
                disabled={!isContentReady}
              >
                <Printer className="w-4 h-4 ml-2" />
                {isContentReady ? 'طباعة' : 'جاري التحميل...'}
              </Button>
              <Button 
                onClick={handleNativePrint} 
                variant="outline" 
                size="sm"
                disabled={!isContentReady}
              >
                <Printer className="w-4 h-4 ml-2" />
                طباعة مباشرة
              </Button>
              <Button 
                onClick={handleFallbackPrint} 
                variant="outline" 
                size="sm"
                disabled={!receipt}
              >
                <Printer className="w-4 h-4 ml-2" />
                طباعة احتياطية
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 ml-2" />
                تحميل
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-0">
            <div 
              ref={printRef}
              className={cn(
                "bill-content font-arabic",
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
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                } : {
                  marginTop: `${receiptSettings.bill_margin_top}mm`,
                  marginRight: `${receiptSettings.bill_margin_right}mm`,
                  marginBottom: `${receiptSettings.bill_margin_bottom}mm`,
                  marginLeft: `${receiptSettings.bill_margin_left}mm`,
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr'
                })
              } as React.CSSProperties}
              dir={receiptSettings.rtl_direction ? 'rtl' : 'ltr'}
            >
              {/* Header with Logo and Company Info */}
              <div className={cn(
                "text-center space-y-2 mb-6",
                printerType === 'thermal' ? "mb-4" : "mb-6"
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
                      onError={(e) => {
                        console.error('Failed to load logo:', receiptSettings.logo_url);
                        console.error('Constructed URL:', getLogoUrl(receiptSettings.logo_url));
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {receiptSettings.bill_show_company_info && (
                  <>
                    <h2 className={cn(
                      "font-bold text-black",
                      printerType === 'thermal' ? "text-lg" : "text-xl"
                    )}>
                      {receiptSettings.company_name}
                    </h2>
                    
                    {receiptSettings.mobile && (
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {receiptSettings.mobile}
                      </div>
                    )}
                    
                    {receiptSettings.address && (
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {receiptSettings.address}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Receipt Title */}
              <div className={cn(
                "text-center mb-6",
                printerType === 'thermal' ? "mb-4" : "mb-6"
              )}>
                <h1 className={cn(
                  "font-bold text-black border-b-2 border-black pb-2",
                  printerType === 'thermal' ? "text-lg" : "text-xl"
                )}>
                  <Receipt className="inline w-5 h-5 ml-2" />
                  إيصال دفع
                </h1>
              </div>

              {/* Receipt Details */}
              <div className={cn(
                "space-y-3 mb-6",
                printerType === 'thermal' ? "mb-4" : "mb-6"
              )}>
                <div className="flex justify-between items-center">
                  <span className="font-bold">رقم الإيصال:</span>
                  <span className="font-bold text-lg">{receipt.receipt_number}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-bold">التاريخ:</span>
                  <span>{format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-bold">الوقت:</span>
                  <span>{format(new Date(receipt.created_at), 'HH:mm', { locale: ar })}</span>
                </div>
                
                {customer && (
                  <div className="flex justify-between items-center">
                    <span className="font-bold">العميل:</span>
                    <span className="font-bold">{customer.name}</span>
                  </div>
                )}
                
                {customer?.phone && (
                  <div className="flex justify-between items-center">
                    <span className="font-bold">الهاتف:</span>
                    <span>{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div className={cn(
                "border-2 border-black p-4 mb-6",
                printerType === 'thermal' ? "mb-4" : "mb-6"
              )}>
                <h3 className={cn(
                  "font-bold text-center mb-3",
                  printerType === 'thermal' ? "text-sm" : "text-base"
                )}>
                  تفاصيل الدفع
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">المبلغ المدفوع:</span>
                    <span className={cn(
                      "font-bold text-lg",
                      printerType === 'thermal' ? "text-base" : "text-lg"
                    )}>
                      {formatCurrency(receipt.amount, receiptSettings.currency, receiptSettings.currency_position)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-bold">طريقة الدفع:</span>
                    <span className="flex items-center gap-1">
                      <span>{getPaymentMethodIcon(receipt.payment_method)}</span>
                      {getPaymentMethodText(receipt.payment_method)}
                    </span>
                  </div>
                  
                  {receipt.reference_number && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold">رقم المرجع:</span>
                      <span>{receipt.reference_number}</span>
                    </div>
                  )}
                  
                  {receipt.sale_invoice_no && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold">رقم الفاتورة:</span>
                      <span>{receipt.sale_invoice_no}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in Words */}
              <div className={cn(
                "text-center mb-6 p-3 border border-gray-300",
                printerType === 'thermal' ? "mb-4" : "mb-6"
              )}>
                <div className="font-bold mb-1">المبلغ بالكلمات:</div>
                <div className="text-sm text-gray-700">
                  {convertNumberToWords(Math.floor(receipt.amount))} {receiptSettings.currency} فقط لا غير
                </div>
              </div>

              {/* Notes */}
              {receipt.notes && (
                <div className={cn(
                  "mb-6 p-3 border border-gray-300",
                  printerType === 'thermal' ? "mb-4" : "mb-6"
                )}>
                  <div className="font-bold mb-1">ملاحظات:</div>
                  <div className="text-sm">{receipt.notes}</div>
                </div>
              )}

              {/* Footer */}
              <div className={cn(
                "text-center space-y-2 mt-8",
                printerType === 'thermal' ? "mt-4" : "mt-8"
              )}>
                <div className="text-sm text-gray-600">
                  تم إنشاء هذا الإيصال بواسطة: {receipt.created_by_name || user?.name || 'النظام'}
                </div>
                
                <div className="text-xs text-gray-500">
                  {format(new Date(receipt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </div>
                
                <div className="text-xs text-gray-500">
                  شكراً لثقتكم بنا
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerReceiptPrint; 