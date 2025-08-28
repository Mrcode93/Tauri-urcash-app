import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { updateSale, returnSale } from '@/features/sales/salesSlice';
import { getProducts } from '@/features/inventory/inventorySlice';
import { getCustomers } from '@/features/customers/customersSlice';
import { toast } from "@/lib/toast";
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Edit, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import type { SaleData, SaleItem, ReturnSaleData } from '@/features/sales/salesService';

interface SaleEditModalProps {
  sale: SaleData | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface EditableSaleItem extends SaleItem {
  isNew?: boolean;
  isDeleted?: boolean;
}

interface ReturnItem {
  sale_item_id: number;
  quantity: number;
  price: number;
  product_name: string;
  max_returnable: number;
}

const SaleEditModal: React.FC<SaleEditModalProps> = ({
  sale,
  open,
  onClose,
  onSave
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: products } = useSelector((state: RootState) => state.inventory);
  const { items: customers } = useSelector((state: RootState) => state.customers);
  
  // Form states
  const [formData, setFormData] = useState<Partial<SaleData>>({});
  const [items, setItems] = useState<EditableSaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');

  // Initialize form data when sale changes
  useEffect(() => {
    if (sale) {
      setFormData({
        customer_id: sale.customer_id,
        invoice_date: sale.invoice_date,
        due_date: sale.due_date,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
        paid_amount: sale.paid_amount,
        notes: sale.notes,
        total_amount: sale.total_amount,
        discount_amount: sale.discount_amount,
        tax_amount: sale.tax_amount,
        net_amount: sale.net_amount
      });
      
      setItems(sale.items.map(item => ({
        ...item,
        isNew: false,
        isDeleted: false
      })));
    }
  }, [sale]);

  // Calculate totals
  const calculateTotals = () => {
    const activeItems = items.filter(item => !item.isDeleted);
    const subtotal = activeItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = formData.discount_amount || 0;
    const tax = formData.tax_amount || 0;
    const net = subtotal - discount + tax;
    
    return { subtotal, discount, tax, net };
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate item totals
    if (field === 'quantity' || field === 'price') {
      const item = updatedItems[index];
      const total = (item.quantity || 0) * (item.price || 0);
      updatedItems[index] = { ...item, total };
    }
    
    setItems(updatedItems);
  };

  // Add new item
  const handleAddItem = () => {
    const newItem: EditableSaleItem = {
      id: Date.now(), // Temporary ID
      product_id: 0,
      product_name: '',
      description: '',
      quantity: 1,
      price: 0,
      total: 0,
      discount_percent: 0,
      tax_percent: 0,
      line_total: 0,
      isNew: true,
      isDeleted: false
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items];
    if (updatedItems[index].isNew) {
      updatedItems.splice(index, 1);
    } else {
      updatedItems[index].isDeleted = true;
    }
    setItems(updatedItems);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: product.id,
        product_name: product.name,
        price: product.selling_price,
        total: product.selling_price * (updatedItems[index].quantity || 1)
      };
      setItems(updatedItems);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      const activeItems = items.filter(item => !item.isDeleted);
      
      if (activeItems.length === 0) {
        toast.error('يجب إضافة منتج واحد على الأقل');
        return;
      }

      const updateData = {
        ...formData,
        items: activeItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent
        }))
      };

      await dispatch(updateSale({ id: sale.id, data: updateData })).unwrap();
      toast.success('تم تحديث المبيعة بنجاح');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('حدث خطأ أثناء تحديث المبيعة');
    } finally {
      setLoading(false);
    }
  };

  // Handle return
  const handleReturn = async () => {
    if (!sale) return;

    setLoading(true);
    try {
      const selectedReturnItems = returnItems.filter(item => item.quantity > 0);
      
      if (selectedReturnItems.length === 0) {
        toast.error('يجب تحديد المنتجات المراد إرجاعها');
        return;
      }

      if (!returnReason.trim()) {
        toast.error('يجب تحديد سبب الإرجاع');
        return;
      }

      const returnData: ReturnSaleData = {
        items: selectedReturnItems.map(item => ({
          sale_item_id: item.sale_item_id,
          quantity: item.quantity,
          price: item.price
        })),
        reason: returnReason,
        refund_method: refundMethod
      };

      await dispatch(returnSale({ id: sale.id, returnData })).unwrap();
      toast.success('تم إرجاع المبيعة بنجاح');
      setShowReturnDialog(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error returning sale:', error);
      toast.error('حدث خطأ أثناء إرجاع المبيعة');
    } finally {
      setLoading(false);
    }
  };

  // Initialize return items
  const initializeReturnItems = () => {
    if (!sale) return;
    
    const returnableItems = sale.items.map(item => ({
      sale_item_id: item.id,
      quantity: 0,
      price: item.price,
      product_name: item.product_name,
      max_returnable: item.quantity - (item.returned_quantity || 0)
    })).filter(item => item.max_returnable > 0);
    
    setReturnItems(returnableItems);
    setShowReturnDialog(true);
  };

  // Handle return item quantity change
  const handleReturnQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...returnItems];
    const maxQuantity = updatedItems[index].max_returnable;
    updatedItems[index].quantity = Math.min(Math.max(0, quantity), maxQuantity);
    setReturnItems(updatedItems);
  };

  const { subtotal, discount, tax, net } = calculateTotals();

  if (!sale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              تعديل المبيعة #{sale.invoice_no}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6" dir="rtl">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">العميل</Label>
                <Select
                  value={formData.customer_id?.toString() || ''}
                  onValueChange={(value) => handleFieldChange('customer_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">تاريخ الفاتورة</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date || ''}
                  onChange={(e) => handleFieldChange('invoice_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => handleFieldChange('due_date', e.target.value)}
                />
              </div>
            </div>

            {/* Payment Information */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(value) => handleFieldChange('payment_method', value)}
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
                <Label htmlFor="payment_status">حالة الدفع</Label>
                <Select
                  value={formData.payment_status || ''}
                  onValueChange={(value) => handleFieldChange('payment_status', value)}
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

              <div className="space-y-2">
                <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  value={formData.paid_amount || 0}
                  onChange={(e) => handleFieldChange('paid_amount', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Input
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">المنتجات</h3>
                <Button onClick={handleAddItem} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة منتج
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    !item.isDeleted && (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.product_id?.toString() || ''}
                            onValueChange={(value) => handleProductSelect(index, parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المنتج" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity || 0}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price || 0}
                            onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>المجموع الفرعي</Label>
                <div className="text-lg font-semibold">{formatCurrency(subtotal)}</div>
              </div>
              <div className="space-y-2">
                <Label>الخصم</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>الضريبة</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(e) => handleFieldChange('tax_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>الإجمالي النهائي</Label>
                <div className="text-lg font-bold text-primary">{formatCurrency(net)}</div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Label>حالة المبيعة:</Label>
              <Badge variant={
                sale.status === 'returned' ? 'destructive' :
                sale.status === 'partially_returned' ? 'secondary' :
                'default'
              }>
                {sale.status === 'returned' ? 'مُرجع' :
                 sale.status === 'partially_returned' ? 'مُرجع جزئياً' :
                 'مكتمل'}
              </Badge>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {sale.status !== 'returned' && (
              <Button
                variant="outline"
                onClick={initializeReturnItems}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                إرجاع
              </Button>
            )}
            <Button onClick={onClose} variant="outline">
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              إرجاع المبيعة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return_reason">سبب الإرجاع</Label>
              <Textarea
                id="return_reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="اذكر سبب الإرجاع..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_method">طريقة الاسترداد</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit">رصيد في الحساب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>المنتجات المراد إرجاعها</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية المتاحة</TableHead>
                    <TableHead>كمية الإرجاع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, index) => (
                    <TableRow key={item.sale_item_id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.max_returnable}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={item.max_returnable}
                          value={item.quantity}
                          onChange={(e) => handleReturnQuantityChange(index, parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowReturnDialog(false)} variant="outline">
              إلغاء
            </Button>
            <Button onClick={handleReturn} disabled={loading} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              تأكيد الإرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaleEditModal; 