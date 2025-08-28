import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Customer } from '@/features/customers/customersService';
import { Save, Printer, Zap } from 'lucide-react';

interface BillOperationsProps {
  cart: any[];
  customer: Customer | null;
  paymentMethod: string;
  paidAmount: number;
  settings: any;
  onBillCreated: (bill: any) => void;
}

const BillOperations = ({
  cart,
  customer,
  paymentMethod,
  paidAmount,
  settings,
  onBillCreated
}: BillOperationsProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickSaleLoading, setIsQuickSaleLoading] = useState(false);
  const [billData, setBillData] = useState({
    customer_id: customer?.id || null,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    paid_amount: paidAmount,
    items: []
  });

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = 0; // You can add discount calculation here
    const tax = 0; // You can add tax calculation here
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
  };

  const handleCreateBill = async (isQuickSale = false) => {
    if (!customer && !isQuickSale) {
      toast.error('يرجى اختيار العميل');
      return;
    }

    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    if (isQuickSale) {
      setIsQuickSaleLoading(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { subtotal, discount, tax, total } = calculateTotals();
      
      const billData = {
        customer_id: isQuickSale ? 999 : customer?.id, // Use anonymous customer for quick sale
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal,
        discount,
        tax,
        total,
        paid_amount: paidAmount,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        }))
      };

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData)
      });

      if (!response.ok) {
        throw new Error('Failed to create bill');
      }

      const bill = await response.json();
      toast.success(isQuickSale ? 'تم حفظ عملية البيع السريع بنجاح' : 'تم إنشاء الفاتورة بنجاح');
      onBillCreated(bill);
      setIsOpen(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      console.error('Error creating bill:', error);
    } finally {
      setIsLoading(false);
      setIsQuickSaleLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-2">
      {/* <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => handleCreateBill(false)}
          disabled={cart.length === 0 || !customer || isLoading}
          className="w-full"
        >
          {isLoading ? 'جاري الحفظ...' : (
            <>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </>
          )}
        </Button>

        <Button
          onClick={() => {
            handleCreateBill(false);
            handlePrint();
          }}
          disabled={cart.length === 0 || !customer || isLoading}
          className="w-full"
        >
          {isLoading ? 'جاري الحفظ...' : (
            <>
              <Printer className="h-4 w-4 ml-2" />
              حفظ وطباعة
            </>
          )}
        </Button>

        <Button
          onClick={() => handleCreateBill(true)}
          disabled={cart.length === 0 || isQuickSaleLoading}
          className="w-full"
        >
          {isQuickSaleLoading ? 'جاري الحفظ...' : (
            <>
              <Zap className="h-4 w-4 ml-2" />
              بيع سريع
            </>
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>العميل</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">
                {customer?.name || 'لم يتم اختيار عميل'}
              </div>
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">
                {paymentMethod === 'cash' ? 'نقدي' : 
                 paymentMethod === 'card' ? 'بطاقة' : 'تحويل بنكي'}
              </div>
            </div>

            <div>
              <Label>المبلغ المدفوع</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">
                {formatCurrency(paidAmount)}
              </div>
            </div>

            <div>
              <Label>إجمالي الفاتورة</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded-md">
                {formatCurrency(calculateTotals().total)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => handleCreateBill(false)}
              disabled={isLoading}
            >
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
};

export default BillOperations; 