import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/features/inventory/inventoryService';
import { getProductPrice, getSimplePriceDisplay, getCurrencyIndicator } from '@/utils/currencyConversion';

interface AddToCartModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, unitType: 'piece' | 'box', price: number) => void;
  settings?: {
    exchangeRate: number;
    currency: string;
    language: string;
    allowNegativeStock: boolean;
  };
}

interface UnitOption {
  value: 'piece' | 'box';
  label: string;
  price: number;
  quantity: number;
}

const AddToCartModal: React.FC<AddToCartModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  settings
}) => {
  const [selectedUnit, setSelectedUnit] = useState<'piece' | 'box'>('piece');
  const [quantity, setQuantity] = useState(1);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);

  useEffect(() => {
    if (product) {
      // Get converted price information
      const priceInfo = settings ? getProductPrice(
        product,
        settings.exchangeRate,
        {
          exchangeRate: settings.exchangeRate,
          localCurrency: settings.currency,
          usdCurrency: 'USD'
        }
      ) : {
        price: product.selling_price,
        originalPrice: product.selling_price,
        currency: 'IQD',
        originalCurrency: 'IQD',
        isConverted: false,
        exchangeRate: 1
      };

      // Calculate price per piece with conversion
      const pricePerPiece = product.units_per_box && product.units_per_box > 1 
        ? priceInfo.price / product.units_per_box 
        : priceInfo.price;

      // Create unit options based on product data
      const options: UnitOption[] = [
        {
          value: 'piece',
          label: `قطعة - ${getSimplePriceDisplay({ ...priceInfo, price: pricePerPiece })}`,
          price: pricePerPiece,
          quantity: 1
        }
      ];

      // Add box option if units_per_box is available and greater than 1
      if (product.units_per_box && product.units_per_box > 1) {
        // For box, the price is the total converted price
        const boxPrice = priceInfo.price; // Total box price
        options.push({
          value: 'box',
          label: `علبة (${product.units_per_box} قطعة) - ${getSimplePriceDisplay({ ...priceInfo, price: boxPrice })}`,
          price: boxPrice,
          quantity: product.units_per_box
        });
      }

      setUnitOptions(options);
      setSelectedUnit('piece');
      setQuantity(1);
    }
  }, [product, settings]);

  const selectedOption = unitOptions.find(option => option.value === selectedUnit);
  const totalPrice = selectedOption ? selectedOption.price * quantity : 0;
  const totalPieces = selectedOption ? selectedOption.quantity * quantity : 0;

  const handleAddToCart = () => {
    if (product && selectedOption) {
      onAddToCart(product, quantity, selectedUnit, selectedOption.price);
      onClose();
    }
  };

  const handleQuantityChange = (value: string) => {
    const newQuantity = parseInt(value) || 1;
    if (newQuantity > 0 && product) {
      // Check if quantity exceeds available stock (only if negative stock is not allowed)
      const maxQuantity = getMaxQuantity();
      
      if (newQuantity <= maxQuantity) {
        setQuantity(newQuantity);
      }
    }
  };

  const getMaxQuantity = () => {
    if (!product) return 0;
    
    // If negative stock is allowed, set a high limit
    if (settings?.allowNegativeStock) {
      return selectedUnit === 'box' 
        ? 1000 // Allow up to 1000 boxes
        : 10000; // Allow up to 10000 pieces
    }
    
    // Otherwise, use the actual stock
    return selectedUnit === 'box' 
      ? Math.floor(product.current_stock / product.units_per_box)
      : product.current_stock;
  };

  const maxQuantity = getMaxQuantity();

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة إلى السلة</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>الوحدة: {product.unit}</span>
              <Badge variant="secondary">
                المخزون: {product.current_stock} {product.unit}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {(() => {
                const priceInfo = settings ? getProductPrice(
                  product,
                  settings.exchangeRate,
                  {
                    exchangeRate: settings.exchangeRate,
                    localCurrency: settings.currency,
                    usdCurrency: 'USD'
                  }
                ) : {
                  price: product.selling_price,
                  originalPrice: product.selling_price,
                  currency: 'IQD',
                  originalCurrency: 'IQD',
                  isConverted: false,
                  exchangeRate: 1
                };

                if (product.units_per_box && product.units_per_box > 1) {
                  const boxPrice = priceInfo.price;
                  const piecePrice = priceInfo.price / product.units_per_box;
                  return (
                    <>
                      <div>سعر العلبة: {getSimplePriceDisplay({ ...priceInfo, price: boxPrice })}</div>
                      <div>سعر القطعة: {getSimplePriceDisplay({ ...priceInfo, price: piecePrice })}</div>
                      {product.is_dolar && (
                        <div className="text-xs text-blue-600">
                          {getCurrencyIndicator(product.is_dolar, settings?.language)}
                        </div>
                      )}
                    </>
                  );
                } else {
                  return (
                    <>
                      <div>سعر القطعة: {getSimplePriceDisplay(priceInfo)}</div>
                      {product.is_dolar && (
                        <div className="text-xs text-blue-600">
                          {getCurrencyIndicator(product.is_dolar, settings?.language)}
                        </div>
                      )}
                    </>
                  );
                }
              })()}
            </div>
            {product.units_per_box && product.units_per_box > 1 && (
              <div className="text-sm text-gray-600 mt-1">
                القطع في العلبة: {product.units_per_box}
              </div>
            )}
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit-select" className="text-right block">نوع الوحدة</Label>
            <Select value={selectedUnit} onValueChange={(value: 'piece' | 'box') => setSelectedUnit(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-right block">الكمية</Label>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange((quantity - 1).toString())}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                min="1"
                max={maxQuantity}
                className="text-center"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange((quantity + 1).toString())}
                disabled={quantity >= maxQuantity}
              >
                +
              </Button>
            </div>
            <div className="text-sm text-gray-600 text-right">
              الحد الأقصى: {maxQuantity}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                {selectedUnit === 'box' ? 'سعر العلبة:' : 'سعر القطعة:'}
              </span>
              <span className="font-semibold">{formatCurrency(selectedOption?.price || 0)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">الكمية:</span>
              <span className="font-semibold">{quantity}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">إجمالي القطع:</span>
              <span className="font-semibold">{totalPieces} قطعة</span>
            </div>
            {selectedUnit === 'box' && product.units_per_box && product.units_per_box > 1 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">سعر القطعة في العلبة:</span>
                <span className="font-semibold">{formatCurrency(product.selling_price / product.units_per_box)}</span>
              </div>
            )}
            {selectedUnit === 'piece' && product.units_per_box && product.units_per_box > 1 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">سعر القطعة الفردية:</span>
                <span className="font-semibold">{formatCurrency(product.selling_price / product.units_per_box)}</span>
              </div>
            )}
            {selectedUnit === 'piece' && (!product.units_per_box || product.units_per_box <= 1) && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">سعر القطعة الفردية:</span>
                <span className="font-semibold">{formatCurrency(product.selling_price)}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">الإجمالي:</span>
                <span className="font-bold text-lg text-blue-600">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 space-x-reverse">
            <Button variant="outline" onClick={onClose} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleAddToCart} className="flex-1" disabled={quantity <= 0}>
              إضافة إلى السلة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal; 