import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { Product } from '@/features/inventory/inventoryService';
import { stocksService, Stock, CreateMovementData } from '@/features/stocks/stocksService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight, 
  Package, 
  Warehouse, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  Calculator,
  Plus
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: (data: CreateMovementData) => void;
}

interface StockProductInfo {
  stock_id: number | null;
  stock_name: string;
  current_quantity: number;
  available_quantity: number;
}

const StockTransferModal: React.FC<StockTransferModalProps> = ({
  open,
  onOpenChange,
  product,
  onSuccess
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [stockProducts, setStockProducts] = useState<StockProductInfo[]>([]);
  
  // Form data
  const [fromStockId, setFromStockId] = useState<number | null | ''>('');
  const [toStockId, setToStockId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  
  // Validation states
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (open) {
      loadStocks();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && product) {
      loadStockProducts();
    }
  }, [open, product]);

  useEffect(() => {
    if (fromStockId !== '' && product) {
      if (fromStockId === null) {
        // Product is in "no stock" - use product's current stock
        setAvailableQuantity(product.current_stock);
        // Reset quantity if it exceeds available
        if (quantity > product.current_stock) {
          setQuantity(product.current_stock);
        }
      } else {
        const stockProduct = stockProducts.find(sp => sp.stock_id === fromStockId);
        if (stockProduct) {
          setAvailableQuantity(stockProduct.available_quantity);
          // Reset quantity if it exceeds available
          if (quantity > stockProduct.available_quantity) {
            setQuantity(stockProduct.available_quantity);
          }
        }
      }
    }
  }, [fromStockId, stockProducts, product, quantity]);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const stocksData = await stocksService.getAllStocks();
      setStocks(stocksData.filter(stock => stock.is_active));
    } catch (error) {
      console.error('Error loading stocks:', error);
      toast.error('فشل في تحميل المخازن');
    } finally {
      setLoading(false);
    }
  };

  const loadStockProducts = async () => {
    if (!product) return;
    
    try {
      // Get product stock quantities from the backend - Fixed API endpoint
      const response = await api.get(`/inventory/${product.id}/stock-quantities`);
      
      if (response.data.success) {
        const stockData = response.data.data || [];
        
        // Add "No Stock" option if product has stock but no stock_id
        const hasNoStockOption = stockData.some((item: StockProductInfo) => item.stock_id === null);
        if (!hasNoStockOption && product.current_stock > 0 && !product.stock_id) {
          stockData.push({
            stock_id: null,
            stock_name: 'بدون مخزن',
            current_quantity: product.current_stock,
            available_quantity: product.current_stock
          });
        }
        
        setStockProducts(stockData);
      } else {
        // Fallback to simulated data if API fails
        const stockProductsData: StockProductInfo[] = stocks?.map(stock => ({
          stock_id: stock.id,
          stock_name: stock.name,
          current_quantity: stock.id === product.stock_id ? product.current_stock : 0,
          available_quantity: stock.id === product.stock_id ? product.current_stock : 0
        }));
        
        // Add "No Stock" option if product has stock but no stock_id
        if (product.current_stock > 0 && !product.stock_id) {
          stockProductsData.push({
            stock_id: null,
            stock_name: 'بدون مخزن',
            current_quantity: product.current_stock,
            available_quantity: product.current_stock
          });
        }
        
        setStockProducts(stockProductsData);
      }
    } catch (error) {
      console.error('Error loading stock products:', error);
      // Fallback to simulated data
      const stockProductsData: StockProductInfo[] = stocks?.map(stock => ({
        stock_id: stock.id,
        stock_name: stock.name,
        current_quantity: stock.id === product.stock_id ? product.current_stock : 0,
        available_quantity: stock.id === product.stock_id ? product.current_stock : 0
      }));
      
      // Add "No Stock" option if product has stock but no stock_id
      if (product.current_stock > 0 && !product.stock_id) {
        stockProductsData.push({
          stock_id: null,
          stock_name: 'بدون مخزن',
          current_quantity: product.current_stock,
          available_quantity: product.current_stock
        });
      }
      
      setStockProducts(stockProductsData);
    }
  };

  const resetForm = () => {
    setFromStockId('');
    setToStockId('');
    setQuantity(1);
    setNotes('');
    setAvailableQuantity(0);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (fromStockId === '') {
      newErrors.fromStock = 'يرجى اختيار المخزن المصدر';
    }

    if (!toStockId) {
      newErrors.toStock = 'يرجى اختيار المخزن الهدف';
    }

    if (fromStockId === toStockId) {
      newErrors.toStock = 'لا يمكن النقل لنفس المخزن';
    }

    if (!quantity || quantity <= 0) {
      newErrors.quantity = 'يجب أن تكون الكمية أكبر من صفر';
    }

    if (quantity > availableQuantity) {
      newErrors.quantity = `الكمية المتاحة: ${availableQuantity}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!product || !validateForm()) return;

    try {
      setTransferring(true);

      const transferData: CreateMovementData = {
        movement_type: 'transfer',
        from_stock_id: fromStockId === null ? null : fromStockId as number,
        to_stock_id: toStockId as number,
        product_id: product.id,
        quantity: quantity,
        unit_cost: product.purchase_price,
        total_value: quantity * product.purchase_price,
        reference_type: 'transfer',
        reference_number: `TR-${Date.now()}`,
        notes: notes || `نقل من ${fromStockId === null ? 'بدون مخزن' : stocks.find(s => s.id === fromStockId)?.name} إلى ${stocks.find(s => s.id === toStockId)?.name}`
      };

      const response = await stocksService.createMovement(transferData);

      toast.success('تم نقل المنتج بنجاح');
      
      // Call onSuccess with the updated data for UI refresh
      onSuccess?.(transferData);
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      console.error('Error transferring product:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل في نقل المنتج';
      toast.error(errorMessage);
    } finally {
      setTransferring(false);
    }
  };

  const getFromStockOptions = () => {
    // Include stocks with available quantity and "No Stock" option
    const stockOptions = stocks.filter(stock => {
      const stockProduct = stockProducts.find(sp => sp.stock_id === stock.id);
      return stockProduct && stockProduct.available_quantity > 0;
    });
    
    // Add "No Stock" option if product has stock but no stock_id
    const noStockOption = stockProducts.find(sp => sp.stock_id === null);
    if (noStockOption && noStockOption.available_quantity > 0) {
      return [{ id: null, name: 'بدون مخزن' }, ...stockOptions];
    }
    
    return stockOptions;
  };

  const getToStockOptions = () => {
    return stocks.filter(stock => stock.id !== fromStockId);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            نقل المنتج - {product.name}
          </DialogTitle>
        </DialogHeader>

        {/* Product Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              معلومات المنتج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">اسم المنتج</Label>
                <div className="font-medium">{product.name}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">الباركود</Label>
                <div className="font-medium">{product.barcode || '-'}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">سعر الشراء</Label>
                <div className="font-medium text-blue-600">{formatCurrency(product.purchase_price)}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">الوحدة</Label>
                <div className="font-medium">{product.unit}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Quantities Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              الكميات المتاحة في المخازن
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockProducts.map((stockProduct) => (
                <div key={stockProduct.stock_id || 'no-stock'} className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">{stockProduct.stock_name}</div>
                  <div className="text-lg font-bold text-blue-600">
                    {stockProduct.available_quantity} {product.unit}
                  </div>
                  <div className="text-xs text-gray-500">متاح للنقل</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transfer Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              تفاصيل النقل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From Stock */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">المخزن المصدر *</Label>
              <Select 
                value={fromStockId === null ? 'no-stock' : fromStockId.toString()} 
                onValueChange={(value) => setFromStockId(value === 'no-stock' ? null : parseInt(value))}
              >
                <SelectTrigger className={errors.fromStock ? 'border-red-500' : ''}>
                  <SelectValue placeholder="اختر المخزن المصدر" />
                </SelectTrigger>
                <SelectContent>
                  {getFromStockOptions().map((stock) => {
                    const stockProduct = stockProducts.find(sp => sp.stock_id === stock.id);
                    const isNoStock = stock.id === null;
                    return (
                      <SelectItem key={stock.id || 'no-stock'} value={isNoStock ? 'no-stock' : stock.id.toString()}>
                        {stock.name} ({isNoStock ? product.current_stock : stockProduct?.available_quantity || 0} متاح)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.fromStock && (
                <p className="text-sm text-red-600">{errors.fromStock}</p>
              )}
            </div>

            {/* To Stock */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">المخزن الهدف *</Label>
              <Select 
                value={toStockId.toString()} 
                onValueChange={(value) => setToStockId(parseInt(value))}
              >
                <SelectTrigger className={errors.toStock ? 'border-red-500' : ''}>
                  <SelectValue placeholder="اختر المخزن الهدف" />
                </SelectTrigger>
                <SelectContent>
                  {getToStockOptions().map((stock) => (
                    <SelectItem key={stock.id} value={stock.id.toString()}>
                      {stock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.toStock && (
                <p className="text-sm text-red-600">{errors.toStock}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">الكمية *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  max={availableQuantity}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                <span className="text-sm text-gray-500 self-center">
                  من {availableQuantity} متاح
                </span>
              </div>
              {errors.quantity && (
                <p className="text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>

            {/* Total Value */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">القيمة الإجمالية</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Calculator className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-lg text-blue-600">
                  {formatCurrency(quantity * product.purchase_price)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ملاحظات (اختياري)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات حول عملية النقل..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Alert */}
        {fromStockId !== '' && toStockId && quantity > 0 && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>ملخص النقل:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {fromStockId === null ? 'بدون مخزن' : stocks.find(s => s.id === fromStockId)?.name}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium">{stocks.find(s => s.id === toStockId)?.name}</span>
                  <span className="text-blue-600 font-bold">({quantity} {product.unit})</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Special Alert for No Stock Transfer */}
        {fromStockId === null && toStockId && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Plus className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>إضافة للمخزن:</strong> سيتم إضافة المنتج إلى المخزن المحدد. 
              هذه العملية ستضع المنتج في المخزن المحدد للمرة الأولى.
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Alert */}
        {fromStockId !== '' && fromStockId !== null && toStockId && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>تنبيه:</strong> سيتم خصم الكمية من المخزن المصدر وإضافتها للمخزن الهدف. 
              تأكد من صحة البيانات قبل المتابعة.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transferring}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={transferring || fromStockId === '' || !toStockId || quantity <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {transferring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري النقل...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 ml-2" />
                {fromStockId === null ? 'إضافة للمخزن' : 'نقل المنتج'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockTransferModal;
