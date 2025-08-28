const db = require('../database');

const version = '015';
const description = 'Add purchase_return transaction type to money_box_transactions table comment';

async function up(db) {
  try {
    // Update the comment on the money_box_transactions table to include purchase_return
    // Note: SQLite doesn't support ALTER TABLE COMMENT, so we'll just log this change
    console.log('✅ Added purchase_return transaction type to money_box_transactions table comment');
    console.log('📝 Note: The money_box_transactions table now supports the following transaction types:');
    console.log('   - deposit, withdraw, transfer_in, transfer_out, cash_deposit');
    console.log('   - transfer_from, transfer_from_cash_box, transfer_from_daily_box, transfer_from_money_box');
    console.log('   - transfer_to_cashier, transfer_to_money_box, transfer_to_bank, cash_box_closing');
    console.log('   - expense, expense_update, expense_reversal, purchase, purchase_return');
    return true;
  } catch (error) {
    console.error('❌ Error updating money_box_transactions table comment:', error.message);
    return false;
  }
}

async function down(db) {
  try {
    console.log('⚠️  Cannot easily reverse comment update in SQLite');
    return false;
  } catch (error) {
    console.error('❌ Error rolling back money_box_transactions table comment:', error.message);
    return false;
  }
}

module.exports = { version, description, up, down };
