import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { Product } from '@/features/inventory/inventoryService';
import { toBillReceiptSale } from '@/components/BillReceipt';
import { convertNumberToWords } from '@/utils/convertNumberToWords';



export interface PrintBillOptions {
  sale: SaleData;
  customer?: Customer | null;
  settings: any;
  products?: Product[];
  cartItems?: any[];
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
}

export interface PrintBillResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Utility function to print a bill with enhanced options
 * This can be used from anywhere in the application
 */
export const printBill = async (options: PrintBillOptions): Promise<PrintBillResult> => {
  try {
    const {
      sale,
      customer,
      settings,
      products = [],
      cartItems = [],
      printerType = 'a4',
      copies = 1,
      showPreview = false
    } = options;

    // Transform sale data to bill receipt format
    const billReceiptSale = toBillReceiptSale(sale, products, cartItems);
    
    if (!billReceiptSale) {
      return {
        success: false,
        message: 'فشل في تحويل بيانات المبيعة',
        error: 'Invalid sale data'
      };
    }

    // Create a temporary print element
    const printElement = document.createElement('div');
    printElement.style.position = 'absolute';
    printElement.style.left = '-9999px';
    printElement.style.top = '-9999px';
    
    // Set width based on printer type
    let paperWidth: string;
    let paperPadding: string;
    let fontSize: string;
    
    if (printerType === 'thermal' || printerType === 'thermal-80mm') {
      paperWidth = '80mm';
      paperPadding = '2mm';
      fontSize = '12px';
    } else if (printerType === 'thermal-58mm') {
      paperWidth = '58mm';
      paperPadding = '1mm';
      fontSize = '10px';
    } else {
      paperWidth = '210mm';
      paperPadding = '10mm';
      fontSize = '14px';
    }
    
    printElement.style.width = paperWidth;
    printElement.style.maxWidth = paperWidth;
    printElement.style.margin = '0 auto';
    printElement.style.padding = paperPadding;
    printElement.style.textAlign = 'center';
    printElement.style.direction = settings?.rtl_direction ? 'rtl' : 'ltr';
    printElement.style.backgroundColor = '#ffffff';
    printElement.style.fontFamily = settings?.bill_font_body || 'Cairo';
    printElement.style.fontSize = fontSize;
    printElement.style.fontWeight = settings?.bill_font_body_weight || '400';
    printElement.style.color = '#000000';
    printElement.style.lineHeight = '1.4';

    // Generate bill content
    const billContent = generateBillContent(billReceiptSale, customer, settings, printerType);
    printElement.innerHTML = billContent;

    // Add to document
    document.body.appendChild(printElement);

    // Print multiple copies if needed
    for (let i = 0; i < copies; i++) {
      if (i > 0) {
        // Add a page break between copies
        const pageBreak = document.createElement('div');
        pageBreak.style.pageBreakBefore = 'always';
        printElement.appendChild(pageBreak);
      }

      // Trigger print
      if (showPreview) {
        // Show print preview
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>معاينة الطباعة - ${billReceiptSale.bill_number}</title>
                <style>
                  body { 
                    font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif;
                    font-size: ${settings?.bill_font_body_size || 14}px;
                    font-weight: ${settings?.bill_font_body_weight || '400'};
                    direction: ${settings?.rtl_direction ? 'rtl' : 'ltr'};
                    margin: 0;
                    padding: 20px;
                    color: #000000;
                    background: white;
                  }
                  * { color: #000000 !important; }
                  @media print { 
                    body { margin: 0; }
                    .no-print { display: none !important; }
                  }
                </style>
              </head>
              <body>
                ${billContent}
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                  <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    طباعة
                  </button>
                  <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                    إغلاق
                  </button>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        // Direct print
        window.print();
      }

      // Wait between copies
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Clean up
    document.body.removeChild(printElement);

    return {
      success: true,
      message: `تم الطباعة بنجاح (${copies} نسخة)`
    };

  } catch (error) {
    console.error('Print error:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء الطباعة',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Generate bill content HTML
 */
const generateBillContent = (
  sale: any,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm'
): string => {
  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && (window as any).process && (window as any).process.versions && (window as any).process.versions.electron;
    
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
      currency: settings?.currency || 'IQD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-IQ');
  };

  // Determine styling based on printer type (same as BillReceipt)
  const isThermal = printerType === 'thermal' || printerType === 'thermal-80mm' || printerType === 'thermal-58mm';

  return `
    <div class="bill-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
      <!-- Header Section (same as BillReceipt) -->
      ${(settings?.bill_show_logo || settings?.bill_show_company_info) ? `
        <div class="bill-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <!-- Logo, Company Name, and Barcode Row -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <!-- Logo and Company Name -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%;">
              ${settings?.bill_show_logo && settings?.logo_url ? `
                <div style="flex-shrink: 0; text-align: center;">
                  <img src="${getLogoUrl(settings.logo_url)}" alt="${settings?.company_name || 'Company Logo'}" style="height: ${isThermal ? '48px' : '60px'}; object-fit: contain;">
                </div>
              ` : ''}
              ${settings?.bill_show_company_info && settings?.company_name && !settings?.bill_show_logo ? `
                <div style="font-family: '${settings?.bill_font_header || 'Cairo'}', Arial, sans-serif; color: #000000; text-align: center; width: 100%;">
                  <h1 style="font-weight: ${settings?.bill_font_header_weight || '700'}; color: #000000; font-size: ${isThermal ? '18px' : '20px'}; margin: 0;">
                    ${settings.company_name}
                  </h1>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Bill Type Indicator -->
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-weight: bold; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; margin: 0; border: 2px solid #000; padding: 8px; display: inline-block; background-color: #f0f0f0;">
              فاتورة مبيعات
            </h2>
          </div>
          
          <!-- Address and Phone Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: bold; color: #000000;">العنوان:</span>
                <span style="color: #000000;">${settings?.address || ''}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: bold; color: #000000;">رقم الهاتف:</span>
              <span style="color: #000000;">${settings?.mobile || ''}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Bill Information Grid (exactly same as BillReceipt) -->
      <div class="bill-info" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم الفاتورة:</span>
          <span style="color: #000000;">${sale.bill_number || sale.invoice_no || 'غير محدد'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">التاريخ:</span>
          <span style="color: #000000;">${formatDate(sale.invoice_date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">الوقت:</span>
          <span style="color: #000000;">${formatTime(sale.invoice_date)}</span>
        </div>
        ${customer ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
          <span style="color: #000000;">${customer.name}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">حالة الدفع:</span>
          <span style="color: #000000;">
            ${sale.payment_status === 'paid' ? 'مدفوع' :
             sale.payment_status === 'partial' ? 'مدفوع جزئياً' :
             'غير مدفوع'}
          </span>
        </div>
        ${sale.created_by_name ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المستخدم:</span>
          <span style="color: #000000;">${sale.created_by_name}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المبلغ المدفوع:</span>
          <span style="color: #000000;">${formatCurrency(sale.paid_amount)}</span>
        </div>
        ${sale.remaining_amount && sale.remaining_amount > 0 ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المبلغ المتبقي:</span>
          <span style="color: #000000;">${formatCurrency(sale.remaining_amount)}</span>
        </div>
        ` : ''}
      </div>

      <!-- Items Table (same as BillReceipt) -->
      <div class="bill-table-container" style="margin-bottom: 20px;">
        <table class="bill-table" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: ${isThermal ? '14px' : '12px'};">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: right; background-color: #d9d9d9;">المنتج</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">الكمية</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">السعر</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items && sale.items.length > 0 ? sale.items.map((item: any, index: number) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="border: 1px solid #000; padding: 4px; color: #000000; text-align: center; font-weight: bold;">
                  <div style="font-weight: bold;">${item.product_name || 'غير محدد'}</div>
                  ${item.description ? `
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                      ${item.description}
                    </div>
                  ` : ''}
                </td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${item.quantity || 0}</td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(item.price || 0)}</td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                  ${formatCurrency(item.total || 0)}
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center;">
                  لا توجد منتجات
                </td>
              </tr>
            `}
            <tr style="background-color: #f3f4f6; border-top: 2px solid #000;">
              <td colspan="3" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">
                المجموع :
              </td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                ${formatCurrency(sale?.subtotal || 0)}
              </td>
            </tr>
            <tr>
              <td colspan="4" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; background-color: #f9fafb;">
                <div style="font-size: 14px; font-weight: bold;">
                  ${convertNumberToWords(sale?.total_amount || 0)} دينار عراقي
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Section (same as BillReceipt) -->
      <div class="bill-footer-section" style="margin-top: 20px;">
        <!-- Footer -->
        ${settings?.bill_footer_text ? `
          <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000;">
            <p style="font-family: '${settings?.bill_font_footer || 'Cairo'}', Arial, sans-serif; font-size: 12px; font-weight: 400; margin: 0; color: #000000;">
              ${settings.bill_footer_text}
            </p>
          </div>
        ` : ''}

        <!-- Copyright -->
        <div style="text-align: center; margin-top: 16px; border-top: 1px solid #000; padding-top: 8px;">
          <p style="font-size: 14px; font-weight: bold; margin: 0; color: #000000;">
            برنامج اوركاش للمحاسبة - من URUX للبرمجيات
          </p>
        </div>
      </div>
    </div>
  `;
};

/**
 * Quick print function for common use cases
 */
export const quickPrintBill = (
  sale: SaleData,
  settings: any,
  customer?: Customer | null
): Promise<PrintBillResult> => {
  return printBill({
    sale,
    customer,
    settings,
    printerType: settings?.bill_print_mode || 'a4',
    copies: 1,
    showPreview: false
  });
};

/**
 * Print bill with preview
 */
export const printBillWithPreview = (
  sale: SaleData,
  settings: any,
  customer?: Customer | null
): Promise<PrintBillResult> => {
  return printBill({
    sale,
    customer,
    settings,
    printerType: settings?.bill_print_mode || 'a4',
    copies: 1,
    showPreview: true
  });
}; 