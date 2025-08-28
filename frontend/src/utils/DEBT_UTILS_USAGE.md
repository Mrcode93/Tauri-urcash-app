# Debt Utilities Usage Guide

This document explains how to use the debt utilities in the UrCash application.

## Overview

The debt utilities provide comprehensive functionality for debt management, including:
- Debt calculations and formatting
- Debt status management
- Debt validation
- Debt filtering and sorting
- Debt statistics
- Debt notifications
- Debt printing (receipts and statements)

## Files

1. **`debtUtils.ts`** - Core debt utility functions
2. **`printDebtUtils.ts`** - Debt printing utilities
3. **`Debts.tsx`** - Updated debts page with print functionality

## Core Debt Utilities (`debtUtils.ts`)

### Calculations

```typescript
import debtUtils from '@/utils/debtUtils';

// Calculate remaining debt amount
const remaining = debtUtils.calculateRemainingDebt(totalAmount, paidAmount);

// Calculate debt percentage paid
const percentagePaid = debtUtils.calculateDebtPercentagePaid(totalAmount, paidAmount);

// Check if debt is overdue
const isOverdue = debtUtils.isDebtOverdue(dueDate);

// Calculate days overdue
const daysOverdue = debtUtils.calculateDaysOverdue(dueDate);
```

### Status Management

```typescript
// Get debt status
const status = debtUtils.getDebtStatus(totalAmount, paidAmount, dueDate);

// Get status color for UI
const statusColor = debtUtils.getDebtStatusColor(status);

// Get status label in Arabic
const statusLabel = debtUtils.getDebtStatusLabel(status);
```

### Formatting

```typescript
// Format currency
const formattedAmount = debtUtils.formatCurrency(amount, 'IQD');

// Format debt amount with remaining indicator
const formattedDebt = debtUtils.formatDebtAmount(totalAmount, paidAmount);

// Format due date
const formattedDate = debtUtils.formatDueDate(dueDate);

// Format overdue information
const overdueInfo = debtUtils.formatOverdueInfo(dueDate);
```

### Validation

```typescript
// Validate debt data
const validation = debtUtils.validateDebtData(debtData);
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}

// Validate repayment data
const repaymentValidation = debtUtils.validateRepaymentData(repaymentData);
```

### Filtering and Sorting

```typescript
// Filter debts by status
const pendingDebts = debtUtils.filterDebtsByStatus(debts, 'pending');

// Filter overdue debts
const overdueDebts = debtUtils.filterOverdueDebts(debts);

// Sort debts by due date
const sortedByDate = debtUtils.sortDebtsByDueDate(debts, true); // ascending

// Sort debts by amount
const sortedByAmount = debtUtils.sortDebtsByAmount(debts, false); // descending
```

### Statistics

```typescript
// Calculate debt statistics
const stats = debtUtils.calculateDebtStats(debts);
console.log('Total debts:', stats.totalDebts);
console.log('Total amount:', stats.totalAmount);
console.log('Overdue count:', stats.overdueCount);

// Get customer debt summary
const summary = debtUtils.getCustomerDebtSummary(debts);
console.log('Total owed:', summary.totalOwed);
console.log('Payment progress:', summary.paymentProgress);
```

## Print Debt Utilities (`printDebtUtils.ts`)

### Print Debt Receipt

```typescript
import printDebtUtils from '@/utils/printDebtUtils';

// Print debt receipt with preview
await printDebtUtils.printDebtWithPreview(
  debt,
  customer,
  settings,
  'a4'
);

// Quick print debt receipt (direct to printer)
await printDebtUtils.quickPrintDebt(
  debt,
  customer,
  settings,
  'thermal-80mm',
  paymentAmount,
  paymentMethod,
  receiptDate
);
```

### Print Debt Statement

```typescript
// Print debt statement for a customer (multiple debts)
await printDebtUtils.printDebtStatement(
  customerDebts,
  customer,
  settings,
  'a4'
);
```

## Integration in Debts Page

The debts page has been updated with the following print functionality:

### Individual Debt Printing

```typescript
const handlePrint = useCallback((debt: DebtData) => {
  try {
    const customer = {
      id: debt.customer_id,
      name: debt.customer_name,
      email: debt.customer_email,
      phone: debt.customer_phone,
      address: debt.customer_address
    };
    
    printDebtUtils.printDebtWithPreview(
      debt,
      customer,
      settingsData,
      'a4'
    );
  } catch (error) {
    console.error('Error printing debt:', error);
    toast.error('حدث خطأ أثناء الطباعة');
  }
}, [settingsData]);
```

