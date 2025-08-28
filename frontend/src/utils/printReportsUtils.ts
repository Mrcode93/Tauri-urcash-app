import type { ReportSummary, RawDashboardSummary, BestSellingProduct } from '@/features/reports/types';
import { convertNumberToWords } from '@/utils/convertNumberToWords';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface PrintReportOptions {
  reportType: 'dashboard' | 'profit-loss' | 'sales' | 'inventory' | 'customers' | 'custom';
  reportData: any;
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

export interface PrintReportResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate report content HTML
 */
const generateReportContent = (
  reportType: string,
  reportData: any,
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

  // Determine styling based on printer type
  const isThermal = printerType === 'thermal' || printerType === 'thermal-80mm' || printerType === 'thermal-58mm';

  // Get report title based on type
  const getReportTitle = () => {
    switch (reportType) {
      case 'dashboard':
        return title || 'تقرير لوحة التحكم الشامل';
      case 'profit-loss':
        return title || 'تقرير الأرباح والخسائر';
      case 'sales':
        return title || 'تقرير المبيعات';
      case 'inventory':
        return title || 'تقرير المخزون';
      case 'customers':
        return title || 'تقرير العملاء';
      case 'custom':
        return title || 'تقرير مخصص';
      default:
        return title || 'تقرير الأعمال';
    }
  };

  // Generate dashboard report content
  const generateDashboardContent = () => {
    const summary = reportData as ReportSummary;
    if (!summary) return '';

    return `
      <div class="dashboard-report" style="margin-bottom: 24px;">
        <h2 style="font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; color: #000000; margin-bottom: 16px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
          ملخص الأداء المالي
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">المبيعات</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي المبيعات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${formatCurrency(summary.sales.total)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">عدد الفواتير:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${summary.sales.count}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">المدفوع:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${formatCurrency(summary.sales.paidAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">غير المدفوع:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #EF4444;">${formatCurrency(summary.sales.unpaidAmount)}</span>
              </div>
            </div>
          </div>
          
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">الأداء المالي</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">صافي الربح:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${formatCurrency(summary.financial.net_profit)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">هامش الربح:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${summary.financial.profit_margin}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي المصروفات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #EF4444;">${formatCurrency(summary.expenses.total)}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${summary.bestSellers && summary.bestSellers.length > 0 ? `
        <div style="margin-top: 20px;">
          <h3 style="font-size: ${isThermal ? '16px' : '18px'}; font-weight: bold; color: #000000; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px;">
            أفضل المنتجات مبيعاً
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: ${isThermal ? '10px' : '12px'};">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">المنتج</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">الكود</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">الكمية</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${summary.bestSellers.map((product: BestSellingProduct) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; text-align: right;">${product.name}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${product.code}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${product.total_quantity}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${formatCurrency(product.total_revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Generate profit-loss report content
  const generateProfitLossContent = () => {
    const profitLoss = reportData;
    if (!profitLoss) return '';

    return `
      <div class="profit-loss-report" style="margin-bottom: 24px;">
        <h2 style="font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; color: #000000; margin-bottom: 16px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
          تقرير الأرباح والخسائر
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">الإيرادات</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي المبيعات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${formatCurrency(profitLoss.total_revenue || 0)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">إجمالي المشتريات:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #EF4444;">${formatCurrency(profitLoss.total_purchases || 0)}</span>
              </div>
            </div>
          </div>
          
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
            <h3 style="font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000; margin-bottom: 8px;">النتيجة</h3>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">صافي الربح:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #10B981;">${formatCurrency(profitLoss.net_profit || 0)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: ${isThermal ? '12px' : '14px'}; color: #000000;">هامش الربح:</span>
                <span style="font-size: ${isThermal ? '12px' : '14px'}; font-weight: bold; color: #000000;">${profitLoss.profit_margin || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Generate custom report content
  const generateCustomContent = () => {
    return `
      <div class="custom-report" style="margin-bottom: 24px;">
        <h2 style="font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; color: #000000; margin-bottom: 16px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px;">
          ${title || 'تقرير مخصص'}
        </h2>
        
        <div style="border: 1px solid #000; padding: 12px; border-radius: 4px;">
          <pre style="font-family: 'Cairo', Arial, sans-serif; font-size: ${isThermal ? '10px' : '12px'}; white-space: pre-wrap; word-wrap: break-word;">
            ${JSON.stringify(reportData, null, 2)}
          </pre>
        </div>
      </div>
    `;
  };

  // Generate content based on report type
  const getReportContent = () => {
    switch (reportType) {
      case 'dashboard':
        return generateDashboardContent();
      case 'profit-loss':
        return generateProfitLossContent();
      case 'custom':
        return generateCustomContent();
      default:
        return generateDashboardContent();
    }
  };

  return `
    <div class="report-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
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
 * Print report with preview
 */
export const printReportWithPreview = async (
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4',
  title?: string,
  subtitle?: string
): Promise<void> => {
  try {
    const reportContent = generateReportContent(
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
          <title>معاينة طباعة التقرير - ${title || 'تقرير الأعمال'}</title>
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
              // Use html2pdf library if available
              if (typeof html2pdf !== 'undefined') {
                const element = document.body;
                const opt = {
                  margin: 1,
                  filename: 'تقرير-${title || 'الأعمال'}-${new Date().toISOString().split('T')[0]}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              } else {
                // Fallback to print to PDF
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
    console.error('Error printing report:', error);
    throw error;
  }
};

/**
 * Quick print report
 */
export const quickPrintReport = async (
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4',
  title?: string,
  subtitle?: string
): Promise<void> => {
  try {
    const reportContent = generateReportContent(
      reportType,
      reportData,
      settings,
      dateRange,
      printerType,
      title,
      subtitle
    );
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>طباعة التقرير</title>
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
          ${reportContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error('Error quick printing report:', error);
    throw error;
  }
};

/**
 * Save report as PDF
 */
export const saveReportAsPDF = async (
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  title?: string,
  subtitle?: string
): Promise<void> => {
  try {
    const reportContent = generateReportContent(
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
          <title>حفظ التقرير كـ PDF</title>
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
                filename: 'تقرير-${title || 'الأعمال'}-${new Date().toISOString().split('T')[0]}.pdf',
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
    console.error('Error saving report as PDF:', error);
    throw error;
  }
};

/**
 * Export report to Excel (CSV format)
 */
export const exportReportToExcel = (
  reportType: string,
  reportData: any,
  dateRange: { start: string; end: string },
  title?: string
): void => {
  try {
    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'dashboard':
        const summary = reportData as ReportSummary;
        if (summary) {
          csvContent = `نوع البيانات,القيمة
إجمالي المبيعات,${summary.sales.total}
عدد الفواتير,${summary.sales.count}
المدفوع,${summary.sales.paidAmount}
غير المدفوع,${summary.sales.unpaidAmount}
صافي الربح,${summary.financial.net_profit}
هامش الربح,${summary.financial.profit_margin}%
إجمالي المصروفات,${summary.expenses.total}`;
        }
        filename = `تقرير-لوحة-التحكم-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'profit-loss':
        const profitLoss = reportData;
        if (profitLoss) {
          csvContent = `نوع البيانات,القيمة
إجمالي المبيعات,${profitLoss.total_revenue || 0}
إجمالي المشتريات,${profitLoss.total_purchases || 0}
صافي الربح,${profitLoss.net_profit || 0}
هامش الربح,${profitLoss.profit_margin || 0}%`;
        }
        filename = `تقرير-الأرباح-والخسائر-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        csvContent = JSON.stringify(reportData, null, 2);
        filename = `تقرير-${title || 'مخصص'}-${new Date().toISOString().split('T')[0]}.csv`;
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
    console.error('Error exporting report to Excel:', error);
    throw error;
  }
};

// ==================== DEFAULT EXPORT ====================

const printReportsUtils = {
  generateReportContent,
  printReportWithPreview,
  quickPrintReport,
  saveReportAsPDF,
  exportReportToExcel
};

export default printReportsUtils;
