import type { CustomerReceipt } from '@/features/customerReceipts/customerReceiptsService';
import type { Customer } from '@/features/customers/customersService';
import type { Supplier } from '@/features/suppliers/suppliersService';
import { convertNumberToWords } from '@/utils/convertNumberToWords';

export interface PrintReceiptOptions {
  receipt: CustomerReceipt;
  customer?: Customer | null;
  supplier?: Supplier | null;
  settings: Record<string, unknown>;
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
}

export interface PrintReceiptResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate receipt content HTML
 */
const generateReceiptContent = (
  receipt: CustomerReceipt,
  customer: Customer | null,
  supplier: Supplier | null,
  settings: Record<string, unknown>,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm'
): string => {
  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && (window as unknown as { process?: { versions?: { electron?: string } } }).process?.versions?.electron;
    
    if (isElectron) {
      // In Electron, always use localhost with the correct port
      const port = process.env.NODE_ENV === 'production' ? 39000 : 39000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: (settings?.currency as string) || 'IQD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return date.toLocaleDateString('ar-IQ');
    } catch (error) {
      return 'غير محدد';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return date.toLocaleTimeString('ar-IQ');
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Determine styling based on printer type
  const isThermal = printerType === 'thermal' || printerType === 'thermal-80mm' || printerType === 'thermal-58mm';
  
  // Determine receipt type - default to سند صرف for customer receipts
  const receiptTitle = 'سند صرف';

  return `
    <div class="receipt-content font-arabic" style="text-align: center; direction: rtl; font-family: '${(settings?.bill_font_body as string) || 'Cairo'}', Arial, sans-serif; color: #000000; max-width: 800px; margin: 0 auto; padding: 20px;">
      
      <!-- Header Section -->
      ${((settings?.bill_show_logo as boolean) || (settings?.bill_show_company_info as boolean)) ? `
        <div class="receipt-header" style="margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px;">
          <!-- Logo, Company Name Row -->
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <!-- Logo and Company Name -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; width: 100%;">
              ${(settings?.bill_show_logo as boolean) && (settings?.logo_url as string) ? `
                <div style="flex-shrink: 0; text-align: center;">
                  <img src="${getLogoUrl(settings.logo_url as string)}" alt="${(settings?.company_name as string) || 'Company Logo'}" style="height: ${isThermal ? '48px' : '70px'}; object-fit: contain;">
                </div>
              ` : ''}
              ${(settings?.bill_show_company_info as boolean) && (settings?.company_name as string) && !(settings?.bill_show_logo as boolean) ? `
                <div style="font-family: '${(settings?.bill_font_header as string) || 'Cairo'}', Arial, sans-serif; color: #000000; text-align: center; width: 100%;">
                  <h1 style="font-weight: ${(settings?.bill_font_header_weight as string) || '700'}; color: #000000; font-size: ${isThermal ? '18px' : '24px'}; margin: 0;">
                    ${settings.company_name as string}
                  </h1>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Bill Type Indicator -->
          <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="font-weight: bold; color: #000000; font-size: ${isThermal ? '16px' : '24px'}; margin: 0; border: 3px solid #000; padding: 15px 25px; display: inline-block; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${receiptTitle}
            </h2>
          </div>
          
          <!-- Address and Phone Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; color: #000000;">العنوان:</span>
                <span style="color: #000000;">${(settings?.address as string) || ''}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; color: #000000;">رقم الهاتف:</span>
              <span style="color: #000000;">${(settings?.mobile as string) || ''}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Receipt Information Grid -->
      <div class="receipt-info" style="margin-bottom: 30px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">رقم الإيصال:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.receipt_number || 'غير محدد'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">التاريخ:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${formatDate(receipt.receipt_date)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">الوقت:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${formatTime(receipt.receipt_date)}</span>
          </div>
          ${customer ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">العميل:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${customer.name}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">المبلغ:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${formatCurrency(receipt.amount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">طريقة الدفع:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">
              ${receipt.payment_method === 'cash' ? 'نقدي' :
               receipt.payment_method === 'card' ? 'بطاقة' :
               receipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
               receipt.payment_method}
            </span>
          </div>
          ${receipt.delegate_name ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">المندوب:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.delegate_name}</span>
          </div>
          ` : ''}
          ${receipt.employee_name ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">الموظف:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.employee_name}</span>
          </div>
          ` : ''}
          ${receipt.created_by_name ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">أنشئ بواسطة:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.created_by_name}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Additional Details Section -->
      ${(receipt.reference_number || receipt.sale_invoice_no || receipt.notes) ? `
      <div class="additional-details" style="margin-bottom: 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 18px; font-weight: bold; color: #000000; margin: 0; border: 3px solid #000; padding: 12px 20px; display: inline-block; background-color: #f8f9fa; border-radius: 8px;">
            تفاصيل إضافية
          </h3>
        </div>
        
        <!-- Additional Details Grid -->
        <div class="additional-details-info" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          ${receipt.reference_number ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">رقم المرجع:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.reference_number}</span>
          </div>
          ` : ''}
          ${receipt.sale_invoice_no ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">فاتورة البيع:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.sale_invoice_no}</span>
          </div>
          ` : ''}
          ${receipt.money_box_id ? `
          <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <span style="font-weight: bold; color: #000000; font-size: 14px;">صندوق المال:</span>
            <span style="color: #000000; font-weight: 600; font-size: 14px;">${receipt.money_box_id}</span>
          </div>
          ` : ''}
        </div>
        
        <!-- Notes Section (Full Width) -->
        ${receipt.notes ? `
        <div style="margin-top: 20px; display: flex; justify-content: space-between; border: 2px solid #000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
          <span style="font-weight: bold; color: #000000; font-size: 14px;">ملاحظات:</span>
          <span style="color: #000000; text-align: right; flex: 1; margin-right: 8px; font-weight: 600; font-size: 14px;">${receipt.notes}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Amount Section -->
      <div style="margin-bottom: 30px; border: 3px solid #000; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
        <div style="text-align: center;">
          <!-- Numerical Amount -->
          <div style="margin-bottom: 15px;">
            <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 8px;">
              المبلغ:
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #000000; border: 2px solid #000; padding: 10px; background-color: #ffffff; border-radius: 6px; display: inline-block;">
              ${formatCurrency(receipt.amount || 0)}
            </div>
          </div>
          
          <!-- Amount in Words -->
          <div style="margin-top: 15px;">
            <div style="font-size: 18px; font-weight: bold; color: #000000; margin-bottom: 8px;">
              المبلغ بالكلمات:
            </div>
            <div style="font-size: 16px; color: #000000; font-weight: 600; border: 2px solid #000; padding: 10px; background-color: #ffffff; border-radius: 6px; display: inline-block;">
              ${convertNumberToWords(receipt.amount || 0)} دينار عراقي
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="receipt-footer-section" style="margin-top: 30px;">
        <!-- Footer -->
        ${(settings?.bill_footer_text as string) ? `
          <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 2px solid #000;">
            <p style="font-family: '${(settings?.bill_font_footer as string) || 'Cairo'}', Arial, sans-serif; font-size: 14px; font-weight: 400; margin: 0; color: #000000;">
              ${settings.bill_footer_text as string}
            </p>
          </div>
        ` : ''}

                 <!-- Thank You Message -->
         <div style="text-align: center; margin-top: 20px;">
           <p style="font-size: 16px; font-weight: bold; margin: 0; color: #000000;">
             شكراً لزيارتكم
           </p>
         </div>
        </div>

        <!-- Copyright -->
        <div style="text-align: center; margin-top: 15px; border-top: 1px solid #000; padding-top: 15px;">
          <p style="font-size: 14px; font-weight: bold; margin: 0; color: #000000;">
            برنامج اوركاش للمحاسبة - من URUX للبرمجيات
          </p>
        </div>
      </div>
    </div>
  `;
};

/**
 * Print receipt with preview
 */
export const printReceiptWithPreview = async (
  receipt: CustomerReceipt,
  customer: Customer | null,
  supplier: Supplier | null,
  settings: Record<string, unknown>,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const receiptContent = generateReceiptContent(receipt, customer, supplier, settings, printerType);
    
    // Open new window for preview
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    const receiptTitle = 'سند صرف';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>معاينة طباعة ${receiptTitle} - ${receipt.receipt_number}</title>
          <style>
            @page {
              size: ${printerType === 'thermal' ? '80mm auto' : 'A4'};
              margin: ${printerType === 'thermal' ? '2mm' : '10mm'};
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Cairo', Arial, sans-serif;
              direction: rtl;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background: #28a745;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
            }
            .print-button:hover {
              background: #218838;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">طباعة ${receiptTitle}</button>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw error;
  }
};

/**
 * Quick print receipt
 */
export const quickPrintReceipt = async (
  receipt: CustomerReceipt,
  customer: Customer | null,
  supplier: Supplier | null,
  settings: Record<string, unknown>,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const receiptContent = generateReceiptContent(receipt, customer, supplier, settings, printerType);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>طباعة السند</title>
          <style>
            @page {
              size: ${printerType === 'thermal' ? '80mm auto' : 'A4'};
              margin: ${printerType === 'thermal' ? '2mm' : '10mm'};
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Cairo', Arial, sans-serif;
              direction: rtl;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error('Error quick printing receipt:', error);
    throw error;
  }
};
