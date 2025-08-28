import type { DebtData, CreateDebtData, UpdateDebtData, RepayDebtData } from '@/features/debts/debtsService';

/**
 * Debt Utility Functions
 * Provides common functions for debt management, calculations, formatting, and validation
 */

// ==================== DEBT CALCULATIONS ====================

/**
 * Calculate remaining debt amount
 */
export const calculateRemainingDebt = (totalAmount: number, paidAmount: number): number => {
  return Math.max(0, totalAmount - paidAmount);
};

/**
 * Calculate debt percentage paid
 */
export const calculateDebtPercentagePaid = (totalAmount: number, paidAmount: number): number => {
  if (totalAmount <= 0) return 100;
  return Math.min(100, Math.round((paidAmount / totalAmount) * 100));
};

/**
 * Calculate debt percentage remaining
 */
export const calculateDebtPercentageRemaining = (totalAmount: number, paidAmount: number): number => {
  return 100 - calculateDebtPercentagePaid(totalAmount, paidAmount);
};

/**
 * Check if debt is overdue
 */
export const isDebtOverdue = (dueDate: string): boolean => {
  const today = new Date();
  const due = new Date(dueDate);
  return due < today;
};

/**
 * Calculate days overdue
 */
export const calculateDaysOverdue = (dueDate: string): number => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Calculate days until due
 */
export const calculateDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// ==================== DEBT STATUS UTILITIES ====================

/**
 * Get debt status based on amounts and due date
 */
export const getDebtStatus = (
  totalAmount: number, 
  paidAmount: number, 
  dueDate?: string
): 'paid' | 'partial' | 'pending' | 'overdue' => {
  const remaining = calculateRemainingDebt(totalAmount, paidAmount);
  
  if (remaining <= 0) {
    return 'paid';
  }
  
  if (paidAmount > 0) {
    return 'partial';
  }
  
  if (dueDate && isDebtOverdue(dueDate)) {
    return 'overdue';
  }
  
  return 'pending';
};

/**
 * Get debt status badge color
 */
export const getDebtStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get debt status label in Arabic
 */
export const getDebtStatusLabel = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'مدفوع';
    case 'partial':
      return 'مدفوع جزئياً';
    case 'pending':
      return 'قيد الانتظار';
    case 'overdue':
      return 'متأخر';
    default:
      return 'غير محدد';
  }
};

// ==================== DEBT FORMATTING ====================

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'IQD'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'غير محدد';
  }
  
  try {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    return `${amount.toLocaleString('ar-IQ')} ${currency}`;
  }
};

/**
 * Format debt amount with remaining indicator
 */
export const formatDebtAmount = (totalAmount: number, paidAmount: number, currency: string = 'IQD'): string => {
  const remaining = calculateRemainingDebt(totalAmount, paidAmount);
  const percentage = calculateDebtPercentagePaid(totalAmount, paidAmount);
  
  if (remaining <= 0) {
    return `${formatCurrency(totalAmount, currency)} (مدفوع بالكامل)`;
  }
  
  return `${formatCurrency(remaining, currency)} من ${formatCurrency(totalAmount, currency)} (${percentage}%)`;
};

/**
 * Format due date
 */
