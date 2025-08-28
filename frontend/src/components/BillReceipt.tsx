import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, Settings, Eye, RotateCcw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import type { SaleData, SaleItem } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { Product } from '@/features/inventory/inventoryService';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import BillBarcode from './BillBarcode';
import { cn } from '@/lib/utils';
import { Package, Phone, MapPin } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from '@/lib/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
 

interface BillReceiptProps {
  sale: BillReceiptSale | null;
  customer: Customer | null;
  settings: any;
  open: boolean;
  onClose: () => void;
}

// Update the BillReceiptSale interface
interface BillReceiptSale {
  id: number;
  bill_number: string;
  barcode: string;
  invoice_date: string;
  created_at?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  paid_amount: number;
  remaining_amount?: number;
  created_by_name?: string;
  created_by_username?: string;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    unit?: string;
    description?: string;
    unitType?: string;
    piecesPerUnit?: number;
  }>;
}

// Helper to transform SaleData to BillReceipt Sale
export function toBillReceiptSale(saleData: SaleData | null, products?: Product[], cartItems?: any[]): BillReceiptSale | null {
  if (!saleData) return null;

  // Handle different types of sale data
  let items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    unit?: string;
    description?: string;
    unitType?: string;
    piecesPerUnit?: number;
  }> = [];

  // First try to use cart items if provided (most reliable for POS)
  if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
    items = cartItems.map((cartItem, index) => {
      const product = products?.find(p => p.id === cartItem.product_id);
      
      // Create description with unit type information - keep it separate from product name
      let description = product?.description || cartItem.description || '';
      // Use type assertion for cart-specific properties
      const typedCartItem = cartItem as any;
      if (typedCartItem.unitType) {
        const unitTypeText = typedCartItem.unitType === 'box' ? 'علبة' : 'قطعة';
        const unitInfo = typedCartItem.unitType === 'box' && typedCartItem.piecesPerUnit > 1 
          ? ` (${typedCartItem.piecesPerUnit} قطعة في العلبة)`
          : '';
        description = `${unitTypeText}${unitInfo}${description ? ` - ${description}` : ''}`;
      }
      
      return {
        id: index + 1,
        product_id: cartItem.product_id || 0,
        // Keep product name clean - don't concatenate with description
        product_name: cartItem.name || cartItem.product_name || product?.name || `منتج ${cartItem.product_id}`,
        quantity: Number(cartItem.quantity) || 1,
        price: Number(cartItem.price) || 0,
        total: Number(cartItem.total) || (Number(cartItem.price) * Number(cartItem.quantity)) || 0,
        unit: product?.unit || cartItem.unit || '',
        description: description,
        unitType: typedCartItem.unitType,
        piecesPerUnit: typedCartItem.piecesPerUnit
      };
    });
  }
  // Then try sale data items
  else if (saleData.items && Array.isArray(saleData.items) && saleData.items.length > 0) {
    items = saleData.items.map((item, index) => {
      const product = products?.find(p => p.id === item.product_id);
      
      // Create description with unit type information if available - keep it separate from product name
      let description = product?.description || item.product?.description || '';
      // Use type assertion for cart-specific properties
      const cartItem = item as any;
      if (cartItem.unitType) {
        const unitTypeText = cartItem.unitType === 'box' ? 'علبة' : 'قطعة';
        const unitInfo = cartItem.unitType === 'box' && cartItem.piecesPerUnit > 1 
          ? ` (${cartItem.piecesPerUnit} قطعة في العلبة)`
          : '';
        description = `${unitTypeText}${unitInfo}${description ? ` - ${description}` : ''}`;
      }
      
      const processedItem = {
        id: item.id || index + 1,
        product_id: item.product_id || 0,
        // Keep product name clean - don't concatenate with description
        product_name: item.product_name || product?.name || item.product?.name || `منتج ${item.product_id}`,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: Number(item.total) || Number(item.line_total) || (Number(item.price) * Number(item.quantity)) || 0,
        unit: product?.unit || item.product?.unit || '',
        description: description,
        unitType: cartItem.unitType,
        piecesPerUnit: cartItem.piecesPerUnit
      };
      
      return processedItem;
    });
  } 
  // Fallback: If no items, create a single item with sale total
  else {
    items = [{
      id: 1,
      product_id: 0,
      product_name: 'مبيعات متنوعة',
      quantity: 1,
      price: Number(saleData.total_amount) || 0,
      total: Number(saleData.total_amount) || 0,
      unit: '',
      description: '',
      unitType: undefined,
      piecesPerUnit: undefined
    }];
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  const result = {
    id: saleData.id,
    bill_number: saleData.invoice_no || `INV-${saleData.id}`,
    barcode: saleData.barcode || saleData.invoice_no || `INV-${saleData.id}`,
    invoice_date: saleData.invoice_date,
    created_at: saleData.created_at,
    subtotal: subtotal,
    discount: Number(saleData.discount_amount) || 0,
    tax: Number(saleData.tax_amount) || 0,
    total_amount: Number(saleData.total_amount) || 0,
    payment_method: saleData.payment_method,
    payment_status: saleData.payment_status,
    paid_amount: Number(saleData.paid_amount) || 0,
    remaining_amount: Number(saleData.remaining_amount) || 0,
    created_by_name: saleData.created_by_name,
    created_by_username: saleData.created_by_username,
    items: items
  };

  return result;
}

