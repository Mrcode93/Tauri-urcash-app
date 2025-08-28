import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Package, Plus } from 'lucide-react';
import { Product } from '@/features/inventory/inventoryService';
import AddProductFromPurchase from './AddProductFromPurchase';

interface ProductSearchSelectProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
  supplierId?: number;
  purchasePrice?: number;
  showAddNew?: boolean;
  onProductCreated?: (product: Product) => void;
}

const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  onProductSelect,
  placeholder = "ابحث عن المنتج...",
  className = "",
  supplierId,
  purchasePrice = 0,
  showAddNew = false,
  onProductCreated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products.slice(0, 10)); // Show first 10 products when empty
    } else {
      const filtered = products.filter(product => {
        const query = searchQuery.toLowerCase();
        return (
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
        );
      }).slice(0, 10); // Limit to 10 results
      setFilteredProducts(filtered);
    }
    setSelectedIndex(-1);
  }, [searchQuery, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if dialog is open
      if (isDialogOpen) return;
      
      // Check if the click is on a dialog or its content
      const target = event.target as Element;
      const isDialogClick = target.closest('[role="dialog"]') || 
                           target.closest('[data-radix-dialog-content]') ||
                           target.closest('[data-radix-dialog-overlay]');
      
      if (containerRef.current && !containerRef.current.contains(target) && !isDialogClick) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDialogOpen]);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-10 pl-10 text-right"
          dir="rtl"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute left-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && filteredProducts.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleProductSelect(product)}
            >
              <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </div>
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>SKU: {product.sku}</span>
                  {product.barcode && <span>باركود: {product.barcode}</span>}
                </div>
                {product.current_stock !== undefined && (
                  <div className="text-xs text-gray-400">
                    المخزون: {product.current_stock} {product.unit || 'قطعة'}
                  </div>
                )}
              </div>
              <div className="text-sm font-medium text-green-600 flex-shrink-0">
                {product.purchase_price ? `${product.purchase_price} د.ع` : 'غير محدد'}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && searchQuery && filteredProducts.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center">
          <div className="text-gray-500 mb-3">
            لا توجد منتجات تطابق البحث
          </div>
          {showAddNew && searchQuery.trim().length > 0 && (
            <div className="border-t pt-3">
              <div className="text-sm text-gray-600 mb-2">
                هل تريد إضافة منتج جديد؟
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <AddProductFromPurchase
                  onProductCreated={(newProduct) => {
                    // Call the parent's onProductCreated callback if provided
                    if (onProductCreated) {
                      onProductCreated(newProduct);
                    }
                    // Also select the product
                    onProductSelect(newProduct);
                    setSearchQuery('');
                    setIsOpen(false);
                    setSelectedIndex(-1);
                    setIsDialogOpen(false);
                  }}
                  supplierId={supplierId}
                  purchasePrice={purchasePrice}
                  className="w-full"
                  onOpenChange={(open) => setIsDialogOpen(open)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchSelect; 