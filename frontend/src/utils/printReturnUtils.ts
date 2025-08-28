import type { ReturnData } from '@/features/returns/returnsService';
import type { Customer } from '@/features/customers/customersService';
import type { Product } from '@/features/inventory/inventoryService';
import { convertNumberToWords } from '@/utils/convertNumberToWords';

export interface PrintReturnOptions {
  return: ReturnData;
  customer?: Customer | null;
  settings: any;
  products?: Product[];
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
}

export interface PrintReturnResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate return bill content HTML
 */
const generateReturnContent = (
  returnData: any,
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

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'غير محدد';
    }
    try {
      return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: settings?.currency || 'IQD'
      }).format(amount);
    } catch (error) {
      return 'غير محدد';
    }
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

  return `
    <div class="return-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
      <!-- Header Section -->
      ${(settings?.bill_show_logo || settings?.bill_show_company_info) ? `
        <div class="return-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <!-- Logo, Company Name Row -->
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
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
              فاتورة مرتجع
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

      <!-- Return Information Grid -->
      <div class="return-info" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم المرتجع:</span>
          <span style="color: #000000;">${returnData.return_number || returnData.id || 'غير محدد'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">التاريخ:</span>
          <span style="color: #000000;">${formatDate(returnData.return_date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">الوقت:</span>
          <span style="color: #000000;">${formatTime(returnData.return_date)}</span>
        </div>
        ${customer ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
          <span style="color: #000000;">${customer.name}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">نوع المرتجع:</span>
          <span style="color: #000000;">
            ${returnData.return_type === 'full' ? 'مرتجع كامل' :
             returnData.return_type === 'partial' ? 'مرتجع جزئي' :
             returnData.return_type}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">سبب المرتجع:</span>
          <span style="color: #000000;">${returnData.reason || returnData.return_reason || 'غير محدد'}</span>
        </div>
        ${returnData.created_by_name ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المستخدم:</span>
          <span style="color: #000000;">${returnData.created_by_name}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المبلغ المسترد:</span>
          <span style="color: #000000;">${formatCurrency(returnData.refund_amount || returnData.total_amount)}</span>
        </div>
        ${returnData.original_invoice_no ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم الفاتورة الأصلية:</span>
          <span style="color: #000000;">${returnData.original_invoice_no}</span>
        </div>
        ` : ''}
      </div>

      <!-- Returned Items Table -->
      <div class="return-table-container" style="margin-bottom: 20px;">
        <table class="return-table" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: ${isThermal ? '14px' : '12px'};">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: right;">المنتج</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">الكمية المُرتجعة</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">السعر</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${returnData.items && returnData.items.length > 0 ? returnData.items.map((item: any, index: number) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="border: 1px solid #000; padding: 4px; color: #000000; text-align: center; font-weight: bold;">
                  <div style="font-weight: bold;">${item.product_name || 'غير محدد'}</div>
                  ${item.product_sku ? `
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                      ${item.product_sku}
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
                  لا توجد منتجات مرتجعة
                </td>
              </tr>
            `}
            <tr style="background-color: #f3f4f6; border-top: 2px solid #000;">
              <td colspan="3" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">
                المجموع :
              </td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                ${formatCurrency(returnData?.total_amount || 0)}
              </td>
            </tr>
            <tr>
              <td colspan="4" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; background-color: #f9fafb;">
                <div style="font-size: 14px; font-weight: bold;">
                  ${convertNumberToWords(returnData?.total_amount || 0)} دينار عراقي
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Section -->
      <div class="return-footer-section" style="margin-top: 20px;">
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
 * Print return bill with preview
 */
export const printReturnWithPreview = async (
  returnData: ReturnData,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const returnContent = generateReturnContent(returnData, customer, settings, printerType);
    
    // Open new window for preview
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>معاينة طباعة المرتجع - ${returnData.return_number || returnData.invoice_no}</title>
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
              background: #dc3545;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
            }
            .print-button:hover {
              background: #c82333;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">طباعة المرتجع</button>
          ${returnContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing return:', error);
    throw error;
  }
};

/**
 * Quick print return bill
 */
export const quickPrintReturn = async (
  returnData: ReturnData,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const returnContent = generateReturnContent(returnData, customer, settings, printerType);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>طباعة المرتجع</title>
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
          ${returnContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error('Error quick printing return:', error);
    throw error;
  }
};
