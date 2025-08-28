const db = require('./database');


const debts = db.query(`
  SELECT 
    s.id, 
    s.invoice_no, 
    s.customer_id, 
    s.total_amount, 
    s.paid_amount, 
    (s.total_amount - COALESCE(s.paid_amount, 0)) as remaining_amount, 
    s.payment_status 
  FROM sales s 
  WHERE s.payment_status != 'paid' 
    AND (s.total_amount - COALESCE(s.paid_amount, 0)) > 0 
  ORDER BY s.id
`);


 