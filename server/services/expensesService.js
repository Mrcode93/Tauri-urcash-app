const db = require('../database');
const logger = require('../utils/logger');

class ExpensesService {
  async getAll() {
    try {
      const expenses = await db.query(`
        SELECT e.*
        FROM expenses e
        ORDER BY e.created_at DESC
      `);
      return expenses;
    } catch (err) {
      logger.error('Error getting all expenses:', err);
      throw new Error('حدث خطأ أثناء جلب المصروفات');
    }
  }

  async getById(id) {
    try {
      const expense = await db.queryOne(`
        SELECT e.*
        FROM expenses e
        WHERE e.id = ?
      `, [id]);
      
      if (!expense) {
        throw new Error('المصروف غير موجود');
      }
      
      return expense;
    } catch (err) {
      logger.error('Error getting expense by ID:', err);
      if (err.message.includes('غير موجود')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء جلب بيانات المصروف');
    }
  }

  async getByCategory(category) {
    try {
      const expenses = await db.query(`
        SELECT e.*
        FROM expenses e
        WHERE e.category = ?
        ORDER BY e.created_at DESC
      `, [category]);
      return expenses;
    } catch (err) {
      logger.error('Error getting expenses by category:', err);
      throw new Error('حدث خطأ أثناء جلب المصروفات حسب الفئة');
    }
  }

  async getByDateRange(startDate, endDate) {
    try {
      const expenses = await db.query(`
        SELECT e.*
        FROM expenses e
        WHERE e.date BETWEEN ? AND ?
        ORDER BY e.date DESC
      `, [startDate, endDate]);
      return expenses;
    } catch (err) {
      logger.error('Error getting expenses by date range:', err);
      throw new Error('حدث خطأ أثناء جلب المصروفات حسب التاريخ');
    }
  }

  async create({ description, amount, category, date, moneyBoxId }) {
    try {
      // Validate required fields
      if (!description || !description.trim()) {
        throw new Error('وصف المصروف مطلوب');
      }
      
      if (!amount || amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }
      
      if (!category || !category.trim()) {
        throw new Error('فئة المصروف مطلوبة');
      }
      
      if (!date) {
        throw new Error('تاريخ المصروف مطلوب');
      }

      if (!moneyBoxId) {
        throw new Error('يجب اختيار صندوق المال');
      }

      const lastId = await db.insert(`
        INSERT INTO expenses (description, amount, category, date, money_box_id)
        VALUES (?, ?, ?, ?, ?)
      `, [description.trim(), amount, category, date, moneyBoxId]);
      
      if (!lastId) {
        throw new Error('فشل في إنشاء المصروف');
      }
      
      return await this.getById(lastId);
    } catch (err) {
      logger.error('Error creating expense:', err);
      if (err.message.includes('مطلوب') || err.message.includes('يجب أن يكون') || err.message.includes('فشل في')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء إنشاء المصروف');
    }
  }

  async update(id, { description, amount, category, date, moneyBoxId }) {
    try {
      // Check if expense exists
      const existingExpense = await this.getById(id);
      if (!existingExpense) {
        throw new Error('المصروف غير موجود');
      }

      // Validate required fields
      if (!description || !description.trim()) {
        throw new Error('وصف المصروف مطلوب');
      }
      
      if (!amount || amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }
      
      if (!category || !category.trim()) {
        throw new Error('فئة المصروف مطلوبة');
      }
      
      if (!date) {
        throw new Error('تاريخ المصروف مطلوب');
      }

      if (!moneyBoxId) {
        throw new Error('يجب اختيار صندوق المال');
      }

      const changes = await db.update(`
        UPDATE expenses
        SET description = ?,
            amount = ?,
            category = ?,
            date = ?,
            money_box_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [description.trim(), amount, category, date, moneyBoxId, id]);
      
      if (changes === 0) {
        throw new Error('فشل في تحديث المصروف');
      }
      
      return await this.getById(id);
    } catch (err) {
      logger.error('Error updating expense:', err);
      if (err.message.includes('غير موجود') || err.message.includes('مطلوب') || err.message.includes('يجب أن يكون') || err.message.includes('فشل في')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء تحديث المصروف');
    }
  }

  async delete(id) {
    try {
      const expense = await this.getById(id);
      if (!expense) {
        throw new Error('المصروف غير موجود');
      }
      
      const changes = await db.update('DELETE FROM expenses WHERE id = ?', [id]);
      if (changes === 0) {
        throw new Error('فشل في حذف المصروف');
      }
      
      return expense;
    } catch (err) {
      logger.error('Error deleting expense:', err);
      if (err.message.includes('غير موجود') || err.message.includes('فشل في')) {
        throw err;
      }
      throw new Error('حدث خطأ أثناء حذف المصروف');
    }
  }

  async getTotalByCategory(startDate, endDate) {
    try {
      const totals = await db.query(`
        SELECT 
          category,
          SUM(amount) as total_amount,
          COUNT(id) as expense_count
        FROM expenses
        WHERE date BETWEEN ? AND ?
        GROUP BY category
        ORDER BY total_amount DESC
      `, [startDate, endDate]);
      return totals;
    } catch (err) {
      logger.error('Error getting expenses total by category:', err);
      throw new Error('حدث خطأ أثناء جلب إجمالي المصروفات حسب الفئة');
    }
  }

  async getTotalByDateRange(startDate, endDate) {
    try {
      const total = await db.queryOne(`
        SELECT 
          SUM(amount) as total_amount,
          COUNT(id) as expense_count
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `, [startDate, endDate]);
      return total || { total_amount: 0, expense_count: 0 };
    } catch (err) {
      logger.error('Error getting expenses total by date range:', err);
      throw new Error('حدث خطأ أثناء جلب إجمالي المصروفات حسب التاريخ');
    }
  }
}

module.exports = new ExpensesService(); 