const cashBoxService = require('../services/cashBoxService');
const logger = require('../utils/logger');

// Middleware to automatically add cash box transactions for sales
const handleSaleCashBoxTransaction = async (req, res, next) => {
  try {
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to intercept response
    res.send = function(data) {
      try {
        // Parse the response data
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If sale was created successfully and payment method is cash
        if (responseData.success && responseData.data && 
            req.body.payment_method === 'cash' && 
            req.body.paid_amount > 0) {
          
          // Get user's cash box
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              // Add transaction to cash box
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'sale',
                req.body.paid_amount,
                'sale',
                responseData.data.id,
                `مبيعات - فاتورة رقم ${responseData.data.id}`,
                req.body.notes || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for sale ${responseData.data.id}: ${req.body.paid_amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for sale:', error);
          });
        }
      } catch (error) {
        logger.error('Error in cash box transaction middleware:', error);
      }
      
      // Call original send method
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleSaleCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for purchases
const handlePurchaseCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // Support both direct response and sendResponse structure
        const purchaseData = responseData.data?.purchase || responseData.data;
        const purchaseId = purchaseData?.id;

        // If purchase was created successfully and payment status is paid or partially paid
        if (responseData.success && purchaseData && 
            req.body.paid_amount > 0 &&
            (req.body.payment_status === 'paid' || req.body.payment_status === 'مدفوع' || 
             req.body.payment_status === 'partial' || req.body.payment_status === 'مدفوع جزئياً')) {
          
          const userId = req.user.id;
          const { moneyBoxId, paid_amount } = req.body;

          // If moneyBoxId is 'cash_box' or not specified, use cash box
          if (!moneyBoxId || moneyBoxId === 'cash_box') {
            cashBoxService.getUserCashBox(userId).then(cashBox => {
              if (cashBox) {
                return cashBoxService.addTransaction(
                  cashBox.id,
                  userId,
                  'purchase',
                  paid_amount,
                  'purchase',
                  purchaseId,
                  `مشتريات - فاتورة رقم ${purchaseId}`,
                  req.body.notes || ''
                );
              }
            }).then(() => {
              logger.info(`[PurchaseCashBox] Cash box transaction added for purchase ${purchaseId} (${req.body.payment_status}): ${paid_amount}`);
            }).catch(error => {
              logger.error('[PurchaseCashBox] Error adding cash box transaction for purchase:', error);
            });
          } else {
            // Use money box service for other money boxes
            const moneyBoxesService = require('../services/moneyBoxesService');
            moneyBoxesService.addTransaction(
              parseInt(moneyBoxId),
              'purchase',
              paid_amount,
              `مشتريات - فاتورة رقم ${purchaseId}`,
              userId
            ).then(() => {
              logger.info(`[PurchaseCashBox] Money box transaction added for purchase ${purchaseId} (${req.body.payment_status}): ${paid_amount}`);
            }).catch(error => {
              logger.error('[PurchaseCashBox] Error adding money box transaction for purchase:', error);
              // If there's insufficient balance, we need to handle it properly
              if (error.message.includes('الرصيد غير كافٍ')) {
                // Send error response to client
                const errorResponse = {
                  success: false,
                  message: `الرصيد غير كافٍ في ${error.moneyBoxName || 'صندوق المال المختار'}. المطلوب: ${paid_amount}، المتوفر: ${error.availableBalance || 0}`,
                  error: 'INSUFFICIENT_BALANCE',
                  requiredAmount: error.requiredAmount || paid_amount,
                  availableBalance: error.availableBalance || 0,
                  moneyBoxName: error.moneyBoxName || 'صندوق المال المختار'
                };
                
                // Override the response
                originalSend.call(this, errorResponse);
                return;
              }
            });
          }
        }
      } catch (error) {
        logger.error('[PurchaseCashBox] Error in purchase cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('[PurchaseCashBox] Error in handlePurchaseCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for expenses
const handleExpenseCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If expense was created successfully
        if (responseData.success && responseData.data) {
          const userId = req.user.id;
          const { moneyBoxId, amount, description } = req.body;

          // If moneyBoxId is 'cash_box', use cash box
          if (moneyBoxId === 'cash_box') {
            cashBoxService.getUserCashBox(userId).then(cashBox => {
              if (cashBox) {
                return cashBoxService.addTransaction(
                  cashBox.id,
                  userId,
                  'expense',
                  amount,
                  'expense',
                  responseData.data.id,
                  `مصروفات - ${description || 'مصروفات عامة'}`,
                  req.body.notes || ''
                );
              }
            }).then(() => {
              logger.info(`Cash box transaction added for expense ${responseData.data.id}: ${amount}`);
            }).catch(error => {
              logger.error('Error adding cash box transaction for expense:', error);
            });
          } else {
            // Use money box service for other money boxes
            const moneyBoxesService = require('../services/moneyBoxesService');
            moneyBoxesService.addTransaction(
              parseInt(moneyBoxId),
              'expense',
              amount,
              `مصروفات - ${description || 'مصروفات عامة'}`,
              userId
            ).then(() => {
              logger.info(`Money box transaction added for expense ${responseData.data.id}: ${amount}`);
            }).catch(error => {
              logger.error('Error adding money box transaction for expense:', error);
              // If there's insufficient balance, we need to handle it properly
              if (error.message.includes('الرصيد غير كافٍ')) {
                // Delete the expense since the transaction failed
                const expensesService = require('../services/expensesService');
                expensesService.delete(responseData.data.id).catch(deleteError => {
                  logger.error('Error deleting expense after failed transaction:', deleteError);
                });
                
                // Send error response to client
                const errorResponse = {
                  success: false,
                  message: `الرصيد غير كافٍ في ${error.moneyBoxName || 'صندوق المال المختار'}. المطلوب: ${amount}، المتوفر: ${error.availableBalance || 0}`,
                  error: 'INSUFFICIENT_BALANCE',
                  requiredAmount: error.requiredAmount || amount,
                  availableBalance: error.availableBalance || 0,
                  moneyBoxName: error.moneyBoxName || 'صندوق المال المختار'
                };
                
                // Override the response
                originalSend.call(this, errorResponse);
                return;
              }
            });
          }
        }
      } catch (error) {
        logger.error('Error in expense cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleExpenseCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to handle expense updates and adjust cash box transactions
const handleExpenseUpdateCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If expense was updated successfully
        if (responseData.success && responseData.data) {
          const userId = req.user.id;
          const { moneyBoxId, amount, description } = req.body;
          const expenseId = req.params.id;
          


          // Get the old expense data to calculate the difference
          const expensesService = require('../services/expensesService');
          expensesService.getById(expenseId).then(oldExpense => {
            const oldAmount = oldExpense.amount;
            const oldMoneyBoxId = oldExpense.money_box_id || 'cash_box';
            const newAmount = parseFloat(amount);
            const newMoneyBoxId = moneyBoxId;
            const amountDifference = newAmount - oldAmount;

            // Check if money box changed or amount changed (convert to string for comparison)
            const moneyBoxChanged = oldMoneyBoxId.toString() !== newMoneyBoxId.toString();
            const amountChanged = amountDifference !== 0;

            if (moneyBoxChanged || amountChanged) {
              // Handle money box change first
              if (moneyBoxChanged) {
                // If old money box was a custom money box, we need to reverse the old transaction
                if (oldMoneyBoxId !== 'cash_box') {
                  const moneyBoxesService = require('../services/moneyBoxesService');
                  // Reverse the old transaction (add back the old amount)
                  moneyBoxesService.addTransaction(
                    parseInt(oldMoneyBoxId),
                    'expense_reversal',
                    oldAmount,
                    `إلغاء مصروفات - ${description || 'مصروفات عامة'} (تحديث)`,
                    userId
                  ).catch(error => {
                    logger.error('Error reversing old money box transaction:', error);
                  });
                } else {
                  // Old money box was cash box, reverse the transaction
                  cashBoxService.getUserCashBox(userId).then(cashBox => {
                    if (cashBox) {
                      return cashBoxService.addTransaction(
                        cashBox.id,
                        userId,
                        'expense_reversal',
                        oldAmount,
                        'expense',
                        expenseId,
                        `إلغاء مصروفات - ${description || 'مصروفات عامة'} (تحديث)`,
                        req.body.notes || ''
                      );
                    }
                  }).catch(error => {
                    logger.error('Error reversing old cash box transaction:', error);
                  });
                }
              }

              // Now handle the new transaction
              if (newMoneyBoxId === 'cash_box') {
                cashBoxService.getUserCashBox(userId).then(cashBox => {
                  if (cashBox) {
                    // Add a new transaction for the new amount
                    return cashBoxService.addTransaction(
                      cashBox.id,
                      userId,
                      'expense_update',
                      newAmount,
                      'expense',
                      expenseId,
                      `تحديث مصروفات - ${description || 'مصروفات عامة'}`,
                      req.body.notes || ''
                    );
                  }
                }).then(() => {
                  logger.info(`Cash box transaction updated for expense ${expenseId}: ${newAmount}`);
                }).catch(error => {
                  logger.error('Error updating cash box transaction for expense:', error);
                });
              } else {
                // Use money box service for other money boxes
                const moneyBoxesService = require('../services/moneyBoxesService');
                moneyBoxesService.addTransaction(
                  parseInt(newMoneyBoxId),
                  'expense_update',
                  newAmount,
                  `تحديث مصروفات - ${description || 'مصروفات عامة'}`,
                  userId
                ).then(() => {
                  logger.info(`Money box transaction updated for expense ${expenseId}: ${newAmount}`);
                }).catch(error => {
                  logger.error('Error updating money box transaction for expense:', error);
                  // If there's insufficient balance, we need to handle it properly
                  if (error.message.includes('الرصيد غير كافٍ')) {
                    // Send error response to client
                    const errorResponse = {
                      success: false,
                      message: `الرصيد غير كافٍ في ${error.moneyBoxName || 'صندوق المال المختار'}. المطلوب: ${newAmount}، المتوفر: ${error.availableBalance || 0}`,
                      error: 'INSUFFICIENT_BALANCE',
                      requiredAmount: error.requiredAmount || newAmount,
                      availableBalance: error.availableBalance || 0,
                      moneyBoxName: error.moneyBoxName || 'صندوق المال المختار'
                    };
                    
                    // Override the response
                    originalSend.call(this, errorResponse);
                    return;
                  }
                });
              }
            } else {
                             // If only amount changed but same money box, update the existing transaction
               if (amountChanged) {
                
                if (newMoneyBoxId === 'cash_box') {
                  // Update cash box transaction
                  cashBoxService.getUserCashBox(userId).then(cashBox => {
                    if (cashBox) {
                      // Find and update the existing expense transaction
                      const db = require('../database');
                      db.update(`
                        UPDATE cash_box_transactions 
                        SET amount = ?, 
                            balance_after = balance_after - ? + ?,
                            description = ?
                        WHERE reference_type = 'expense' 
                          AND reference_id = ? 
                          AND transaction_type = 'expense'
                        ORDER BY created_at DESC 
                        LIMIT 1
                      `, [newAmount, oldAmount, newAmount, `تحديث مصروفات - ${description || 'مصروفات عامة'}`, expenseId]);
                      
                      // Update cash box balance
                      const balanceDifference = newAmount - oldAmount;
                      if (balanceDifference !== 0) {
                        return cashBoxService.addTransaction(
                          cashBox.id,
                          userId,
                          'expense_update',
                          Math.abs(balanceDifference),
                          'expense',
                          expenseId,
                          `تحديث مصروفات - ${description || 'مصروفات عامة'} (${balanceDifference > 0 ? 'زيادة' : 'نقصان'})`,
                          req.body.notes || ''
                        );
                      }
                    }
                  }).catch(error => {
                    logger.error('Error updating cash box transaction for expense:', error);
                  });
                } else {
                  // Update money box transaction
                  const moneyBoxesService = require('../services/moneyBoxesService');
                  const db = require('../database');
                  
                  // Find and update the existing expense transaction
                  db.update(`
                    UPDATE money_box_transactions 
                    SET amount = ?, 
                        balance_after = balance_after - ? + ?,
                        notes = ?
                    WHERE box_id = ? 
                      AND type = 'expense'
                      AND notes LIKE '%مصروفات%'
                    ORDER BY created_at DESC 
                    LIMIT 1
                  `, [newAmount, oldAmount, newAmount, `تحديث مصروفات - ${description || 'مصروفات عامة'}`, parseInt(newMoneyBoxId)]);
                  
                  // Update money box balance
                  const balanceDifference = newAmount - oldAmount;
                  if (balanceDifference !== 0) {
                    moneyBoxesService.addTransaction(
                      parseInt(newMoneyBoxId),
                      'expense_update',
                      Math.abs(balanceDifference),
                      `تحديث مصروفات - ${description || 'مصروفات عامة'} (${balanceDifference > 0 ? 'زيادة' : 'نقصان'})`,
                      userId
                    ).catch(error => {
                      logger.error('Error updating money box transaction for expense:', error);
                    });
                  }
                }
              }
            }
          }).catch(error => {
            logger.error('Error getting old expense data:', error);
          });
        }
      } catch (error) {
        logger.error('Error in expense update cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleExpenseUpdateCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for customer receipts
const handleCustomerReceiptCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If customer receipt was created successfully and payment method is cash
        // AND no specific money box was selected (use main cash box)
        if (responseData.success && responseData.data && 
            req.body.payment_method === 'cash' &&
            (!req.body.money_box_id || req.body.money_box_id === 'cash_box')) {
          
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'customer_receipt',
                req.body.amount,
                'customer_receipt',
                responseData.data.id,
                `إيصال عميل - ${req.body.customer_name || 'عميل'}`,
                req.body.notes || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for customer receipt ${responseData.data.id}: ${req.body.amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for customer receipt:', error);
          });
        }
      } catch (error) {
        logger.error('Error in customer receipt cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleCustomerReceiptCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for supplier payments
const handleSupplierPaymentCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If supplier payment was created successfully and payment method is cash
        // AND no specific money box was selected (use main cash box)
        if (responseData.success && responseData.data && 
            req.body.payment_method === 'cash' &&
            (!req.body.money_box_id || req.body.money_box_id === 'cash_box')) {
          
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'supplier_payment',
                req.body.amount,
                'supplier_payment',
                responseData.data.id,
                `دفع مورد - ${req.body.supplier_name || 'مورد'}`,
                req.body.notes || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for supplier payment ${responseData.data.id}: ${req.body.amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for supplier payment:', error);
          });
        }
      } catch (error) {
        logger.error('Error in supplier payment cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleSupplierPaymentCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for sales returns
const handleSaleReturnCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        // Support both totalAmount and total_amount
        const totalAmount = responseData.data?.totalAmount ?? responseData.data?.total_amount;
        // Support refund_method at root or in items[0]
        let refundMethod = req.body.refund_method;
        if (!refundMethod && Array.isArray(req.body.items) && req.body.items.length > 0) {
          refundMethod = req.body.items[0].refund_method;
        }
        logger.info('[SaleReturnCashBox] refundMethod:', refundMethod, 'totalAmount:', totalAmount, 'responseData:', responseData.data);
        // If sale return was processed successfully and refund method is cash
        if (responseData.success && responseData.data && 
            refundMethod === 'cash' && 
            totalAmount > 0) {
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'withdrawal', // Sales returns reduce cash box balance
                totalAmount,
                'sale_return',
                responseData.data.saleId || responseData.data.id,
                `إرجاع مبيعات - فاتورة رقم ${req.params.id}`,
                req.body.reason || ''
              );
            }
          }).then(() => {
            logger.info(`[SaleReturnCashBox] Cash box transaction added for sale return ${responseData.data.saleId || responseData.data.id}: ${totalAmount}`);
          }).catch(error => {
            logger.error('[SaleReturnCashBox] Error adding cash box transaction for sale return:', error);
          });
        }
      } catch (error) {
        logger.error('[SaleReturnCashBox] Error in sale return cash box transaction middleware:', error);
      }
      originalSend.call(this, data);
    };
    next();
  } catch (error) {
    logger.error('[SaleReturnCashBox] Error in handleSaleReturnCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for purchase returns
const handlePurchaseReturnCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // Support both totalAmount and total_amount
        const totalAmount = responseData.data?.totalAmount ?? responseData.data?.total_amount;
        // Support refund_method at root or in items[0]
        let refundMethod = req.body.refund_method;
        if (!refundMethod && Array.isArray(req.body.items) && req.body.items.length > 0) {
          refundMethod = req.body.items[0].refund_method;
        }
        logger.info('[PurchaseReturnCashBox] refundMethod:', refundMethod, 'totalAmount:', totalAmount, 'responseData:', responseData.data);

        // If purchase return was processed successfully and refund method is cash
        if (responseData.success && responseData.data && 
            refundMethod === 'cash' && 
            totalAmount > 0) {
          
          const userId = req.user.id;
          const purchaseId = req.params.id;
          
          // First, try to find the original purchase's money box transaction
          const db = require('../database');
          const originalPurchase = db.queryOne('SELECT money_box_id FROM purchases WHERE id = ?', [purchaseId]);
          
          if (originalPurchase && originalPurchase.money_box_id && originalPurchase.money_box_id !== 'cash_box') {
            // Return to the same money box that was used for the original purchase
            const moneyBoxesService = require('../services/moneyBoxesService');
            moneyBoxesService.addTransaction(
              parseInt(originalPurchase.money_box_id),
              'purchase_return',
              totalAmount,
              `إرجاع مشتريات - فاتورة رقم ${purchaseId}`,
              userId
            ).then(() => {
              logger.info(`[PurchaseReturnCashBox] Money box transaction added for purchase return ${purchaseId}: ${totalAmount} to money box ${originalPurchase.money_box_id}`);
            }).catch(error => {
              logger.error('[PurchaseReturnCashBox] Error adding money box transaction for purchase return:', error);
              // Fallback to cash box if money box transaction fails
              return cashBoxService.getUserCashBox(userId).then(cashBox => {
                if (cashBox) {
                  return cashBoxService.addTransaction(
                    cashBox.id,
                    userId,
                    'deposit',
                    totalAmount,
                    'purchase_return',
                    purchaseId,
                    `إرجاع مشتريات - فاتورة رقم ${purchaseId}`,
                    req.body.reason || ''
                  );
                }
              });
            });
          } else {
            // Use main cash box if no specific money box was used
            cashBoxService.getUserCashBox(userId).then(cashBox => {
              if (cashBox) {
                return cashBoxService.addTransaction(
                  cashBox.id,
                  userId,
                  'deposit', // Purchase returns increase cash box balance
                  totalAmount,
                  'purchase_return',
                  purchaseId,
                  `إرجاع مشتريات - فاتورة رقم ${purchaseId}`,
                  req.body.reason || ''
                );
              }
            }).then(() => {
              logger.info(`[PurchaseReturnCashBox] Cash box transaction added for purchase return ${purchaseId}: ${totalAmount}`);
            }).catch(error => {
              logger.error('[PurchaseReturnCashBox] Error adding cash box transaction for purchase return:', error);
            });
          }
        }
      } catch (error) {
        logger.error('[PurchaseReturnCashBox] Error in purchase return cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('[PurchaseReturnCashBox] Error in handlePurchaseReturnCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for individual sale item returns
const handleSaleItemReturnCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If sale item return was processed successfully and refund method is cash
        if (responseData.success && responseData.data && 
            req.body.refund_method === 'cash' && 
            responseData.data.refund_amount > 0) {
          
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'withdrawal', // Sale item returns reduce cash box balance
                responseData.data.refund_amount,
                'sale_return',
                responseData.data.id,
                `إرجاع منتج من مبيعات - فاتورة رقم ${req.params.saleId}`,
                req.body.reason || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for sale item return ${responseData.data.id}: ${responseData.data.refund_amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for sale item return:', error);
          });
        }
      } catch (error) {
        logger.error('Error in sale item return cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleSaleItemReturnCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for individual purchase item returns
const handlePurchaseItemReturnCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If purchase item return was processed successfully and refund method is cash
        if (responseData.success && responseData.data && 
            req.body.refund_method === 'cash' && 
            responseData.data.refund_amount > 0) {
          
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'deposit', // Purchase item returns increase cash box balance
                responseData.data.refund_amount,
                'purchase_return',
                responseData.data.id,
                `إرجاع منتج من مشتريات - فاتورة رقم ${req.params.purchaseId}`,
                req.body.reason || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for purchase item return ${responseData.data.id}: ${responseData.data.refund_amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for purchase item return:', error);
          });
        }
      } catch (error) {
        logger.error('Error in purchase item return cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handlePurchaseItemReturnCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for debt receipts
const handleDebtReceiptCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If debt receipt was created successfully and payment method is cash
        // AND no specific money box was selected (use main cash box)
        if (responseData.success && responseData.data && 
            req.body.payment_method === 'cash' && 
            req.body.paid_amount > 0 &&
            (!req.body.money_box_id || req.body.money_box_id === 'cash_box')) {
          
          const userId = req.user.id;
          cashBoxService.getUserCashBox(userId).then(cashBox => {
            if (cashBox) {
              return cashBoxService.addTransaction(
                cashBox.id,
                userId,
                'customer_receipt', // Debt payments are customer receipts
                req.body.paid_amount,
                'debt', // Reference type is debt
                responseData.data.id,
                `سداد دين - فاتورة رقم ${req.params.id}`,
                req.body.notes || ''
              );
            }
          }).then(() => {
            logger.info(`Cash box transaction added for debt receipt ${responseData.data.id}: ${req.body.paid_amount}`);
          }).catch(error => {
            logger.error('Error adding cash box transaction for debt receipt:', error);
          });
        }
      } catch (error) {
        logger.error('Error in debt receipt cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleDebtReceiptCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to automatically add cash box transactions for installment receipts
const handleInstallmentReceiptCashBoxTransaction = async (req, res, next) => {
  try {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }

        // If installment payment was recorded successfully and payment method is cash
        if (responseData.success && responseData.data && 
            req.body.payment_method === 'cash' && 
            req.body.paid_amount > 0) {
          
          const userId = req.user.id;
          const { money_box_id } = req.body;
          
          // Only add cash box transaction if no specific money box is selected
          if (!money_box_id || money_box_id === 'cash_box') {
            cashBoxService.getUserCashBox(userId).then(cashBox => {
              if (cashBox) {
                return cashBoxService.addTransaction(
                  cashBox.id,
                  userId,
                  'customer_receipt', // Installment payments are customer receipts
                  req.body.paid_amount,
                  'installment', // Reference type is installment
                  responseData.data.id,
                  `سداد قسط - قسط رقم ${req.params.id}`,
                  req.body.notes || ''
                );
              }
            }).then(() => {
              logger.info(`Cash box transaction added for installment receipt ${responseData.data.id}: ${req.body.paid_amount}`);
            }).catch(error => {
              logger.error('Error adding cash box transaction for installment receipt:', error);
            });
          }
        }
      } catch (error) {
        logger.error('Error in installment receipt cash box transaction middleware:', error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Error in handleInstallmentReceiptCashBoxTransaction middleware:', error);
    next();
  }
};

// Middleware to check if user has open cash box before financial operations
const requireOpenCashBox = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cashBox =  cashBoxService.getUserCashBox(userId);
    
    if (!cashBox) {
      return res.status(400).json({
        success: false,
        message: 'يجب فتح صندوق قبل إجراء العمليات المالية'
      });
    }
    
    // Add cash box info to request for use in other middleware
    req.cashBox = cashBox;
    next();
  } catch (error) {
    logger.error('Error in requireOpenCashBox middleware:', error);
    next();
  }
};

module.exports = {
  handleSaleCashBoxTransaction,
  handlePurchaseCashBoxTransaction,
  handleExpenseCashBoxTransaction,
  handleExpenseUpdateCashBoxTransaction,
  handleCustomerReceiptCashBoxTransaction,
  handleSupplierPaymentCashBoxTransaction,
  handleSaleReturnCashBoxTransaction,
  handlePurchaseReturnCashBoxTransaction,
  handleSaleItemReturnCashBoxTransaction,
  handlePurchaseItemReturnCashBoxTransaction,
  handleDebtReceiptCashBoxTransaction,
  handleInstallmentReceiptCashBoxTransaction,
  requireOpenCashBox
}; 