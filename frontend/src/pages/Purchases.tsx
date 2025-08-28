import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '@/app/store';
import { 
  getPurchases, 
  getPurchase,
  updatePurchase, 
  deletePurchase, 
  createPurchase, 
  setSelectedPurchase, 
  returnPurchase 
} from '@/features/purchases/purchasesSlice';
import { getSuppliers } from '@/features/suppliers/suppliersSlice';
import { getProducts } from '@/features/inventory/inventorySlice';
import { fetchAllMoneyBoxes } from '@/features/moneyBoxes/moneyBoxesSlice';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  DollarSign,
  RotateCcw,
  FileText,
  CreditCard,
  ArrowLeftRight,
  Pencil,
  Keyboard,
  Printer,
  MoreVertical,
  Warehouse,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,  
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Purchase, CreatePurchaseData } from '@/features/purchases/purchasesService';
import { Product } from '@/features/inventory/inventoryService';
import { useFormNavigation } from '@/hooks/useFormNavigation';
import { usePrintBill } from '@/hooks/usePrintBill';
import { printPurchaseWithPreview, quickPrintPurchase } from '@/utils/printPurchaseUtils';
import { useSettings } from '@/features/settings/useSettings';
import ProductSearchSelect from '@/components/ProductSearchSelect';
import { PurchaseReturnForm } from '@/components/PurchaseReturnForm';
import AddProductModal from '@/components/AddProductModal';
import { stocksService, Stock } from '@/features/stocks/stocksService';

interface CreatePurchaseFormData {
  supplier_id: number;
  invoice_no?: string;
  invoice_date: string;
  due_date: string;
  items: {
    product_id: number;
    stock_id: number; // Required stock selection
    quantity: number;
    price: number;
    discount_percent: number;
    tax_percent: number;
  }[];
  payment_method: 'cash' | 'card' | 'bank_transfer';
  payment_status: 'paid' | 'unpaid' | 'partial';
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially_returned';
  notes: string;
  paid_amount?: number;
  moneyBoxId?: string; // New field for money box selection
}

interface PurchaseFormProps {
  onSubmit: (data: CreatePurchaseFormData) => void;
  formData: CreatePurchaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreatePurchaseFormData>>;
  suppliers: Array<{ id: number; name: string }>;
  products: Product[];
  moneyBoxes: Array<{ id: number; name: string; amount: number }>;
  isEdit?: boolean;
  onProductCreated?: (product: Product) => void;
  isCreatingPurchase?: boolean;
}

