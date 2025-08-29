import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { Product } from '@/features/inventory/inventoryService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, Info, ShoppingCart, Plus, Minus } from 'lucide-react';
import { toast } from '@/lib/toast';
import api from '@/lib/api';
import { getSuppliers } from '@/features/suppliers/suppliersSlice';
import { createPurchase } from '@/features/purchases/purchasesSlice';

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  open,
  onOpenChange,
  product,
  onSuccess
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { suppliers = [] } = useSelector((state: RootState) => state.suppliers);
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [createPurchaseRecord, setCreatePurchaseRecord] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Load suppliers when modal opens
  useEffect(() => {
    if (open && suppliers && suppliers.length === 0) {
      dispatch(getSuppliers());
    }
  }, [open, suppliers, dispatch]);

  // Set default purchase price when product changes
  useEffect(() => {
    if (product && !purchasePrice) {
      setPurchasePrice(product.purchase_price.toString());
    }
  }, [product, purchasePrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    const quantityNum = parseFloat(quantity);
    if (!quantityNum || quantityNum <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }

    // Validate purchase data if creating purchase record
    if (adjustmentType === 'add' && createPurchaseRecord) {
      if (!selectedSupplier) {
        toast.error('يرجى اختيار المورد');
        return;
      }
      if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
        toast.error('يرجى إدخال سعر الشراء');
        return;
      }
    }

    setLoading(true);
    try {
      if (adjustmentType === 'add' && createPurchaseRecord) {
        // Create purchase record using the new integrated endpoint
        const adjustmentData = {
          product_id: product.id,
          quantity: quantityNum,
          supplier_id: parseInt(selectedSupplier),
          purchase_price: parseFloat(purchasePrice),
          invoice_no: invoiceNumber || undefined,
          notes: notes || `شراء مخزون - ${product.name}`
        };

        const response = await api.post('/inventory/adjust-stock-with-purchase', adjustmentData);
        toast.success('تم إضافة المخزون وإنشاء فاتورة شراء بنجاح');
      } else {
        // Direct stock adjustment
        const adjustmentData = {
          product_id: product.id,
          adjustment_type: adjustmentType,
          quantity: quantityNum,
          notes: notes || `تعديل مخزون يدوي - ${adjustmentType === 'add' ? 'إضافة' : 'خصم'} ${quantityNum}`
        };

        await api.post('/inventory/adjust-stock', adjustmentData);
        toast.success('تم تعديل المخزون بنجاح');
      }
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setQuantity('');
      setNotes('');
      setAdjustmentType('add');
      setCreatePurchaseRecord(true);
      setSelectedSupplier('');
      setPurchasePrice('');
      setInvoiceNumber('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'فشل في تعديل المخزون');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewStock = () => {
    if (!product || !quantity) return product?.current_stock;
    
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum)) return product.current_stock;
    
    return adjustmentType === 'add' 
      ? product.current_stock + quantityNum
      : product.current_stock - quantityNum;
  };

  const calculatePurchaseTotal = () => {
    if (!quantity || !purchasePrice) return 0;
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(purchasePrice);
    return quantityNum * priceNum;
  };

  if (!product) return null;

  const newStock = calculateNewStock();
  const purchaseTotal = calculatePurchaseTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            تعديل مخزون - {product.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg max-h-[80vh] overflow-y-auto scrollbar-hide">
          {/* Current Stock Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <Label className="text-sm text-gray-600">المخزون الحالي</Label>
                  <div className="text-xl font-bold text-blue-600">{product.current_stock}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">المخزون الجديد</Label>
                  <div className={`text-xl font-bold ${
                    newStock && newStock < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {newStock || product.current_stock}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Type */}
          <div>
            <Label>نوع التعديل</Label>
            <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract') => setAdjustmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">إضافة مخزون</SelectItem>
                <SelectItem value="subtract">خصم مخزون</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <Label>الكمية</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.01"
              step="0.01"
              required
              placeholder="أدخل الكمية"
            />
          </div>

          {/* Purchase Integration for Add Operations */}
          {adjustmentType === 'add' && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <Label className="font-medium">إنشاء فاتورة شراء</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="create-purchase"
                      checked={createPurchaseRecord}
                      onChange={(e) => setCreatePurchaseRecord(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="create-purchase" className="text-sm">
                      إنشاء فاتورة شراء لهذه الكمية
                    </Label>
                  </div>

                  {createPurchaseRecord && (
                    <div className="space-y-3 pt-2">
                      {/* Supplier Selection */}
                      <div>
                        <Label>المورد</Label>
                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers && suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Purchase Price */}
                      <div>
                        <Label>سعر الشراء</Label>
                        <Input
                          type="number"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          min="0.01"
                          step="0.01"
                          required={createPurchaseRecord}
                          placeholder="سعر الشراء"
                        />
                      </div>

                      {/* Invoice Number */}
                      <div>
                        <Label>رقم الفاتورة (اختياري)</Label>
                        <Input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="رقم الفاتورة"
                        />
                      </div>

                      {/* Purchase Total */}
                      {purchaseTotal > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">إجمالي فاتورة الشراء:</span>
                            <span className="font-bold text-blue-800">{purchaseTotal}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سبب التعديل..."
              rows={3}
            />
          </div>

          {/* Warning for negative stock */}
          {newStock && newStock < 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">تحذير</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                سيصبح المخزون سالباً بعد هذا التعديل
              </p>
            </div>
          )}

          {/* Info about adjustment */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Info className="h-4 w-4" />
              <span className="font-medium">معلومات</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              {adjustmentType === 'add' && createPurchaseRecord 
                ? 'سيتم إنشاء فاتورة شراء وتحديث المخزون تلقائياً'
                : 'سيتم تسجيل هذا التعديل في سجل حركات المخزون'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading || !quantity || (adjustmentType === 'add' && createPurchaseRecord && (!selectedSupplier || !purchasePrice))}
              className="flex-1"
            >
              {loading ? 'جاري التعديل...' : 'تأكيد التعديل'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentModal; 