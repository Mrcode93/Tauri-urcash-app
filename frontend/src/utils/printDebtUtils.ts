import type { DebtData } from '@/features/debts/debtsService';
import type { Customer } from '@/features/customers/customersService';
import { convertNumberToWords } from '@/utils/convertNumberToWords';
import debtUtils from './debtUtils';

export interface PrintDebtOptions {
  debt: DebtData;
  customer?: Customer | null;
  settings: any;
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
  paymentAmount?: number;
  paymentMethod?: string;
  receiptDate?: string;
}

export interface PrintDebtResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate debt receipt content HTML
 */
const generateDebtReceiptContent = (
  debt: DebtData,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm',
  paymentAmount?: number,
  paymentMethod?: string,
  receiptDate?: string
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
    return debtUtils.formatCurrency(amount, settings?.currency || 'IQD');
  };

  const formatDate = (dateString: string) => {
    return debtUtils.formatDueDate(dateString);
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

  // Calculate amounts
  const remainingBeforePayment = debtUtils.calculateRemainingDebt(debt.total_amount, debt.paid_amount);
  const remainingAfterPayment = paymentAmount ? Math.max(0, remainingBeforePayment - paymentAmount) : remainingBeforePayment;
  const isPaymentReceipt = paymentAmount && paymentAmount > 0;

  return `
    <div class="debt-receipt-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
      <!-- Header Section -->
      ${(settings?.bill_show_logo || settings?.bill_show_company_info) ? `
        <div class="debt-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
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
          
          <!-- Document Type Indicator -->
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-weight: bold; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; margin: 0; border: 2px solid #000; padding: 8px; display: inline-block; background-color: #f0f0f0;">
              ${isPaymentReceipt ? 'إيصال دفع دين' : 'كشف حساب دين'}
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

      <!-- Debt Information Grid -->
      <div class="debt-info" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم الفاتورة:</span>
          <span style="color: #000000;">${debt.invoice_no}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">التاريخ:</span>
          <span style="color: #000000;">${formatDate(debt.created_at)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">الوقت:</span>
          <span style="color: #000000;">${formatTime(debt.created_at)}</span>
        </div>
        ${customer ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
          <span style="color: #000000;">${customer.name}</span>
        </div>
        ` : `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
          <span style="color: #000000;">${debt.customer_name}</span>
        </div>
        `}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">تاريخ الاستحقاق:</span>
          <span style="color: #000000;">${formatDate(debt.due_date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">حالة الدين:</span>
          <span style="color: #000000;">${debtUtils.getDebtStatusLabel(debtUtils.getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date))}</span>
        </div>
        ${debt.customer_phone ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم الهاتف:</span>
          <span style="color: #000000;">${debt.customer_phone}</span>
        </div>
        ` : ''}
        ${debt.customer_email ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">البريد الإلكتروني:</span>
          <span style="color: #000000;">${debt.customer_email}</span>
        </div>
        ` : ''}
      </div>

      <!-- Debt Amounts Table -->
      <div class="debt-amounts-container" style="margin-bottom: 20px;">
        <table class="debt-amounts-table" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: ${isThermal ? '14px' : '12px'};">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: right; background-color: #d9d9d9;">الوصف</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #ffffff;">
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">المبلغ الإجمالي</td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(debt.total_amount)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">المبلغ المدفوع</td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(debt.paid_amount)}</td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">المبلغ المتبقي</td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(remainingBeforePayment)}</td>
            </tr>
            ${isPaymentReceipt ? `
            <tr style="background-color: #f0f9ff;">
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">المبلغ المدفوع اليوم</td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(paymentAmount)}</td>
            </tr>
            <tr style="background-color: #fef3c7;">
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">المبلغ المتبقي بعد الدفع</td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${formatCurrency(remainingAfterPayment)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      ${isPaymentReceipt ? `
      <!-- Payment Information -->
      <div class="payment-info" style="margin-bottom: 20px; padding: 16px; border: 2px solid #000; border-radius: 8px; background-color: #f0f9ff;">
        <h3 style="margin: 0 0 12px 0; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; text-align: center;">تفاصيل الدفع</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #000000;">طريقة الدفع:</span>
            <span style="color: #000000;">${paymentMethod || 'نقداً'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold; color: #000000;">تاريخ الدفع:</span>
            <span style="color: #000000;">${formatDate(receiptDate || new Date().toISOString())}</span>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Overdue Information -->
      ${debtUtils.isDebtOverdue(debt.due_date) ? `
      <div class="overdue-info" style="margin-bottom: 20px; padding: 16px; border: 2px solid #dc2626; border-radius: 8px; background-color: #fef2f2;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: ${isThermal ? '16px' : '18px'}; text-align: center;">تنبيه تأخير</h3>
        <p style="margin: 0; color: #dc2626; text-align: center; font-weight: bold;">
          ${debtUtils.formatOverdueInfo(debt.due_date)}
        </p>
      </div>
      ` : ''}

      <!-- Summary Section -->
      <div class="debt-summary" style="margin-bottom: 20px; padding: 16px; border: 2px solid #000; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin: 0 0 12px 0; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; text-align: center;">ملخص الدين</h3>
        <div style="text-align: center; font-size: ${isThermal ? '14px' : '16px'}; font-weight: bold; color: #000000;">
          ${convertNumberToWords(remainingAfterPayment)} دينار عراقي
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: ${isThermal ? '12px' : '14px'}; color: #666;">
          نسبة الدفع: ${debtUtils.calculateDebtPercentagePaid(debt.total_amount, debt.paid_amount + (paymentAmount || 0))}%
        </div>
      </div>

      <!-- Footer Section -->
      <div class="debt-footer-section" style="margin-top: 20px;">
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
 * Print debt receipt with preview
 */
export const printDebtWithPreview = async (
  debt: DebtData,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4',
  paymentAmount?: number,
  paymentMethod?: string,
  receiptDate?: string
): Promise<void> => {
  try {
    const debtContent = generateDebtReceiptContent(
      debt, 
      customer, 
      settings, 
      printerType, 
      paymentAmount, 
      paymentMethod, 
      receiptDate
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
          <title>معاينة طباعة الدين - ${debt.invoice_no}</title>
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
          <button class="print-button" onclick="window.print()">طباعة الدين</button>
          ${debtContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing debt:', error);
    throw error;
  }
};

/**
 * Quick print debt receipt
 */
export const quickPrintDebt = async (
  debt: DebtData,
  customer: Customer | null,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4',
  paymentAmount?: number,
  paymentMethod?: string,
  receiptDate?: string
): Promise<void> => {
  try {
    const debtContent = generateDebtReceiptContent(
      debt, 
      customer, 
      settings, 
      printerType, 
      paymentAmount, 
      paymentMethod, 
      receiptDate
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
          <title>طباعة الدين</title>
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
          ${debtContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error('Error quick printing debt:', error);
    throw error;
  }
};

/**
 * Print debt statement (multiple debts for a customer)
 */
export const printDebtStatement = async (
  debts: DebtData[],
  customer: Customer,
  settings: any,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const totalAmount = debts.reduce((sum, debt) => sum + debt.total_amount, 0);
    const totalPaid = debts.reduce((sum, debt) => sum + debt.paid_amount, 0);
    const totalRemaining = debts.reduce((sum, debt) => sum + debtUtils.calculateRemainingDebt(debt.total_amount, debt.paid_amount), 0);
    
    const statementContent = `
      <div class="debt-statement-content font-arabic" style="text-align: center; direction: rtl; font-family: '${settings?.bill_font_body || 'Cairo'}', Arial, sans-serif; color: #000000;">
        
        <!-- Header Section -->
        ${(settings?.bill_show_logo || settings?.bill_show_company_info) ? `
          <div class="statement-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%;">
                ${settings?.bill_show_logo && settings?.logo_url ? `
                  <div style="flex-shrink: 0; text-align: center;">
                    <img src="${settings.logo_url}" alt="${settings?.company_name || 'Company Logo'}" style="height: 60px; object-fit: contain;">
                  </div>
                ` : ''}
                ${settings?.bill_show_company_info && settings?.company_name ? `
                  <div style="font-family: '${settings?.bill_font_header || 'Cairo'}', Arial, sans-serif; color: #000000; text-align: center; width: 100%;">
                    <h1 style="font-weight: ${settings?.bill_font_header_weight || '700'}; color: #000000; font-size: 20px; margin: 0;">
                      ${settings.company_name}
                    </h1>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 10px;">
              <h2 style="font-weight: bold; color: #000000; font-size: 18px; margin: 0; border: 2px solid #000; padding: 8px; display: inline-block; background-color: #f0f0f0;">
                كشف حساب العميل
              </h2>
            </div>
          </div>
        ` : ''}

        <!-- Customer Information -->
        <div class="customer-info" style="margin-bottom: 24px; padding: 16px; border: 2px solid #000; border-radius: 8px; background-color: #f9fafb;">
          <h3 style="margin: 0 0 16px 0; color: #000000; font-size: 18px; text-align: center;">معلومات العميل</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
              <span style="color: #000000;">${customer.name}</span>
            </div>
            ${customer.phone ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #000000;">رقم الهاتف:</span>
              <span style="color: #000000;">${customer.phone}</span>
            </div>
            ` : ''}
            ${customer.email ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #000000;">البريد الإلكتروني:</span>
              <span style="color: #000000;">${customer.email}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #000000;">تاريخ الطباعة:</span>
              <span style="color: #000000;">${new Date().toLocaleDateString('ar-IQ')}</span>
            </div>
          </div>
        </div>

        <!-- Debts Table -->
        <div class="debts-table-container" style="margin-bottom: 20px;">
          <table class="debts-table" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 12px;">
            <thead>
              <tr style="background-color: #e5e7eb;">
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: right; background-color: #d9d9d9;">رقم الفاتورة</th>
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">التاريخ</th>
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">المبلغ الإجمالي</th>
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">المبلغ المدفوع</th>
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">المبلغ المتبقي</th>
                <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center; background-color: #d9d9d9;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${debts.map((debt, index) => {
                const remaining = debtUtils.calculateRemainingDebt(debt.total_amount, debt.paid_amount);
                const status = debtUtils.getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date);
                return `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debt.invoice_no}</td>
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debtUtils.formatDueDate(debt.created_at)}</td>
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debtUtils.formatCurrency(debt.total_amount)}</td>
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debtUtils.formatCurrency(debt.paid_amount)}</td>
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debtUtils.formatCurrency(remaining)}</td>
                    <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">${debtUtils.getDebtStatusLabel(status)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary Section -->
        <div class="statement-summary" style="margin-bottom: 20px; padding: 16px; border: 2px solid #000; border-radius: 8px; background-color: #f9fafb;">
          <h3 style="margin: 0 0 16px 0; color: #000000; font-size: 18px; text-align: center;">ملخص الحساب</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #000000; font-size: 16px;">إجمالي المبالغ</div>
              <div style="color: #000000; font-size: 18px; font-weight: bold;">${debtUtils.formatCurrency(totalAmount)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #000000; font-size: 16px;">إجمالي المدفوع</div>
              <div style="color: #000000; font-size: 18px; font-weight: bold;">${debtUtils.formatCurrency(totalPaid)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #000000; font-size: 16px;">إجمالي المتبقي</div>
              <div style="color: #000000; font-size: 18px; font-weight: bold;">${debtUtils.formatCurrency(totalRemaining)}</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px; font-size: 16px; font-weight: bold; color: #000000;">
            ${convertNumberToWords(totalRemaining)} دينار عراقي
          </div>
        </div>

        <!-- Footer Section -->
        <div class="statement-footer-section" style="margin-top: 20px;">
          ${settings?.bill_footer_text ? `
            <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000;">
              <p style="font-family: '${settings?.bill_font_footer || 'Cairo'}', Arial, sans-serif; font-size: 12px; font-weight: 400; margin: 0; color: #000000;">
                ${settings.bill_footer_text}
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 16px; border-top: 1px solid #000; padding-top: 8px;">
            <p style="font-size: 14px; font-weight: bold; margin: 0; color: #000000;">
              برنامج اوركاش للمحاسبة - من URUX للبرمجيات
            </p>
          </div>
        </div>
      </div>
    `;
    
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
          <title>كشف حساب العميل - ${customer.name}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
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
          <button class="print-button" onclick="window.print()">طباعة كشف الحساب</button>
          ${statementContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing debt statement:', error);
    throw error;
  }
};

// ==================== DEFAULT EXPORT ====================

const printDebtUtils = {
  generateDebtReceiptContent,
  printDebtWithPreview,
  quickPrintDebt,
  printDebtStatement
};

export default printDebtUtils;
