import React, { memo, useCallback, useState } from 'react';
import { Search, Plus, Package, Info, Loader2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { Product } from '@/features/inventory/inventoryService';
import { getProductPrice, getSimplePriceDisplay, getCurrencyIndicator } from '@/utils/currencyConversion';
import ManualPriceModal from './ManualPriceModal';

interface POSProductGridProps {
  products: Product[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  onAddToCart: (product: Product) => void;
  onProductSelect: (product: Product) => void;
  onLoadMore?: () => void;
  showLoadMore?: boolean;
  onManualItemAdd?: (price: number, quantity: number, notes?: string) => void;
  settings?: {
    exchangeRate: number;
    currency: string;
    language: string;
    allowNegativeStock: boolean;
  };
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

// Optimized Grid Product Card
const GridProductCard = memo(({ product, onAddToCart, onProductSelect, settings, colors }: { 
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductSelect?: (product: Product) => void;
  settings?: {
    exchangeRate: number;
    currency: string;
    language: string;
    allowNegativeStock: boolean;
  };
  colors?: POSProductGridProps['colors'];
}) => {

  const isOutOfStock = settings?.allowNegativeStock ? false : product.current_stock <= 0;
  const isLowStock = product.current_stock > 0 && product.current_stock <= product.min_stock;
  const hasBoxOption = product.units_per_box && product.units_per_box > 1;
  
  // Calculate price with currency conversion if settings are available
  const priceInfo = settings && settings.exchangeRate ? getProductPrice(
    product,
    settings.exchangeRate,
    {
      exchangeRate: settings.exchangeRate,
      localCurrency: settings.currency || 'IQD',
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
  
  const handleClick = useCallback(() => {
    
    const canAdd = settings?.allowNegativeStock || product.current_stock > 0;
    
    
    if (canAdd) {
      onAddToCart(product);
    }
  }, [product, onAddToCart, settings?.allowNegativeStock]);
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-50 hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        "rounded-sm h-[60px] flex flex-col",
        isOutOfStock && "opacity-60 hover:opacity-70"
      )}
      style={{
        backgroundColor: colors?.pos.productCard || '#ffffff',
        border: `1px solid ${colors?.pos.productCardBorder || '#e2e8f0'}`,
        borderColor: isOutOfStock ? colors?.accent.danger || '#ef4444' : colors?.pos.productCardBorder || '#e2e8f0'
      }}
      role="article"
      aria-label={`${product.name} - ${formatCurrency(product.selling_price)}`}
      onClick={handleClick}
    >
      <div className="p-1 pb-0 flex-1">
        <div className="absolute top-1 left-1 z-10">
          {isOutOfStock && (
            <Badge variant="destructive" className="text-[6px] px-1.5 py-0.5 font-medium">
              غير متوفر
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="secondary" className="text-[6px] px-1.5 py-0.5 font-medium bg-orange-100 text-orange-700">
              منخفض
            </Badge>
          )}
          {hasBoxOption && (
            <Badge variant="outline" className="text-[6px] px-1.5 py-0.5 font-medium bg-blue-50 text-blue-700 border-blue-200">
              علبة
            </Badge>
          )}
        </div>

        <div className="mt-1">
          <h3 
            className="font-semibold text-sm leading-tight text-gray-900 line-clamp-2 text-center min-h-[40px] flex items-center justify-center" 
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
      </div>
    </Card>
  );
});

// Optimized List Product Card
const ListProductCard = memo(({ product, onAddToCart, onProductSelect, settings }: { 
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductSelect: (product: Product) => void;
  settings?: {
    exchangeRate: number;
    currency: string;
    language: string;
    allowNegativeStock: boolean;
  };
}) => {

  const isOutOfStock = settings?.allowNegativeStock ? false : product.current_stock <= 0;
  const isLowStock = product.current_stock > 0 && product.current_stock <= product.min_stock;
  const hasBoxOption = product.units_per_box && product.units_per_box > 1;

  // Calculate price with currency conversion if settings are available
  const priceInfo = settings && settings.exchangeRate ? getProductPrice(
    product,
    settings.exchangeRate,
    {
      exchangeRate: settings.exchangeRate,
      localCurrency: settings.currency || 'IQD',
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

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const canAdd = settings?.allowNegativeStock || product.current_stock > 0;
    
    
    if (canAdd) {
      onAddToCart(product);
    }
  }, [product, onAddToCart, settings?.allowNegativeStock]);

  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onProductSelect(product);
  }, [product, onProductSelect]);

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:bg-gray-50 rounded-lg border bg-white",
        isOutOfStock && "opacity-60"
      )}
      role="article"
      aria-label={`${product.name} - ${formatCurrency(product.selling_price)}`}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          <Package className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate" title={product.name}>
                {product.name}
              </h3>
              <p className="text-primary font-bold text-base mt-0.5">
                {getSimplePriceDisplay(priceInfo)}
                {product.is_dolar && (
                  <span className="text-xs text-blue-600 ml-1">
                    {getCurrencyIndicator(product.is_dolar, settings?.language || 'ar')}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  المخزون: {product.current_stock} {product.unit}
                </span>
                {hasBoxOption && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                    علبة ({product.units_per_box} قطعة)
                  </Badge>
                )}
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">غير متوفر</Badge>
                )}
                {isLowStock && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-orange-100 text-orange-700">منخفض</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleInfoClick}
                      className="h-7 w-7 hover:bg-gray-100"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>عرض التفاصيل</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button 
                variant="default" 
                size="icon"
                onClick={handleAddClick}
                disabled={isOutOfStock}
                className={cn(
                  "h-7 w-7 transition-all",
                  isOutOfStock 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100" 
                    : "bg-primary hover:bg-primary/90 text-white"
                )}
              >
                {isOutOfStock ? (
                  <Info className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

// Other Materials Card Component
const OtherMaterialsCard = memo(({ 
  viewMode, 
  onManualItemAdd 
}: { 
  viewMode: 'grid' | 'list';
  onManualItemAdd?: (price: number, quantity: number, notes?: string) => void;
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = useCallback(() => {
    if (onManualItemAdd) {
      setShowModal(true);
    }
  }, [onManualItemAdd]);

  const handleConfirm = useCallback((price: number, quantity: number, notes?: string) => {
    if (onManualItemAdd) {
      onManualItemAdd(price, quantity, notes);
    }
  }, [onManualItemAdd]);

  if (viewMode === 'grid') {
    return (
      <>
        <Card 
          className="group relative overflow-hidden transition-all duration-50 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-sm h-[60px] flex flex-col"
          role="article"
          aria-label="مواد اخرى - إضافة يدوية"
          onClick={handleClick}
        >
          <div className="p-1 pb-0 flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <Edit3 className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-sm text-orange-800">مواد اخرى</span>
            </div>
            <div className="text-xs text-orange-600 mt-1">إضافة يدوية</div>
          </div>
        </Card>
        
        <ManualPriceModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      </>
    );
  }

  return (
    <>
      <Card 
        className="transition-all duration-200 hover:shadow-md hover:bg-orange-50 rounded-lg border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100"
        role="article"
        aria-label="مواد اخرى - إضافة يدوية"
        onClick={handleClick}
      >
        <div className="p-3 flex items-center gap-3">
          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-orange-200 flex items-center justify-center">
            <Edit3 className="h-6 w-6 text-orange-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-orange-800 truncate">
                  مواد اخرى
                </h3>
                <p className="text-orange-600 text-sm mt-0.5">
                  إضافة يدوية
                </p>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button 
                  variant="default" 
                  size="icon"
                  onClick={handleClick}
                  className="h-7 w-7 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <ManualPriceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
});

const POSProductGrid = memo(({ 
  products, 
  viewMode, 
  onAddToCart, 
  onProductSelect, 
  onLoadMore,
  showLoadMore = false,
  loading = false,
  onManualItemAdd,
  settings,
  colors
}: POSProductGridProps) => {
  
  
  

  const ProductCard = viewMode === 'grid' ? GridProductCard : ListProductCard;
  const containerClass = viewMode === 'grid' 
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 overflow-y-auto flex-1 p-2"
    : "space-y-2 overflow-y-auto flex-1";

  // Ensure products is an array
  const productsArray = Array.isArray(products) ? products : [];

  if (productsArray.length === 0 && !loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-12"
        style={{ color: colors?.text.muted || '#94a3b8' }}
      >
        <Search className="h-16 w-16 mb-4" />
        <p className="text-lg">لا توجد نتائج</p>
        <p className="text-sm">جرب البحث بكلمات مختلفة</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className={containerClass}>
        {/* Other Materials Card - Always shown first */}
        <OtherMaterialsCard 
          viewMode={viewMode}
          onManualItemAdd={onManualItemAdd}
        />
        
        {/* Regular Products */}
        {productsArray.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={onAddToCart}
            onProductSelect={onProductSelect}
            settings={settings}
            colors={colors}
          />
        ))}
      </div>
      
      {showLoadMore && onLoadMore && (
        <div 
          className="flex justify-center p-4 border-t"
          style={{ borderColor: colors?.border.light || '#e2e8f0' }}
        >
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
            className="flex items-center gap-2"
            style={{
              borderColor: colors?.pos.cardBorder || '#e2e8f0',
              color: colors?.text.primary || '#1e293b'
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            تحميل المزيد
          </Button>
        </div>
      )}
    </div>
  );
});

POSProductGrid.displayName = 'POSProductGrid';

export default POSProductGrid; 