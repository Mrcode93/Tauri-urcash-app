import React, { memo, useCallback, useState } from 'react';
import { ShoppingCart, User, Plus, X, Minus, Trash2, Save, Loader2, Printer, Eye, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { POSWindowState, CartItem } from '@/features/pos/posSlice';
import type { Customer } from '@/features/customers/customersService';

interface POSCartSectionProps {
  sessions: { [sessionId: string]: POSWindowState };
  activeSessionId: string;
  cart: CartItem[];
  customer_id: number | null;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  paid_amount: number;
  customers: Customer[];
  isCustomersFeatureAvailable: boolean;
  posLoading: boolean;
  salesLoading?: boolean;
  allowNegativeStock?: boolean;
  onSwitchCart: (sessionId: string) => void;
  onRemoveCart: (sessionId: string) => void;
  onCreateNewCart: () => void;
  onSetCustomer: (customerId: number) => void;
  onSetPaymentMethod: (method: 'cash' | 'card' | 'bank_transfer') => void;
  onSetPaidAmount: (amount: number) => void;
  onQuantityChange: (productId: number, change: number) => void;
  onUpdateItemUnitType: (productId: number, unitType: 'piece' | 'box') => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onCreateSale: () => void;
  onAddCustomer: () => void;
  onOpenReceiptBill: () => void;
  calculateTotal: () => number;
  onCartItemSelect?: (productId: number) => void;
  selectedCartItemId?: number | null;
  onPaidAmountSelect?: () => void;
  colors?: {
    primary: {
      DEFAULT: string;
      dark: string;
      light: string;
      medium: string;
      gradient: string;
      glass: string;
      rgb: { r: number; g: number; b: number };
    };
    secondary: {
      DEFAULT: string;
      light: string;
      medium: string;
      rgb: { r: number; g: number; b: number };
    };
    background: {
      light: string;
      DEFAULT: string;
      dark: string;
      glass: string;
      glassDark: string;
      primary: string;
      secondary: string;
      pos: string;
      cart: string;
      products: string;
      header: string;
    };
    text: {
      primary: string;
      secondary: string;
      inverted: string;
      muted: string;
      accent: string;
    };
    accent: {
      success: string;
      warning: string;
      danger: string;
      info: string;
      primary: string;
      secondary: string;
    };
    border: {
      light: string;
      DEFAULT: string;
      dark: string;
      primary: string;
      secondary: string;
    };
    pos: {
      card: string;
      cardHover: string;
      cardBorder: string;
      cardBorderHover: string;
      button: string;
      buttonHover: string;
      buttonText: string;
      total: string;
      totalText: string;
      cartItem: string;
      cartItemHover: string;
      productCard: string;
      productCardHover: string;
      productCardBorder: string;
      productCardBorderHover: string;
      searchBar: string;
      searchBarBorder: string;
      searchBarFocus: string;
    };
  };
}

// Cart Tabs Component
const CartTabs = memo(({ 
  sessions, 
  activeSessionId, 
  onSwitchCart, 
  onRemoveCart, 
  onCreateNewCart,
  getSessionDisplayName,
  colors
}: {
  sessions: { [sessionId: string]: POSWindowState };
  activeSessionId: string;
  onSwitchCart: (sessionId: string) => void;
  onRemoveCart: (sessionId: string) => void;
  onCreateNewCart: () => void;
  getSessionDisplayName: (sessionId: string, session: POSWindowState) => string;
  colors?: POSCartSectionProps['colors'];
}) => {
  const sessionIds = Object.keys(sessions);
  
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <h3 
          className="text-lg font-bold"
          style={{ color: colors?.primary.DEFAULT || '#3B82F6' }}
        >
          سلع البيع
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateNewCart}
          className="text-xs font-bold border-2 shadow-md"
          style={{
            borderColor: colors?.primary.DEFAULT || '#3B82F6',
            color: colors?.primary.DEFAULT || '#3B82F6'
          }}
        >
          <Plus className="h-3 w-3 ml-1" />
          سلة جديدة
        </Button>
      </div>
      
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sessionIds.map((sessionId) => {
          const session = sessions[sessionId];
          const isActive = sessionId === activeSessionId;
          const itemCount = session?.cart?.length || 0;
          const total = session.cart.reduce((sum, item) => sum + item.total, 0);
          
          return (
            <Card
              key={sessionId}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all min-w-0 flex-shrink-0 shadow-md"
              )}
              style={{
                backgroundColor: isActive 
                  ? colors?.primary.DEFAULT || '#3B82F6' 
                  : colors?.background.DEFAULT || '#ffffff',
                borderColor: isActive 
                  ? colors?.primary.DEFAULT || '#3B82F6' 
                  : colors?.border.DEFAULT || '#cbd5e1',
                color: isActive 
                  ? colors?.text.inverted || '#ffffff' 
                  : colors?.text.primary || '#1e293b'
              }}
              onClick={() => onSwitchCart(sessionId)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  سلة {sessionId.slice(-4)}
                </div>
                <div className={cn(
                  "text-xs",
                  isActive ? "text-white/80" : "text-gray-500"
                )}>
                  {itemCount} منتج - {formatCurrency(total)}
                </div>
              </div>
              
              {sessionIds.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-white/80 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-red-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCart(sessionId);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
});

// Optimized Cart Item Row
const CartItemRow = memo(({ item, index, onQuantityChange, onUpdateItemUnitType, onRemoveItem, allowNegativeStock = false, onCartItemSelect, isSelected }: {
  item: CartItem;
  index: number;
  onQuantityChange: (productId: number, change: number) => void;
  onUpdateItemUnitType: (productId: number, unitType: 'piece' | 'box') => void;
  onRemoveItem: (productId: number) => void;
  allowNegativeStock?: boolean;
  onCartItemSelect?: (productId: number) => void;
  isSelected?: boolean;
}) => {
  const [showUnitSelector, setShowUnitSelector] = useState(false);

  const handleQuantityInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && (allowNegativeStock || value <= item.stock)) {
      onQuantityChange(item.product_id, value - item.quantity);
    }
  }, [item, onQuantityChange, allowNegativeStock]);

  const handleIncrement = useCallback(() => {
    onQuantityChange(item.product_id, 1);
  }, [item.product_id, onQuantityChange]);

  const handleDecrement = useCallback(() => {
    onQuantityChange(item.product_id, -1);
  }, [item.product_id, onQuantityChange]);

  const handleRemove = useCallback(() => {
    onRemoveItem(item.product_id);
  }, [item.product_id, onRemoveItem]);

  const handleUnitChange = useCallback((newUnit: 'piece' | 'box') => {
    // Calculate the new price based on unit type
    let newPrice = item.price;
    if (item.piecesPerUnit && item.piecesPerUnit > 1) {
      if (newUnit === 'piece') {
        // Convert from box price to piece price
        newPrice = item.price / item.piecesPerUnit;
      } else {
        // Convert from piece price to box price
        newPrice = item.price * item.piecesPerUnit;
      }
    }
    
    onUpdateItemUnitType(item.product_id, newUnit);
    setShowUnitSelector(false);
  }, [item, onUpdateItemUnitType]);

  return (
    <tr 
      className={cn(
        index % 2 === 0 ? "bg-white" : "bg-gray-50",
        isSelected && "ring-2 ring-primary ring-inset",
        onCartItemSelect && "cursor-pointer hover:bg-gray-100"
      )}
      onClick={() => onCartItemSelect && onCartItemSelect(item.product_id)}
    >
      <td className="px-2 py-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate min-w-0">{item.name}</span>
            {item.product_id < 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 flex-shrink-0">
                يدوي
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
            <span className="flex-shrink-0">{item.unit}</span>
            {item.unitType === 'box' && item.piecesPerUnit > 1 && (
              <>
                <span className="flex-shrink-0">•</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {item.unitType === 'box' ? 'علبة' : 'قطعة'} ({item.piecesPerUnit} قطعة)
                </Badge>
              </>
            )}
            {item.notes && (
              <>
                <span className="flex-shrink-0">•</span>
                <span className="text-orange-600 flex-shrink-0">{item.notes}</span>
              </>
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-3 flex-shrink-0">
        <div className="flex flex-col items-center gap-1 min-w-0">
          {/* Unit Selector - Only show for regular products (positive IDs) */}
          {item.product_id > 0 && (
            <div className="flex items-center gap-1 mb-1 relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnitSelector(!showUnitSelector)}
                className="text-xs h-6 px-2 flex-shrink-0"
              >
                {item.unitType === 'box' ? 'علبة' : 'قطعة'}
              </Button>
              {showUnitSelector && (
                <div className="absolute z-10 bg-white border rounded-lg shadow-lg p-1 mt-8">
                  <Button
                    variant={item.unitType === 'piece' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUnitChange('piece')}
                    className="text-xs h-6 px-2 mb-1 w-full"
                  >
                    قطعة
                  </Button>
                  <Button
                    variant={item.unitType === 'box' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUnitChange('box')}
                    className="text-xs h-6 px-2 w-full"
                  >
                    علبة
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Quantity Controls */}
          <div className="flex items-center justify-center gap-1 min-w-0">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 flex-shrink-0"
              onClick={handleDecrement}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input 
              type="number" 
              value={item.quantity} 
              className="h-6 w-12 text-center text-xs p-1 border-gray-300 flex-shrink-0"
              onChange={handleQuantityInputChange}
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 flex-shrink-0"
              onClick={handleIncrement}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {item.unitType === 'box' && item.piecesPerUnit > 1 && (
            <div className="text-xs text-gray-500 flex-shrink-0">
              {item.quantity * item.piecesPerUnit} قطعة
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-center font-medium flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="flex-shrink-0">{formatCurrency(item.price)}</span>
          {item.unitType === 'box' && item.piecesPerUnit > 1 && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatCurrency(item.price / item.piecesPerUnit)} للقطعة
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-center font-bold text-primary flex-shrink-0">
        {formatCurrency(item.total)}
      </td>
      <td className="px-2 py-3 text-center flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-red-50 flex-shrink-0" 
          onClick={handleRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
});

const POSCartSection = memo(({
  sessions,
  activeSessionId,
  cart,
  customer_id,
  payment_method,
  paid_amount,
  customers,
  isCustomersFeatureAvailable,
  posLoading,
  salesLoading,
  allowNegativeStock,
  onSwitchCart,
  onRemoveCart,
  onCreateNewCart,
  onSetCustomer,
  onSetPaymentMethod,
  onSetPaidAmount,
  onQuantityChange,
  onUpdateItemUnitType,
  onRemoveItem,
  onClearCart,
  onCreateSale,
  onAddCustomer,
  onOpenReceiptBill,
  calculateTotal,
  colors,
  onCartItemSelect,
  selectedCartItemId,
  onPaidAmountSelect
}: POSCartSectionProps) => {
  const getSessionDisplayName = useCallback((sessionId: string, session: POSWindowState) => {
    const itemCount = session.cart.length;
    const total = session.cart.reduce((sum, item) => sum + item.total, 0);
    return `سلة ${sessionId.slice(-4)} (${itemCount} منتج - ${formatCurrency(total)})`;
  }, []);

  const total = calculateTotal();
  const isAnonymous = !customer_id || customer_id === 999;

  return (
    <section 
      className="w-full lg:w-auto lg:flex-1 flex flex-col gap-3 border-r-2 p-4 overflow-y-auto min-w-0"
      style={{ borderColor: colors?.primary.DEFAULT || '#3B82F6' }}
    >
      <div 
        className="rounded-lg shadow-xl p-4 flex flex-col h-full min-w-0 border-2"
        style={{ 
          backgroundColor: colors?.pos.card || '#ffffff',
          borderColor: colors?.primary.DEFAULT || '#3B82F6'
        }}
      >
        {/* Cart Tabs */}
        <CartTabs
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSwitchCart={onSwitchCart}
          onRemoveCart={onRemoveCart}
          onCreateNewCart={onCreateNewCart}
          getSessionDisplayName={getSessionDisplayName}
          colors={colors}
        />
        
        {/* Customer Selection */}
        <div className="mb-2 min-w-0">
          <div className="flex gap-2 min-w-0">
            <Select value={customer_id?.toString() || ''} onValueChange={(value) => onSetCustomer(parseInt(value))}>
              <SelectTrigger className="rounded-lg text-base h-10 flex-1 min-w-0 border-2 shadow-md">
                <SelectValue placeholder={isCustomersFeatureAvailable ? "اختر العميل" : "البيع النقدي فقط"} />
              </SelectTrigger>
              <SelectContent>
                {isCustomersFeatureAvailable ? (
                  <>
                    {customers
                      .filter(customer => customer.id !== 999)
                      .map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
                      ))
                    }
                    <SelectItem value="999">البيع النقدي فقط</SelectItem>
                  </>
                ) : (
                  customers
                    .filter(customer => customer.id === 999)
                    .map(customer => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            
            <div className="flex gap-1">
              {/* Clear Customer Button */}
              {isCustomersFeatureAvailable && customer_id && customer_id !== 999 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onSetCustomer(999)}
                        className="h-10 w-10 text-orange-600 border-2 border-orange-300 hover:bg-orange-50 shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>إلغاء اختيار العميل</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Add Customer Button */}
              {isCustomersFeatureAvailable && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={onAddCustomer}
                        className="h-10 w-10 text-green-600 border-2 border-green-300 hover:bg-green-50 shadow-md"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>إضافة عميل جديد</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          {/* Customer Balance Display */}
          {customer_id && customer_id !== 999 && (
            (() => {
              const selectedCustomer = customers.find(c => c.id === customer_id);
              if (selectedCustomer && selectedCustomer.current_balance !== undefined) {
                return (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border min-w-0">
                    <div className="flex items-center justify-between text-sm min-w-0">
                      <span className="text-gray-600 flex-shrink-0">رصيد العميل:</span>
                      <span className={`font-semibold flex-shrink-0 ${selectedCustomer.current_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(selectedCustomer.current_balance)}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}
        </div>

        {/* Cart Items */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 flex-1">
            <ShoppingCart className="h-16 w-16 mb-4 text-gray-400" />
            <p className="text-lg">السلة فارغة</p>
            <p className="text-sm text-gray-400">قم بإضافة منتجات من القائمة</p>
          </div>
        ) : (
          <>
            {/* Hint for clickable items */}
            <div 
              className="mb-2 p-2 rounded-lg text-xs text-center"
              style={{ 
                backgroundColor: colors?.primary.light || '#dbeafe',
                color: colors?.primary.DEFAULT || '#3B82F6'
              }}
            >
              انقر على أي منتج لتعديل الكمية باستخدام لوحة الأرقام
            </div>
          <div className="overflow-x-auto rounded-lg border min-w-0">
            <table className="w-full text-sm min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-3 text-right font-medium text-gray-900 min-w-0">المنتج</th>
                  <th className="px-2 py-3 text-center font-medium text-gray-900 w-24 flex-shrink-0">الكمية</th>
                  <th className="px-2 py-3 text-center font-medium text-gray-900 w-20 flex-shrink-0">السعر</th>
                  <th className="px-2 py-3 text-center font-medium text-gray-900 w-24 flex-shrink-0">المجموع</th>
                  <th className="px-2 py-3 text-center font-medium text-gray-900 w-12 flex-shrink-0">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cart.map((item, index) => (
                  <CartItemRow
                    key={item.product_id}
                    item={item}
                    index={index}
                    onQuantityChange={onQuantityChange}
                    onUpdateItemUnitType={onUpdateItemUnitType}
                    onRemoveItem={onRemoveItem}
                    allowNegativeStock={allowNegativeStock}
                    onCartItemSelect={onCartItemSelect}
                    isSelected={selectedCartItemId === item.product_id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="rounded-xl shadow-xl bg-gray-50 p-4 mt-3 flex-shrink-0 min-w-0 border-2" style={{ borderColor: colors?.primary.DEFAULT || '#3B82F6' }}>
            <div className="flex justify-between text-base min-w-0 font-semibold">
              <span style={{ color: colors?.text.primary || '#1e293b' }}>المجموع الفرعي:</span>
              <span className="flex-shrink-0 font-bold" style={{ color: colors?.text.primary || '#1e293b' }}>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold border-t-2 pt-3 mt-2 min-w-0" style={{ borderColor: colors?.primary.DEFAULT || '#3B82F6' }}>
              <span style={{ color: colors?.primary.DEFAULT || '#3B82F6' }}>الإجمالي:</span>
              <span className="flex-shrink-0" style={{ color: colors?.primary.DEFAULT || '#3B82F6' }}>{formatCurrency(total)}</span>
            </div>

            {/* Payment Section */}
            <div className="flex flex-col gap-3 mt-4 flex-shrink-0 min-w-0">
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <Button 
                  variant={payment_method === 'cash' ? 'default' : 'outline'} 
                  className={`flex-1 min-w-0 h-12 font-bold text-base border-2 shadow-md ${payment_method === 'cash' ? '' : ''}`}
                  onClick={() => onSetPaymentMethod('cash')}
                  style={{
                    backgroundColor: payment_method === 'cash' ? colors?.primary.DEFAULT || '#3B82F6' : colors?.background.DEFAULT || '#ffffff',
                    color: payment_method === 'cash' ? colors?.text.inverted || '#ffffff' : colors?.primary.DEFAULT || '#3B82F6',
                    borderColor: colors?.primary.DEFAULT || '#3B82F6'
                  }}
                >
                  نقدي
                </Button>
                <Button 
                  variant={payment_method === 'card' ? 'default' : 'outline'} 
                  className={`flex-1 min-w-0 h-12 font-bold text-base border-2 shadow-md ${payment_method === 'card' ? '' : ''}`}
                  onClick={() => onSetPaymentMethod('card')}
                  style={{
                    backgroundColor: payment_method === 'card' ? colors?.primary.DEFAULT || '#3B82F6' : colors?.background.DEFAULT || '#ffffff',
                    color: payment_method === 'card' ? colors?.text.inverted || '#ffffff' : colors?.primary.DEFAULT || '#3B82F6',
                    borderColor: colors?.primary.DEFAULT || '#3B82F6'
                  }}
                >
                  بطاقة
                </Button>
              </div>

              <div className="flex gap-2 mt-2 min-w-0">
                <div className="flex-1 relative min-w-0">
                  <Input 
                    type="number" 
                    value={paid_amount} 
                    onChange={e => onSetPaidAmount(parseFloat(e.target.value) || 0)} 
                    onFocus={() => onPaidAmountSelect && onPaidAmountSelect()}
                    className="flex-1 min-w-0 pr-12 h-12 text-lg font-semibold border-2 shadow-md" 
                    placeholder="المبلغ المدفوع" 
                    style={{
                      borderColor: colors?.primary.DEFAULT || '#3B82F6'
                    }}
                  />
                  {onPaidAmountSelect && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 transform -translate-y-1/2 h-10 w-10"
                      onClick={onPaidAmountSelect}
                      style={{
                        color: colors?.primary.DEFAULT || '#3B82F6'
                      }}
                    >
                      <Calculator className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="text-lg whitespace-nowrap flex-shrink-0 font-bold" style={{ color: colors?.text.primary || '#1e293b' }}>
                  المتبقي: <span className="font-bold" style={{ color: colors?.accent.danger || '#ef4444' }}>{formatCurrency(total - paid_amount)}</span>
                </div>
              </div>
              
              {/* Sale Type Indicator */}
              {(() => {
                if (isAnonymous) {
                  return (
                    <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg min-w-0 shadow-md">
                      <div className="flex items-center gap-2 text-sm text-green-800 min-w-0 font-semibold">
                        <span className="truncate min-w-0">بيع نقدي - سيتم إنشاء فاتورة مدفوعة: {formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                } else if (paid_amount > 0 && paid_amount < total) {
                  return (
                    <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg min-w-0 shadow-md">
                      <div className="flex items-center gap-2 text-sm text-blue-800 min-w-0 font-semibold">
                        <span className="truncate min-w-0">سيتم إنشاء فاتورة جزئية: مدفوع {formatCurrency(paid_amount)} من {formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                } else if (paid_amount >= total) {
                  const excessAmount = paid_amount - total;
                  if (excessAmount > 0) {
                    return (
                      <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg min-w-0 shadow-md">
                        <div className="flex items-center gap-2 text-sm text-purple-800 min-w-0 font-semibold">
                          <span className="truncate min-w-0">سيتم إنشاء فاتورة مدفوعة: {formatCurrency(total)}</span>
                          <div className="text-xs text-purple-600 mt-1 flex-shrink-0">
                            المبلغ الزائد ({formatCurrency(excessAmount)}) سيتم إضافته إلى رصيد العميل
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg min-w-0 shadow-md">
                        <div className="flex items-center gap-2 text-sm text-green-800 min-w-0 font-semibold">
                          <span className="truncate min-w-0">سيتم إنشاء فاتورة مدفوعة: {formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  }
                } else {
                  return (
                    <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg min-w-0 shadow-md">
                      <div className="flex items-center gap-2 text-sm text-orange-800 min-w-0 font-semibold">
                        <span className="truncate min-w-0">سيتم إنشاء فاتورة غير مدفوعة: {formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                }
              })()}

              <div className="grid grid-cols-2 gap-3 mt-4 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        className="bg-primary text-white text-base py-3 rounded-lg hover:bg-primary/90 transition-colors w-full min-w-0 font-bold border-2 shadow-md"
                        onClick={onCreateSale}
                        disabled={posLoading || cart.length === 0 || salesLoading}
                        style={{
                          backgroundColor: colors?.primary.DEFAULT || '#3B82F6',
                          borderColor: colors?.primary.DEFAULT || '#3B82F6'
                        }}
                      >
                        {(posLoading || salesLoading) ? <Loader2 className="h-5 w-5 ml-2 animate-spin" /> : <Printer className="h-5 w-5 ml-2" />}
                        <span className="truncate min-w-0">
                          {(() => {
                            if (posLoading || salesLoading) {
                              return 'جاري إنشاء الفاتورة...';
                            } else if (cart.length === 0) {
                              return 'لا توجد سلع في السلة';
                            } else {
                              return 'إنشاء الفاتورة';
                            }
                          })()}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>إنشاء فاتورة جديدة</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        className="text-base py-3 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-0 font-bold border-2 shadow-md"
                        onClick={onOpenReceiptBill}
                        disabled={cart.length === 0}
                        style={{
                          borderColor: colors?.primary.DEFAULT || '#3B82F6',
                          color: colors?.primary.DEFAULT || '#3B82F6'
                        }}
                      >
                        <Eye className="h-5 w-5 ml-2" />
                        <span className="truncate min-w-0">
                          معاينة الفاتورة
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>معاينة الفاتورة قبل الطباعة</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

POSCartSection.displayName = 'POSCartSection';

export default POSCartSection; 