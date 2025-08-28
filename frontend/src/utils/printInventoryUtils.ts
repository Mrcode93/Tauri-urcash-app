import type { Product } from '@/features/inventory/inventoryService';
import { convertNumberToWords } from '@/utils/convertNumberToWords';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface InventoryReportData {
  summary: {
    total_products: number;
    total_stock_value: number;
    low_stock_products: number;
    out_of_stock_products: number;
    total_movements: number;
    purchases_count: number;
    sales_count: number;
    adjustments_count: number;
    returns_count: number;
  };
  current_inventory: Product[];
  movements: any[];
  period: {
    type: string;
    start_date: string;
    end_date: string;
  };
}

export interface PrintInventoryOptions {
  reportType: 'comprehensive' | 'stock-levels' | 'movements' | 'low-stock' | 'expiry' | 'custom';
  reportData: InventoryReportData;
  settings: any;
  dateRange: {
    start: string;
    end: string;
  };
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
  title?: string;
  subtitle?: string;
}

export interface PrintInventoryResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate inventory report content HTML
 */
const generateInventoryContent = (
  reportType: string,
  reportData: InventoryReportData,
  settings: any,
  dateRange: { start: string; end: string },
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm',
  title?: string,
  subtitle?: string
): string => {
  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    const isElectron = window && (window as any).process && (window as any).process.versions && (window as any).process.versions.electron;
    
    if (isElectron) {
      const port = process.env.NODE_ENV === 'production' ? 39000 : 39000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'غير محدد';
    }
    
    try {
      return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: settings?.currency || 'IQD'
      }).format(amount);
    } catch (error) {
      return `${amount.toLocaleString('ar-IQ')} ${settings?.currency || 'IQD'}`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'تاريخ غير صحيح';
      
      return date.toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'تاريخ غير صحيح';
    }
  };

  const isThermal = printerType === 'thermal' || printerType === 'thermal-80mm' || printerType === 'thermal-58mm';

  const getReportTitle = () => {
    switch (reportType) {
      case 'comprehensive':
        return title || 'تقرير المخزون الشامل';
      case 'stock-levels':
        return title || 'تقرير مستويات المخزون';
      case 'movements':
        return title || 'تقرير حركة المخزون';
      case 'low-stock':
        return title || 'تقرير المنتجات منخفضة المخزون';
      case 'expiry':
        return title || 'تقرير المنتجات منتهية الصلاحية';
      case 'custom':
        return title || 'تقرير مخزون مخصص';
      default:
        return title || 'تقرير المخزون';
    }
  };

  // Generate comprehensive inventory report content
  const generateComprehensiveContent = () => {
    const summary = reportData.summary;
    const inventory = reportData.current_inventory;

    return `
      <div class="inventory-report" style="margin-bottom: 24px;">
        <h2 style="font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; color: #000000; margin-bottom: 16px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
          ملخص المخزون الشامل
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">إحصائيات عامة</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي المنتجات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${summary.total_products}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">قيمة المخزون:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${formatCurrency(summary.total_stock_value)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي الحركات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${summary.total_movements}</span>
              </div>
            </div>
          </div>
          
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">حالة المخزون</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">منخفضة المخزون:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #F59E0B;">${summary.low_stock_products}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">نفذت من المخزون:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #EF4444;">${summary.out_of_stock_products}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">المنتجات المتوفرة:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${summary.total_products - summary.out_of_stock_products}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${inventory && inventory.length > 0 ? `
        <div style="margin-top: 20px;">
          <h3 style="font-size: ${isThermal ? '16px' : '18px'}; font-weight: bold; color: #000000; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px;">
            تفاصيل المنتجات
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: ${isThermal ? '10px' : '12px'};">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">المنتج</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">الكود</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">الكمية</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">سعر الشراء</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">قيمة المخزون</th>
              </tr>
            </thead>
            <tbody>
              ${inventory.slice(0, isThermal ? 10 : 20).map((product: Product) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; text-align: right;">${product.name}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${product.sku}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; ${product.current_stock <= product.min_stock ? 'color: #EF4444; font-weight: bold;' : ''}">${product.current_stock} ${product.unit}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${formatCurrency(product.purchase_price)}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${formatCurrency(product.current_stock * product.purchase_price)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Generate stock levels report content
  const generateStockLevelsContent = () => {
    const inventory = reportData.current_inventory;
    const lowStock = inventory.filter(p => p.current_stock <= p.min_stock && p.current_stock > 0);
    const outOfStock = inventory.filter(p => p.current_stock === 0);
    const normalStock = inventory.filter(p => p.current_stock > p.min_stock);

    return `
      <div class="stock-levels-report" style="margin-bottom: 24px;">
        <h2 style="font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; color: #000000; margin-bottom: 16px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
          تقرير مستويات المخزون
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px; background-color: #10B981;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #ffffff; margin-bottom: 8px;">مخزون طبيعي</h3>
            <div style="text-align: center;">
              <span style="font-size: ${isThermal ? '18px' : '24px'}; font-weight: bold; color: #ffffff;">${normalStock.length}</span>
              <p style="font-size: ${isThermal ? '10px' : '12px'}; color: #ffffff; margin: 4px 0 0 0;">منتج</p>
            </div>
          </div>
          
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px; background-color: #F59E0B;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #ffffff; margin-bottom: 8px;">منخفضة المخزون</h3>
            <div style="text-align: center;">
              <span style="font-size: ${isThermal ? '18px' : '24px'}; font-weight: bold; color: #ffffff;">${lowStock.length}</span>
              <p style="font-size: ${isThermal ? '10px' : '12px'}; color: #ffffff; margin: 4px 0 0 0;">منتج</p>
            </div>
          </div>
          
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px; background-color: #EF4444;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #ffffff; margin-bottom: 8px;">نفذت من المخزون</h3>
            <div style="text-align: center;">
              <span style="font-size: ${isThermal ? '18px' : '24px'}; font-weight: bold; color: #ffffff;">${outOfStock.length}</span>
              <p style="font-size: ${isThermal ? '10px' : '12px'}; color: #ffffff; margin: 4px 0 0 0;">منتج</p>
            </div>
          </div>
        </div>
        
        ${lowStock.length > 0 ? `
        <div style="margin-top: 20px;">
          <h3 style="font-size: ${isThermal ? '16px' : '18px'}; font-weight: bold; color: #F59E0B; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #F59E0B; padding-bottom: 4px;">
            المنتجات منخفضة المخزون
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: ${isThermal ? '10px' : '12px'};">
            <thead>
              <tr style="background-color: #FEF3C7;">
                <th style="border: 1px solid #F59E0B; padding: 6px; text-align: right; font-weight: bold;">المنتج</th>
                <th style="border: 1px solid #F59E0B; padding: 6px; text-align: center; font-weight: bold;">الكمية الحالية</th>
                <th style="border: 1px solid #F59E0B; padding: 6px; text-align: center; font-weight: bold;">الحد الأدنى</th>
                <th style="border: 1px solid #F59E0B; padding: 6px; text-align: center; font-weight: bold;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${lowStock.slice(0, isThermal ? 8 : 15).map((product: Product) => `
                <tr>
                  <td style="border: 1px solid #F59E0B; padding: 6px; text-align: right;">${product.name}</td>
                  <td style="border: 1px solid #F59E0B; padding: 6px; text-align: center; color: #F59E0B; font-weight: bold;">${product.current_stock} ${product.unit}</td>
                  <td style="border: 1px solid #F59E0B; padding: 6px; text-align: center;">${product.min_stock} ${product.unit}</td>
                  <td style="border: 1px solid #F59E0B; padding: 6px; text-align: center; color: #F59E0B; font-weight: bold;">تحتاج طلب</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Generate content based on report type
  const getReportContent = () => {
    switch (reportType) {
      case 'comprehensive':
        return generateComprehensiveContent();
      case 'stock-levels':
        return generateStockLevelsContent();
      case 'movements':
        return generateComprehensiveContent(); // Use comprehensive for now
      case 'low-stock':
        return generateStockLevelsContent();
      case 'expiry':
        return generateComprehensiveContent(); // Use comprehensive for now
      case 'custom':
        return generateComprehensiveContent();
      default:
        return generateComprehensiveContent();
    }
  };

  return `
    <div class="inventory-report-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
      <!-- Header Section -->
      ${(settings?.bill_show_logo || settings?.bill_show_company_info) ? `
        <div class="report-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <!-- Logo, Company Name Row -->
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
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
          
          <!-- Report Title -->
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-weight: bold; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; margin: 0; border: 2px solid #000; padding: 8px; display: inline-block; background-color: #f0f0f0;">
              ${getReportTitle()}
            </h2>
          </div>
          
          <!-- Report Period -->
          <div style="text-align: center; margin-bottom: 10px;">
            <p style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000; margin: 0;">
              الفترة من ${formatDate(dateRange.start)} إلى ${formatDate(dateRange.end)}
            </p>
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

      <!-- Report Content -->
      ${getReportContent()}

      <!-- Summary Section -->
      <div class="report-summary" style="margin-bottom: 20px; padding: 16px; border: 2px solid #000; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin: 0 0 12px 0; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; text-align: center;">ملخص التقرير</h3>
        <div style="text-align: center; font-size: ${isThermal ? '12px' : '14px'}; color: #666;">
          تاريخ الإنشاء: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
        </div>
        ${subtitle ? `
        <div style="text-align: center; margin-top: 8px; font-size: ${isThermal ? '12px' : '14px'}; color: #666;">
          ${subtitle}
        </div>
        ` : ''}
      </div>

      <!-- Footer Section -->
      <div class="report-footer-section" style="margin-top: 20px;">
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
 * Print inventory report with preview
 */
export const printInventoryWithPreview = async (
  reportType: string,
  reportData: InventoryReportData,
  settings: any,
  dateRange: { start: string; end: string },
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4',
  title?: string,
  subtitle?: string
): Promise<void> => {
  try {
    const reportContent = generateInventoryContent(
      reportType,
      reportData,
      settings,
      dateRange,
      printerType,
      title,
      subtitle
    );
    
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
          <title>معاينة طباعة تقرير المخزون - ${title || 'تقرير المخزون'}</title>
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
            .save-pdf-button {
              position: fixed;
              top: 20px;
              right: 120px;
              padding: 10px 20px;
              background: #28a745;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
            }
            .save-pdf-button:hover {
              background: #218838;
            }
            @media print {
              .print-button, .save-pdf-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">طباعة التقرير</button>
          <button class="save-pdf-button" onclick="saveAsPDF()">حفظ كـ PDF</button>
          ${reportContent}
          
          <script>
            function saveAsPDF() {
              if (typeof html2pdf !== 'undefined') {
                const element = document.body;
                const opt = {
                  margin: 1,
                  filename: 'تقرير-مخزون-${title || 'شامل'}-${new Date().toISOString().split('T')[0]}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              } else {
                window.print();
              }
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing inventory report:', error);
    throw error;
  }
};

/**
 * Save inventory report as PDF
 */
export const saveInventoryAsPDF = async (
  reportType: string,
  reportData: InventoryReportData,
  settings: any,
  dateRange: { start: string; end: string },
  title?: string,
  subtitle?: string
): Promise<void> => {
  try {
    const reportContent = generateInventoryContent(
      reportType,
      reportData,
      settings,
      dateRange,
      'a4',
      title,
      subtitle
    );
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة PDF');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>حفظ تقرير المخزون كـ PDF</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Cairo', Arial, sans-serif;
              direction: rtl;
            }
          </style>
        </head>
        <body>
          <div id="report-content">
            ${reportContent}
          </div>
          
          <script>
            window.onload = function() {
              const element = document.getElementById('report-content');
              const opt = {
                margin: 10,
                filename: 'تقرير-مخزون-${title || 'شامل'}-${new Date().toISOString().split('T')[0]}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              
              html2pdf().set(opt).from(element).save().then(() => {
                window.close();
              });
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  } catch (error) {
    console.error('Error saving inventory report as PDF:', error);
    throw error;
  }
};

/**
 * Export inventory report to Excel (CSV format)
 */
export const exportInventoryToExcel = (
  reportType: string,
  reportData: InventoryReportData,
  dateRange: { start: string; end: string },
  title?: string
): void => {
  try {
    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'comprehensive':
        const summary = reportData.summary;
        const inventory = reportData.current_inventory;
        
        csvContent = `نوع البيانات,القيمة
إجمالي المنتجات,${summary.total_products}
قيمة المخزون,${summary.total_stock_value}
منخفضة المخزون,${summary.low_stock_products}
نفذت من المخزون,${summary.out_of_stock_products}
إجمالي الحركات,${summary.total_movements}
عدد المشتريات,${summary.purchases_count}
عدد المبيعات,${summary.sales_count}
عدد التعديلات,${summary.adjustments_count}
عدد المرتجعات,${summary.returns_count}

تفاصيل المنتجات:
اسم المنتج,الكود,الكمية,سعر الشراء,قيمة المخزون,الوحدة
${inventory.map((product: Product) => 
  `${product.name},${product.sku},${product.current_stock},${product.purchase_price},${product.current_stock * product.purchase_price},${product.unit}`
).join('\n')}`;
        filename = `تقرير-مخزون-شامل-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'stock-levels':
        const lowStock = reportData.current_inventory.filter(p => p.current_stock <= p.min_stock && p.current_stock > 0);
        const outOfStock = reportData.current_inventory.filter(p => p.current_stock === 0);
        
        csvContent = `نوع البيانات,العدد
مخزون طبيعي,${reportData.current_inventory.filter(p => p.current_stock > p.min_stock).length}
منخفضة المخزون,${lowStock.length}
نفذت من المخزون,${outOfStock.length}

المنتجات منخفضة المخزون:
اسم المنتج,الكود,الكمية الحالية,الحد الأدنى,الوحدة
${lowStock.map((product: Product) => 
  `${product.name},${product.sku},${product.current_stock},${product.min_stock},${product.unit}`
).join('\n')}`;
        filename = `تقرير-مستويات-المخزون-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        csvContent = JSON.stringify(reportData, null, 2);
        filename = `تقرير-مخزون-${title || 'مخصص'}-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting inventory report to Excel:', error);
    throw error;
  }
};

// ==================== DEFAULT EXPORT ====================

const printInventoryUtils = {
  generateInventoryContent,
  printInventoryWithPreview,
  saveInventoryAsPDF,
  exportInventoryToExcel
};

export default printInventoryUtils;
