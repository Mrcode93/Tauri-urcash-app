import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { createSelector } from '@reduxjs/toolkit';
import { getProductsForPOS } from '@/features/inventory/inventorySlice';
import { getCustomers, createCustomer } from '@/features/customers/customersSlice';
import { createSale } from '@/features/sales/salesSlice';
import { CashBoxGuard } from '@/components/CashBoxGuard';
import type { SaleData, CreateSaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { Product } from '@/features/inventory/inventoryService';
import inventoryService from '@/features/inventory/inventoryService';
import { 
  addToCart, 
  addToCartWithUnit,
  updateQuantity, 
  updateItemUnitType,
  removeFromCart, 
  clearCart, 
  setCustomer,
  setPaymentMethod,
  setPaidAmount,
  setSearchQuery,
  createSession,
  switchSession,
  removeSession,
  addManualItemToCart
} from '@/features/pos/posSlice';
import { formatCurrency } from '@/lib/utils';
import { toast, updateToastColorsFromSettings } from '@/lib/toast';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { licenseService } from '@/services/licenseService';
import { useLicense } from '@/contexts/LicenseContext';
import { useSettings } from '@/features/settings/useSettings';
import { useBillModal } from '@/hooks/useBillModal';
import { usePrintBill } from '@/hooks/usePrintBill';
import { toBillReceiptSale } from '@/components/BillReceipt';
import { printBill } from '@/utils/printUtils';
import { useGlobalShortcuts, SHORTCUT_KEYS } from '@/hooks/useGlobalShortcuts';
import CustomerForm from '@/components/CustomerForm';
import BillModal from '@/components/BillModal';
import POSHeader from './POSHeader';
import POSCartSection from './POSCartSection';
import POSProductGrid from './POSProductGrid';
import POSModals from './POSModals';
import NumbersKeyboard from './NumbersKeyboard';

// Helper function to convert settings paper size to printer type
const getPrinterTypeFromSettings = (paperSize?: string): 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm' => {
  switch (paperSize) {
    case 'thermal':
    case 'thermal-80mm':
      return 'thermal-80mm';
    case 'thermal-58mm':
      return 'thermal-58mm';
    case 'a4':
    default:
      return 'a4';
  }
};

// Optimized selectors with deep equality checks
const selectInventory = createSelector(
  (state: RootState) => state.inventory,
  (inventory) => ({
    posProducts: inventory.posProducts || [],
    posProductsLoading: inventory.posProductsLoading || false
  })
);

const selectCustomers = createSelector(
  (state: RootState) => state.customers,
  (customers) => ({
    items: customers.items || [],
    loading: customers.loading || false
  })
);

const selectPOS = createSelector(
  (state: RootState) => state.pos,
  (pos) => ({
    sessions: pos.sessions || {},
    activeSessionId: pos.activeSessionId || '',
    loading: pos.loading || false
  })
);

const selectCurrentSession = createSelector(
  selectPOS,
  (pos) => pos.sessions[pos.activeSessionId]
);

// Memoized components
const ProductSkeleton = React.memo(() => (
  <div className="bg-white rounded-lg shadow-sm p-4">
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-10 w-full mb-2" />
    <Skeleton className="h-8 w-full" />
  </div>
));

