# Money Boxes System Documentation

## Overview

The Money Boxes system provides a comprehensive solution for managing different types of money boxes within the application. It integrates seamlessly with the existing Cash Box system to provide a complete financial management solution.

## Features

### Core Money Boxes Features
- **CRUD Operations**: Create, read, update, and delete money boxes
- **Transaction Management**: Add deposits, withdrawals, and transfers
- **Balance Tracking**: Real-time balance updates with transaction history
- **Transfer Between Boxes**: Move money between different money boxes
- **Comprehensive Reporting**: Detailed summaries and transaction reports

### Integration with Cash Boxes
- **Daily Money Box Integration**: Seamless integration with "الصندوق اليومي" (Daily Box)
- **Bidirectional Transfers**: Transfer money between cash boxes and money boxes
- **Unified Reporting**: Combined reports showing both cash box and money box data

## Database Schema

### Money Boxes Table
```sql
CREATE TABLE money_boxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
)
```

### Money Box Transactions Table
```sql
CREATE TABLE money_box_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  box_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdraw', 'transfer_in', 'transfer_out'
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2),
  notes TEXT,
  related_box_id INTEGER,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (box_id) REFERENCES money_boxes(id) ON DELETE CASCADE,
  FOREIGN KEY (related_box_id) REFERENCES money_boxes(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
)
```

## Default Money Boxes

The system automatically creates three default money boxes:

1. **الصندوق اليومي** (Daily Box) - For daily operations
2. **القاصة** (Cashier Box) - For cashier operations  
3. **الصيرفة** (Exchange Box) - For currency exchange operations

## API Endpoints

### Money Boxes Management

#### Get All Money Boxes
```
GET /api/money-boxes
```

#### Get Money Box by ID
```
GET /api/money-boxes/:id
```

#### Create Money Box
```
POST /api/money-boxes
Body: {
  "name": "Box Name",
  "amount": 0,
  "notes": "Optional notes"
}
```

#### Update Money Box
```
PUT /api/money-boxes/:id
Body: {
  "name": "Updated Name",
  "notes": "Updated notes"
}
```

#### Delete Money Box
```
DELETE /api/money-boxes/:id
```

### Money Box Transactions

#### Get Money Box Transactions
```
GET /api/money-boxes/:id/transactions?limit=50&offset=0
```

#### Add Transaction
```
POST /api/money-boxes/:id/transactions
Body: {
  "type": "deposit|withdraw|transfer_in|transfer_out",
  "amount": 100.00,
  "notes": "Transaction notes"
}
```

#### Transfer Between Money Boxes
```
POST /api/money-boxes/transfer
Body: {
  "fromBoxId": 1,
  "toBoxId": 2,
  "amount": 500.00,
  "notes": "Transfer notes"
}
```

### Money Box Reports

#### Get Money Box Summary
```
GET /api/money-boxes/:id/summary
```

#### Get All Money Boxes Summary
```
GET /api/money-boxes/summary
```

#### Get Transactions by Date Range
```
GET /api/money-boxes/:id/transactions/date-range?startDate=2024-01-01&endDate=2024-01-31
```

### Cash Box Integration

#### Get Cash Box with Money Box Summary
```
GET /api/cash-box/with-money-box-summary
```

#### Transfer to Daily Money Box
```
POST /api/cash-box/transfer-to-daily-money-box
Body: {
  "cashBoxId": 1,
  "amount": 1000.00,
  "notes": "Transfer notes"
}
```

#### Transfer from Daily Money Box
```
POST /api/cash-box/transfer-from-daily-money-box
Body: {
  "cashBoxId": 1,
  "amount": 500.00,
  "notes": "Transfer notes"
}
```

#### Comprehensive Cash Box Report
```
GET /api/cash-box/comprehensive-report?startDate=2024-01-01&endDate=2024-01-31
```

## Transaction Types

### Money Box Transactions
- **deposit**: Add money to the box
- **withdraw**: Remove money from the box
- **transfer_in**: Receive money from another box
- **transfer_out**: Send money to another box

### Cash Box Integration Transactions
- **opening**: Cash box opening
- **closing**: Cash box closing
- **deposit**: Add money to cash box
- **withdrawal**: Remove money from cash box
- **sale**: Sale transaction
- **purchase**: Purchase transaction
- **expense**: Expense transaction
- **customer_receipt**: Customer payment receipt
- **supplier_payment**: Supplier payment
- **adjustment**: Manual adjustment
- **sale_return**: Sale return
- **purchase_return**: Purchase return

## Service Classes

### MoneyBoxesService
Main service for money box operations:
- `getAllMoneyBoxes()`
- `getMoneyBoxById(id)`
- `createMoneyBox(data)`
- `updateMoneyBox(id, data)`
- `deleteMoneyBox(id)`
- `addTransaction(boxId, type, amount, notes, created_by, relatedBoxId)`
- `transferBetweenBoxes(fromBoxId, toBoxId, amount, notes, created_by)`
- `getMoneyBoxTransactions(boxId, limit, offset)`
- `getMoneyBoxSummary(boxId)`
- `getAllMoneyBoxesSummary()`
- `getTransactionsByDateRange(boxId, startDate, endDate, limit, offset)`
- `getMoneyBoxByName(name)`

### CashBoxService Integration Methods
Additional methods in CashBoxService for integration:
- `getDailyMoneyBox()`
- `transferToDailyMoneyBox(cashBoxId, userId, amount, notes)`
- `transferFromDailyMoneyBox(cashBoxId, userId, amount, notes)`
- `getCashBoxWithMoneyBoxSummary(userId)`
- `getComprehensiveCashBoxReport(userId, startDate, endDate)`

## Database Indexes

The following indexes are created for optimal performance:

```sql
-- Money boxes indexes
CREATE INDEX idx_money_boxes_name ON money_boxes(name);
CREATE INDEX idx_money_boxes_created_by ON money_boxes(created_by);
CREATE INDEX idx_money_boxes_created_at ON money_boxes(created_at);

-- Money box transactions indexes
CREATE INDEX idx_money_box_transactions_box_id ON money_box_transactions(box_id);
CREATE INDEX idx_money_box_transactions_type ON money_box_transactions(type);
CREATE INDEX idx_money_box_transactions_created_at ON money_box_transactions(created_at);
CREATE INDEX idx_money_box_transactions_created_by ON money_box_transactions(created_by);
CREATE INDEX idx_money_box_transactions_related_box ON money_box_transactions(related_box_id);
```

## Error Handling

The system includes comprehensive error handling for:
- Insufficient balance errors
- Invalid transaction types
- Missing required fields
- Database constraint violations
- Transaction rollbacks on failures

## Testing

Run the test script to verify functionality:
```bash
node test-money-boxes.js
```

## Security

- All endpoints require authentication
- Admin-only operations for deletion
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- Transaction integrity through database transactions

## Performance Considerations

- Optimized database queries with proper indexing
- Pagination for large transaction lists
- Caching for frequently accessed data
- Efficient joins for related data retrieval

## Future Enhancements

- Multi-currency support
- Advanced reporting and analytics
- Automated reconciliation
- Integration with external financial systems
- Mobile app support for money box operations 