const BillReceipt: React.FC<BillReceiptProps> = ({
  sale,
  customer,
  settings,
  open,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [printSettings, setPrintSettings] = useState({
    printerType: settings?.bill_print_mode || settings?.printMode || 'a4' as 'thermal' | 'a4',
    showPrintPreview: false,
    copies: 1,
    showPrintDialog: true
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  // Get printer type from settings - use the new printMode field
  const printerType: 'thermal' | 'a4' = printSettings.printerType;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bill_${sale?.bill_number || 'Receipt'}`,
    onAfterPrint: () => {
      setIsPrinting(false);
      toast.success('تم الطباعة بنجاح');
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      const errorMessage = 'حدث خطأ أثناء الطباعة';
      setPrintError(errorMessage);
      toast.error(errorMessage);
      console.error('Print error:', error);
    }
  });

  const handlePrintWithSettings = () => {
    if (printSettings.copies > 1) {
      // Print multiple copies
      for (let i = 0; i < printSettings.copies; i++) {
        setTimeout(() => {
          handlePrint();
        }, i * 1000); // 1 second delay between copies
      }
    } else {
      handlePrint();
    }
  };

  const handlePrintPreview = () => {
    setPrintSettings(prev => ({ ...prev, showPrintPreview: true }));
  };

  const handleClosePrintPreview = () => {
    setPrintSettings(prev => ({ ...prev, showPrintPreview: false }));
  };

  const convertNumberToWords = (num: number): string => {
    const units = [
      'صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة',
      'ستة', 'سبعة', 'ثمانية', 'تسعة'
    ];
    const teens = [
      'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر',
      'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
    ];
    const tens = [
      '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون',
      'ستون', 'سبعون', 'ثمانون', 'تسعون'
    ];
    
    if (num < 0) return 'رقم سالب';
    if (num === 0) return units[0];
    if (num > 999999999) return 'رقم كبير جداً';
    
    const convertGroup = (n: number): string => {
      let result = '';
      
      // Handle hundreds
      if (n >= 100) {
        const hundreds = Math.floor(n / 100);
        if (hundreds === 1) {
          result += 'مائة';
        } else if (hundreds === 2) {
          result += 'مئتان';
        } else {
          result += units[hundreds] + 'مائة';
        }
        n %= 100;
        if (n > 0) result += ' ';
      }
      
      // Handle tens and units with proper Arabic grammar
      if (n >= 20) {
        const tensDigit = Math.floor(n / 10);
        const unitsDigit = n % 10;
        
        if (unitsDigit > 0) {
          // Arabic grammar: units come before tens with "و" (and)
          result += units[unitsDigit] + ' و' + tens[tensDigit];
        } else {
          result += tens[tensDigit];
        }
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += units[n];
      }
      
      return result.trim();
    };
    
    let words = '';
    
    // Handle millions
    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      const millionText = convertGroup(millions);
      if (millions === 1) {
        words += 'مليون';
      } else if (millions === 2) {
        words += 'مليونان';
      } else if (millions <= 10) {
        words += millionText + ' ملايين';
      } else {
        words += millionText + ' مليون';
      }
      num %= 1000000;
      if (num > 0) words += ' و'; // Add "و" (and) connector when there are remaining numbers
    }
    
    // Handle thousands
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const thousandText = convertGroup(thousands);
      if (thousands === 1) {
        words += 'ألف';
      } else if (thousands === 2) {
        words += 'ألفان';
      } else if (thousands <= 10) {
        words += thousandText + ' آلاف';
      } else {
        words += thousandText + ' ألف';
      }
      num %= 1000;
      if (num > 0) words += ' و'; // Add "و" (and) connector when there are remaining numbers
    }
    
    // Handle remaining hundreds, tens, and units
    if (num > 0) {
      words += convertGroup(num);
    }
    
    return words.trim();
  };

  const handleDownload = () => {
    // Generate PDF using BillPrintModal logic but with BillReceipt styling
    const printContent = document.getElementById('bill-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html dir="rtl">
          <head>
            <title>فاتورة ${sale.bill_number}</title>
            <style>
              @page {
                size: A4;
                margin: 20mm 15mm;
                orphans: 3;
                widows: 3;
              }
              
              @media print {
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: '${settings.bill_font_body || 'Cairo'}', Arial, sans-serif; 
                  direction: rtl;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                  line-height: 1.4;
                }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                
                /* Page break controls */
                .page-break-before { page-break-before: always; }
                .page-break-after { page-break-after: always; }
                .page-break-inside-avoid { page-break-inside: avoid; }
                .page-break-inside-auto { page-break-inside: auto; }
                
                /* Table handling */
                .bill-table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-bottom: 20px; 
                  page-break-inside: auto;
                  border: 2px solid #000000;
                }
                .bill-table th, .bill-table td { 
                  border: 1px solid #000000; 
                  padding: 8px; 
                  text-align: center; 
                  color: #000000 !important;
                  vertical-align: top;
                }
                .bill-table th { 
                  background-color: #f5f5f5 !important; 
                  font-weight: bold;
                  page-break-inside: avoid;
                  page-break-after: avoid;
                  display: table-header-group;
                }
                .bill-table thead { 
                  display: table-header-group; 
                  page-break-inside: avoid;
                  page-break-after: avoid;
                }
                .bill-table tbody { 
                  page-break-inside: auto; 
                }
                .bill-table tr { 
                  page-break-inside: avoid; 
                  page-break-after: auto;
                }
                
                /* Grid layout */
                .grid { display: grid; }
                .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
                
                /* Flexbox */
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .space-x-4 > * + * { margin-right: 1rem; }
                .space-x-reverse > * + * { margin-right: 1rem; }
                
                /* Borders and spacing */
                .border-2 { border-width: 2px; }
                .border-black { border-color: #000000; }
                .p-2 { padding: 0.5rem; }
                .rounded { border-radius: 0.25rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-4 { margin-top: 1rem; }
                .mt-6 { margin-top: 1.5rem; }
                .pt-2 { padding-top: 0.5rem; }
                .pt-4 { padding-top: 1rem; }
                .pb-2 { padding-bottom: 0.5rem; }
                .pb-4 { padding-bottom: 1rem; }
                
                /* Typography */
                .font-bold { font-weight: 700; }
                .text-black { color: #000000; }
                .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                
                /* Background colors */
                .bg-gray-50 { background-color: #f9fafb !important; }
                .bg-gray-100 { background-color: #f3f4f6 !important; }
                .bg-gray-200 { background-color: #e5e7eb !important; }
                
                /* Bill content container */
                .bill-content {
                  max-width: 180mm;
                  margin: 0 auto;
                  padding: 20px;
                  background: white;
                  font-family: '${settings.bill_font_body || 'Cairo'}', Arial, sans-serif;
                  direction: rtl;
                  color: #000000 !important;
                  text-align: center;
                }
                
                /* Header styling */
                .bill-header { 
                  text-align: center; 
                  margin-bottom: 30px; 
                  border-bottom: 2px solid #000; 
                  padding-bottom: 20px; 
                  page-break-inside: avoid;
                  page-break-after: avoid;
                }
                
                /* Footer styling */
                .bill-footer { 
                  margin-top: 30px; 
                  page-break-inside: avoid;
                  page-break-before: avoid;
                }
                
                /* Bill info grid */
                .bill-info { 
                  display: grid; 
                  grid-template-columns: repeat(3, 1fr); 
                  gap: 1rem; 
                  margin-bottom: 30px; 
                }
                
                /* Bill items */
                .bill-items { 
                  margin-bottom: 30px; 
                }
                
                /* Bill totals */
                .bill-totals { 
                  text-align: left; 
                  margin-top: 20px; 
                }
                
                /* Company info */
                .company-info { 
                  text-align: center; 
                  margin-bottom: 20px; 
                }
                
                /* Bill number */
                .bill-number { 
                  font-size: 1.2em; 
                  font-weight: bold; 
                }
                
                /* Bill table container */
                .bill-table-container {
                  margin-bottom: 20px;
                }
                
                /* Bill footer section */
                .bill-footer-section {
                  margin-top: 20px;
                  page-break-inside: avoid;
                  page-break-before: avoid;
                }
              }
              
              body { 
                font-family: '${settings.bill_font_body || 'Cairo'}', Arial, sans-serif; 
                direction: rtl; 
                color: #000000 !important;
                margin: 0;
                padding: 0;
                line-height: 1.4;
              }
              
              .bill-content {
                max-width: 180mm;
                margin: 0 auto;
                padding: 20px;
                background: white;
                font-family: '${settings.bill_font_body || 'Cairo'}', Arial, sans-serif;
                direction: rtl;
                color: #000000 !important;
                text-align: center;
              }
              
              .bill-header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #000; 
                padding-bottom: 20px; 
              }
              
              .bill-info { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 1rem; 
                margin-bottom: 30px; 
              }
              
              .bill-items { 
                margin-bottom: 30px; 
              }
              
              .bill-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px; 
                border: 2px solid #000000;
              }
              
              .bill-table th, .bill-table td { 
                border: 1px solid #000000; 
                padding: 8px; 
                text-align: center; 
                color: #000000 !important;
                vertical-align: top;
              }
              
              .bill-table th { 
                background-color: #f5f5f5 !important; 
                font-weight: bold;
              }
              
              .bill-totals { 
                text-align: left; 
                margin-top: 20px; 
              }
              
              .total-row { 
                font-weight: bold; 
                font-size: 1.1em; 
              }
              
              .company-info { 
                text-align: center; 
                margin-bottom: 20px; 
              }
              
              .bill-number { 
                font-size: 1.2em; 
                font-weight: bold; 
              }
              
              .bill-table-container {
                margin-bottom: 20px;
              }
              
              .bill-footer-section {
                margin-top: 20px;
              }
              
              .no-print { 
                display: none !important; 
              }
              
              /* Print button styling */
              .print-button {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                z-index: 1000;
              }
              
              .print-button:hover {
                background: #0056b3;
              }
              
              @media print {
                .print-button {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <button class="print-button" onclick="window.print()">طباعة الفاتورة</button>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow?.document.close();
      printWindow?.focus();
    }
  };

  if (!open || !sale) return null;

  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && (window as any).process && (window as any).process.versions && (window as any).process.versions.electron;
    
    if (isElectron) {
      // In Electron, always use localhost with the correct port
      const port = process.env.NODE_ENV === 'production' ? 39000 : 39000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined, formatString: string) => {
    if (!dateString) {
      return format(new Date(), formatString, { locale: ar });
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return format(new Date(), formatString, { locale: ar });
      }
      return format(date, formatString, { locale: ar });
    } catch (error) {
      return format(new Date(), formatString, { locale: ar });
    }
  };

  // Use exact settings from props without fallbacks
  const receiptSettings = {
    // Company info from settings
    company_name: settings?.company_name,
    logo_url: settings?.logo_url,
    mobile: settings?.mobile,
    email: settings?.email,
    address: settings?.address,
    website: settings?.website,
    tax_number: settings?.tax_number,
    registration_number: settings?.registration_number,
    description: settings?.description,
    
    // Receipt template settings
    bill_print_mode: settings?.bill_print_mode || settings?.printMode,
    bill_template: settings?.bill_template,
    bill_show_logo: settings?.bill_show_logo,
    bill_show_barcode: settings?.bill_show_barcode,
    bill_show_company_info: settings?.bill_show_company_info,
    bill_show_qr_code: settings?.bill_show_qr_code,
    bill_paper_size: settings?.bill_paper_size,
    bill_orientation: settings?.bill_orientation,
    
    // Margins
    bill_margin_top: settings?.bill_margin_top,
    bill_margin_right: settings?.bill_margin_right,
    bill_margin_bottom: settings?.bill_margin_bottom,
    bill_margin_left: settings?.bill_margin_left,
    
    // Fonts (only the ones that exist in database)
    bill_font_header: settings?.bill_font_header,
    bill_font_body: settings?.bill_font_body,
    bill_font_footer: settings?.bill_font_footer,
    
    // Colors
    bill_color_primary: settings?.bill_color_primary,
    bill_color_secondary: settings?.bill_color_secondary,
    bill_color_text: settings?.bill_color_text,
    
    // Footer text
    bill_footer_text: settings?.bill_footer_text,
    
    // System settings
    currency: settings?.currency,
    tax_rate: settings?.tax_rate,
    rtl_direction: settings?.rtl_direction,
    language: settings?.language,
    timezone: settings?.timezone,
    date_format: settings?.date_format,
    number_format: settings?.number_format,
  };

  // Get template-specific styling based on settings
  const getTemplateStyles = () => {
    const template = receiptSettings.bill_template;
    const baseStyles = {
      fontFamily: receiptSettings.bill_font_body || 'Cairo',
      fontSize: '14px', // Default size since it's not in database
      fontWeight: '400', // Default weight since it's not in database
      color: receiptSettings.bill_color_text || '#000000',
      direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr',
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      lineHeight: '1.4',
    };

    switch (template) {
      case 'classic':
        return {
          ...baseStyles,
          border: `1px solid #000000`,
          borderRadius: '0px',
          padding: '20px',
          backgroundColor: '#ffffff',
        };
      case 'minimal':
        return {
          ...baseStyles,
          border: 'none',
          borderRadius: '0px',
          padding: '15px',
          backgroundColor: '#ffffff',
        };
      case 'modern':
      default:
        return {
          ...baseStyles,
          border: `1px solid #000000`,
          borderRadius: '0px',
          padding: '20px',
          backgroundColor: '#ffffff',
        };
    }
  };

  // Print Preview Modal
  if (printSettings.showPrintPreview) {
    return (
      <Dialog open={printSettings.showPrintPreview} onOpenChange={handleClosePrintPreview}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 gap-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">معاينة الطباعة</h2>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrintWithSettings} variant="default" className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button onClick={handleClosePrintPreview} variant="outline">
                إغلاق
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div 
              ref={printRef}
              className={cn(
                "bill-content font-arabic mx-auto",
                printerType === 'thermal' ? [
                  "p-2 text-sm w-full max-w-[80mm] thermal-preview",
                  "border border-gray-300 shadow-lg"
                ] : [
                  "p-8 text-base w-full max-w-[210mm]",
                  "border border-gray-300 shadow-lg"
                ]
              )}
              style={{
                ...getTemplateStyles(),
                ...(printerType === 'thermal' ? {
                  width: '80mm',
                  maxWidth: '80mm',
                  margin: '0 auto',
                  padding: '2mm',
                  textAlign: 'center',
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                } : {
                  marginTop: `${receiptSettings.bill_margin_top}mm`,
                  marginRight: `${receiptSettings.bill_margin_right}mm`,
                  marginBottom: `${receiptSettings.bill_margin_bottom}mm`,
                  marginLeft: `${receiptSettings.bill_margin_left}mm`,
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr'
                })
              } as React.CSSProperties}
              dir={receiptSettings.rtl_direction ? 'rtl' : 'ltr'}
            >
              {/* Print Preview Content - Same as main content */}
              {/* Header with Logo, Company Info, and Barcode */}
              {(receiptSettings.bill_show_logo || receiptSettings.bill_show_company_info) && (
                <div className="mb-4 pb-2 border-b-2 border-black">
                  {/* Logo, Company Name, and Barcode Row */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Logo and Company Name */}
                    <div className="flex items-center space-x-4 space-x-reverse">
                      {receiptSettings.bill_show_logo && receiptSettings.logo_url && (
                        <div className="flex-shrink-0">
                          <img 
                            src={getLogoUrl(receiptSettings.logo_url)} 
                            alt={receiptSettings.company_name || 'Company Logo'} 
                            className={cn(
                              "object-contain",
                              printerType === 'thermal' ? "h-16" : "h-20"
                            )}
                          />
                        </div>
                      )}
                      {receiptSettings.bill_show_company_info && receiptSettings.company_name && (
                        <div style={{ 
                          fontFamily: receiptSettings.bill_font_header || 'Cairo',
                          color: '#000000'
                        }}>
                          <h1 
                            className={cn(
                              "font-bold text-black",
                              printerType === 'thermal' ? "text-2xl" : "text-2xl"
                            )}
                            style={{ 
                              fontWeight: receiptSettings.bill_font_header_weight || '700',
                              color: '#000000'
                            }}
                          >
                            {receiptSettings.company_name}
                          </h1>
                        </div>
                      )}
                    </div>
                    
                    {/* Barcode */}
                    {receiptSettings.bill_show_barcode && sale.barcode && (
                      <div className="flex-shrink-0">
                        <BillBarcode
                          value={sale.barcode}
                          width={printerType === 'thermal' ? 1.2 : 2}
                          height={printerType === 'thermal' ? 40 : 60}
                          fontSize={printerType === 'thermal' ? 12 : 16}
                          margin={0}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Address and Phone Row */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-bold text-black">العنوان:</span>
                        <span className="text-black">{receiptSettings.address || 'تكريت'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="font-bold text-black">رقم الهاتف:</span>
                      <span className="text-black">{receiptSettings.mobile || '07838584311'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bill Info */}
              <div className="mb-6 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">رقم الفاتورة:</span>
                    <span className="text-black">{sale.bill_number}</span>
                  </div>
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">التاريخ:</span>
                    <span className="text-black">
                      {safeFormatDate(sale.invoice_date, 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">الوقت:</span>
                    <span className="text-black">
                      {safeFormatDate(sale.created_at || sale.invoice_date, 'HH:mm:ss')}
                    </span>
                  </div>
                  {customer && (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">اسم العميل:</span>
                      <span className="text-black">{customer.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">طريقة الدفع:</span>
                    <span className="text-black">
                      {sale.payment_method === 'cash' ? 'نقدي' :
                       sale.payment_method === 'card' ? 'بطاقة' :
                       sale.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                       sale.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">حالة الدفع:</span>
                    <span className="text-black">
                      {sale.payment_status === 'paid' ? 'مدفوع' :
                       sale.payment_status === 'partial' ? 'مدفوع جزئياً' :
                       'غير مدفوع'}
                    </span>
                  </div>
                  {sale.created_by_name && (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">المستخدم:</span>
                      <span className="text-black">{sale.created_by_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">المبلغ المدفوع:</span>
                    <span className="text-black">{formatCurrency(sale.paid_amount)} {receiptSettings.currency}</span>
                  </div>
                  {sale.remaining_amount && sale.remaining_amount > 0 && (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">المبلغ المتبقي:</span>
                      <span className="text-black">{formatCurrency(sale.remaining_amount)} {receiptSettings.currency}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="bill-table-container">
                <table className={cn(
                  "bill-table w-full border-collapse border-2 border-black", 
                  printerType === 'thermal' ? "text-md" : "text-sm"
                )}>
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black py-2 px-2 font-bold text-black text-right">المنتج</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">الكمية</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">السعر</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {sale?.items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-black py-1 px-1 text-black text-center font-bold">
                        <div className="font-bold">{item.product_name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="border border-black py-1 px-2 text-black text-center font-bold">{item.quantity}</td>
                      <td className="border border-black py-1 px-2 text-black text-center font-bold">{formatCurrency(item.price)}</td>
                      <td className="border border-black py-1 px-2 text-black text-center font-bold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 border-t-2 border-black">
                    <td colSpan={3} className="border border-black py-2 px-2 text-black text-right font-bold">
                      المجموع :
                    </td>
                    <td className="border border-black py-2 px-2 text-black text-center font-bold">
                      {formatCurrency(sale?.subtotal || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border border-black py-2 px-2 text-black text-center font-medium bg-gray-50">
                      <div className="text-sm font-bold">
                        {convertNumberToWords(sale?.total_amount || 0)} دينار عراقي
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Footer Section - Keep together in PDF */}
              <div className="bill-footer-section">
                



                {/* Footer */}
                {receiptSettings.bill_footer_text && (
                  <div 
                    className="text-center mt-2 pt-2 border-t-2 border-black"
                    style={{ 
                      fontFamily: receiptSettings.bill_font_footer || 'Cairo',
                      fontSize: '12px',
                      fontWeight: '400',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                  >
                    <p 
                      className="text-black font-bold text-lg mb-2"
                      style={{
                        color: '#000000'
                      }}
                    >
                      {receiptSettings.bill_footer_text}
                    </p>
                  </div>
                )}

                {/* Copyright */}
                <div className="text-center mt-4 border-t border-black pt-2">
                  <p className="text-md text-black font-bold">
                    برنامج اوركاش للمحاسبة - من URUX للبرمجيات
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0 gap-0 flex flex-col h-[90vh]",
        printerType === 'thermal' ? "max-w-md" : "max-w-4xl"
      )}>
        {/* Print Options and Close Button */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
      
         
          </div>
          <div className="flex items-center gap-2">
         
          
            <Button 
              onClick={handlePrintWithSettings} 
              variant="default" 
              className="gap-2"
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-0">
            <div 
              ref={printRef}
              className={cn(
                "bill-content font-arabic",
                printerType === 'thermal' ? [
                  "p-2 text-sm w-full max-w-[80mm] mx-auto thermal-preview",
                  "print:w-[80mm] print:max-w-[80mm] print:mx-auto print:p-1"
                ] : [
                  "p-8 text-base m-4",
                  "print:w-[210mm] print:max-w-[210mm]"
                ]
              )}
              style={{
                ...getTemplateStyles(),
                ...(printerType === 'thermal' ? {
                  width: '80mm',
                  maxWidth: '80mm',
                  margin: '0 auto',
                  padding: '2mm',
                  textAlign: 'center',
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                } : {
                  marginTop: `${receiptSettings.bill_margin_top}mm`,
                  marginRight: `${receiptSettings.bill_margin_right}mm`,
                  marginBottom: `${receiptSettings.bill_margin_bottom}mm`,
                  marginLeft: `${receiptSettings.bill_margin_left}mm`,
                  direction: receiptSettings.rtl_direction ? 'rtl' : 'ltr'
                })
              } as React.CSSProperties}
              dir={receiptSettings.rtl_direction ? 'rtl' : 'ltr'}
            >
              {/* Header with Logo, Company Info, and Barcode - Professional Layout */}
              {(receiptSettings.bill_show_logo || receiptSettings.bill_show_company_info) && (
                <div className="mb-4 pb-2 border-b-2 border-black">
                  {/* Logo, Company Name, and Barcode Row */}
                  <div className="flex items-center justify-between mb-3">
                    {/* Logo and Company Name */}
                    <div className="flex items-center space-x-4 space-x-reverse">
                      {receiptSettings.bill_show_logo && receiptSettings.logo_url && (
                        <div className="flex-shrink-0">
                          <img 
                            src={getLogoUrl(receiptSettings.logo_url)} 
                            alt={receiptSettings.company_name || 'Company Logo'} 
                            className={cn(
                              "object-contain",
                              printerType === 'thermal' ? "h-16" : "h-20"
                            )}
                          />
                        </div>
                      )}
                      {receiptSettings.bill_show_company_info && receiptSettings.company_name && (
                        <div style={{ 
                          fontFamily: receiptSettings.bill_font_header || 'Cairo',
                          color: '#000000'
                        }}>
                          <h1 
                            className={cn(
                              "font-bold text-black",
                              printerType === 'thermal' ? "text-2xl" : "text-2xl"
                            )}
                            style={{ 
                              fontWeight: receiptSettings.bill_font_header_weight || '700',
                              color: '#000000'
                            }}
                          >
                            {receiptSettings.company_name}
                          </h1>
                        </div>
                      )}
                    </div>
                    
                    {/* Barcode */}
                    {receiptSettings.bill_show_barcode && sale.barcode && (
                      <div className="flex-shrink-0">
                        <BillBarcode
                          value={sale.barcode}
                          width={printerType === 'thermal' ? 1.2 : 2}
                          height={printerType === 'thermal' ? 40 : 60}
                          fontSize={printerType === 'thermal' ? 12 : 16}
                          margin={0}
                        />
                      </div>
                    )}
                  </div>
                  
                 
                </div>
              )}

              {/* Bill Info - Professional Layout */}
              <div className="mb-6 space-y-3">
               
             
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">رقم الفاتورة:</span>
                    <span className="text-black">{sale.bill_number}</span>
                  </div>
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">التاريخ:</span>
                    <span className="text-black">
                      {safeFormatDate(sale.invoice_date, 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">الوقت:</span>
                    <span className="text-black">
                      {safeFormatDate(sale.created_at || sale.invoice_date, 'HH:mm:ss')}
                    </span>
                  </div>
                  {customer && (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">اسم العميل:</span>
                      <span className="text-black">{customer.name}</span>
                    </div>
                  )}
                  {/* <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">طريقة الدفع:</span>
                    <span className="text-black">
                      {sale.payment_method === 'cash' ? 'نقدي' :
                       sale.payment_method === 'card' ? 'بطاقة' :
                       sale.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                       sale.payment_method}
                    </span>
                  </div> */}
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">حالة الدفع:</span>
                    <span className="text-black">
                      {sale.payment_status === 'paid' ? 'مدفوع' :
                       sale.payment_status === 'partial' ? 'مدفوع جزئياً' :
                       'غير مدفوع'}
                    </span>
                  </div>
                  {sale.created_by_name && (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">المستخدم:</span>
                      <span className="text-black">{sale.created_by_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-2 border-black p-2 rounded">
                    <span className="font-bold text-black">المبلغ المدفوع:</span>
                    <span className="text-black">{formatCurrency(sale.paid_amount)} {receiptSettings.currency}</span>
                  </div>
                  {sale.remaining_amount && sale.remaining_amount > 0 ? (
                    <div className="flex justify-between border-2 border-black p-2 rounded">
                      <span className="font-bold text-black">المبلغ المتبقي:</span>
                      <span className="text-black">{formatCurrency(sale.remaining_amount)} </span>
                    </div>
                  ) : (
                   null
                  )}
                </div>
              </div>

              {/* Items Table - Professional Layout */}
              <div className="bill-table-container">
                <table className={cn(
                  "bill-table w-full border-collapse border-2 border-black", 
                  printerType === 'thermal' ? "text-md" : "text-sm"
                )}>
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black py-2 px-2 font-bold text-black text-right">المنتج</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">الكمية</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">السعر</th>
                    <th className="border border-black py-2 px-2 font-bold text-black text-center">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {sale?.items.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-black py-1 px-1 text-black text-center font-bold">
                        <div className="font-bold">{item.product_name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="border border-black py-1 px-2 text-black text-center  font-bold">{item.quantity}</td>
                      <td className="border border-black py-1 px-2 text-black text-center  font-bold">{formatCurrency(item.price)}</td>
                      <td className="border border-black py-1 px-2 text-black text-center  font-bold">
                        {formatCurrency(item.total)}
                      </td>
                    
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr className="bg-gray-100 border-t-2 border-black">
                    <td colSpan={3} className="border border-black py-2 px-2 text-black text-right font-bold">
                      المجموع :
                    </td>
                    <td className="border border-black py-2 px-2 text-black text-center font-bold">
                      {formatCurrency(sale?.subtotal || 0)}
                    </td>
                  </tr>
                  <tr>
                    {/* total written as words spanning all columns */}
                    <td colSpan={4} className="border border-black py-2 px-2 text-black text-center font-medium bg-gray-50">
                      <div className="text-sm font-bold">
                        {convertNumberToWords(sale?.total_amount || 0)} دينار عراقي
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Footer Section - Keep together in PDF */}
              <div className="bill-footer-section">
               

                {/* QR Code - Professional Black */}
                {receiptSettings.bill_show_qr_code && (
                  <div className="flex justify-center gap-4 mt-6 pt-2">
                    <div className="text-center">
                      <div 
                        className="h-12 w-12 flex items-center justify-center text-white text-xs mb-2 mx-auto rounded border-2 border-black"
                        style={{ backgroundColor: '#000000' }}
                      >
                        QR
                      </div>
                      <p className="text-xs text-black font-medium">رمز الاستجابة السريعة</p>
                    </div>
                  </div>
                )}
                  {/* Footer with Custom Text - Professional Black */}
                {receiptSettings.bill_footer_text && (
                  <div 
                    className="text-center border-t-0 border-black"
                    style={{ 
                      fontFamily: receiptSettings.bill_font_footer || 'Cairo',
                      fontSize: '12px',
                      fontWeight: '400',
                      textRendering: 'optimizeLegibility',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                  >
                    <p 
                      className="text-black font-bold text-lg mb-2"
                      style={{
                        color: '#000000'
                      }}
                    >
                      {receiptSettings.bill_footer_text}
                    </p>
                  </div>
                )}
                {/* copyright */}
                <div className="text-center mt-4 border-t border-black pt-2">
                  <p className="text-md text-black font-bold">
                   برنامج اوركاش للمحاسبة - من URUX للبرمجيات
                   </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


export default BillReceipt;