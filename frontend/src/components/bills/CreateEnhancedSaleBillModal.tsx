import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../app/store';
import { createSaleBill } from '../../features/bills/billsSlice';
import { getCustomers } from '../../features/customers/customersSlice';
import { getProducts } from '../../features/inventory/inventorySlice';
import { fetchDelegates } from '../../features/delegates/delegatesSlice';
import { fetchEmployees } from '../../features/employees/employeesSlice';
import { fetchAllMoneyBoxes } from '../../features/moneyBoxes/moneyBoxesSlice';
import { stocksService } from '../../features/stocks/stocksService';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  Search,
  User,
  Package,
  Calculator,
  CreditCard,
  Users,
  Building2,
  Warehouse,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { SaleBillData, BillItem } from '../../features/bills/billsService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatCurrency } from '../../lib/utils';

interface CreateEnhancedSaleBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillCreated?: () => void;
}

interface Stock {
  id: number;
  name: string;
  code: string;
}

const CreateEnhancedSaleBillModal: React.FC<CreateEnhancedSaleBillModalProps> = ({ 
  open, 
  onOpenChange, 
  onBillCreated 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: customers = [] } = useSelector((state: RootState) => state.customers);
  const { items: products = [], loading: productsLoading } = useSelector((state: RootState) => state.inventory);
  const { delegates = [], loading: delegatesLoading } = useSelector((state: RootState) => state.delegates);
  const { employees = [], loading: employeesLoading } = useSelector((state: RootState) => state.employees);
  const { moneyBoxes = [] } = useSelector((state: RootState) => state.moneyBoxes);
  const { loading: { creating: creatingLoading }, error: { creating: creatingError } } = useSelector((state: RootState) => state.bills);
  
  // Debug logging
  useEffect(() => {
    console.log('Delegates state:', { delegates, delegatesLoading });
  }, [delegates, delegatesLoading]);
  
  useEffect(() => {
    console.log('Employees state:', { employees, employeesLoading });
  }, [employees, employeesLoading]);
  
  useEffect(() => {
    if (creatingError) {
      console.error('Bill creation error:', creatingError);
    }
  }, [creatingError]);
  
  // Check authentication state
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, user });
  }, [isAuthenticated, user]);
  
  // Local state for stocks
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [billData, setBillData] = useState<SaleBillData>({
    customer_id: 0,
    delegate_id: undefined,
    employee_id: undefined,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    discount: 0,
    discount_type: 'fixed',
    tax_rate: 0,
    paid_amount: 0,
    payment_method: 'cash',
    bill_type: 'retail',
    notes: '',
    installments: []
  });

  const [items, setItems] = useState<BillItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemStockId, setItemStockId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [selectedMoneyBox, setSelectedMoneyBox] = useState<any>(null);
  const [transactionNotes, setTransactionNotes] = useState('');

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      console.log('Modal opened, loading data...');
      dispatch(getCustomers({}));
      dispatch(getProducts({ limit: 100 }));
      dispatch(fetchDelegates({ page: 1, limit: 100 }));
      dispatch(fetchEmployees({ page: 1, limit: 100 }));
      dispatch(fetchAllMoneyBoxes());
      
      // Load stocks
      const loadStocks = async () => {
        try {
          const stocksData = await stocksService.getAllStocks();
          setStocks(stocksData);
        } catch (error) {
          console.error('Error loading stocks:', error);
        }
      };
      loadStocks();
    }
  }, [open, dispatch]);

  // Debug delegates and employees data
  useEffect(() => {
    console.log('Delegates state:', delegates);
    console.log('Employees state:', employees);
  }, [delegates, employees]);

  // Update price when bill type changes
  const updatePriceForBillType = () => {
    if (selectedProduct) {
      const price = billData.bill_type === 'wholesale' ? selectedProduct.wholesale_price : selectedProduct.selling_price;
      setItemPrice(price);
    }
  };

  useEffect(() => {
    updatePriceForBillType();
  }, [billData.bill_type, selectedProduct]);

  // Auto-suggest money box when paid amount is entered
  useEffect(() => {
    if (billData.paid_amount && billData.paid_amount > 0 && !selectedMoneyBox && moneyBoxes.length > 0) {
      // Auto-select the first available money box
      setSelectedMoneyBox(moneyBoxes[0]);
    }
  }, [billData.paid_amount, selectedMoneyBox, moneyBoxes]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = billData.discount_type === 'percentage' 
    ? (subtotal * billData.discount / 100) 
    : billData.discount;
  const taxAmount = (subtotal - discountAmount) * (billData.tax_rate || 0) / 100;
  const totalAmount = subtotal - discountAmount + taxAmount;
  const remainingAmount = totalAmount - (billData.paid_amount || 0);

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setSelectedProduct(product);
      const price = billData.bill_type === 'wholesale' ? product.wholesale_price : product.selling_price;
      setItemPrice(price);
      setItemQuantity(1);
      setItemDiscount(0);
      setItemStockId('');
      setSearchTerm('');
      setSelectedProductIndex(-1);
    }
  };

  // Add item to bill
  const handleAddItem = () => {
    if (!selectedProduct || itemQuantity <= 0 || itemPrice <= 0) {
      toast.error("يرجى التأكد من اختيار المنتج والكمية والسعر");
      return;
    }

    if (!itemStockId) {
      toast.error("يرجى اختيار المخزن للمنتج");
      return;
    }

    // Check if we already have this product from this stock in the bill
    const existingItemIndex = items.findIndex(item => 
      item.product_id === selectedProduct.id && item.stock_id === itemStockId
    );

    if (existingItemIndex !== -1) {
      toast.error("هذا المنتج موجود بالفعل في هذا المخزن في الفاتورة");
      return;
    }

    // Check stock availability (basic check - backend will do detailed validation)
    const currentStock = selectedProduct.current_stock || 0;
    if (itemQuantity > currentStock) {
      toast.error(`الكمية المطلوبة (${itemQuantity}) تتجاوز المخزون المتاح (${currentStock})`);
      return;
    }

    const newItem: BillItem = {
      product_id: selectedProduct.id,
      stock_id: parseInt(itemStockId.toString()),
      product_name: selectedProduct.name,
      product_sku: selectedProduct.sku,
      product_barcode: selectedProduct.barcode,
      product_unit: selectedProduct.unit,
      quantity: itemQuantity,
      price: itemPrice,
      discount: itemDiscount,
      discount_type: 'fixed',
      total: (itemPrice * itemQuantity) - itemDiscount,
      notes: ''
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemPrice(0);
    setItemDiscount(0);
    setItemStockId('');
  };

  // Remove item from bill
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    if (!billData.customer_id) {
      toast.error("يرجى اختيار العميل");
      return;
    }

    if (items.length === 0) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    // Validate that all items have stock IDs
    const itemsWithoutStock = items.filter(item => !item.stock_id);
    if (itemsWithoutStock.length > 0) {
      toast.error("جميع المنتجات يجب أن يكون لها مخزن محدد");
      return;
    }

    // Validate paid amount
    if (billData.paid_amount && billData.paid_amount > totalAmount) {
      toast.error("المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي");
      return;
    }

    // Validate money box selection for paid/partial payments
    if ((billData.paid_amount && billData.paid_amount > 0) && !selectedMoneyBox) {
      toast.error("يجب اختيار صندوق المال لإضافة المبلغ إليه");
      return;
    }

    console.log('Submitting bill data:', { billData, items });

    try {
      // Update bill data with money box and transaction notes
      const updatedBillData = {
        ...billData,
        moneyBoxId: selectedMoneyBox?.id?.toString() || null,
        transactionNotes: transactionNotes
      };

      const result = await dispatch(createSaleBill({ billData: updatedBillData, items }) as any);
      console.log('Bill creation result:', result);
      
      if (result.error) {
        toast.error(result.error.message || "حدث خطأ أثناء إنشاء فاتورة البيع");
        return;
      }
      
      toast.success("تم إنشاء فاتورة البيع بنجاح");
      handleClose();
      onBillCreated?.();
    } catch (error: any) {
      console.error('Bill creation error:', error);
      toast.error(error?.message || "حدث خطأ أثناء إنشاء فاتورة البيع");
    }
  };

  // Handle close modal
  const handleClose = () => {
    setBillData({
      customer_id: 0,
      delegate_id: undefined,
      employee_id: undefined,
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      discount: 0,
      discount_type: 'fixed',
      tax_rate: 0,
      paid_amount: 0,
      payment_method: 'cash',
      bill_type: 'retail',
      notes: '',
      installments: []
    });
    setItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
    setItemPrice(0);
    setItemDiscount(0);
    setItemStockId('');
    setSearchTerm('');
    setSelectedProductIndex(-1);
    setSelectedMoneyBox(null);
    setTransactionNotes('');
    onOpenChange(false);
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء فاتورة بيع جديدة
          </DialogTitle>
          <DialogDescription>
            قم بإنشاء فاتورة بيع جديدة مع اختيار العميل والمنتجات
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Bill Information */}
          <div className="space-y-6">
            {/* Customer and Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات العميل والمهنيين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="customer">العميل *</Label>
                  <Select 
                    value={billData.customer_id?.toString() || ''} 
                    onValueChange={(value) => setBillData({...billData, customer_id: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delegate Selection */}
                                  <div className="space-y-2">
                    <Label htmlFor="delegate">المندوب (اختياري)</Label>
                    <Select 
                      value={billData.delegate_id?.toString() || 'none'} 
                      onValueChange={(value) => setBillData({...billData, delegate_id: value === 'none' ? undefined : parseInt(value)})}
                      disabled={delegatesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={delegatesLoading ? "جاري التحميل..." : "اختر المندوب"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مندوب</SelectItem>
                        {delegates.map((delegate) => (
                          <SelectItem key={delegate.id} value={delegate.id.toString()}>
                            {delegate.name} - {delegate.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                {/* Employee Selection */}
                                  <div className="space-y-2">
                    <Label htmlFor="employee">الموظف المسؤول (اختياري)</Label>
                    <Select 
                      value={billData.employee_id?.toString() || 'none'} 
                      onValueChange={(value) => setBillData({...billData, employee_id: value === 'none' ? undefined : parseInt(value)})}
                      disabled={employeesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={employeesLoading ? "جاري التحميل..." : "اختر الموظف المسؤول"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون تحديد</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name} - {employee.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              </CardContent>
            </Card>

            {/* Bill Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تفاصيل الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">تاريخ الفاتورة</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={billData.invoice_date}
                      onChange={(e) => setBillData({...billData, invoice_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={billData.due_date || ''}
                      onChange={(e) => setBillData({...billData, due_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bill_type">نوع الفاتورة</Label>
                    <Select 
                      value={billData.bill_type} 
                      onValueChange={(value: 'retail' | 'wholesale') => setBillData({...billData, bill_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">تجزئة</SelectItem>
                        <SelectItem value="wholesale">جملة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Products and Totals */}
          <div className="space-y-6">
            {/* Add Product */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  إضافة منتج
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <Label htmlFor="product">المنتج</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="ابحث عن منتج..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchTerm && (
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {filteredProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className={`p-2 cursor-pointer hover:bg-gray-100 ${
                            selectedProductIndex === index ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => {
                            setSelectedProduct(product);
                            const price = billData.bill_type === 'wholesale' ? product.wholesale_price : product.selling_price;
                            setItemPrice(price);
                            setItemQuantity(1);
                            setItemDiscount(0);
                            setItemStockId(''); // Reset stock selection for new product
                            setSearchTerm('');
                            setSelectedProductIndex(-1);
                          }}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            {product.sku} - {product.barcode}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProduct && (
                  <>
                                        {/* Stock Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="stock" className="flex items-center gap-1">
                        المخزن
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={itemStockId?.toString() || ''} 
                        onValueChange={(value) => setItemStockId(value ? parseInt(value) : '')}
                      >
                        <SelectTrigger className={!itemStockId ? 'border-red-500' : ''}>
                          <SelectValue placeholder="اختر المخزن (مطلوب)" />
                        </SelectTrigger>
                        <SelectContent>
                          {stocks?.map((stock) => (
                            <SelectItem key={stock.id} value={stock.id.toString()}>
                              {stock.name} ({stock.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!itemStockId && (
                        <p className="text-sm text-red-500">يجب اختيار المخزن</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">الكمية</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">السعر</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discount">الخصم</Label>
                        <Input
                          id="discount"
                          type="number"
                          step="0.01"
                          value={itemDiscount}
                          onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleAddItem} 
                      className="w-full"
                      disabled={!itemStockId}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      {!itemStockId ? 'اختر المخزن أولاً' : 'إضافة المنتج'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Items List */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>المنتجات المضافة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-gray-600">
                            الكمية: {item.quantity} | السعر: {item.price} | 
                            المخزن: {stocks.find(s => s.id === item.stock_id)?.name || 'غير محدد'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.total}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bill Discount */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  خصم الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">قيمة الخصم</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={billData.discount || 0}
                      onChange={(e) => setBillData({
                        ...billData, 
                        discount: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">نوع الخصم</Label>
                    <Select 
                      value={billData.discount_type || 'fixed'} 
                      onValueChange={(value) => setBillData({
                        ...billData, 
                        discount_type: value as 'fixed' | 'percentage'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الخصم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                        <SelectItem value="percentage">نسبة مئوية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">نسبة الضريبة (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={billData.tax_rate || 0}
                      onChange={(e) => setBillData({
                        ...billData, 
                        tax_rate: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
                    <Input
                      id="paid_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={billData.paid_amount || 0}
                      onChange={(e) => setBillData({
                        ...billData, 
                        paid_amount: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">طريقة الدفع</Label>
                    <Select 
                      value={billData.payment_method || 'cash'} 
                      onValueChange={(value) => setBillData({
                        ...billData, 
                        payment_method: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Alert for required money box when paid amount is entered */}
                {(billData.paid_amount && billData.paid_amount > 0) && !selectedMoneyBox && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        مطلوب اختيار صندوق المال
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      يجب اختيار صندوق المال لإضافة المبلغ المدفوع ({formatCurrency(billData.paid_amount)}) إليه
                    </p>
                  </div>
                )}

                {/* Money Box Selection - Required for paid/partial payments */}
                <div className="space-y-2">
                  <Label htmlFor="money_box" className="flex items-center gap-1">
                    صندوق المال
                    {(billData.paid_amount && billData.paid_amount > 0) && (
                      <span className="text-red-500">*</span>
                    )}
                    <span className="text-sm text-gray-500">
                      {(billData.paid_amount && billData.paid_amount > 0) 
                        ? '(مطلوب لإضافة المبلغ المدفوع)' 
                        : '(اختياري - مطلوب عند إدخال مبلغ مدفوع)'}
                    </span>
                  </Label>
                  <Select
                    value={selectedMoneyBox?.id?.toString() || ''}
                    onValueChange={(value) => {
                      const moneyBox = moneyBoxes.find(mb => mb.id.toString() === value);
                      setSelectedMoneyBox(moneyBox || null);
                    }}
                    disabled={moneyBoxes.length === 0}
                  >
                    <SelectTrigger className={`w-full ${(billData.paid_amount && billData.paid_amount > 0) && !selectedMoneyBox ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={moneyBoxes.length === 0 ? "لا توجد صناديق مال متاحة" : "اختر صندوق المال لإضافة المبلغ إليه"} />
                    </SelectTrigger>
                    <SelectContent>
                      {moneyBoxes.length > 0 ? (
                        moneyBoxes.map((moneyBox) => (
                          <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{moneyBox.name}</span>
                              <span className="text-sm text-gray-500">
                                {formatCurrency(moneyBox.amount)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : null}
                    </SelectContent>
                  </Select>
                  {(billData.paid_amount && billData.paid_amount > 0) && !selectedMoneyBox && (
                    <p className="text-sm text-red-600 mt-1">يجب اختيار صندوق المال لإضافة المبلغ المدفوع إليه</p>
                  )}
                  {selectedMoneyBox && billData.paid_amount && billData.paid_amount > 0 && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded mt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>سيتم إضافة المبلغ إلى صندوق المال المحدد</span>
                      </div>
                      <div className="mt-1">
                        الرصيد الحالي: {formatCurrency(selectedMoneyBox.amount)} | 
                        الرصيد بعد الإضافة: {formatCurrency(selectedMoneyBox.amount + (billData.paid_amount || 0))}
                      </div>
                    </div>
                  )}
                  {selectedMoneyBox && (!billData.paid_amount || billData.paid_amount === 0) && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>الرصيد الحالي: {formatCurrency(selectedMoneyBox.amount)}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        سيتم إضافة المبلغ المدفوع عند إدخاله
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction Notes */}
                {selectedMoneyBox && (
                  <div className="space-y-2">
                    <Label htmlFor="transaction_notes">ملاحظات المعاملة</Label>
                    <Textarea
                      value={transactionNotes}
                      onChange={(e) => setTransactionNotes(e.target.value)}
                      placeholder="ملاحظات حول استلام المبلغ..."
                      rows={2}
                    />
                  </div>
                )}
                
                {/* Discount Summary */}
                {billData.discount && billData.discount > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-2">ملخص الخصم:</div>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span>{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>قيمة الخصم ({billData.discount_type === 'percentage' ? `${billData.discount}%` : 'مبلغ ثابت'}):</span>
                        <span>-{billData.discount_type === 'percentage' ? (subtotal * billData.discount / 100).toFixed(2) : billData.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>المجموع بعد الخصم:</span>
                        <span>{(subtotal - (billData.discount_type === 'percentage' ? (subtotal * billData.discount / 100) : billData.discount)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>الإجماليات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الخصم:</span>
                  <span>{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الضريبة:</span>
                  <span>{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>المبلغ المدفوع:</span>
                  <span>{(billData.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>المتبقي:</span>
                  <span>{remainingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>الإجمالي:</span>
                  <span>{totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea
            id="notes"
            value={billData.notes || ''}
            onChange={(e) => setBillData({...billData, notes: e.target.value})}
            placeholder="أضف ملاحظات للفاتورة..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={creatingLoading}>
            {creatingLoading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEnhancedSaleBillModal;
