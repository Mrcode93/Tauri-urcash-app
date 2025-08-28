import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../app/store';
import { createPurchaseBill } from '../../features/bills/billsSlice';
import { getSuppliers } from '../../features/suppliers/suppliersSlice';
import { getProducts } from '../../features/inventory/inventorySlice';
import { stocksService, Stock } from '../../features/stocks/stocksService';
import { fetchAllMoneyBoxes } from '../../features/moneyBoxes/moneyBoxesSlice';
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
import { Separator } from '../ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Plus, 
  Trash2, 
  Search,
  User,
  Package,
  Calculator,
  CreditCard,
  Warehouse,
  FileText,
  Calendar,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { PurchaseBillData, BillItem } from '../../features/bills/billsService';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CreatePurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillCreated?: () => void;
}

const CreatePurchaseInvoiceModal: React.FC<CreatePurchaseInvoiceModalProps> = ({ 
  open, 
  onOpenChange, 
  onBillCreated 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { suppliers = [] } = useSelector((state: RootState) => state.suppliers);
  const { items: products = [] } = useSelector((state: RootState) => state.inventory);
  const { moneyBoxes = [] } = useSelector((state: RootState) => state.moneyBoxes);
  const { loading: { creating: loading } } = useSelector((state: RootState) => state.bills);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      dispatch(getSuppliers());
      dispatch(getProducts({}));
      dispatch(fetchAllMoneyBoxes());
      
      // Load stocks using service
      const loadStocks = async () => {
        try {
          setStocksLoading(true);
          const stocksData = await stocksService.getAllStocks();
          setStocks(stocksData);
        } catch (error) {
          console.error('Error loading stocks:', error);
        } finally {
          setStocksLoading(false);
        }
      };
      
      loadStocks();
    }
  }, [open, dispatch]);

  const [billData, setBillData] = useState<PurchaseBillData>({
    supplier_id: 0,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    discount_amount: 0,
    tax_amount: 0,
    paid_amount: 0,
    payment_method: 'cash',
    payment_status: 'unpaid',
    notes: ''
  });

  const [items, setItems] = useState<BillItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemTax, setItemTax] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [selectedMoneyBox, setSelectedMoneyBox] = useState<any>(null);
  const [transactionNotes, setTransactionNotes] = useState('');

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.scientific_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 50); // Limit to 50 results for performance

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0) + (billData.discount_amount || 0);
  const totalTax = items.reduce((sum, item) => sum + ((item.price * item.quantity - (item.discount || 0)) * (item.tax_percent || 0) / 100), 0) + (billData.tax_amount || 0);
  const totalAmount = subtotal - totalDiscount + totalTax;
  const remainingAmount = totalAmount - (billData.paid_amount || 0);

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error("الرجاء اختيار المنتج");
      return;
    }

    if (!selectedStock) {
      toast.error("الرجاء اختيار المخزن");
      return;
    }

    if (itemQuantity <= 0) {
      toast.error("الكمية يجب أن تكون أكبر من صفر");
      return;
    }

    if (itemPrice <= 0) {
      toast.error("السعر يجب أن يكون أكبر من صفر");
      return;
    }

    const newItem: BillItem = {
      product_id: selectedProduct.id,
      stock_id: selectedStock.id,
      quantity: itemQuantity,
      price: itemPrice,
      discount: itemDiscount,
      tax_percent: itemTax,
      product_name: selectedProduct.name,
      product_sku: selectedProduct.sku,
      product_barcode: selectedProduct.barcode,
      product_unit: selectedProduct.unit,
      total: (itemQuantity * itemPrice) - itemDiscount + ((itemQuantity * itemPrice - itemDiscount) * itemTax / 100)
    };

    setItems([...items, newItem]);
    
    // Reset form
    setSelectedProduct(null);
    setSelectedStock(null);
    setItemQuantity(1);
    setItemPrice(0);
    setItemDiscount(0);
    setItemTax(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!billData.supplier_id) {
      toast.error("الرجاء اختيار المورد");
      return;
    }

    if (items.length === 0) {
      toast.error("الرجاء إضافة منتج واحد على الأقل");
      return;
    }

    // Validate money box selection for paid/partial payments
    if ((billData.payment_status === 'paid' || billData.payment_status === 'partial') && !selectedMoneyBox) {
      toast.error("يجب اختيار صندوق المال للمدفوعات");
      return;
    }

    // Check balance for paid/partial payments
    if (billData.payment_status === 'paid' || billData.payment_status === 'partial') {
      const amountToPay = billData.payment_status === 'paid' ? totalAmount : (billData.paid_amount || 0);
      
      if (selectedMoneyBox && selectedMoneyBox.amount < amountToPay) {
        toast.error(
          `الرصيد غير كافٍ في ${selectedMoneyBox.name}. المطلوب: ${amountToPay.toLocaleString('ar-IQ')} د.ع، المتوفر: ${selectedMoneyBox.amount?.toLocaleString('ar-IQ')} د.ع`,
          { duration: 5000 }
        );
        return;
      }
    }

    try {
      const purchaseBillData = {
        billData: billData,
        items: items,
        moneyBoxId: selectedMoneyBox?.id || null,
        transactionNotes: transactionNotes
      };

      await dispatch(createPurchaseBill(purchaseBillData)).unwrap();
      toast.success("تم إنشاء فاتورة الشراء بنجاح");
      onOpenChange(false);
      
      // Reset form
      setBillData({
        supplier_id: 0,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        discount_amount: 0,
        tax_amount: 0,
        paid_amount: 0,
        payment_method: 'cash',
        payment_status: 'unpaid',
        notes: ''
      });
      setItems([]);
      setInvoiceNumber('');
      setSelectedMoneyBox(null);
      setTransactionNotes('');
      
      if (onBillCreated) {
        onBillCreated();
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "حدث خطأ أثناء إنشاء فاتورة الشراء";
      toast.error(errorMessage);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      case 'unpaid': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Receipt className="w-8 h-8 text-blue-600" />
            إنشاء فاتورة شراء جديدة
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            قم بإدخال تفاصيل فاتورة الشراء الجديدة مع المنتجات والمخازن
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Basic Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-gray-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <FileText className="w-5 h-5 text-blue-600" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Supplier Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4 text-blue-600" />
                    اسم المورد *
                  </Label>
                  <Select
                    value={billData.supplier_id.toString()}
                    onValueChange={(value) => setBillData(prev => ({ ...prev, supplier_id: parseInt(value) }))}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-500">
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4 text-blue-600" />
                    رقم الفاتورة
                  </Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="أدخل رقم الفاتورة"
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>

                {/* Invoice Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    تاريخ الفاتورة *
                  </Label>
                  <Input
                    type="date"
                    value={billData.invoice_date}
                    onChange={(e) => setBillData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    تاريخ الاستحقاق
                  </Label>
                  <Input
                    type="date"
                    value={billData.due_date}
                    onChange={(e) => setBillData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="border-2 border-gray-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  معلومات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    طريقة الدفع *
                  </Label>
                  <Select
                    value={billData.payment_method}
                    onValueChange={(value) => setBillData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-green-500">
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    حالة الدفع *
                  </Label>
                  <Select
                    value={billData.payment_status}
                    onValueChange={(value) => setBillData(prev => ({ ...prev, payment_status: value }))}
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-green-500">
                      <SelectValue placeholder="اختر حالة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">غير مدفوع</SelectItem>
                      <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                      <SelectItem value="paid">مدفوع بالكامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Paid Amount */}
                {billData.payment_status !== 'unpaid' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      المبلغ المدفوع
                    </Label>
                    <Input
                      type="number"
                      value={billData.paid_amount}
                      onChange={(e) => setBillData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="border-2 border-gray-200 focus:border-green-500"
                    />
                  </div>
                )}

                {/* Money Box Selection */}
                {billData.payment_status !== 'unpaid' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <CreditCard className="w-4 h-4 text-green-600" />
                      صندوق المال المدفوع منه *
                    </Label>
                    <Select
                      value={selectedMoneyBox?.id?.toString() || ''}
                      onValueChange={(value) => {
                        const moneyBox = moneyBoxes.find(box => box.id.toString() === value);
                        setSelectedMoneyBox(moneyBox || null);
                      }}
                    >
                      <SelectTrigger className="border-2 border-gray-200 focus:border-green-500">
                        <SelectValue placeholder="اختر صندوق المال" />
                      </SelectTrigger>
                      <SelectContent>
                        {moneyBoxes.map((moneyBox) => (
                          <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                            {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString('ar-IQ')} د.ع
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Balance Indicator */}
                    {selectedMoneyBox && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 font-medium">الرصيد الحالي:</span>
                          <span className="text-blue-800 font-bold">
                            {selectedMoneyBox.amount?.toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                        {billData.payment_status === 'paid' && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-red-600 font-medium">المبلغ المطلوب:</span>
                            <span className="text-red-700 font-bold">
                              {totalAmount.toLocaleString('ar-IQ')} د.ع
                            </span>
                          </div>
                        )}
                        {billData.payment_status === 'partial' && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-orange-600 font-medium">المبلغ المدفوع:</span>
                            <span className="text-orange-700 font-bold">
                              {(billData.paid_amount || 0).toLocaleString('ar-IQ')} د.ع
                            </span>
                          </div>
                        )}
                        {selectedMoneyBox.amount < (billData.payment_status === 'paid' ? totalAmount : (billData.paid_amount || 0)) && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">
                            ⚠️ الرصيد غير كافٍ لإتمام هذه المعاملة
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction Notes */}
                {billData.payment_status !== 'unpaid' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Edit3 className="w-4 h-4 text-green-600" />
                      ملاحظات المعاملة
                    </Label>
                    <Textarea
                      value={transactionNotes}
                      onChange={(e) => setTransactionNotes(e.target.value)}
                      placeholder="أدخل ملاحظات المعاملة المالية..."
                      className="border-2 border-gray-200 focus:border-green-500 min-h-[80px]"
                    />
                  </div>
                )}

                {/* Payment Status Badge */}
                <div className="flex items-center gap-2">
                  <Badge className={`${getPaymentStatusColor(billData.payment_status)} flex items-center gap-1`}>
                    {getPaymentStatusIcon(billData.payment_status)}
                    {billData.payment_status === 'paid' && 'مدفوع'}
                    {billData.payment_status === 'partial' && 'مدفوع جزئياً'}
                    {billData.payment_status === 'unpaid' && 'غير مدفوع'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-2 border-gray-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Textarea
                  value={billData.notes}
                  onChange={(e) => setBillData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  className="border-2 border-gray-200 focus:border-purple-500 min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Products and Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Product Section */}
            <Card className="border-2 border-gray-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Package className="w-5 h-5 text-orange-600" />
                  إضافة المنتجات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Product Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Package className="w-4 h-4 text-orange-600" />
                      المنتج *
                    </Label>
                    <Select
                      value={selectedProduct?.id?.toString() || ''}
                      onValueChange={(value) => {
                        const product = products.find(p => p.id.toString() === value);
                        setSelectedProduct(product);
                        if (product) {
                          setItemPrice(product.purchase_price || 0);
                          setSearchTerm(''); // Clear search when product is selected
                        }
                      }}
                    >
                      <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Search Input */}
                        <div className="flex items-center px-3 py-2 border-b">
                          <Search className="w-4 h-4 text-gray-400 mr-2" />
                          <Input
                            placeholder="البحث في المنتجات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-0 focus:ring-0 focus:border-0 p-0 h-8 text-sm"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        {/* Search Results Count */}
                        {searchTerm && (
                          <div className="px-3 py-1 text-xs text-gray-500 border-b">
                            {filteredProducts.length} منتج مطابق
                          </div>
                        )}
                        
                        {/* Filtered Products */}
                        {filteredProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-gray-500">
                                  {product.sku && `SKU: ${product.sku}`}
                                  {product.barcode && product.sku && ' • '}
                                  {product.barcode && `Barcode: ${product.barcode}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        
                        {/* No Results */}
                        {filteredProducts.length === 0 && searchTerm && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            لا توجد منتجات تطابق البحث
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Warehouse className="w-4 h-4 text-orange-600" />
                      المخزن *
                    </Label>
                    <Select
                      value={selectedStock?.id?.toString() || ''}
                      onValueChange={(value) => {
                        const stock = stocks.find(s => s.id.toString() === value);
                        setSelectedStock(stock);
                      }}
                    >
                      <SelectTrigger className="border-2 border-gray-200 focus:border-orange-500">
                        <SelectValue placeholder="اختر المخزن" />
                      </SelectTrigger>
                      <SelectContent>
                        {stocks.map((stock) => (
                          <SelectItem key={stock.id} value={stock.id.toString()}>
                            {stock.name} {stock.is_main_stock ? '(المخزن الرئيسي)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Calculator className="w-4 h-4 text-orange-600" />
                      الكمية *
                    </Label>
                    <Input
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      className="border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                      السعر *
                    </Label>
                    <Input
                      type="number"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Calculator className="w-4 h-4 text-orange-600" />
                      الخصم
                    </Label>
                    <Input
                      type="number"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>

                  {/* Tax */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Calculator className="w-4 h-4 text-orange-600" />
                      الضريبة %
                    </Label>
                    <Input
                      type="number"
                      value={itemTax}
                      onChange={(e) => setItemTax(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      className="border-2 border-gray-200 focus:border-orange-500"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddItem}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة المنتج
                </Button>
              </CardContent>
            </Card>

            {/* Products Table */}
            {items.length > 0 && (
              <Card className="border-2 border-gray-100 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <Package className="w-5 h-5 text-blue-600" />
                    المنتجات المضافة ({items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">المنتج</TableHead>
                        <TableHead className="font-semibold text-gray-700">الكمية</TableHead>
                        <TableHead className="font-semibold text-gray-700">السعر</TableHead>
                        <TableHead className="font-semibold text-gray-700">الخصم</TableHead>
                        <TableHead className="font-semibold text-gray-700">الضريبة</TableHead>
                        <TableHead className="font-semibold text-gray-700">الإجمالي</TableHead>
                        <TableHead className="font-semibold text-gray-700">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.price?.toFixed(2)}</TableCell>
                          <TableCell>{item.discount?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{item.tax_percent?.toFixed(2) || '0.00'}%</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {item.total?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card className="border-2 border-gray-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Calculator className="w-5 h-5 text-green-600" />
                  ملخص الفاتورة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">المجموع الفرعي:</span>
                    <span className="font-semibold">{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">إجمالي الخصم:</span>
                    <span className="font-semibold text-red-600">-{totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">إجمالي الضريبة:</span>
                    <span className="font-semibold text-blue-600">+{totalTax.toFixed(2)}</span>
                  </div>
                  <Separator className="col-span-2" />
                  <div className="flex justify-between col-span-2">
                    <span className="text-lg font-bold text-gray-800">المجموع الكلي:</span>
                    <span className="text-lg font-bold text-green-600">{totalAmount.toFixed(2)}</span>
                  </div>
                  {billData.payment_status !== 'unpaid' && (
                    <>
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-600">المبلغ المدفوع:</span>
                        <span className="font-semibold text-green-600">-{(billData.paid_amount || 0).toFixed(2)}</span>
                      </div>
                      <Separator className="col-span-2" />
                      <div className="flex justify-between col-span-2">
                        <span className="text-lg font-bold text-gray-800">المبلغ المتبقي:</span>
                        <span className="text-lg font-bold text-orange-600">{remainingAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-gray-300 hover:border-gray-400"
          >
            <X className="w-4 h-4 mr-2" />
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePurchaseInvoiceModal;