### Customer Debt Statement Printing

```typescript
const handlePrintDebtStatement = useCallback((customerDebts: CustomerDebtSummary) => {
  try {
    const customer = {
      id: customerDebts.customer_id,
      name: customerDebts.customer_name,
      email: customerDebts.customer_email,
      phone: customerDebts.customer_phone,
      address: customerDebts.customer_address
    };
    
    printDebtUtils.printDebtStatement(
      customerDebts.debts,
      customer,
      settingsData,
      'a4'
    );
  } catch (error) {
    console.error('Error printing debt statement:', error);
    toast.error('حدث خطأ أثناء طباعة كشف الحساب');
  }
}, [settingsData]);
```

### Payment Receipt Printing

```typescript
// After successful payment
try {
  const customer = {
    id: selectedDebt.customer_id,
    name: selectedDebt.customer_name,
    email: selectedDebt.customer_email,
    phone: selectedDebt.customer_phone,
    address: selectedDebt.customer_address
  };
  
  printDebtUtils.quickPrintDebt(
    selectedDebt,
    customer,
    settingsData,
    'a4',
    repayData.paid_amount,
    repayData.payment_method,
    repayData.receipt_date
  );
} catch (error) {
  console.error('Error printing payment receipt:', error);
}
```

## UI Components

### Print Buttons

The debts page now includes print buttons:

1. **Individual Debt Print Button** - In the debt row actions
2. **Customer Statement Print Button** - In the customer card
3. **Automatic Payment Receipt Printing** - After successful payment

### Customer Card with Print Button

```typescript
const CustomerCard = memo(({ 
  customer, 
  onViewDetails,
  onPrintStatement
}: { 
  customer: CustomerDebtSummary;
  onViewDetails: (customerId: number) => void;
  onPrintStatement: (customer: CustomerDebtSummary) => void;
}) => {
  // ... component implementation
  
  return (
    <Card>
      {/* ... card content */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-2" />
          عرض التفاصيل
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handlePrintStatement}
          title="طباعة كشف حساب العميل"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
});
```

## Constants

The utilities provide useful constants:

```typescript
import { DEBT_STATUSES, PAYMENT_METHODS, DEBT_NOTIFICATION_THRESHOLDS } from '@/utils/debtUtils';

// Debt statuses
console.log(DEBT_STATUSES.PAID); // 'paid'
console.log(DEBT_STATUSES.PARTIAL); // 'partial'
console.log(DEBT_STATUSES.PENDING); // 'pending'
console.log(DEBT_STATUSES.OVERDUE); // 'overdue'

// Payment methods
console.log(PAYMENT_METHODS.CASH); // 'cash'
console.log(PAYMENT_METHODS.CARD); // 'card'
console.log(PAYMENT_METHODS.BANK_TRANSFER); // 'bank_transfer'
console.log(PAYMENT_METHODS.CHECK); // 'check'

// Notification thresholds
console.log(DEBT_NOTIFICATION_THRESHOLDS.DUE_WEEK); // 7
console.log(DEBT_NOTIFICATION_THRESHOLDS.DUE_MONTH); // 30
```

## Error Handling

All utility functions include proper error handling:

```typescript
try {
  const result = await printDebtUtils.printDebtWithPreview(debt, customer, settings, 'a4');
} catch (error) {
  console.error('Error printing debt:', error);
  toast.error('حدث خطأ أثناء الطباعة');
}
```

## Best Practices

1. **Always handle errors** when using print utilities
2. **Use appropriate printer types** (thermal for receipts, A4 for statements)
3. **Validate data** before printing
4. **Use memoization** for expensive calculations
5. **Provide user feedback** for print operations
6. **Test print layouts** on different devices and printers

## Future Enhancements

Potential improvements for the debt utilities:

1. **Batch printing** - Print multiple debts at once
2. **Email integration** - Send debt statements via email
3. **PDF generation** - Generate PDF files for debt documents
4. **Custom templates** - Allow users to customize print layouts
5. **Print history** - Track print operations
6. **Scheduled printing** - Automatically print overdue debt reports