const POSMain = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { posProducts: products, posProductsLoading: productsLoading } = useSelector(selectInventory);
  const { items: customers, loading: customersLoading } = useSelector(selectCustomers);
  const { sessions, activeSessionId, loading: posLoading } = useSelector(selectPOS);
  const session = useSelector(selectCurrentSession);
  const { loading: salesLoading } = useSelector((state: { sales: { loading: boolean } }) => state.sales);
  
  // Ref to track if sale creation is in progress
  const isCreatingSaleRef = useRef(false);

  // Get settings using the hook for better management
  const { settings, loading: settingsLoading } = useSettings();
  
  // Enhanced color system with better contrast using app settings
  const colors = useMemo(() => {
    const primaryColor = settings?.primary_color || '#3B82F6';
    const secondaryColor = settings?.secondary_color || '#64748b';
    
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 }; // Default blue
    };
    
    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    
    // Create variations of the primary color
    const primaryLight = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`;
    const primaryMedium = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
    const primaryDark = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.8)`;
    
    // Create variations of the secondary color
    const secondaryLight = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.1)`;
    const secondaryMedium = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.3)`;
    
    return {
      primary: {
        DEFAULT: primaryColor,
        dark: primaryDark,
        light: primaryLight,
        medium: primaryMedium,
        gradient: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        glass: primaryLight,
        rgb: primaryRgb
      },
      secondary: {
        DEFAULT: secondaryColor,
        light: secondaryLight,
        medium: secondaryMedium,
        rgb: secondaryRgb
      },
      background: {
        light: '#f8fafc',
        DEFAULT: '#ffffff',
        dark: '#f1f5f9',
        glass: 'rgba(255, 255, 255, 0.8)',
        glassDark: 'rgba(0, 0, 0, 0.05)',
        primary: primaryLight,
        secondary: secondaryLight,
        // POS specific backgrounds
        pos: '#f8fafc',
        cart: '#ffffff',
        products: '#ffffff',
        header: '#ffffff'
      },
      text: {
        primary: '#1e293b',
        secondary: secondaryColor,
        inverted: '#ffffff',
        muted: '#94a3b8',
        accent: primaryColor
      },
      accent: {
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor
      },
      border: {
        light: '#e2e8f0',
        DEFAULT: '#cbd5e1',
        dark: '#94a3b8',
        primary: primaryColor,
        secondary: secondaryColor
      },
      // POS specific colors
      pos: {
        card: '#ffffff',
        cardHover: '#f8fafc',
        cardBorder: '#e2e8f0',
        cardBorderHover: primaryColor,
        button: primaryColor,
        buttonHover: primaryDark,
        buttonText: '#ffffff',
        total: primaryColor,
        totalText: '#ffffff',
        cartItem: '#f8fafc',
        cartItemHover: '#f1f5f9',
        productCard: '#ffffff',
        productCardHover: '#f8fafc',
        productCardBorder: '#e2e8f0',
        productCardBorderHover: primaryColor,
        searchBar: '#ffffff',
        searchBarBorder: '#e2e8f0',
        searchBarFocus: primaryColor
      }
    };
  }, [settings?.primary_color, settings?.secondary_color]);
  
  // Memoize the settings object to prevent infinite re-renders
  const memoizedSettings = useMemo(() => {
    
    
    if (!settings) {
      
      return {
        exchangeRate: 1.00,
        currency: 'IQD',
        language: 'ar',
        allowNegativeStock: false
      };
    }
    
    const rate = settings.exchange_rate || 1.00;
    // Limit exchange rate to prevent infinity issues
    const limitedRate = rate > 10000 ? 1000 : rate;
    
    const result = {
      exchangeRate: limitedRate,
      currency: settings.currency || 'IQD',
      language: settings.language || 'ar',
      allowNegativeStock: settings.allow_negative_stock || false
    };
    
    
    return result;
  }, [settings]);
  

  
  // Memoized session data
  const cart = useMemo(() => session?.cart || [], [session?.cart]);
  const customer_id = useMemo(() => session?.customer_id || null, [session?.customer_id]);
  const payment_method = useMemo(() => session?.payment_method || 'cash', [session?.payment_method]);
  const paid_amount = useMemo(() => session?.paid_amount || 0, [session?.paid_amount]);
  const searchQuery = useMemo(() => session?.searchQuery || '', [session?.searchQuery]);
  
  const { licenseData, hasFeatureAccess } = useLicense();
  const { modalState: billModal, showBillModal, closeBillModal } = useBillModal();
  
  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: getPrinterTypeFromSettings(settings?.bill_paper_size)
  });

  // Function to open receipt bill in new tab (same logic as bills page)
  const openReceiptBillInNewTab = useCallback(async (sale: SaleData, customer?: Customer | null) => {
    try {
      // Determine printer type from settings
      const printerType = getPrinterTypeFromSettings(settings?.bill_paper_size);
      
      // Use the printBill function with showPreview: true to open in new tab
      const result = await printBill({
        sale,
        customer,
        settings,
        products,
        cartItems: cart,
        printerType,
        copies: 1,
        showPreview: true
      });

      if (!result.success) {
        toast.error(result.message || 'حدث خطأ أثناء فتح الفاتورة');
      }
    } catch (error) {
      console.error('Error opening receipt bill:', error);
      toast.error('حدث خطأ أثناء فتح الفاتورة');
    }
  }, [products, cart, settings]);


  
  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Numbers keyboard state
  const [showNumbersKeyboard, setShowNumbersKeyboard] = useState(false);
  const [keyboardValue, setKeyboardValue] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(null);
  const [keyboardMode, setKeyboardMode] = useState<'cart' | 'paid'>('cart');
  
  // Enhanced bill data state
  const [enhancedBillData, setEnhancedBillData] = useState<{
    products: Product[];
    cartItems: Array<{
      product_id: number;
      quantity: number;
      price: number;
      name: string;
      product_name: string;
      unit: string;
      description: string;
      total: number;
    }>;
  }>({ products: [], cartItems: [] });

  // Data loading state tracking
  const [dataInitialized, setDataInitialized] = useState(false);
  const productsLoadedRef = useRef(false);
  const customersLoadedRef = useRef(false);

  // Memoized calculations
  const calculateTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  // Function to handle opening receipt bill preview from cart
  const handleOpenReceiptBillPreview = useCallback(() => {
    // Create a temporary sale object from current cart for preview
    if (cart.length === 0) {
      toast.error('لا توجد منتجات في السلة');
      return;
    }

    const tempSale: SaleData = {
      id: 0,
      invoice_no: 'معاينة',
      barcode: '',
      invoice_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_amount: calculateTotal(),
      discount_amount: 0,
      tax_amount: 0,
      net_amount: calculateTotal(),
      payment_method: payment_method,
      payment_status: 'unpaid',
      paid_amount: paid_amount,
      remaining_amount: calculateTotal() - paid_amount,
      customer_id: customer_id,
      customer_name: customers.find(c => c.id === customer_id)?.name || 'زبون نقدي',
      notes: '',
      status: 'completed',
      items: cart.map(item => ({
        id: item.product_id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        discount_percent: item.discount || 0,
        tax_percent: 0,
        line_total: item.total,
        unit: item.unit,
        returned_quantity: 0
      }))
    };

    const customer = customers.find(c => c.id === customer_id) || null;
    openReceiptBillInNewTab(tempSale, customer);
  }, [cart, calculateTotal, payment_method, paid_amount, customer_id, customers, openReceiptBillInNewTab]);

  const calculateProfit = useCallback(() => {
    let totalProfit = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    const profitDetails = cart.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const purchasePrice = product?.purchase_price || 0;
      const sellingPrice = item.price;
      const quantity = item.quantity;
      
      const itemCost = purchasePrice * quantity;
      const itemRevenue = sellingPrice * quantity;
      const itemProfit = itemRevenue - itemCost;
      
      totalCost += itemCost;
      totalRevenue += itemRevenue;
      totalProfit += itemProfit;
      
      return {
        name: item.name,
        quantity,
        costPrice: purchasePrice,
        sellingPrice,
        itemCost,
        itemRevenue,
        itemProfit,
        profitMargin: sellingPrice > 0 ? ((itemProfit / itemRevenue) * 100) : 0
      };
    });

    return {
      totalCost,
      totalRevenue,
      totalProfit,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0,
      profitDetails
    };
  }, [cart, products]);

  // Optimized filtered products with memoization
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const q = searchQuery.toLowerCase();
    return products.filter(product => (
      (product.name && product.name.toLowerCase().includes(q)) ||
      (product.barcode && product.barcode.toLowerCase().includes(q)) ||
      (product.sku && product.sku.toLowerCase().includes(q)) ||
      (product.description && product.description.toLowerCase().includes(q)) ||
      (product.unit && product.unit.toLowerCase().includes(q))
    ));
  }, [products, searchQuery]);

  // Load products when search query changes (debounced)
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        dispatch(getProductsForPOS({ 
          search: searchQuery.trim(), 
          limit: 20 
        }));
      }, 500); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
    // Removed the else condition that was causing repeated calls
  }, [searchQuery, dispatch]); // Removed dataInitialized from dependencies

  // Load more products when needed
  const handleLoadMoreProducts = useCallback(() => {
    if (!productsLoading && !searchQuery.trim()) {
      dispatch(getProductsForPOS({ 
        limit: products.length + 10 
      }));
    }
  }, [dispatch, productsLoading, searchQuery, products.length]);

  // Memoized handlers
  const handleAddToCart = useCallback((product: Product) => {
    // Get converted price for USD products
    let pricePerPiece;
    if (product.is_dolar && settings?.exchange_rate) {
      // Convert USD price to local currency
      const convertedPrice = product.selling_price * settings.exchange_rate;
      pricePerPiece = product.units_per_box && product.units_per_box > 1 
        ? convertedPrice / product.units_per_box 
        : convertedPrice;
    } else {
      // Use original price for local currency products
      pricePerPiece = product.units_per_box && product.units_per_box > 1 
        ? product.selling_price / product.units_per_box 
        : product.selling_price;
    }
    
    dispatch(addToCartWithUnit({ 
      product, 
      quantity: 1, 
      unitType: 'piece', 
      price: pricePerPiece,
      allowNegativeStock: settings?.allow_negative_stock || false
    }));
  }, [dispatch, settings?.allow_negative_stock, settings?.exchange_rate]);

  const handleAddToCartWithUnit = useCallback((product: Product, quantity: number, unitType: 'piece' | 'box', price: number) => {
    dispatch(addToCartWithUnit({ 
      product, 
      quantity, 
      unitType, 
      price,
      allowNegativeStock: settings?.allow_negative_stock || false
    }));
  }, [dispatch, settings?.allow_negative_stock]);

  const handleQuantityChange = useCallback((productId: number, change: number) => {
    dispatch(updateQuantity({ 
      productId, 
      change,
      allowNegativeStock: settings?.allow_negative_stock || false
    }));
  }, [dispatch, settings?.allow_negative_stock]);

  const handleUpdateItemUnitType = useCallback((productId: number, unitType: 'piece' | 'box') => {
    dispatch(updateItemUnitType({ productId, unitType }));
  }, [dispatch]);

  const handleRemoveItem = useCallback((productId: number) => {
    dispatch(removeFromCart(productId));
  }, [dispatch]);

  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleManualItemAdd = useCallback((price: number, quantity: number, notes?: string) => {
    dispatch(addManualItemToCart({ price, quantity, notes }));
  }, [dispatch]);

  // Numbers keyboard handlers
  const handleNumberPress = useCallback((number: string) => {
    setKeyboardValue(prev => {
      // Prevent multiple decimal points
      if (number === '.' && prev.includes('.')) return prev;
      // Limit to reasonable length
      if (prev.length >= 10) return prev;
      // Handle leading zero
      if (prev === '0' && number !== '.') return number;
      return prev + number;
    });
  }, []);

  const handleKeyboardEnter = useCallback(() => {
    const value = parseFloat(keyboardValue);
    if (!isNaN(value) && value >= 0) {
      if (keyboardMode === 'cart' && selectedCartItemId !== null) {
        // Update the quantity of the selected cart item
        const cartItem = cart.find(item => item.product_id === selectedCartItemId);
        if (cartItem) {
          const quantityDiff = value - cartItem.quantity;
          handleQuantityChange(selectedCartItemId, quantityDiff);
        }
        setSelectedCartItemId(null);
      } else if (keyboardMode === 'paid') {
        // Update the paid amount
        dispatch(setPaidAmount(value));
      }
      setKeyboardValue('');
    }
  }, [keyboardValue, selectedCartItemId, cart, handleQuantityChange, keyboardMode, dispatch]);

  const handleKeyboardClear = useCallback(() => {
    setKeyboardValue('');
  }, []);

  const handleKeyboardBackspace = useCallback(() => {
    setKeyboardValue(prev => prev.slice(0, -1));
  }, []);

  const handleCartItemSelect = useCallback((productId: number) => {
    setSelectedCartItemId(productId);
    setKeyboardMode('cart');
    const cartItem = cart.find(item => item.product_id === productId);
    if (cartItem) {
      setKeyboardValue(cartItem.quantity.toString());
      setShowNumbersKeyboard(true);
    }
  }, [cart]);

  const handlePaidAmountSelect = useCallback(() => {
    setKeyboardMode('paid');
    setKeyboardValue(paid_amount.toString());
    setShowNumbersKeyboard(true);
  }, [paid_amount]);

  const isCustomersFeatureAvailable = useCallback(() => {
    if (!licenseData) return false;
    return hasFeatureAccess('customers');
  }, [licenseData, hasFeatureAccess]);

  // Handle customer creation success
  const handleCustomerCreated = useCallback(async (newCustomer: Customer) => {
    // Refresh customers list
    await dispatch(getCustomers({ limit: 100 }));
    // Auto-select the new customer
    dispatch(setCustomer(newCustomer.id));
    // Close the modal
    setIsCustomerModalOpen(false);
  }, [dispatch]);

  // Barcode scanning handlers
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    try {
      
      
      
      const product = await inventoryService.getProductByBarcode(barcode);
      
      
      if (product) {
        // Check if product is in stock or if negative stock is allowed
        const canAddToCart = settings?.allow_negative_stock || product.current_stock > 0;
        
        
        if (canAddToCart) {
          // Get converted price for USD products
          let pricePerPiece;
          if (product.is_dolar && settings?.exchange_rate) {
            // Convert USD price to local currency
            const convertedPrice = product.selling_price * settings.exchange_rate;
            pricePerPiece = product.units_per_box && product.units_per_box > 1 
              ? convertedPrice / product.units_per_box 
              : convertedPrice;
          } else {
            // Use original price for local currency products
            pricePerPiece = product.units_per_box && product.units_per_box > 1 
              ? product.selling_price / product.units_per_box 
              : product.selling_price;
          }
          
          dispatch(addToCartWithUnit({ 
            product, 
            quantity: 1, 
            unitType: 'piece', 
            price: pricePerPiece,
            allowNegativeStock: settings?.allow_negative_stock || false
          }));
        } else {
          toast.error(`${product.name} غير متوفر في المخزون`);
        }
      } else {
        toast.error('لم يتم العثور على المنتج');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      if (error instanceof Error && 'code' in error && error.code === 'PRODUCT_NOT_FOUND') {
        toast.error('لم يتم العثور على المنتج');
      } else {
        toast.error('حدث خطأ أثناء البحث عن المنتج');
      }
    } finally {
      setIsScanning(false);
      setShowBarcodeModal(false);
    }
  }, [dispatch, settings?.allow_negative_stock, settings?.exchange_rate]);

  const handleStartBarcodeScan = useCallback(() => {
    setShowBarcodeModal(true);
    setIsScanning(true);
    // Focus the input after a short delay to ensure the modal is open
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }, []);

  // Cart tabs handlers
  const handleCreateNewCart = useCallback(() => {
    dispatch(createSession());
  }, [dispatch]);

  const handleSwitchCart = useCallback((sessionId: string) => {
    dispatch(switchSession(sessionId));
  }, [dispatch]);

  const handleRemoveCart = useCallback((sessionId: string) => {
    if (Object.keys(sessions).length > 1) {
      dispatch(removeSession(sessionId));
      toast.success('تم حذف السلة');
    } else {
      toast.error('لا يمكن حذف السلة الأخيرة');
    }
  }, [dispatch, sessions]);

  // Handle single sale creation with proper payment status and auto-print
  const handleCreateSale = useCallback(async () => {
    if (!session || cart.length === 0) return;
    
    // Prevent duplicate submissions using ref
    if (isCreatingSaleRef.current) {
      toast.error('جاري إنشاء الفاتورة، يرجى الانتظار...');
      return;
    }
    
    // Set flag to prevent duplicate submissions
    isCreatingSaleRef.current = true;
    
    try {
      const total = calculateTotal();
      const isAnonymous = !customer_id || customer_id === 999;
      
      // Generate unique barcode for this sale to prevent duplicates
      const uniqueBarcode = `SALE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Determine payment status and amount
      let paymentStatus: 'paid' | 'partial' | 'unpaid';
      let paidAmount: number;
      
      if (isAnonymous) {
        // Anonymous customers are always considered paid
        paymentStatus = 'paid';
        paidAmount = total;
      } else {
        // Regular customers: calculate based on actual payment
        paidAmount = Math.min(paid_amount, total);
        if (paidAmount >= total) {
          paymentStatus = 'paid';
        } else if (paidAmount > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'unpaid';
        }
      }
      
      // Create single sale with proper payment status and unique barcode
      const saleData: CreateSaleData = {
        customer_id: customer_id || 999,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_method: payment_method,
        payment_status: paymentStatus,
        paid_amount: paidAmount,
        notes: isAnonymous 
          ? `بيع نقدي - ${formatCurrency(total)}`
          : paymentStatus === 'paid' 
            ? `فاتورة مدفوعة - ${formatCurrency(total)}`
            : paymentStatus === 'partial'
              ? `فاتورة جزئية - مدفوع: ${formatCurrency(paidAmount)}`
              : `فاتورة غير مدفوعة - ${formatCurrency(total)}`,
        items: cart.map(item => ({
          product_id: item.product_id,
          name: item.name, // Include name for manual items
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: total,
        barcode: uniqueBarcode // Add unique barcode to prevent duplicates
      };

      const newSale = await dispatch(createSale(saleData)).unwrap();
      
      // Show notification for excess payment if applicable
      if (newSale.excess_payment) {
        const { excess_amount, customer_name, new_balance } = newSale.excess_payment;
        toast.success(
          `تم إضافة المبلغ الزائد (${excess_amount.toLocaleString()} د.ك) إلى رصيد العميل ${customer_name}. الرصيد الجديد: ${new_balance.toLocaleString()} د.ك`,
          { duration: 5000 }
        );
      }
      
      // Create enhanced cart items for display
      const cartItemsWithProductDetails = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.product_id);
        return {
          ...cartItem,
          name: product?.name || cartItem.name || `منتج ${cartItem.product_id}`,
          product_name: product?.name || cartItem.name || `منتج ${cartItem.product_id}`,
          unit: product?.unit || cartItem.unit || '',
          description: product?.description || '',
          total: cartItem.price * cartItem.quantity,
          unitType: cartItem.unitType || 'piece',
          piecesPerUnit: cartItem.piecesPerUnit || 1
        };
      });
      
      setEnhancedBillData({
        products: products,
        cartItems: cartItemsWithProductDetails
      });

      const customer = customers.find(c => c.id === customer_id) || {
        id: 999,
        name: 'زبون نقدي',
        phone: '',
        email: '',
        address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Open receipt bill in new tab (same logic as bills page)
      openReceiptBillInNewTab(newSale as SaleData, customer);
      
      // Removed auto-print functionality
      
      dispatch(clearCart());
      
      // Show success message
      toast.success('تم إنشاء الفاتورة بنجاح');
      
    } catch (error: unknown) {
      // Handle specific duplicate errors
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('duplicate') || errorMessage.includes('UNIQUE constraint failed')) {
        toast.error('تم إنشاء فاتورة مماثلة مسبقاً، يرجى التحقق من قائمة المبيعات');
      } else if (errorMessage.includes('already in progress')) {
        toast.error('جاري إنشاء الفاتورة، يرجى الانتظار...');
      } else {
        toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      }
      console.error('Sale creation error:', error);
    } finally {
      // Reset flag regardless of success or failure
      isCreatingSaleRef.current = false;
    }
  }, [session, cart, calculateTotal, customer_id, payment_method, paid_amount, dispatch, products, customers, showBillModal]);

  // Create stable callback functions
  const handleShowKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(true);
  }, [setShowKeyboardShortcuts]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  }, [viewMode, setViewMode]);

  const handlePrintSale = useCallback(() => {
    // Quick print the current sale if available
    if (session && session.cart.length > 0) {
      const customer = customers.find(c => c.id === session.customer_id);
      // TODO: Implement proper quick print for current session
      toast.error('الطباعة السريعة غير متاحة للسلة الحالية');
    } else {
      toast.error('لا توجد مبيعة للطباعة');
    }
  }, [session, customers]);

  const handleManualItem = useCallback(() => {
    // Close the NumbersKeyboard if it's open
    if (showNumbersKeyboard) {
      setShowNumbersKeyboard(false);
    }
    
    // Open manual item modal by triggering the OtherMaterialsCard click
    const manualItemButton = document.querySelector('[aria-label="مواد اخرى - إضافة يدوية"]') as HTMLElement;
    if (manualItemButton) {
      manualItemButton.click();
    }
  }, [showNumbersKeyboard]);

  const handleEscape = useCallback(() => {
    if (showKeyboardShortcuts) {
      setShowKeyboardShortcuts(false);
    } else if (showProfitModal) {
      setShowProfitModal(false);
    } else if (showBarcodeModal) {
      setShowBarcodeModal(false);
    }
  }, [showKeyboardShortcuts, setShowKeyboardShortcuts, showProfitModal, setShowProfitModal, showBarcodeModal, setShowBarcodeModal]);

  // Memoize shortcuts to prevent infinite re-renders
  const shortcuts = useMemo(() => [
    {
      key: SHORTCUT_KEYS.SHOW_KEYBOARD_SHORTCUTS,
      callback: handleShowKeyboardShortcuts,
      allowInForms: true, // Allow showing help even when typing
    },
    {
      key: SHORTCUT_KEYS.TOGGLE_VIEW_MODE,
      callback: handleToggleViewMode,
      allowInForms: false, // Don't allow view toggle when typing
    },
    {
      key: SHORTCUT_KEYS.START_BARCODE_SCAN,
      callback: handleStartBarcodeScan,
      allowInForms: false, // Don't allow barcode scan when typing
    },
    {
      key: SHORTCUT_KEYS.NEW_CART,
      callback: handleCreateNewCart,
      allowInForms: false, // Don't allow new cart when typing
    },
    {
      key: SHORTCUT_KEYS.CREATE_SALE,
      callback: handleCreateSale,
      allowInForms: false, // Don't allow create sale when typing
    },
    {
      key: SHORTCUT_KEYS.PRINT_SALE,
      callback: handlePrintSale,
      allowInForms: false, // Don't allow print when typing
    },
    {
      key: SHORTCUT_KEYS.SHOW_HELP,
      callback: handleShowKeyboardShortcuts,
      allowInForms: true, // Allow help even when typing
    },
    {
      key: 'm',
      callback: handleManualItem,
      allowInForms: false, // Don't allow manual item when typing
    },
    {
      key: SHORTCUT_KEYS.ESCAPE,
      callback: handleEscape,
      allowInForms: true, // Always allow escape
    },
  ], [
    handleShowKeyboardShortcuts,
    handleToggleViewMode,
    handleStartBarcodeScan,
    handleCreateNewCart,
    handleCreateSale,
    handlePrintSale,
    handleManualItem,
    handleEscape
  ]);

  // Global keyboard shortcuts using the new system
  useGlobalShortcuts(shortcuts);

  // Barcode scanning keyboard handler
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process barcode scanning when typing in inputs or when modals are open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const now = Date.now();
      // Reset buffer if too much time has passed
      if (now - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (/^[0-9]$/.test(e.key)) {
        barcodeBuffer += e.key;
      }
      if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
        const scannedBarcode = barcodeBuffer;
        handleBarcodeScanned(scannedBarcode);
        barcodeBuffer = '';
      }
    };

    // Only enable barcode scanning if the feature is enabled in settings
    if (settings?.pos_barcode_scanner_enabled !== false) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleBarcodeScanned, settings?.pos_barcode_scanner_enabled]);

  // Optimized data loading - only load once when component mounts
  useEffect(() => {
    if (!dataInitialized) {
      // Load only essential data initially
      const loadInitialData = async () => {
        try {
          // Load products first (highest priority)
          if (!productsLoadedRef.current) {
            await dispatch(getProductsForPOS({ limit: 50 }));
            productsLoadedRef.current = true;
          }
          
          // Then load customers in background
          if (!customersLoadedRef.current) {
            dispatch(getCustomers({ limit: 100 })); // Don't await, load in background
            customersLoadedRef.current = true;
          }
          
          setDataInitialized(true);
        } catch (error) {
          console.error('Error loading initial data:', error);
          setDataInitialized(true); // Mark as initialized even if there's an error
        }
      };
      
      loadInitialData();
    }
  }, [dispatch, dataInitialized]); // Removed products.length and customers.length from dependencies

  // License effect
  useEffect(() => {
    if (licenseData && !isCustomersFeatureAvailable() && customer_id !== 999) {
      dispatch(setCustomer(999));
    }
  }, [licenseData, customer_id, dispatch, isCustomersFeatureAvailable]);

  // Update toast colors when settings change
  useEffect(() => {
    if (settings) {
      updateToastColorsFromSettings(settings);
    }
  }, [settings]);

  // Loading state - only show loading if essential data is not loaded
  const isLoading = (!dataInitialized && (productsLoading || customersLoading)) || settingsLoading;

  if (isLoading) {
    return (
      <div className="bg-background-secondary min-h-screen p-6">
        <div className="flex gap-6">
          <section className="w-[40%] min-w-[350px]">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <Skeleton className="h-12 w-full mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
          <section className="w-[60%]">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <CashBoxGuard operationType="عملية بيع">
      <div 
        className="min-h-screen p-4 flex flex-col"
        style={{ backgroundColor: colors.background.pos }}
      >
        {/* Header */}
        <POSHeader
          searchQuery={searchQuery}
          onSearchChange={(value) => dispatch(setSearchQuery(value))}
          onKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
          onBarcodeScan={handleStartBarcodeScan}
          onRecentSales={() => setShowRecentSales(true)}
          onStockAlerts={() => setShowStockAlerts(true)}
          onNumbersKeyboard={() => setShowNumbersKeyboard(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          productsCount={products.length}
          isScanning={isScanning}
          barcodeScannerEnabled={settings ? settings.pos_barcode_scanner_enabled !== false : true}
          colors={colors}
        />

        {/* Main Content */}
        <main className="flex flex-col lg:flex-row gap-4 px-4 py-4 flex-1 overflow-hidden min-w-0">
          {/* Cart Section */}
          <POSCartSection
            sessions={sessions}
            activeSessionId={activeSessionId}
            cart={cart}
            customer_id={customer_id}
            payment_method={payment_method}
            paid_amount={paid_amount}
            customers={customers}
            isCustomersFeatureAvailable={isCustomersFeatureAvailable()}
            posLoading={posLoading}
            salesLoading={salesLoading}
            allowNegativeStock={memoizedSettings.allowNegativeStock}
            onSwitchCart={handleSwitchCart}
            onRemoveCart={handleRemoveCart}
            onCreateNewCart={handleCreateNewCart}
            onSetCustomer={(customerId) => dispatch(setCustomer(customerId))}
            onSetPaymentMethod={(method) => dispatch(setPaymentMethod(method))}
            onSetPaidAmount={(amount) => dispatch(setPaidAmount(amount))}
            onQuantityChange={handleQuantityChange}
            onUpdateItemUnitType={handleUpdateItemUnitType}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCreateSale={handleCreateSale}
            onAddCustomer={() => setIsCustomerModalOpen(true)}
            onOpenReceiptBill={handleOpenReceiptBillPreview}
            calculateTotal={calculateTotal}
            colors={colors}
            onCartItemSelect={handleCartItemSelect}
            selectedCartItemId={selectedCartItemId}
            onPaidAmountSelect={handlePaidAmountSelect}
          />

          {/* Products Section with Numbers Keyboard */}
          <section className="w-full lg:w-auto lg:flex-1 flex flex-col gap-3 order-1 lg:order-2 overflow-hidden min-w-0">
            <div 
              className="rounded-lg shadow-sm p-3 flex flex-col h-full min-w-0"
              style={{ 
                backgroundColor: colors.pos.productCard,
                border: `1px solid ${colors.pos.productCardBorder}`
              }}
            >
              {productsLoading && searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: colors.text.muted }}>
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mb-4"
                    style={{ borderColor: colors.primary.DEFAULT }}
                  ></div>
                  <p className="text-lg">جاري البحث عن المنتجات...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 h-full">
                  {/* Numbers Keyboard - Top */}
                  <div className="flex-shrink-0">
                    <NumbersKeyboard
                      isOpen={showNumbersKeyboard}
                      onToggle={() => setShowNumbersKeyboard(!showNumbersKeyboard)}
                      value={keyboardValue}
                      onNumberPress={handleNumberPress}
                      onEnter={handleKeyboardEnter}
                      onClear={handleKeyboardClear}
                      onBackspace={handleKeyboardBackspace}
                      mode={keyboardMode}
                      colors={colors}
                    />
                  </div>
                  
                  {/* Products Grid - Bottom */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <POSProductGrid 
                      products={filteredProducts}
                      viewMode={viewMode}
                      onAddToCart={handleAddToCart}
                      onProductSelect={handleProductSelect}
                      onLoadMore={handleLoadMoreProducts}
                      showLoadMore={!searchQuery.trim() && products.length > 0}
                      loading={productsLoading}
                      onManualItemAdd={handleManualItemAdd}
                      settings={memoizedSettings}
                      colors={colors}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Modals */}
        <POSModals
          showKeyboardShortcuts={showKeyboardShortcuts}
          onKeyboardShortcutsChange={setShowKeyboardShortcuts}
          showProfitModal={showProfitModal}
          onProfitModalChange={setShowProfitModal}
          cart={cart}
          products={products}
          calculateProfit={calculateProfit}
          showBarcodeModal={showBarcodeModal}
          onBarcodeModalChange={setShowBarcodeModal}
          onBarcodeScanned={handleBarcodeScanned}
          isScanning={isScanning}
        />

        {/* Bill Modal */}
        <BillModal
          sale={billModal.sale as SaleData}
          customer={billModal.customer}
          settings={settings || null}
          open={billModal.isOpen}
          onClose={closeBillModal}
          products={enhancedBillData.products}
          cartItems={enhancedBillData.cartItems}
          mode={billModal.mode}
        />

        {/* Customer Form Modal */}
        <CustomerForm
          open={isCustomerModalOpen}
          onOpenChange={setIsCustomerModalOpen}
          onSuccess={handleCustomerCreated}
        />


      </div>
    </CashBoxGuard>
  );
};

export default POSMain; 