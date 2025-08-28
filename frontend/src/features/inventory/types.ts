export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  supported?: boolean;
  scientific_name?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id?: number;
  supplier_id?: number;
  expiry_date?: string;
  units_per_box: number;
  created_at: string;
  updated_at: string;
  total_sold?: number;
  total_purchased?: number;
  stock?: number;
  days_until_expiry?: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  sku: string;
  supported?: boolean;
  scientific_name?: string;
  barcode?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  category_id?: number;
  supplier_id?: number;
  expiry_date?: string;
  units_per_box: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: number;
}

export interface ProductMovement {
  id: number;
  product_id: number;
  type: 'sale' | 'purchase' | 'adjustment';
  quantity: number;
  date: string;
  reference: string;
  notes?: string;
}

export interface ProductFilters {
  name?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: number;
  barcode?: string;
  page?: number;
  limit?: number;
} 