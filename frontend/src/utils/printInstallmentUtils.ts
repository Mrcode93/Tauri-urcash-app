import type { Installment } from '@/features/installments/installmentsService';
import type { Customer } from '@/features/customers/customersService';
import { convertNumberToWords } from '@/utils/convertNumberToWords';

// Add InstallmentPlan interface to match the actual data structure
interface InstallmentPlan {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  total_installments: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: Array<{
    id: number;
    sale_id: number;
    customer_id: number;
    customer_name: string;
    customer_phone: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    payment_status: 'paid' | 'unpaid' | 'partial';
    payment_method: 'cash' | 'card' | 'bank_transfer';
    paid_at: string | null;
    notes: string;
    invoice_no: string;
    created_at: string;
    updated_at: string;
  }>;
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

export interface PrintInstallmentOptions {
  installment: Installment | InstallmentPlan;
  customer?: Customer | null;
  settings: Record<string, unknown>;
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  copies?: number;
  showPreview?: boolean;
}

export interface PrintInstallmentResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate installment receipt content HTML
 */
const generateInstallmentContent = (
  installment: Installment | InstallmentPlan,
  customer: Customer | null,
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
      return date.toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'غير محدد';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return date.toLocaleTimeString('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Check if this is an InstallmentPlan
  const isInstallmentPlan = (data: Installment | InstallmentPlan): data is InstallmentPlan => {
    return data && Array.isArray((data as InstallmentPlan).installments);
  };

  const plan = isInstallmentPlan(installment) ? installment : null;
  const installmentData = isInstallmentPlan(installment) ? null : installment;

  // Calculate amounts from installments array if available
  const calculateAmounts = () => {
    if (plan?.installments && plan.installments.length > 0) {
      const totalAmount = plan.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      const paidAmount = plan.installments.reduce((sum, inst) => {
        if (inst.payment_status === 'paid') {
          return sum + (inst.paid_amount || inst.amount || 0);
        }
        return sum + (inst.paid_amount || 0);
      }, 0);
      const remainingAmount = totalAmount - paidAmount;
      
      return {
        totalAmount,
        paidAmount,
        remainingAmount
      };
    }
    
    return {
      totalAmount: plan?.total_amount || installmentData?.amount || 0,
      paidAmount: plan?.paid_amount || installmentData?.paid_amount || 0,
      remainingAmount: plan?.remaining_amount || 0
    };
  };

  const amounts = calculateAmounts();

  // Determine styling based on printer type
  const isThermal = printerType === 'thermal' || printerType === 'thermal-80mm' || printerType === 'thermal-58mm';

  return `
    <div class="installment-content font-arabic" style="text-align: center; direction: rtl; font-family: '${(settings?.bill_font_body as string) || 'Cairo'}', Arial, sans-serif; color: #000000;">
      
      <!-- Header Section -->
      ${((settings?.bill_show_logo as boolean) || (settings?.bill_show_company_info as boolean)) ? `
        <div class="installment-header" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <!-- Logo, Company Name Row -->
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <!-- Logo and Company Name -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%;">
              ${(settings?.bill_show_logo as boolean) && (settings?.logo_url as string) ? `
                <div style="flex-shrink: 0; text-align: center;">
                  <img src="${getLogoUrl(settings.logo_url as string)}" alt="${(settings?.company_name as string) || 'Company Logo'}" style="height: ${isThermal ? '48px' : '60px'}; object-fit: contain;">
                </div>
              ` : ''}
              ${(settings?.bill_show_company_info as boolean) && (settings?.company_name as string) && !(settings?.bill_show_logo as boolean) ? `
                <div style="font-family: '${(settings?.bill_font_header as string) || 'Cairo'}', Arial, sans-serif; color: #000000; text-align: center; width: 100%;">
                  <h1 style="font-weight: ${(settings?.bill_font_header_weight as string) || '700'}; color: #000000; font-size: ${isThermal ? '18px' : '20px'}; margin: 0;">
                    ${settings.company_name as string}
                  </h1>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Bill Type Indicator -->
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-weight: bold; color: #000000; font-size: ${isThermal ? '16px' : '18px'}; margin: 0; border: 2px solid #000; padding: 8px; display: inline-block; background-color: #f0f0f0;">
              سند قسط
            </h2>
          </div>
          
          <!-- Address and Phone Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: bold; color: #000000;">العنوان:</span>
                <span style="color: #000000;">${(settings?.address as string) || ''}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: bold; color: #000000;">رقم الهاتف:</span>
              <span style="color: #000000;">${(settings?.mobile as string) || ''}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Installment Information Grid -->
      <div class="installment-info" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">رقم الفاتورة:</span>
          <span style="color: #000000;">${plan?.invoice_no || installmentData?.invoice_no || 'غير محدد'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">التاريخ:</span>
          <span style="color: #000000;">${formatDate(plan?.created_at || installmentData?.created_at || new Date().toISOString())}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">الوقت:</span>
          <span style="color: #000000;">${formatTime(plan?.created_at || installmentData?.created_at || new Date().toISOString())}</span>
        </div>
        ${customer ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">اسم العميل:</span>
          <span style="color: #000000;">${customer.name}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">إجمالي الأقساط:</span>
          <span style="color: #000000;">${plan?.total_installments || 0}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المبلغ المدفوع:</span>
          <span style="color: #000000;">${formatCurrency(amounts.paidAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">المبلغ المتبقي:</span>
          <span style="color: #000000;">${formatCurrency(amounts.remainingAmount)}</span>
        </div>
        ${plan?.payment_status ? `
        <div style="display: flex; justify-content: space-between; border: 2px solid #000; padding: 8px; border-radius: 4px;">
          <span style="font-weight: bold; color: #000000;">حالة السداد:</span>
          <span style="color: #000000;">${plan.payment_status === 'paid' ? 'مدفوع' : 
                                       plan.payment_status === 'partial' ? 'مدفوع جزئياً' : 
                                       'غير مدفوع'}</span>
        </div>
        ` : ''}
      </div>

      <!-- Installment Details Table -->
      <div class="installment-table-container" style="margin-bottom: 20px;">
        <table class="installment-table" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: ${isThermal ? '14px' : '12px'};">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">رقم القسط</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">المبلغ</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">تاريخ الاستحقاق</th>
              <th style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #000000; text-align: center;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${plan?.installments && plan.installments.length > 0 ? plan.installments.map((detail, index: number) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                  القسط ${index + 1}
                </td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                  ${formatCurrency(detail.amount || 0)}
                </td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                  ${detail.due_date ? formatDate(detail.due_date) : 'غير محدد'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                  ${detail.payment_status === 'paid' ? 'مدفوع' :
                   detail.payment_status === 'partial' ? 'مدفوع جزئياً' :
                   'غير مدفوع'}
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center;">
                  لا توجد تفاصيل أقساط
                </td>
              </tr>
            `}
            <tr style="background-color: #f3f4f6; border-top: 2px solid #000;">
              <td colspan="1" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: right; font-weight: bold;">
                المجموع :
              </td>
              <td style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                ${formatCurrency(amounts.totalAmount)}
              </td>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; color: #000000; text-align: center; font-weight: bold;">
                ${plan?.total_installments || 0} قسط
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in Words -->
      <div style="margin-bottom: 20px; border: 2px solid #000; padding: 16px; background-color: #f9fafb;">
        <div style="text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #000000; margin-bottom: 8px;">
            المبلغ بالكلمات:
          </div>
          <div style="font-size: 14px; color: #000000;">
            ${convertNumberToWords(amounts.totalAmount)} دينار عراقي
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="installment-footer-section" style="margin-top: 20px;">
        <!-- Footer -->
        ${(settings?.bill_footer_text as string) ? `
          <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000;">
            <p style="font-family: '${(settings?.bill_font_footer as string) || 'Cairo'}', Arial, sans-serif; font-size: 12px; font-weight: 400; margin: 0; color: #000000;">
              ${settings.bill_footer_text as string}
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
 * Print installment receipt with preview
 */
export const printInstallmentWithPreview = async (
  installment: Installment | InstallmentPlan,
  customer: Customer | null,
  settings: Record<string, unknown>,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const installmentContent = generateInstallmentContent(installment, customer, settings, printerType);
    
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
          <title>معاينة طباعة القسط - ${(installment as InstallmentPlan).invoice_no || (installment as Installment).invoice_no}</title>
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
              background: #17a2b8;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Cairo', Arial, sans-serif;
            }
            .print-button:hover {
              background: #138496;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">طباعة القسط</button>
          ${installmentContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  } catch (error) {
    console.error('Error printing installment:', error);
    throw error;
  }
};

/**
 * Quick print installment receipt
 */
export const quickPrintInstallment = async (
  installment: Installment | InstallmentPlan,
  customer: Customer | null,
  settings: Record<string, unknown>,
  printerType: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' = 'a4'
): Promise<void> => {
  try {
    const installmentContent = generateInstallmentContent(installment, customer, settings, printerType);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('فشل في فتح نافذة الطباعة');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>طباعة القسط</title>
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
          ${installmentContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error('Error quick printing installment:', error);
    throw error;
  }
};
