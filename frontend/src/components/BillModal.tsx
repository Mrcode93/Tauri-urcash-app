import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Download, Eye, X, Receipt, FileText } from 'lucide-react';
import BillReceipt, { toBillReceiptSale } from './BillReceipt';
import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { BillReceiptSale } from '@/types/bill';

interface BillModalProps {
  sale: SaleData | BillReceiptSale | null;
  customer: Customer | null;
  settings: any;
  open: boolean;
  onClose: () => void;
  products?: any[]; // Add products array
  cartItems?: any[]; // Add cart items
  mode?: 'view' | 'print' | 'preview'; // Add mode prop
}

const BillModal: React.FC<BillModalProps> = ({
  sale,
  customer,
  settings,
  open,
  onClose,
  products,
  cartItems,
  mode = 'view'
}) => {
  const [activeTab, setActiveTab] = useState<'receipt' | 'invoice'>('receipt');

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Future implementation for PDF download
    
  };

  // Removed auto-print functionality

  if (!sale || !settings) return null;
  // Ensure we always pass BillReceiptSale to BillReceipt with enhanced product data
  const billReceiptSale: BillReceiptSale | null = (sale as any).bill_number ? 
    (sale as BillReceiptSale) : 
    (sale ? toBillReceiptSale(sale as SaleData, products, cartItems) : null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Overlay for focus */}
      <div className="fixed inset-0 bg-black/30 z-40" aria-hidden="true" />
      <DialogContent className="max-w-3xl  w-full max-h-[100vh] p-0 gap-0  shadow-2xl border-0 bg-white relative z-50 flex flex-col items-center overflow-hidden">
        {/* Hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            <VisuallyHidden>
              فاتورة رقم {billReceiptSale?.bill_number} - العميل: {customer?.name === 'Anonymous' ? 'زبون نقدي' : customer?.name || 'غير محدد'}
            </VisuallyHidden>
          </DialogTitle>
        </DialogHeader>
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          title="إغلاق"
          className="absolute top-4 left-4 md:top-6 md:left-6 z-50 bg-white border border-gray-200 rounded-full p-2 shadow hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontSize: 22 }}
        >
          <X className="h-6 w-6" />
        </button>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">فاتورة رقم {billReceiptSale?.bill_number}</h2>
              <p className="text-sm text-gray-600">
                العميل: {customer?.name === 'Anonymous' ? 'زبون نقدي' : customer?.name || 'غير محدد'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'receipt' | 'invoice')}>
            <TabsList className="grid w-full grid-cols-2 m-6 mb-0 rounded-xl bg-gray-100">
              <TabsTrigger value="receipt" className="gap-2">
                <Receipt className="h-4 w-4" />
                إيصال
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2">
                <FileText className="h-4 w-4" />
                فاتورة
              </TabsTrigger>
            </TabsList>            <TabsContent value="receipt" className="mt-0 h-full">
              <div className="p-6">
                <BillReceipt
                  sale={billReceiptSale}
                  customer={customer}
                  settings={settings}
                  open={true}
                  onClose={onClose}
                />
              </div>
            </TabsContent>
            <TabsContent value="invoice" className="mt-0 h-full">
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>عرض الفاتورة سيتم تطويره قريباً</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        {/* Quick Actions Footer */}
        <div className="border-t p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-base text-gray-700">
              إجمالي المبلغ: <span className="font-bold text-primary">{billReceiptSale?.total_amount} IQD</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-primary hover:bg-primary/90 gap-2 text-white shadow"
              >
                <Printer className="h-4 w-4" />
                طباعة سريعة
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillModal;