export interface BillReceiptSettings {
  // Company Information
  company_name?: string;
  logo_url?: string;
  mobile?: string;
  email?: string;
  address?: string;
  website?: string;
  
  // Receipt Template Settings
  bill_template?: string;
  bill_show_logo?: boolean;
  bill_show_barcode?: boolean;
  bill_show_company_info?: boolean;
  bill_show_qr_code?: boolean;
  bill_footer_text?: string;
  bill_paper_size?: string;
  bill_orientation?: string;
  
  // Margins
  bill_margin_top?: number;
  bill_margin_right?: number;
  bill_margin_bottom?: number;
  bill_margin_left?: number;
  
  // Fonts
  bill_font_header?: string;
  bill_font_body?: string;
  bill_font_footer?: string;
  
  // Colors
  bill_color_primary?: string;
  bill_color_secondary?: string;
  bill_color_text?: string;
  
  // System Settings
  currency?: string;
  tax_rate?: number;
  rtl_direction?: boolean;
  language?: string;
}

export interface BillReceiptSale {
  id: number;
  bill_number: string;
  barcode: string;
  document_type?: 'invoice' | 'quote' | 'proforma' | 'estimate';
  invoice_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  paid_amount: number;
  remaining_amount?: number;
  items: {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    unit?: string;
    description?: string;
  }[];
}