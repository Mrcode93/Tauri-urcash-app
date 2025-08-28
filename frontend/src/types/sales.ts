export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string;
  search?: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  tax_amount: number;
  net_price: number;
}

export interface SaleData {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: SaleItem[];
  status: string;
  barcode?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
} 