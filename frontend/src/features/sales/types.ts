export interface SaleItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  returned_quantity?: number;
}

export interface SaleItemForm {
  product_id: number;
  quantity: number;
  price: number;
  discount_percent?: number;
  tax_percent?: number;
}

export interface Sale {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  items: SaleItem[];
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  created_at: string;
  updated_at: string;
  barcode: string | null;
  returns?: any[];
}

export interface CreateSaleData {
  customer_id?: number;
  invoice_date: string;
  due_date?: string;
  total_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  net_amount?: number;
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  items: SaleItemForm[];
  barcode?: string;
} 