const PurchaseForm = ({ onSubmit, formData, setFormData, suppliers, products, moneyBoxes, isEdit = false, onProductCreated, isLoading = false }: PurchaseFormProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [itemTax, setItemTax] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [newlyCreatedProducts, setNewlyCreatedProducts] = useState<Product[]>([]);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  // Define field order for navigation
  const fieldOrder = [
    'supplier_id',
    'invoice_no',
    'invoice_date',
    'due_date',
    'payment_method',
    'payment_status',
    'paid_amount',
    'status',
    'product_id',
    'quantity',
    'price',
    'discount',
    'tax',
    'notes'
  ];

  const { setInputRef, handleKeyDown, focusFirstField } = useFormNavigation({
    fieldOrder,
    skipFields: ['supplier_id', 'payment_method', 'payment_status', 'status', 'product_id'], // Skip select fields
    onSubmit: () => {
      // Trigger form submission when Enter is pressed on last field
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }
  });

  // Auto-focus first field when modal opens - only if no field is currently focused
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement.tagName === 'BODY') {
        focusFirstField();
      }
    }, 200); // Increased delay to ensure modal is fully open
    return () => clearTimeout(timer);
  }, [focusFirstField]);

  // Load stocks
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

  // Load stocks on component mount
  useEffect(() => {
    loadStocks();
  }, []);

  // Handle product creation from AddProductModal
  const handleProductCreated = (newProduct: Product) => {
    // Add to newly created products list
    setNewlyCreatedProducts(prev => [...prev, newProduct]);
    // Auto-select the new product
    setSelectedProduct(newProduct);
    setItemPrice(newProduct.purchase_price || 0);
    // Call parent callback if provided
    if (onProductCreated) {
      onProductCreated(newProduct);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error("الرجاء اختيار المنتج");
      return;
    }

    if (!selectedStock) {
      toast.error("الرجاء اختيار المخزن");
      return;
    }

    if (!itemQuantity || itemQuantity <= 0) {
      toast.error("الرجاء إدخال الكمية");
      return;
    }

    const price = itemPrice || selectedProduct.purchase_price || 0;

    const newItem = {
      product_id: selectedProduct.id,
      stock_id: selectedStock.id,
      quantity: itemQuantity,
      price: price,
      discount_percent: itemDiscount || 0,
      tax_percent: itemTax || 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset item form
    setSelectedProduct(null);
    setSelectedStock(null);
    setItemQuantity(1);
    setItemPrice(0);
    setItemDiscount(0);
    setItemTax(0);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateItemTotal = (item: {
    product_id: number;
    quantity: number;
    price: number;
    discount_percent?: number;
    tax_percent?: number;
  }) => {
    const subtotal = item.quantity * item.price;
    const discount = subtotal * ((item.discount_percent || 0) / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * ((item.tax_percent || 0) / 100);
    return afterDiscount + tax;
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((total, item) => {
      return total + calculateItemTotal(item);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if already creating
    if (isCreatingPurchase) {
      toast.error("جاري إنشاء عملية الشراء، يرجى الانتظار...");
      return;
    }
    
    // Validate money box selection for paid/partial payments
    if ((formData.payment_status === 'paid' || formData.payment_status === 'partial') && !formData.moneyBoxId) {
      toast.error("يجب اختيار صندوق المال للمدفوعات");
      return;
    }
    
    // Check balance for paid/partial payments
    if (formData.payment_status === 'paid' || formData.payment_status === 'partial') {
      const amountToPay = formData.payment_status === 'paid' ? calculateTotalAmount() : (formData.paid_amount || 0);
      
      if (formData.moneyBoxId && formData.moneyBoxId !== 'cash_box') {
        const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId);
        if (selectedMoneyBox && selectedMoneyBox.amount < amountToPay) {
          toast.error(
            `الرصيد غير كافٍ في ${selectedMoneyBox.name}. المطلوب: ${formatCurrency(amountToPay)}، المتوفر: ${formatCurrency(selectedMoneyBox.amount)}`,
            { duration: 5000 }
          );
          return;
        }
      }
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">المعلومات الأساسية</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              المورد
            </Label>
            <Select
              value={formData.supplier_id.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: parseInt(value) }))}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              رقم الفاتورة
            </Label>
            <Input
              type="text"
              value={formData.invoice_no || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
              onKeyDown={handleKeyDown('invoice_no')}
              ref={setInputRef('invoice_no')}
              placeholder="أدخل رقم الفاتورة"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              تاريخ الفاتورة
            </Label>
            <Input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
              onKeyDown={handleKeyDown('invoice_date')}
              ref={setInputRef('invoice_date')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              تاريخ الاستحقاق
            </Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              onKeyDown={handleKeyDown('due_date')}
              ref={setInputRef('due_date')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              طريقة الدفع
            </Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value: 'cash' | 'card' | 'bank_transfer') => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              حالة الدفع
            </Label>
            <Select
              value={formData.payment_status}
              onValueChange={(value: 'paid' | 'unpaid' | 'partial') => setFormData(prev => ({ ...prev, payment_status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                <SelectItem value="unpaid">غير مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_status === 'partial' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                المبلغ المدفوع
              </Label>
              <Input
                type="number"
                value={formData.paid_amount || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: Number(e.target.value) }))}
                onKeyDown={handleKeyDown('paid_amount')}
                ref={setInputRef('paid_amount')}
                min="0"
                max={calculateTotalAmount()}
                step="0.01"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                الحد الأقصى: {formatCurrency(calculateTotalAmount())}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              صندوق المال
            </Label>
            <Select
              value={formData.moneyBoxId || ""}
              onValueChange={(value) => setFormData(prev => ({ ...prev, moneyBoxId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر صندوق المال" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_box">صندوق النقد</SelectItem>
                {moneyBoxes.map((moneyBox) => (
                  <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                    {moneyBox.name} - {formatCurrency(moneyBox.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.moneyBoxId && formData.moneyBoxId !== 'cash_box' && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  الرصيد المتوفر: {formatCurrency(moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0)}
                </p>
                {(formData.paid_amount && formData.paid_amount > 0) || formData.payment_status === 'paid' ? (
                  <p className={`text-sm ${(formData.payment_status === 'paid' ? calculateTotalAmount() : (formData.paid_amount || 0)) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) ? 'text-red-600' : 'text-green-600'}`}>
                    {(formData.payment_status === 'paid' ? calculateTotalAmount() : (formData.paid_amount || 0)) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) 
                      ? '⚠️ الرصيد غير كافٍ' 
                      : '✅ الرصيد كافٍ'}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              حالة الطلب
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'completed' | 'pending' | 'cancelled') => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">المنتجات</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                المنتج
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddProductModalOpen(true)}
                className="gap-1 text-xs text-green-600 border-green-200 hover:bg-green-50"
              >
                <Plus className="w-3 h-3" />
                إضافة منتج
              </Button>
            </div>
            <ProductSearchSelect
              products={[...products, ...newlyCreatedProducts]}
              onProductSelect={(product) => {
                setSelectedProduct(product);
                setItemPrice(product.purchase_price || 0);
              }}
              placeholder="ابحث عن المنتج بالاسم، SKU، أو الباركود..."
              className="w-full"
              supplierId={formData.supplier_id || undefined}
              purchasePrice={itemPrice}
              showAddNew={false}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              المخزن *
            </Label>
            <Select
              value={selectedStock?.id?.toString() || ''}
              onValueChange={(value) => {
                const stock = stocks.find(s => s.id.toString() === value);
                setSelectedStock(stock || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent>
                {stocksLoading ? (
                  <SelectItem value="loading" disabled>
                    جاري التحميل...
                  </SelectItem>
                ) : stocks.length === 0 ? (
                  <SelectItem value="no-stocks" disabled>
                    لا توجد مخازن متاحة
                  </SelectItem>
                ) : (
                  stocks.map((stock) => (
                    <SelectItem key={stock.id} value={stock.id.toString()}>
                      {stock.name} {stock.is_main_stock ? '(المخزن الرئيسي)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              الكمية
            </Label>
            <Input
              type="number"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(Number(e.target.value))}
              onKeyDown={handleKeyDown('quantity')}
              ref={setInputRef('quantity')}
              min="1"
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              السعر
            </Label>
            <Input
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(Number(e.target.value))}
              onKeyDown={handleKeyDown('price')}
              ref={setInputRef('price')}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              الخصم (%)
            </Label>
            <Input
              type="number"
              value={itemDiscount}
              onChange={(e) => setItemDiscount(Number(e.target.value))}
              onKeyDown={handleKeyDown('discount')}
              ref={setInputRef('discount')}
              min="0"
              max="100"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              الضريبة (%)
            </Label>
            <Input
              type="number"
              value={itemTax}
              onChange={(e) => setItemTax(Number(e.target.value))}
              onKeyDown={handleKeyDown('tax')}
              ref={setInputRef('tax')}
              min="0"
              max="100"
              placeholder="0"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={handleAddItem} className="w-full">
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Items Table */}
        {formData.items.length > 0 && (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الخصم</TableHead>
                  <TableHead>الضريبة</TableHead>
                  <TableHead>المجموع</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, index) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <TableRow key={index}>
                      <TableCell>{product?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>{item.discount_percent}%</TableCell>
                      <TableCell>{item.tax_percent}%</TableCell>
                      <TableCell>{formatCurrency(calculateItemTotal(item))}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 text-right">
              <p className="text-lg font-semibold">
                المجموع الكلي: {formatCurrency(calculateTotalAmount())}
              </p>
              
              {/* Payment Summary */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">ملخص الدفع</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المجموع الكلي:</span>
                    <span className="font-medium">{formatCurrency(calculateTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ المدفوع:</span>
                    <span className="font-medium text-green-600">
                      {formData.payment_status === 'paid' 
                        ? formatCurrency(calculateTotalAmount())
                        : formData.payment_status === 'partial'
                        ? formatCurrency(formData.paid_amount || 0)
                        : formatCurrency(0)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-medium text-orange-600">
                      {formData.payment_status === 'paid' 
                        ? formatCurrency(0)
                        : formData.payment_status === 'partial'
                        ? formatCurrency(Math.max(0, calculateTotalAmount() - (formData.paid_amount || 0)))
                        : formatCurrency(calculateTotalAmount())
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          ملاحظات
        </Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          onKeyDown={handleKeyDown('notes')}
          ref={setInputRef('notes')}
          rows={3}
          placeholder="أدخل أي ملاحظات إضافية"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              supplier_id: 0,
              invoice_no: "",
              invoice_date: new Date().toISOString().split('T')[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              payment_method: "cash",
              payment_status: "unpaid",
              status: "completed",
              notes: "",
              items: [],
              paid_amount: 0
            });
            // Reset newly created products
            setNewlyCreatedProducts([]);
            setSelectedProduct(null);
            setItemQuantity(1);
            setItemPrice(0);
            setItemDiscount(0);
            setItemTax(0);
          }}
        >
          إعادة تعيين
        </Button>
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary"
          disabled={isCreatingPurchase}
        >
          {isCreatingPurchase ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            isEdit ? 'تحديث المشتريات' : 'إضافة المشتريات'
          )}
        </Button>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        open={isAddProductModalOpen}
        onOpenChange={setIsAddProductModalOpen}
        onSuccess={(product) => {
          if (product) {
            handleProductCreated(product);
          }
          // Also trigger parent refresh
          if (onProductCreated) {
            onProductCreated(product || {} as Product);
          }
        }}
      />
    </form>
  );
};

const Purchases = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { purchases = [], isLoading, error } = useSelector((state: RootState) => {
    const purchasesState = state.purchases;
    return {
      purchases: Array.isArray(purchasesState.purchases) ? purchasesState.purchases : [],
      isLoading: purchasesState.isLoading,
      error: purchasesState.error,
    };
  });
  const { suppliers = [] } = useSelector((state: RootState) => state.suppliers);
  const { items: products = [] } = useSelector((state: RootState) => state.inventory);
  const { moneyBoxes = [] } = useSelector((state: RootState) => state.moneyBoxes);
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Check if current user is admin or has delete permissions
  const isAdmin = user?.role === 'admin';
  const canDelete = user?.role === 'admin' || user?.role === 'manager'; // Add more roles as needed
  
  // Debug: Log user information (can be removed after testing)
  // 
  // 
  // 
  // 
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [filterReturns, setFilterReturns] = useState('all');
  
  // Modal states
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseFormData>({
    supplier_id: 0,
    invoice_no: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    payment_method: "cash" as const,
    payment_status: "unpaid" as const,
    status: "completed",
    notes: "",
  });
  const [createFormData, setCreateFormData] = useState<CreatePurchaseFormData>({
    supplier_id: 0,
    invoice_no: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_method: "cash",
    payment_status: "unpaid",
    status: "completed",
    notes: "",
    items: [],
    paid_amount: 0,
    moneyBoxId: ""
  });

  // Get settings for printing
  const { settings } = useSettings();

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(getPurchases()),
          dispatch(getSuppliers()),
          dispatch(getProducts({ page: 1, limit: 50 })),
          dispatch(fetchAllMoneyBoxes())
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب البيانات");
      }
    };
    fetchData();
  }, [dispatch]);

  // Filter purchases based on search term and filters
  const filteredPurchases = purchases.filter(purchase => {
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    const supplierName = supplier?.name || 'مورد محذوف';
    
    const matchesSearch = (purchase.invoice_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || purchase.payment_status === filterStatus;
    
    const matchesDate = !dateFilter || (purchase.invoice_date?.startsWith(dateFilter) || false);
    
    const matchesReturns = filterReturns === 'all' || 
                          (filterReturns === 'returned' && purchase.status === 'returned') ||
                          (filterReturns === 'partially_returned' && purchase.status === 'partially_returned') ||
                          (filterReturns === 'no_returns' && purchase.status !== 'returned' && purchase.status !== 'partially_returned');
    
    return matchesSearch && matchesStatus && matchesDate && matchesReturns;
  });

  const handleRowClick = (purchase: Purchase) => {
    navigate(`/purchases/${purchase.id}`);
  };

  const handleEdit = (e: React.MouseEvent, purchase: Purchase) => {
    e.stopPropagation();
    setSelectedPurchase(purchase);
    setFormData({
      supplier_id: purchase.supplier_id,
      invoice_no: purchase.invoice_no || '',
      invoice_date: purchase.invoice_date,
      due_date: purchase.due_date,
      items: purchase.items?.map(item => ({
        product_id: item.product_id,
        stock_id: item.stock_id || 1, // Default to main stock if not specified
        quantity: item.quantity,
        price: item.price,
        discount_percent: item.discount_percent,
        tax_percent: item.tax_percent
      })) || [],
      payment_method: purchase.payment_method as 'cash' | 'card' | 'bank_transfer',
      payment_status: purchase.payment_status,
      status: purchase.status,
      notes: purchase.notes || '',
      paid_amount: purchase.paid_amount || 0,
      moneyBoxId: purchase.money_box_id || "",
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (data: CreatePurchaseFormData) => {
    if (!data.supplier_id) {
      toast.error("الرجاء اختيار المورد");
      return;
    }

    if (data.items.length === 0) {
      toast.error("الرجاء إضافة منتج واحد على الأقل");
      return;
    }

    setIsCreatingPurchase(true);

    try {
      // Calculate total amount from items
      const totalAmount = data.items.reduce((total, item) => {
        const subtotal = item.quantity * item.price;
        const discount = subtotal * ((item.discount_percent || 0) / 100);
        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * ((item.tax_percent || 0) / 100);
        return total + afterDiscount + tax;
      }, 0);

      // Set paid amount based on payment status
      let paidAmount = 0;
      if (data.payment_status === 'paid') {
        paidAmount = totalAmount;
      } else if (data.payment_status === 'partial') {
        paidAmount = data.paid_amount || 0;
      }

      // Format items data
      const formattedItems = data.items.map(item => ({
        product_id: item.product_id,
        stock_id: item.stock_id,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount_percent: Number(item.discount_percent || 0),
        tax_percent: Number(item.tax_percent || 0)
      }));

      const purchaseData: CreatePurchaseData = {
        supplier_id: data.supplier_id,
        invoice_no: data.invoice_no,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        items: formattedItems,
        payment_method: data.payment_method,
        payment_status: data.payment_status,
        status: data.status,
        notes: data.notes,
        paid_amount: paidAmount,
        moneyBoxId: data.moneyBoxId
      };

      await dispatch(createPurchase(purchaseData)).unwrap();
      toast.success("تم إنشاء عملية الشراء بنجاح");
      setIsCreateModalOpen(false);
      setCreateFormData({
        supplier_id: 0,
        invoice_no: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: "cash",
        payment_status: "unpaid",
        status: "completed",
        notes: "",
        items: [],
        paid_amount: 0
      });
      // Refresh products list to include newly created products
      dispatch(getProducts({ page: 1, limit: 50 }));
    } catch (error: any) {
      // Display Arabic error message from backend
      const errorMessage = error?.message || error?.toString() || "حدث خطأ أثناء إنشاء عملية الشراء";
      toast.error(errorMessage);
      console.error('Error creating purchase:', error);
    } finally {
      setIsCreatingPurchase(false);
    }
  };

  const handleEditSubmit = async (data: CreatePurchaseFormData) => {
    if (!selectedPurchase) return;

    try {
      // Calculate total amount from items
      const totalAmount = data.items.reduce((total, item) => {
        const subtotal = item.quantity * item.price;
        const discount = subtotal * ((item.discount_percent || 0) / 100);
        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * ((item.tax_percent || 0) / 100);
        return total + afterDiscount + tax;
      }, 0);

      // Set paid amount based on payment status
      let paidAmount = 0;
      if (data.payment_status === 'paid') {
        paidAmount = totalAmount;
      } else if (data.payment_status === 'partial') {
        paidAmount = data.paid_amount || 0;
      }

      await dispatch(updatePurchase({
        id: selectedPurchase.id,
        data: {
          supplier_id: data.supplier_id,
          invoice_no: data.invoice_no,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          items: data.items,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          status: data.status,
          notes: data.notes,
          paid_amount: paidAmount,
          moneyBoxId: data.moneyBoxId
        }
      })).unwrap();

      toast.success("تم تحديث بيانات المشتريات بنجاح");
      setIsEditModalOpen(false);
    } catch (error: any) {
      // Display Arabic error message from backend
      const errorMessage = error?.message || error?.toString() || "حدث خطأ أثناء تحديث المشتريات";
      toast.error(errorMessage);
      console.error('Error updating purchase:', error);
    }
  };

  const handleDelete = (e: React.MouseEvent, purchase: Purchase) => {
    e.stopPropagation();
    
    setSelectedPurchase(purchase);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPurchase) {
      toast.error("لم يتم تحديد مشتريات للحذف");
      return;
    }
    
    try {
      await dispatch(deletePurchase(selectedPurchase.id)).unwrap();
      
      toast.success("تم حذف المشتريات بنجاح");
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      // Display Arabic error message from backend
      const errorMessage = error?.message || error?.toString() || "حدث خطأ أثناء حذف المشتريات";
      toast.error(errorMessage);
      console.error('Error deleting purchase:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50";
      case "unpaid":
        return "text-red-600 bg-red-50";
      case "partial":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cash":
        return "نقدي";
      case "card":
        return "بطاقة";
      case "bank_transfer":
        return "تحويل بنكي";
      default:
        return method;
    }
  };

  // Filter suppliers based on search query
  const filteredSuppliers = Array.isArray(suppliers) ? suppliers : [];

  // Ensure data validation before accessing properties
  const validSales = purchases.filter((sale) => sale && sale.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-w-full mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8" />
            إدارة المشتريات
          </h1>
          <p className="text-gray-600 mt-1">
            عرض وإدارة جميع عمليات الشراء
          </p>
          {/* Debug: Show user role (can be removed after testing) */}
          {/* <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
            <strong>Debug Info:</strong> User Role: {user?.role || 'No role'} | isAdmin: {isAdmin ? 'true' : 'false'} | canDelete: {canDelete ? 'true' : 'false'}
          </div> */}
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            className="gap-2"
            onClick={() => navigate('/bills')}
          >
            <Plus className="w-4 h-4" />
            عملية شراء جديدة
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="البحث برقم الفاتورة أو اسم المورد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">حالة الدفع</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">جميع الحالات</option>
                <option value="paid">مدفوع</option>
                <option value="partial">مدفوع جزئياً</option>
                <option value="unpaid">غير مدفوع</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returns-filter">المرتجعات</Label>
              <select
                id="returns-filter"
                value={filterReturns}
                onChange={(e) => setFilterReturns(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">جميع المشتريات</option>
                <option value="returned">مرجع كلياً</option>
                <option value="partially_returned">مرجع جزئياً</option>
                <option value="no_returns">بدون مرتجعات</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-filter">التاريخ</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterReturns('all');
                  setDateFilter('');
                }}
                className="w-full"
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المشتريات</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المشتريات المدفوعة</p>
                <p className="text-2xl font-bold text-green-600">
                  {purchases.filter(p => p.payment_status === 'paid').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المشتريات المعلقة</p>
                <p className="text-2xl font-bold text-orange-600">
                  {purchases.filter(p => p.payment_status === 'partial').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المرتجعات</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    {purchases.filter(p => p.status === 'returned' || p.status === 'partially_returned').length}
                  </p>
                  <p className="text-xs text-gray-500">
                    {purchases.filter(p => p.status === 'returned').length} مرجع كلي
                  </p>
                </div>
              </div>
              <RotateCcw className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(purchases.reduce((sum, purchase) => sum + (Number(purchase.net_amount) || 0), 0))}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
            <Package className="w-7 h-7 text-blue-600" />
            قائمة المشتريات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">رقم الفاتورة</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">المورد</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">تاريخ الفاتورة</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">تاريخ الاستحقاق</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">المبلغ الإجمالي</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">المبلغ المدفوع</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">المبلغ المتبقي</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">طريقة الدفع</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">حالة الدفع</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">الحالة</th>
                  <th className="text-right p-4 text-base font-semibold text-gray-700">الإرجاعات</th>
                  <th className="text-center p-4 text-base font-semibold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className={`border-b border-gray-100 transition-colors duration-200 ${
                    purchase.status === 'returned' ? 
                      'bg-red-50 hover:bg-red-100 border-red-200' :
                      purchase.status === 'partially_returned' ?
                      'bg-orange-50 hover:bg-orange-100 border-orange-200' :
                      'hover:bg-blue-50'
                  }`}>
                    <td className="p-4 font-mono text-base font-medium text-blue-600">#{purchase.invoice_no}</td>
                    <td className="p-4 text-base font-medium text-gray-800">
                      {suppliers.find(s => s.id === purchase.supplier_id)?.name || 'مورد محذوف'}
                    </td>
                    <td className="p-4 text-base text-gray-700">{formatDate(purchase.invoice_date || '')}</td>
                    <td className="p-4 text-base text-gray-700">{formatDate(purchase.due_date || '')}</td>
                    <td className="p-4 text-base font-semibold text-green-600">{formatCurrency(Number(purchase.net_amount) || 0)}</td>
                    <td className="p-4 text-base font-semibold text-blue-600">{formatCurrency(Number(purchase.paid_amount) || 0)}</td>
                    <td className="p-4 text-base font-semibold text-orange-600">{formatCurrency(Number(purchase.remaining_amount) || 0)}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                        {purchase.payment_method === 'cash' ? 'نقدي' :
                         purchase.payment_method === 'card' ? 'بطاقة' : 'تحويل بنكي'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={
                          purchase.payment_status === 'paid' ? 'default' :
                          purchase.payment_status === 'partial' ? 'secondary' : 'destructive'
                        }
                        className="text-sm font-medium px-3 py-1"
                      >
                        {purchase.payment_status === 'paid' ? 'مدفوع' :
                         purchase.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={
                          purchase.status === 'returned' ? 'destructive' :
                          purchase.status === 'partially_returned' ? 'secondary' :
                          purchase.status === 'completed' ? 'default' : 'secondary'
                        }
                        className={`text-sm font-medium px-3 py-1 ${
                          purchase.status === 'returned' ? 'bg-red-100 text-red-800 border-red-200' :
                          purchase.status === 'partially_returned' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''
                        }`}
                      >
                        {purchase.status === 'returned' ? 'مُرجع بالكامل' :
                         purchase.status === 'partially_returned' ? 'مُرجع جزئياً' :
                         purchase.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {purchase.return_count > 0 ? (
                        <div className="space-y-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium px-2 py-1 ${
                              purchase.status === 'returned' ? 
                                'text-red-600 border-red-200 bg-red-50' :
                                purchase.status === 'partially_returned' ?
                                'text-orange-600 border-orange-200 bg-orange-50' :
                                'text-orange-600 border-orange-200'
                            }`}
                          >
                            {purchase.return_count} إرجاع
                            {purchase.status === 'returned' && ' ✓'}
                          </Badge>
                          <div className={`text-xs ${
                            purchase.status === 'returned' ? 'text-red-600 font-semibold' :
                            purchase.status === 'partially_returned' ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {formatCurrency(purchase.total_returned_amount || 0)}
                            {purchase.status === 'returned' && ' (مُرجع بالكامل)'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">لا توجد إرجاعات</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-2 bg-gray-200 hover:bg-gray-600 hover:text-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">فتح القائمة</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-40 ml-12 rtl">
                            <DropdownMenuItem
                              onClick={() => navigate(`/purchases/${purchase.id}`)}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer border-b border-gray-100"
                            >
                              <Eye className="ml-2 h-4 w-4 text-blue-600" />
                              <span>عرض</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  // Fetch complete purchase details including items
                                  const result = await dispatch(getPurchase(purchase.id) as any);
                                  const completePurchase = result.payload || purchase;
                                  const supplier = suppliers.find(s => s.id === purchase.supplier_id);
                                  quickPrintPurchase(completePurchase, supplier || null, settings, 'a4');
                                } catch (error) {
                                  console.error('Error fetching purchase details for printing:', error);
                                  // Fallback to basic purchase data
                                  const supplier = suppliers.find(s => s.id === purchase.supplier_id);
                                  quickPrintPurchase(purchase, supplier || null, settings, 'a4');
                                }
                              }}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer border-b border-gray-100"
                            >
                              <Printer className="ml-2 h-4 w-4 text-purple-600" />
                              <span>طباعة سريعة</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  // Fetch complete purchase details including items
                                  const result = await dispatch(getPurchase(purchase.id) as any);
                                  const completePurchase = result.payload || purchase;
                                  const supplier = suppliers.find(s => s.id === purchase.supplier_id);
                                  printPurchaseWithPreview(completePurchase, supplier || null, settings, 'a4');
                                } catch (error) {
                                  console.error('Error fetching purchase details for printing:', error);
                                  // Fallback to basic purchase data
                                  const supplier = suppliers.find(s => s.id === purchase.supplier_id);
                                  printPurchaseWithPreview(purchase, supplier || null, settings, 'a4');
                                }
                              }}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer border-b border-gray-100"
                            >
                              <Eye className="ml-2 h-4 w-4 text-green-600" />
                              <span>معاينة وطباعة</span>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={(e) => handleEdit(e, purchase)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <Edit className="ml-2 h-4 w-4 text-blue-600" />
                                <span>تعديل</span>
                              </DropdownMenuItem>
                            )}
                            {purchase.status === 'completed' && (
                              <DropdownMenuItem
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedPurchase(purchase);
                                  setIsReturnModalOpen(true);
                                }}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <RotateCcw className="ml-2 h-4 w-4 text-orange-600" />
                                <span>إرجاع</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(e, purchase)}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              <span>حذف</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPurchases.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                <p className="text-xl font-semibold mb-3 text-gray-600">لا توجد مشتريات</p>
                <p className="text-base text-gray-500">لا توجد مشتريات تطابق معايير البحث الحالية</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!purchaseToDelete} onOpenChange={() => setPurchaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المشتريات؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteConfirm()}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto  scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة عملية شراء جديدة
            </DialogTitle>
            <DialogDescription>
              قم بإدخال تفاصيل عملية الشراء الجديدة
            </DialogDescription>
          </DialogHeader>
          {/* Keyboard shortcuts help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Keyboard className="h-4 w-4" />
              <span className="font-medium">اختصارات لوحة المفاتيح</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-blue-600">
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> للانتقال للحقل التالي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> للتنقل بين الحقول</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Tab</kbd> للتنقل العادي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> في الحقل الأخير للحفظ</div>
            </div>
          </div>
          <PurchaseForm
            onSubmit={handleCreateSubmit}
            formData={createFormData}
            setFormData={setCreateFormData}
            suppliers={filteredSuppliers}
            products={products}
            moneyBoxes={moneyBoxes}
            isEdit={false}
            isLoading={isLoading}
            onProductCreated={(newProduct) => {
              // Refresh products list to include the new product
              dispatch(getProducts({ page: 1, limit: 50 }));
            }}
          />
        </DialogContent>
      </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setSelectedPurchase(null);
          }
        }}>
          <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                تعديل عملية الشراء
              </DialogTitle>
              <DialogDescription>
                قم بتعديل تفاصيل عملية الشراء
              </DialogDescription>
            </DialogHeader>
            {/* Keyboard shortcuts help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Keyboard className="h-4 w-4" />
                <span className="font-medium">اختصارات لوحة المفاتيح</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-blue-600">
                <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> للانتقال للحقل التالي</div>
                <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> للتنقل بين الحقول</div>
                <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Tab</kbd> للتنقل العادي</div>
                <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> في الحقل الأخير للحفظ</div>
              </div>
            </div>
            <PurchaseForm
              onSubmit={handleEditSubmit}
              formData={formData}
              setFormData={setFormData}
              suppliers={filteredSuppliers}
              products={products}
              moneyBoxes={moneyBoxes}
              isEdit={true}
              isLoading={false}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="rtl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذه المشتريات؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                حذف
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Return Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
          setIsReturnModalOpen(open);
          if (!open) {
            setSelectedPurchase(null);
          }
        }}>
          <DialogContent className="rtl max-w-[800px] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                إرجاع المشتريات
              </DialogTitle>
              <DialogDescription>
                قم بتحديد المنتجات المراد إرجاعها وسبب الإرجاع
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <PurchaseReturnForm
                purchase={selectedPurchase}
                onSubmit={async (returnData) => {
                  try {
                    await dispatch(returnPurchase({
                      id: selectedPurchase.id,
                      returnData
                    })).unwrap();
                    toast.success("تم إرجاع المشتريات بنجاح");
                    setIsReturnModalOpen(false);
                    setSelectedPurchase(null);
                  } catch (error: any) {
                    // Display Arabic error message from backend
                    const errorMessage = error?.message || error?.toString() || "حدث خطأ أثناء إرجاع المشتريات";
                    toast.error(errorMessage);
                    console.error('Error returning purchase:', error);
                  }
                }}
                onCancel={() => {
                  setIsReturnModalOpen(false);
                  setSelectedPurchase(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
    </div>  
  );
};

export default Purchases;
