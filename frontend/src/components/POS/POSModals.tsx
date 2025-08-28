import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { 
  Keyboard, 
  DollarSign, 
  ShoppingCart, 
  Info, 
  Barcode,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '@/features/pos/posSlice';
import type { Product } from '@/features/inventory/inventoryService';

interface ProfitDetail {
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  itemCost: number;
  itemRevenue: number;
  itemProfit: number;
  profitMargin: number;
}

interface ProfitCalculation {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  profitDetails: ProfitDetail[];
}

interface POSModalsProps {
  // Keyboard Shortcuts Modal
  showKeyboardShortcuts: boolean;
  onKeyboardShortcutsChange: (show: boolean) => void;
  
  // Profit Modal
  showProfitModal: boolean;
  onProfitModalChange: (show: boolean) => void;
  cart: CartItem[];
  products: Product[];
  calculateProfit: () => ProfitCalculation;
  
  // Barcode Scanner Modal
  showBarcodeModal: boolean;
  onBarcodeModalChange: (show: boolean) => void;
  onBarcodeScanned: (barcode: string) => void;
  isScanning: boolean;
}

// Keyboard Shortcuts Modal
const KeyboardShortcutsModal = memo(({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[600px] rtl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold font-arabic">اختصارات لوحة المفاتيح</DialogTitle>
        <DialogDescription>
          استخدم هذه الاختصارات لتسريع عملك في نقطة البيع
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold font-arabic text-primary">العمليات الأساسية</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + P</kbd>
                <span className="font-arabic">طباعة</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + S</kbd>
                <span className="font-arabic">حفظ</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + C</kbd>
                <span className="font-arabic">إلغاء</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold font-arabic text-primary">عرض وتنقل</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + G</kbd>
                <span className="font-arabic">تبديل عرض المنتجات</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + F</kbd>
                <span className="font-arabic">البحث</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + B</kbd>
                <span className="font-arabic">مسح الباركود</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + N</kbd>
                <span className="font-arabic">سلة جديدة</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Ctrl + D</kbd>
                <span className="font-arabic">إنشاء فاتورة</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-medium">Esc</kbd>
                <span className="font-arabic">إغلاق النوافذ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
));

// Profit Modal
const ProfitModal = memo(({ 
  open, 
  onOpenChange, 
  cart, 
  products, 
  calculateProfit, 
  formatCurrency 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  products: Product[];
  calculateProfit: () => ProfitCalculation;
  formatCurrency: (amount: number) => string;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[600px] rtl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          تفاصيل الربح المتوقع
        </DialogTitle>
        <DialogDescription>
          حساب الربح الفعلي من هذه الفاتورة بناءً على أسعار الشراء والبيع المحفوظة
        </DialogDescription>
      </DialogHeader>
      
      {cart.length > 0 ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateProfit().totalRevenue)}
                </div>
                <div className="text-sm text-blue-800 font-medium">إجمالي المبيعات</div>
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(calculateProfit().totalCost)}
                </div>
                <div className="text-sm text-orange-800 font-medium">التكلفة الفعلية</div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateProfit().totalProfit)}
                </div>
                <div className="text-sm text-green-800 font-medium">الربح المتوقع</div>
                <div className="text-xs text-green-700 mt-1">
                  ({calculateProfit().profitMargin.toFixed(1)}% هامش ربح)
                </div>
              </div>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">تفصيل المنتجات:</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-gray-900">المنتج</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-900">الكمية</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-900">سعر البيع</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-900">التكلفة المقدرة</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-900">الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calculateProfit().profitDetails.map((item: ProfitDetail, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">{formatCurrency(item.sellingPrice)}</td>
                      <td className="px-3 py-2 text-center text-orange-600">
                        {formatCurrency(item.costPrice)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="font-medium text-green-600">
                          {formatCurrency(item.itemProfit)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({item.profitMargin.toFixed(1)}%)
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">ملاحظة مهمة:</p>
                <p>
                  هذه الأرقام محسوبة بناءً على أسعار الشراء والبيع الفعلية المحفوظة في النظام. 
                  إذا لم يتم إدخال سعر الشراء لأي منتج، سيتم اعتباره صفر في حساب الربح.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>لا توجد منتجات في السلة لحساب الربح</p>
        </div>
      )}
      
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>
          إغلاق
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
));

// Barcode Scanner Component
const BarcodeScanner = memo(({ onBarcodeScanned }: { onBarcodeScanned: (barcode: string) => void }) => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (barcode.length >= 8) {
          onBarcodeScanned(barcode);
          setBarcode('');
        }
      } else if (/^[0-9]$/.test(e.key)) {
        setBarcode(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, onBarcodeScanned]);

  return (
    <div className="space-y-4">
      <Input
        ref={inputRef}
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        placeholder="امسح الباركود أو أدخله يدوياً"
        className="flex-1 text-center text-lg"
        dir="ltr"
      />
      <div className="text-sm text-muted-foreground text-center">
        {barcode ? `الباركود: ${barcode}` : 'امسح الباركود أو أدخله يدوياً'}
      </div>
    </div>
  );
});

// Barcode Scanner Modal
const BarcodeScannerModal = memo(({ 
  open, 
  onOpenChange, 
  onBarcodeScanned, 
  isScanning 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeScanned: (barcode: string) => void;
  isScanning: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[500px] rtl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          مسح الباركود
        </DialogTitle>
        <DialogDescription>
          قم بمسح الباركود أو إدخاله يدوياً لإضافة المنتج إلى السلة
        </DialogDescription>
      </DialogHeader>
      <BarcodeScanner onBarcodeScanned={onBarcodeScanned} />
    </DialogContent>
  </Dialog>
));

const POSModals = memo(({
  showKeyboardShortcuts,
  onKeyboardShortcutsChange,
  showProfitModal,
  onProfitModalChange,
  cart,
  products,
  calculateProfit,
  showBarcodeModal,
  onBarcodeModalChange,
  onBarcodeScanned,
  isScanning
}: POSModalsProps) => {
  return (
    <>
      <KeyboardShortcutsModal 
        open={showKeyboardShortcuts} 
        onOpenChange={onKeyboardShortcutsChange} 
      />
      
      <ProfitModal
        open={showProfitModal}
        onOpenChange={onProfitModalChange}
        cart={cart}
        products={products}
        calculateProfit={calculateProfit}
        formatCurrency={formatCurrency}
      />

      <BarcodeScannerModal
        open={showBarcodeModal}
        onOpenChange={onBarcodeModalChange}
        onBarcodeScanned={onBarcodeScanned}
        isScanning={isScanning}
      />
    </>
  );
});

POSModals.displayName = 'POSModals';

export default POSModals; 