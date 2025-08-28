const Bill = require('../models/Bill');
const db = require('../database');
const logger = require('../utils/logger');

class BillReturnsService {
  async createReturn(billId, returnData, userId) {
    try {
      return await db.transaction(async () => {
        const originalBill = await Bill.findById(billId);
        if (!originalBill) {
          throw new Error('Bill not found');
        }

        // Validate return items against original bill
        await this.validateReturnItems(originalBill, returnData.items);

        // Create return record
        const returnId = await Bill.createReturn({
          originalBillId: billId,
          returnReason: returnData.return_reason,
          returnDate: returnData.return_date,
          refundMethod: returnData.refund_method,
          refundAmount: returnData.refund_amount,
          notes: returnData.notes,
          returnedBy: userId,
          items: returnData.items
        });

        // Update product stock with return reference
        await this.updateProductStock(returnData.items, returnId, userId, returnData.bill_type);

        // Update original bill status if needed
        if (await this.isFullReturn(billId, returnData.items)) {
          await Bill.updateStatus(billId, 'returned');
        }

        return this.getReturnDetails(returnId);
      });
    } catch (error) {
      logger.error('BillReturnsService.createReturn error:', error);
      throw error;
    }
  }

  async validateReturnItems(bill, returnItems) {
    const billItems = await Bill.getBillItems(bill.id);
    const itemMap = new Map(billItems.map(item => [item.product_id, item]));

    for (const returnItem of returnItems) {
      const originalItem = itemMap.get(returnItem.product_id);
      if (!originalItem) {
        throw new Error(`Product ${returnItem.product_id} not found in original bill`);
      }
      if (returnItem.quantity > originalItem.quantity) {
        throw new Error(`Return quantity exceeds original quantity for product ${returnItem.product_id}`);
      }
    }
  }

  async updateProductStock(items, returnId = null, userId = null, billType = null) {
    for (const item of items) {
      // Get current stock before update
      const product = await db.queryOne(
        'SELECT id, name, current_stock, purchase_price FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }

      const currentStock = product.current_stock || 0;
      
      // Determine operation based on bill type
      let operation, newStock, notes;
      if (billType === 'purchase') {
        // Purchase return: subtract from inventory (returned to supplier)
        operation = 'subtract';
        newStock = currentStock - item.quantity;
        notes = 'إرجاع إلى المورد';
      } else {
        // Sale return: add to inventory (returned from customer)
        operation = 'add';
        newStock = currentStock + item.quantity;
        notes = 'إرجاع من العميل';
      }

      // Update the stock
      await db.execute(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStock, item.product_id]
      );

      // Log inventory movement
      await db.insert(
        `INSERT INTO inventory_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_type, reference_id, unit_cost, total_value, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.product_id,
          'return',
          operation === 'subtract' ? -item.quantity : item.quantity, // Negative for subtract operations
          currentStock,
          newStock,
          'return',
          returnId,
          product.purchase_price || 0,
          (product.purchase_price || 0) * item.quantity,
          notes,
          userId
        ]
      );

      logger.info(`Inventory movement logged for product ${product.name}: return ${item.quantity} units`);
    }
  }

  async isFullReturn(billId, returnItems) {
    const billItems = await Bill.getBillItems(billId);
    return billItems.every(billItem => {
      const returnItem = returnItems.find(ri => ri.product_id === billItem.product_id);
      return returnItem && returnItem.quantity === billItem.quantity;
    });
  }

  async getReturnDetails(returnId) {
    return Bill.getReturnWithItems(returnId);
  }
}

module.exports = new BillReturnsService();