export const formatDueDate = (dueDate: string): string => {
  if (!dueDate) return 'غير محدد';
  
  try {
    const date = new Date(dueDate);
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

/**
 * Format overdue information
 */
export const formatOverdueInfo = (dueDate: string): string => {
  if (!dueDate) return '';
  
  if (isDebtOverdue(dueDate)) {
    const daysOverdue = calculateDaysOverdue(dueDate);
    return `متأخر ${daysOverdue} يوم`;
  } else {
    const daysUntilDue = calculateDaysUntilDue(dueDate);
    if (daysUntilDue === 0) {
      return 'يستحق اليوم';
    } else if (daysUntilDue === 1) {
      return 'يستحق غداً';
    } else {
      return `يستحق خلال ${daysUntilDue} يوم`;
    }
  }
};

// ==================== DEBT VALIDATION ====================

/**
 * Validate debt data
 */
export const validateDebtData = (debtData: CreateDebtData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!debtData.sale_id || debtData.sale_id <= 0) {
    errors.push('معرف الفاتورة مطلوب');
  }
  
  if (debtData.paid_amount < 0) {
    errors.push('المبلغ المدفوع لا يمكن أن يكون سالباً');
  }
  
  if (!debtData.due_date) {
    errors.push('تاريخ الاستحقاق مطلوب');
  } else {
    const dueDate = new Date(debtData.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push('تاريخ الاستحقاق غير صحيح');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate debt repayment data
 */
export const validateRepaymentData = (repaymentData: RepayDebtData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!repaymentData.paid_amount || repaymentData.paid_amount <= 0) {
    errors.push('المبلغ المدفوع مطلوب ويجب أن يكون أكبر من صفر');
  }
  
  if (repaymentData.payment_method && !['cash', 'card', 'bank_transfer', 'check'].includes(repaymentData.payment_method)) {
    errors.push('طريقة الدفع غير صحيحة');
  }
  
  if (repaymentData.receipt_date) {
    const receiptDate = new Date(repaymentData.receipt_date);
    if (isNaN(receiptDate.getTime())) {
      errors.push('تاريخ الإيصال غير صحيح');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ==================== DEBT FILTERING & SORTING ====================

/**
 * Filter debts by status
 */
export const filterDebtsByStatus = (debts: DebtData[], status: string): DebtData[] => {
  if (!status || status === 'all') return debts;
  
  return debts.filter(debt => {
    const debtStatus = getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date);
    return debtStatus === status;
  });
};

/**
 * Filter debts by customer
 */
export const filterDebtsByCustomer = (debts: DebtData[], customerId: number): DebtData[] => {
  return debts.filter(debt => debt.customer_id === customerId);
};

/**
 * Filter overdue debts
 */
export const filterOverdueDebts = (debts: DebtData[]): DebtData[] => {
  return debts.filter(debt => isDebtOverdue(debt.due_date));
};

/**
 * Sort debts by due date
 */
export const sortDebtsByDueDate = (debts: DebtData[], ascending: boolean = true): DebtData[] => {
  return [...debts].sort((a, b) => {
    const dateA = new Date(a.due_date).getTime();
    const dateB = new Date(b.due_date).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Sort debts by amount
 */
export const sortDebtsByAmount = (debts: DebtData[], ascending: boolean = true): DebtData[] => {
  return [...debts].sort((a, b) => {
    const amountA = calculateRemainingDebt(a.total_amount, a.paid_amount);
    const amountB = calculateRemainingDebt(b.total_amount, b.paid_amount);
    return ascending ? amountA - amountB : amountB - amountA;
  });
};

// ==================== DEBT STATISTICS ====================

/**
 * Calculate debt statistics
 */
export const calculateDebtStats = (debts: DebtData[]) => {
  const stats = {
    totalDebts: debts.length,
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    overdueCount: 0,
    overdueAmount: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0
  };
  
  debts.forEach(debt => {
    const remaining = calculateRemainingDebt(debt.total_amount, debt.paid_amount);
    const status = getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date);
    
    stats.totalAmount += debt.total_amount;
    stats.totalPaid += debt.paid_amount;
    stats.totalRemaining += remaining;
    
    if (status === 'overdue') {
      stats.overdueCount++;
      stats.overdueAmount += remaining;
    } else if (status === 'paid') {
      stats.paidCount++;
    } else if (status === 'partial') {
      stats.partialCount++;
    } else if (status === 'pending') {
      stats.pendingCount++;
    }
  });
  
  return stats;
};

/**
 * Get debt summary for customer
 */
export const getCustomerDebtSummary = (debts: DebtData[]) => {
  const stats = calculateDebtStats(debts);
  
  return {
    totalDebts: stats.totalDebts,
    totalOwed: formatCurrency(stats.totalRemaining),
    overdueAmount: formatCurrency(stats.overdueAmount),
    overdueCount: stats.overdueCount,
    paymentProgress: stats.totalAmount > 0 ? Math.round((stats.totalPaid / stats.totalAmount) * 100) : 0
  };
};

// ==================== DEBT NOTIFICATIONS ====================

/**
 * Check if debt needs notification
 */
export const shouldNotifyDebt = (debt: DebtData, daysThreshold: number = 7): boolean => {
  if (getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date) === 'paid') {
    return false;
  }
  
  const daysUntilDue = calculateDaysUntilDue(debt.due_date);
  return daysUntilDue <= daysThreshold;
};

/**
 * Get debt notification message
 */
export const getDebtNotificationMessage = (debt: DebtData): string => {
  const status = getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date);
  const remaining = calculateRemainingDebt(debt.total_amount, debt.paid_amount);
  
  if (status === 'overdue') {
    const daysOverdue = calculateDaysOverdue(debt.due_date);
    return `دين متأخر: ${debt.customer_name} - ${formatCurrency(remaining)} (متأخر ${daysOverdue} يوم)`;
  }
  
  if (status === 'pending') {
    const daysUntilDue = calculateDaysUntilDue(debt.due_date);
    if (daysUntilDue <= 3) {
      return `دين يستحق قريباً: ${debt.customer_name} - ${formatCurrency(remaining)} (يستحق خلال ${daysUntilDue} يوم)`;
    }
  }
  
  return `دين معلق: ${debt.customer_name} - ${formatCurrency(remaining)}`;
};

// ==================== DEBT EXPORT UTILITIES ====================

/**
 * Convert debt to CSV row
 */
export const debtToCSVRow = (debt: DebtData): string => {
  const status = getDebtStatus(debt.total_amount, debt.paid_amount, debt.due_date);
  const remaining = calculateRemainingDebt(debt.total_amount, debt.paid_amount);
  const overdue = isDebtOverdue(debt.due_date);
  
  return [
    debt.invoice_no,
    debt.customer_name,
    debt.customer_phone || '',
    formatCurrency(debt.total_amount),
    formatCurrency(debt.paid_amount),
    formatCurrency(remaining),
    formatDueDate(debt.due_date),
    getDebtStatusLabel(status),
    overdue ? 'نعم' : 'لا',
    debt.created_at
  ].join(',');
};

/**
 * Get CSV headers for debt export
 */
export const getDebtCSVHeaders = (): string => {
  return [
    'رقم الفاتورة',
    'اسم العميل',
    'رقم الهاتف',
    'المبلغ الإجمالي',
    'المبلغ المدفوع',
    'المبلغ المتبقي',
    'تاريخ الاستحقاق',
    'الحالة',
    'متأخر',
    'تاريخ الإنشاء'
  ].join(',');
};

// ==================== DEBT PRINT UTILITIES ====================

/**
 * Generate debt receipt content
 */
export const generateDebtReceiptContent = (debt: DebtData, paymentAmount: number, paymentMethod: string): string => {
  const remaining = calculateRemainingDebt(debt.total_amount, debt.paid_amount);
  const newRemaining = Math.max(0, remaining - paymentAmount);
  
  return `
    <div style="text-align: center; direction: rtl; font-family: 'Cairo', Arial, sans-serif;">
      <h2>إيصال دفع دين</h2>
      <div style="margin: 20px 0;">
        <p><strong>رقم الفاتورة:</strong> ${debt.invoice_no}</p>
        <p><strong>اسم العميل:</strong> ${debt.customer_name}</p>
        <p><strong>المبلغ المدفوع:</strong> ${formatCurrency(paymentAmount)}</p>
        <p><strong>طريقة الدفع:</strong> ${paymentMethod}</p>
        <p><strong>المبلغ المتبقي:</strong> ${formatCurrency(newRemaining)}</p>
        <p><strong>تاريخ الدفع:</strong> ${new Date().toLocaleDateString('ar-IQ')}</p>
      </div>
    </div>
  `;
};

// ==================== DEBT CONSTANTS ====================

export const DEBT_STATUSES = {
  PAID: 'paid',
  PARTIAL: 'partial',
  PENDING: 'pending',
  OVERDUE: 'overdue'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check'
} as const;

export const DEBT_NOTIFICATION_THRESHOLDS = {
  OVERDUE: 0,
  DUE_TODAY: 0,
  DUE_TOMORROW: 1,
  DUE_WEEK: 7,
  DUE_MONTH: 30
} as const;

// ==================== DEFAULT EXPORT ====================

const debtUtils = {
  // Calculations
  calculateRemainingDebt,
  calculateDebtPercentagePaid,
  calculateDebtPercentageRemaining,
  isDebtOverdue,
  calculateDaysOverdue,
  calculateDaysUntilDue,
  
  // Status
  getDebtStatus,
  getDebtStatusColor,
  getDebtStatusLabel,
  
  // Formatting
  formatCurrency,
  formatDebtAmount,
  formatDueDate,
  formatOverdueInfo,
  
  // Validation
  validateDebtData,
  validateRepaymentData,
  
  // Filtering & Sorting
  filterDebtsByStatus,
  filterDebtsByCustomer,
  filterOverdueDebts,
  sortDebtsByDueDate,
  sortDebtsByAmount,
  
  // Statistics
  calculateDebtStats,
  getCustomerDebtSummary,
  
  // Notifications
  shouldNotifyDebt,
  getDebtNotificationMessage,
  
  // Export
  debtToCSVRow,
  getDebtCSVHeaders,
  
  // Print
  generateDebtReceiptContent,
  
  // Constants
  DEBT_STATUSES,
  PAYMENT_METHODS,
  DEBT_NOTIFICATION_THRESHOLDS
};

export default debtUtils;
