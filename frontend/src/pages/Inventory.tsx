import { useEffect, useState, useRef, useCallback, useMemo, memo, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { getProducts, createProduct, updateProduct, deleteProduct, importProducts, getExpiringProducts, getCategories } from "@/features/inventory/inventorySlice";
import inventoryService, { Product, CreateProductData, exportToCSV, getProductReferences, Category } from "@/features/inventory/inventoryService";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, Eye, Upload, AlertTriangle, Package, Tag, FileText, DollarSign, Calendar, Barcode, Keyboard, History, ArrowUpDown, BarChart3, ShoppingCart, X, Loader2, Filter, ChevronUp, ChevronDown, Warehouse, MoreVertical, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AxiosError } from "axios";
import AddProductModal from '@/components/AddProductModal';
import ProductMovementsModal from '@/components/ProductMovementsModal';
import StockAdjustmentModal from '@/components/StockAdjustmentModal';
import InventoryReportsModal from '@/components/InventoryReportsModal';
import StockTransferModal from '@/components/StockTransferModal';
import { useFormNavigation } from '@/hooks/useFormNavigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CategoryForm from '@/components/CategoryForm';
import { stocksService, Stock } from '@/features/stocks/stocksService';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
import api from '@/lib/api';

// Placeholder categories and units

const unitOptions = ["قطعة", "علبة", "كرتون", "كيلوغرام"];

const initialFormData: CreateProductData = {
  name: "",
  description: "",
  scientific_name: "",
  sku: "",
  barcode: "",
  purchase_price: 0,
  selling_price: 0,
  wholesale_price: 0,
  company_name: "",
  current_stock: 0, // This will be set to 0 by default, but not editable in creation
  min_stock: 0,
  unit: "قطعة",
  units_per_box: 1,
  supported: false,
  category_id: undefined,
  stock_id: undefined,
  is_dolar: false,
};

interface ProductFormProps {
  onSubmit: (data: CreateProductData) => void;
  formData: CreateProductData;
  setFormData: React.Dispatch<React.SetStateAction<CreateProductData>>;
  autoFocus?: boolean;
  categories?: Category[];
  setCategoryModalOpen: (open: boolean) => void;
}

const ProductForm = ({ onSubmit, formData, setFormData, autoFocus, categories, setCategoryModalOpen }: ProductFormProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksFetched, setStocksFetched] = useState(false);

  // Define field order for navigation
  const fieldOrder = [
    'name',
    'scientific_name',
    'sku',
    'barcode', 
    'description',
    'company_name',
    'purchase_price',
    'selling_price',
    'wholesale_price',
    'is_dolar',
    'min_stock',
    'unit',
    'units_per_box',
    'expiry_date',
    'category_id',
    'stock_id',
    'supported'
  ];

  const { setInputRef, handleKeyDown, focusFirstField } = useFormNavigation({
    fieldOrder,
    skipFields: ['unit', 'category_id', 'stock_id'], // Skip select fields as they have different navigation
    onSubmit: () => {
      // Trigger form submission when Enter is pressed on last field
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }
  });

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (autoFocus) {
      focusFirstField();
    }
    // Only run when autoFocus changes to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // Load stocks
  useEffect(() => {
    if (!stocksFetched) {
      loadStocks();
      setStocksFetched(true);
    }
  }, [stocksFetched]);

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

  // Debug: log barcode value
  

  const handleBarcodeBlur = async () => {
    const value = formData.barcode;
    if (value && value.length >= 8) {
      try {
        const product = await inventoryService.getProductByBarcode(value);
        if (product) {
          const event = new CustomEvent('barcodeProductFound', { detail: product });
          window.dispatchEvent(event);
        }
      } catch (error) {
        // Not found: do nothing
      }
    }
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, barcode: value }));
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4" >
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            اسم المنتج
          </Label>
          <Input
            type="text"
            value={formData.name}
            onChange={handleNameInput}
            onKeyDown={handleKeyDown('name')}
            ref={setInputRef('name')}
            required
            placeholder="أدخل اسم المنتج"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            رمز المنتج (SKU)
          </Label>
          <Input
            type="text"
            value={formData.scientific_name || ''}
            onChange={e => setFormData(prev => ({ ...prev, scientific_name: e.target.value }))}
            onKeyDown={handleKeyDown('scientific_name')}
            ref={setInputRef('scientific_name')}
            placeholder="أدخل الاسم العلمي للمنتج"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            رمز المنتج (SKU)
          </Label>
          <Input
            type="text"
            value={formData.sku || ''}
            onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
            onKeyDown={handleKeyDown('sku')}
            ref={setInputRef('sku')}
            placeholder="أدخل رمز المنتج"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            الباركود
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              ref={(ref) => {
                barcodeInputRef.current = ref;
                setInputRef('barcode')(ref);
              }}
              value={formData.barcode || ''}
              onChange={handleBarcodeInput}
              onBlur={handleBarcodeBlur}
              onKeyDown={handleKeyDown('barcode')}
              placeholder="Scan or enter barcode"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => setIsScanning(true)}
              variant="outline"
              className="whitespace-nowrap"
            >
              {isScanning ? 'جاري المسح...' : 'مسح'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الوصف
          </Label>
          <Textarea
            value={formData.description || ''}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            onKeyDown={handleKeyDown('description')}
            ref={setInputRef('description')}
            rows={3}
            placeholder="أدخل وصف المنتج"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            سعر الشراء
          </Label>
          <Input
            type="number"
            value={formData.purchase_price}
            onChange={e => setFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) }))}
            onKeyDown={handleKeyDown('purchase_price')}
            ref={setInputRef('purchase_price')}
            min="0"
            step="0.01"
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            سعر البيع
          </Label>
          <Input
            type="number"
            value={formData.selling_price}
            onChange={e => setFormData(prev => ({ ...prev, selling_price: parseFloat(e.target.value) }))}
            onKeyDown={handleKeyDown('selling_price')}
            ref={setInputRef('selling_price')}
            min="0"
            step="0.01"
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            سعر التفريغ
          </Label>
          <Input
            type="number"
            value={formData.wholesale_price}
            onChange={e => setFormData(prev => ({ ...prev, wholesale_price: parseFloat(e.target.value) }))}
            onKeyDown={handleKeyDown('wholesale_price')}
            ref={setInputRef('wholesale_price')}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            السعر بالدولار
          </Label>
          <Switch 
            checked={formData.is_dolar}
            onCheckedChange={value => setFormData(prev => ({ ...prev, is_dolar: value }))}
          />
          <div className="text-xs text-gray-500">
            تفعيل هذا الخيار إذا كان سعر المنتج بالدولار الأمريكي
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            اسم الشركة (اختياري)
          </Label>
          <Input
            type="text"
            value={formData.company_name || ''}
            onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            onKeyDown={handleKeyDown('company_name')}
            ref={setInputRef('company_name')}
            placeholder="أدخل اسم الشركة"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            الكمية الحالية
          </Label>
          <Input
            type="number"
            value={formData.current_stock}
            disabled
            className="bg-gray-100 cursor-not-allowed"
            placeholder="سيتم تحديثها من المشتريات"
          />
          <p className="text-xs text-gray-500">الكمية ستتم إضافتها من عمليات الشراء</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            الحد الأدنى للكمية
          </Label>
          <Input
            type="number"
            value={formData.min_stock}
            onChange={e => setFormData(prev => ({ ...prev, min_stock: parseInt(e.target.value) }))}
            onKeyDown={handleKeyDown('min_stock')}
            ref={setInputRef('min_stock')}
            min="0"
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            الوحدة
          </Label>
          <Select
            value={formData.unit}
            onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الوحدة" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            الوحدات في الصندوق
          </Label>
          <Input
            type="number"
            value={formData.units_per_box}
            onChange={e => setFormData(prev => ({ ...prev, units_per_box: parseInt(e.target.value) }))}
            onKeyDown={handleKeyDown('units_per_box')}
            ref={setInputRef('units_per_box')}
            min="1"
            required
            placeholder="1"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            تاريخ الانتهاء (اختياري)
          </Label>
          <Input
            type="date"
            value={formData.expiry_date || ''}
            onChange={e => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
            onKeyDown={handleKeyDown('expiry_date')}
            ref={setInputRef('expiry_date')}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            الفئة (اختيارية)
          </Label>
          <Select
            value={formData.category_id ? String(formData.category_id) : ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value ? parseInt(value) : undefined }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفئة (اختياري)" />
            </SelectTrigger>
            <SelectContent>
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  لا يوجد فئات
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="link"
            className="text-blue-600 px-0 mt-1"
            onClick={() => setCategoryModalOpen(true)}
          >
            + إضافة فئة جديدة
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            المخزن (اختياري)
          </Label>
          <Select
            value={formData.stock_id ? String(formData.stock_id) : ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, stock_id: value ? parseInt(value) : undefined }))}
            disabled={stocksLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={stocksLoading ? 'جاري التحميل...' : 'اختر المخزن (اختياري)'} />
            </SelectTrigger>
            <SelectContent>
              {stocks && stocks.length > 0 ? (
                stocks?.map((stock) => (
                  <SelectItem key={stock.id} value={String(stock.id)}>
                    {stock.name} {stock.is_main_stock && '(رئيسي)'}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  لا يوجد مخازن
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            المنتج مدعوم
          </Label>
          <Switch
            id="supported"
            checked={formData.supported}
            onCheckedChange={(value) => setFormData(prev => ({ ...prev, supported: value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData({
            name: '',
            description: '',
            scientific_name: '',
            sku: '',
            barcode: '',
            purchase_price: 0,
            selling_price: 0,
            wholesale_price: 0,
            company_name: '',
            current_stock: 0,
            min_stock: 0,
            unit: 'قطعة',
            units_per_box: 1,
            supported: true,
            category_id: undefined,
            stock_id: undefined,
          })}
        >
          إعادة تعيين
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary">
          {formData.barcode ? 'تحديث المنتج' : 'إضافة منتج'}
        </Button>
      </div>
    </form>
  );
};

const BarcodeScanner = ({ onBarcodeScanned }: { onBarcodeScanned: (barcode: string) => void }) => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (barcode.length >= 8) {
          onBarcodeScanned(barcode);
          setBarcode('');
        }
      } else if (/^[0-9]$/.test(e.key)) {
        setBarcode(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, onBarcodeScanned]);

  return (
    <div className="space-y-4">
      <Input
        ref={inputRef}
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        placeholder="Scan or enter barcode"
        className="flex-1"
        readOnly
      />
      <div className="text-sm text-muted-foreground">
        {barcode ? `Barcode: ${barcode}` : 'Scan or enter barcode'}
      </div>
    </div>
  );
};

// Memoized search input component to prevent focus loss
const SearchInput = memo(forwardRef<HTMLInputElement, {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  loading: boolean;
  resultCount?: number;
}>(({ 
  value, 
  onChange, 
  onClear, 
  loading, 
  resultCount
}, ref) => {
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <Input
        type="text"
        placeholder="ابحث عن اسم المنتج، الباركود، SKU، أو اسم الشركة..."
        value={value}
        onChange={onChange}
        className={`pl-10 pr-12 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
          value ? 'border-blue-300 bg-blue-50' : ''
        }`}
        dir="rtl"
        disabled={loading}
        ref={ref}
      />
      {loading && (
        <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
      )}
      {value && !loading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          disabled={loading}
        >
          <X className="h-4 w-4 text-gray-400" />
        </Button>
      )}
      {value && !loading && (
        <div className="absolute left-12 top-1/2 transform -translate-y-1/2">
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            <Search className="h-3 w-3" />
            {resultCount || 0} نتيجة
          </div>
        </div>
      )}
      {/* Search Help Tooltip */}
      <div className="absolute left-24 top-1/2 transform -translate-y-1/2">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="اختصارات البحث"
            onClick={() => setShowHelpTooltip(!showHelpTooltip)}
            onMouseEnter={() => setShowHelpTooltip(true)}
            onMouseLeave={() => setShowHelpTooltip(false)}
          >
            ?
          </Button>
          {showHelpTooltip && (
            <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
              <div>Ctrl+K: التركيز على البحث</div>
              <div>Escape: مسح البحث</div>
              <div>انقر على ? لعرض المساعدة</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}));

SearchInput.displayName = 'SearchInput';

// CSV Format Guide Modal Component
const CsvFormatGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            دليل تنسيق ملف Excel/CSV لاستيراد المنتجات
          </DialogTitle>
          <DialogDescription>
            تعرف على التنسيق المطلوب لاستيراد المنتجات من ملف Excel أو CSV
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Required Columns */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">الأعمدة المطلوبة</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">1. اسم المنتج</h4>
                <p className="text-sm text-blue-700 mb-2">يجب أن يكون أحد هذه الأسماء:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• <code className="bg-blue-100 px-1 rounded">name</code></li>
                  <li>• <code className="bg-blue-100 px-1 rounded">product_name</code></li>
                  <li>• <code className="bg-blue-100 px-1 rounded">product name</code></li>
                  <li>• <code className="bg-blue-100 px-1 rounded">اسم المنتج</code></li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">2. السعر</h4>
                <p className="text-sm text-green-700 mb-2">يجب أن يكون أحد هذه الأسماء:</p>
                <ul className="text-xs text-green-600 space-y-1">
                  <li>• <code className="bg-green-100 px-1 rounded">price</code></li>
                  <li>• <code className="bg-green-100 px-1 rounded">dollar_price</code></li>
                  <li>• <code className="bg-green-100 px-1 rounded">dinar_price</code></li>
                  <li>• <code className="bg-green-100 px-1 rounded">سعر</code></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional Columns */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">الأعمدة الاختيارية</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">3. اسم الشركة</h4>
                <p className="text-sm text-yellow-700 mb-2">يمكن أن يكون أحد هذه الأسماء:</p>
                <ul className="text-xs text-yellow-600 space-y-1">
                  <li>• <code className="bg-yellow-100 px-1 rounded">company</code></li>
                  <li>• <code className="bg-yellow-100 px-1 rounded">company_name</code></li>
                  <li>• <code className="bg-yellow-100 px-1 rounded">شركة</code></li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">4. تاريخ انتهاء الصلاحية</h4>
                <p className="text-sm text-purple-700 mb-2">يمكن أن يكون أحد هذه الأسماء:</p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• <code className="bg-purple-100 px-1 rounded">expiry_date</code></li>
                  <li>• <code className="bg-purple-100 px-1 rounded">expiration</code></li>
                  <li>• <code className="bg-purple-100 px-1 rounded">expiry</code></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">مثال على التنسيق الصحيح</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right border-b border-gray-300 text-sm font-medium text-gray-900">name</th>
                    <th className="px-4 py-2 text-right border-b border-gray-300 text-sm font-medium text-gray-900">price</th>
                    <th className="px-4 py-2 text-right border-b border-gray-300 text-sm font-medium text-gray-900">company</th>
                    <th className="px-4 py-2 text-right border-b border-gray-300 text-sm font-medium text-gray-900">expiry_date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">منتج 1</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">10.50</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">شركة أ</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">2024-12-31</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">منتج 2</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">25.00</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">شركة ب</td>
                    <td className="px-4 py-2 text-right border-b border-gray-200 text-sm">2024-06-30</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-right text-sm">منتج 3</td>
                    <td className="px-4 py-2 text-right text-sm">15.75</td>
                    <td className="px-4 py-2 text-right text-sm">شركة ج</td>
                    <td className="px-4 py-2 text-right text-sm"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">متطلبات البيانات</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">اسم المنتج</p>
                    <p className="text-sm text-gray-600">نص (مطلوب، على الأقل حرفين)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">السعر</p>
                    <p className="text-sm text-gray-600">رقم أكبر من صفر (مطلوب)</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">اسم الشركة</p>
                    <p className="text-sm text-gray-600">نص (اختياري)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">تاريخ انتهاء الصلاحية</p>
                    <p className="text-sm text-gray-600">تاريخ بالتنسيق YYYY-MM-DD (اختياري)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Common Errors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">الأخطاء الشائعة</h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900">أسماء الأعمدة غير صحيحة</p>
                <p className="text-sm text-red-700">تأكد من أن أسماء الأعمدة في الصف الأول</p>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900">أسعار غير صحيحة</p>
                <p className="text-sm text-red-700">تأكد من أن الأسعار أرقام أكبر من صفر</p>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900">أسماء منتجات فارغة</p>
                <p className="text-sm text-red-700">تأكد من وجود أسماء للمنتجات</p>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900">تنسيق التواريخ غير صحيح</p>
                <p className="text-sm text-red-700">استخدم التنسيق YYYY-MM-DD</p>
              </div>
            </div>
          </div>

          {/* Steps to Fix */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">خطوات التصحيح</h3>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>افتح ملف Excel الخاص بك</li>
              <li>تأكد من أن الصف الأول يحتوي على أسماء الأعمدة الصحيحة</li>
              <li>تأكد من أن البيانات في الصفوف التالية صحيحة</li>
              <li>احفظ الملف بصيغة Excel (.xlsx) أو CSV</li>
              <li>جرب الاستيراد مرة أخرى</li>
            </ol>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Inventory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { items: products = [], loading: isLoading, error, pagination } = useSelector((state: RootState) => state.inventory);
  const { categories = [], categoriesLoading: isCategoriesLoading } = useSelector((state: RootState) => state.inventory);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Permission checks for products management
  const canAddProducts = useSelector(selectHasPermission(PERMISSIONS.PRODUCTS_ADD));
  const canEditProducts = useSelector(selectHasPermission(PERMISSIONS.PRODUCTS_EDIT));
  const canDeleteProducts = useSelector(selectHasPermission(PERMISSIONS.PRODUCTS_DELETE));
  const canViewProducts = useSelector(selectHasPermission(PERMISSIONS.PRODUCTS_VIEW));
  
  // Debug permissions - removed to prevent console flooding
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string | number>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  
  // Helper function to get stock filter display value
  const getStockFilterValue = () => {
    return typeof stockFilter === 'number' ? 'stock' : stockFilter;
  };
  
  // Handle stock filter from navigation state
  useEffect(() => {
    if (location.state?.stockFilter) {
      setStockFilter(location.state.stockFilter);
      // Clear the state to prevent re-applying on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Debug modal states - removed to prevent console flooding
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showCsvFormatModal, setShowCsvFormatModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null; forceDelete: boolean }>({ 
    open: false, 
    product: null, 
    forceDelete: false 
  });
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [showExpiryAlerts, setShowExpiryAlerts] = useState(true);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [importProgress, setImportProgress] = useState<{ importing: boolean; message: string } | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [hasInitialData, setHasInitialData] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use server-side filtered results directly with defensive filtering
  const filteredProducts = Array.isArray(products) ? products.filter(product => product && typeof product === 'object' && product.id) : [];

  // Remove debug pagination logs to prevent console flooding when scrolling

  // Sync page size with Redux pagination state
  useEffect(() => {
    if (pagination?.limit && pagination.limit !== pageSize) {
      setPageSize(pagination.limit);
    }
  }, [pagination?.limit, pageSize]);

  // Handle search with pagination reset
  const handleSearch = useCallback((value: string) => {
    
    setSearchTerm(value);
    // Don't reset page immediately to prevent focus loss
    // The page will be reset when debouncedSearchTerm changes
  }, []);

  // Handle search input change
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    dispatch(getProducts({ page: 1, limit: pageSize }));
  }, [dispatch, pageSize]);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Reduced from 500ms to 300ms for better responsiveness

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoize the search parameters to prevent unnecessary re-fetches
  const searchParams = useMemo(() => {
    const params: {
      page: number;
      limit: number;
      name?: string;
      category?: string;
      lowStock?: number;
      stock_id?: number;
      expiring?: number;
    } = { 
      page: pagination?.page || 1, 
      limit: pageSize 
    };
    
    // Add search parameters if search term exists
    if (debouncedSearchTerm.trim()) {
      params.name = debouncedSearchTerm.trim();
      // When searching, we want to search across all products, so reset to page 1
      params.page = 1;
    }

    // Add advanced filters
    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }
    if (stockFilter !== 'all') {
      if (typeof stockFilter === 'number') {
        // If stockFilter is a number, it's a stock ID
        params.stock_id = stockFilter;
      } else {
        // Otherwise, it's a stock level filter
        params.lowStock = stockFilter === 'low' ? 10 : stockFilter === 'out' ? 0 : undefined;
      }
    }
    if (expiryFilter !== 'all') {
      params.expiring = expiryFilter === 'expiring' ? 30 : expiryFilter === 'expired' ? -1 : undefined;
    }
    
    return params;
  }, [pagination?.page, pageSize, debouncedSearchTerm, selectedCategory, stockFilter, expiryFilter]);

  // Fetch data with search and pagination - optimized for performance
  useEffect(() => {
    const fetchData = async () => {
      setSearchLoading(true);
      try {
        // Only fetch expiring products if we're not in a search or filter mode
        const shouldFetchExpiring = !debouncedSearchTerm.trim() && 
                                  selectedCategory === 'all' && 
                                  stockFilter === 'all' && 
                                  expiryFilter === 'all';
        
        // Fetch products
        const productsResponse = await dispatch(getProducts(searchParams)).unwrap();
        
        // Mark that we've received initial data
        setHasInitialData(true);
        
        // Fetch expiring products only when needed
        if (shouldFetchExpiring) {
          try {
            const expiringResponse = await dispatch(getExpiringProducts(30)).unwrap();
            setExpiringProducts(expiringResponse);
          } catch (error) {
            console.error('Error fetching expiring products:', error);
            // Don't show error toast for expiring products as it's not critical
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Removed error toast to avoid showing error to user
      } finally {
        setSearchLoading(false);
      }
    };

    // Only fetch if we have valid parameters
    if ((searchParams.page || 1) > 0 && pageSize > 0) {
      fetchData();
    }
  }, [searchParams, debouncedSearchTerm, selectedCategory, stockFilter, expiryFilter, pageSize, dispatch]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    // Dispatch the page change directly to Redux
    dispatch(getProducts({ page: newPage, limit: pageSize }));
    // Reset search loading when changing pages
    setSearchLoading(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    dispatch(getProducts({ page: 1, limit: newPageSize }));
  };

  // Test search functionality
  const testSearch = async (testTerm: string) => {
    
    setSearchTerm(testTerm);
    dispatch(getProducts({ page: 1, limit: pageSize }));
  };

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="ابحث"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchTerm) {
        handleClearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, handleClearSearch]);

  // Highlight searched text in results
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    // Escape special regex characters
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded font-semibold text-gray-800">
          {part}
        </mark>
      ) : part
    );
  };

  // Memoize search result display to prevent unnecessary re-renders
  const searchResultDisplay = useMemo(() => {
    if (!searchTerm && selectedCategory === 'all' && stockFilter === 'all' && expiryFilter === 'all') {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <Search className="h-4 w-4" />
          <span className="font-medium">
            {searchTerm ? 'نتائج البحث' : 'المنتجات المفلترة'}
          </span>
          {searchTerm && (
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
              النص المظلل باللون الأصفر
            </span>
          )}
          {searchLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-blue-600">
          {searchTerm && (
            <span>البحث: "{searchTerm}"</span>
          )}
          {selectedCategory !== 'all' && (
            <span>الفئة: {categories?.find(c => c.id.toString() === selectedCategory)?.name}</span>
          )}
                  {stockFilter !== 'all' && (
          <span>
            {typeof stockFilter === 'number' 
              ? `المخزن: ${stockFilter}` 
              : `المخزون: ${stockFilter === 'low' ? 'منخفض' : 'نفذ'}`
            }
          </span>
        )}
          {expiryFilter !== 'all' && (
            <span>الصلاحية: {expiryFilter === 'expiring' ? 'قاربة على الانتهاء' : 'منتهية'}</span>
          )}
          <span className="font-medium">
            إجمالي النتائج: {pagination?.total || filteredProducts.length} 
            {pagination?.total && pagination.total > pageSize && (
              <span className="text-blue-500 ml-1">
                (عرض {Math.min(pageSize, filteredProducts.length)} من {pagination.total})
              </span>
            )}
          </span>
        </div>
        {pagination?.total && pagination.total > pageSize && (
          <div className="mt-2 text-xs text-blue-500">
            💡 النتائج مقسمة على صفحات. استخدم أزرار التنقل أدناه لتصفح جميع النتائج.
          </div>
        )}
        {searchTerm && (pagination?.total || 0) === 0 && !searchLoading && (
          <div className="mt-2 text-xs text-red-600">
            ⚠️ لم يتم العثور على منتجات تطابق البحث. جرب كلمات مختلفة أو ابحث في الباركود أو SKU.
          </div>
        )}
      </div>
    );
  }, [searchTerm, selectedCategory, stockFilter, expiryFilter, searchLoading, pagination?.total, pageSize, filteredProducts.length]);

  // Separate useEffect for categories - runs only once on mount
  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  // Separate useEffect for initial products fetch - runs only once on mount
  const initialFetchRef = useRef(false);
  
  useEffect(() => {
    if (!initialFetchRef.current && products.length === 0 && !isLoading) {
      initialFetchRef.current = true;
      dispatch(getProducts({ page: 1, limit: pageSize }));
    }
  }, [dispatch, products.length, isLoading, pageSize]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setEditingProduct(customEvent.detail);
        setIsEditModalOpen(true);
      }
    };

    window.addEventListener('barcodeProductFound', handler);
    return () => window.removeEventListener('barcodeProductFound', handler);
  }, []);

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
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
        const scannedBarcode = barcodeBuffer; // capture value
        (async () => {
          try {
            const product = await inventoryService.getProductByBarcode(scannedBarcode);
            if (product) {
              setEditingProduct(product);
              setIsEditModalOpen(true);
            } else {
              
              setFormData({ ...initialFormData, barcode: scannedBarcode });
              setIsCreateModalOpen(false);
              setTimeout(() => {
                
                setIsCreateModalOpen(true);
              }, 100);
            }
          } catch {
            
            setFormData({ ...initialFormData, barcode: scannedBarcode });
            setIsCreateModalOpen(false);
            setTimeout(() => {
              
              setIsCreateModalOpen(true);
            }, 100);
          }
        })();
        barcodeBuffer = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    
    // Only auto-open create modal if barcode is set, create modal is closed, and edit modal is also closed
    if (formData.barcode && !isCreateModalOpen && !isEditModalOpen) {
      setIsCreateModalOpen(true);
    }
  }, [formData.barcode, isCreateModalOpen, isEditModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["purchase_price", "selling_price", "current_stock", "min_stock", "units_per_box", "wholesale_price"].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleUnitChange = (value: string) => {
    setFormData((prev) => ({ ...prev, unit: value }));
  };

  const openEditModal = (product: Product) => {
    // First close any open create modal and clear form data
    setIsCreateModalOpen(false);
    setFormData(initialFormData);
    
    // Then set up edit modal
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const product = await inventoryService.getProductByBarcode(barcode);
      if (product) {
        setShowScanModal(false);
        setEditingProduct(product);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      // Product not found - open create modal with barcode pre-filled
      setShowScanModal(false);
      setFormData({
        ...initialFormData,
        barcode: barcode,
        name: ''
      });
      setIsCreateModalOpen(true);
      toast.info('لم يتم العثور على المنتج. يرجى إضافة منتج جديد.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateSubmit = async (data: CreateProductData) => {
    try {
      // Validate required fields
      if (!data.name || !data.purchase_price || !data.selling_price || !data.unit) {
        toast.error('يرجى تعبئة جميع الحقول المطلوبة');
        return;
      }

      // Validate barcode format if provided
      if (data.barcode && data.barcode.length < 8) {
        toast.error('يجب أن يكون الباركود 8 أرقام على الأقل');
        return;
      }

      await dispatch(createProduct(data));
      setIsCreateModalOpen(false);
      toast.success('تم إضافة المنتج بنجاح');
      // Reset form data
      setFormData(initialFormData);
    } catch (error) {
      // Error is already handled by the slice and will be shown via toast
      console.error('Error creating product:', error);
    }
  };

  const handleEditSubmit = async (data: CreateProductData) => {
    if (!editingProduct?.id) {
      toast.error('لم يتم تحديد منتج للتعديل');
      return;
    }

    try {
      // Convert CreateProductData to UpdateProductData by ensuring sku is provided
      const updateData = {
        ...data,
        sku: data.sku || editingProduct.sku || ''
      };
      
      await dispatch(updateProduct({ id: editingProduct.id, data: updateData })).unwrap();
      setIsEditModalOpen(false);
      toast.success('تم تحديث المنتج بنجاح');
      // Refresh the products list to show updated data
      dispatch(getProducts({ page: 1, limit: 50 }));
    } catch (error) {
      // Error is already handled by the slice and will be shown via toast
      console.error('Error updating product:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.product) return;
    try {
      await dispatch(deleteProduct({ 
        id: deleteDialog.product.id, 
        force: deleteDialog.forceDelete 
      })).unwrap();
      toast.success(deleteDialog.forceDelete 
        ? "تم حذف المنتج وجميع السجلات المرتبطة به بنجاح" 
        : "تم حذف المنتج بنجاح"
      );
      setDeleteDialog({ open: false, product: null, forceDelete: false });
    } catch (error: unknown) {
      // Handle the Arabic error message from backend
      if (error && typeof error === 'string') {
        toast.error(error);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('حدث خطأ أثناء حذف المنتج');
      }
      console.error('Error deleting product:', error);
    }
  };

  const handleDeleteClick = async (product: Product) => {
    try {
      // Check references first
      const references = await getProductReferences(product.id);
      
      if (references.totalReferences > 0) {
        // Show references info in the dialog
        setDeleteDialog({ 
          open: true, 
          product, 
          forceDelete: false 
        });
        
        // Show warning toast
        toast.warning(`هذا المنتج له ${references.totalReferences} مرجع في النظام. استخدم 'حذف قسري' لحذفه.`);
      } else {
        // Safe to delete
        setDeleteDialog({ 
          open: true, 
          product, 
          forceDelete: false 
        });
      }
    } catch (error) {
      // If reference check fails, still show delete dialog
      setDeleteDialog({ 
        open: true, 
        product, 
        forceDelete: false 
      });
    }
  };

  const validateFileFormat = (file: File) => {
    return new Promise((resolve, reject) => {
      // Simple validation - just check file type and size
      const allowedTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        reject(new Error('يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV فقط'));
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('الملف كبير جداً. الحد الأقصى 50 ميجابايت'));
        return;
      }
      
      // For now, just validate basic file properties
      // The actual format validation will be done on the server
      resolve({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        message: 'File format validation passed - proceeding to import'
      });
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV فقط');
      return;
    }

    // Debug: Log file details
    console.log('File to upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Debug: Log current API configuration
    console.log('Current API config:', {
      baseURL: api.defaults.baseURL,
      timeout: api.defaults.timeout,
      headers: api.defaults.headers
    });

    try {
      setImportProgress({ importing: true, message: 'جاري التحقق من تنسيق الملف...' });
      
      // Validate file format first
      try {
        const validation = await validateFileFormat(file);
        
        setImportProgress({ importing: true, message: 'جاري الاستيراد...' });
      } catch (validationError) {
        console.error('File validation failed:', validationError);
        toast.error(`خطأ في تنسيق الملف: ${validationError.message}`);
        return;
      }
      
      // Debug: Test API connectivity first
      try {
        
        const testResponse = await api.get('/products');
        
      } catch (testError) {
        console.error('API connectivity test failed:', testError);
        throw new Error('API connection failed - please check server status');
      }

      const result = await dispatch(importProducts(file)).unwrap();
      
      
      
      if (result.success) {
        // Show detailed success message
        if (result.data) {
          const { imported, failed, total, errors, errorCount } = result.data;
          let message = `تم استيراد ${imported} منتج بنجاح`;
          if (failed > 0) {
            message += `، فشل في استيراد ${failed} منتج`;
          }
          if (errorCount > 0) {
            message += ` (${errorCount} خطأ إجمالي)`;
          }
          toast.success(message);
          
          // Show errors if any
          if (errors && errors.length > 0) {
            console.warn('Import errors:', errors);
            if (errorCount > errors.length) {
              toast.warning(`تم عرض أول ${errors.length} خطأ فقط من إجمالي ${errorCount} خطأ. راجع السجلات للتفاصيل الكاملة.`);
            }
          }
        } else {
          toast.success(result.message || 'تم استيراد المنتجات بنجاح');
        }
        
        // Refresh the products list
        dispatch(getProducts({ page: 1, limit: pageSize }));
        
        // Clear the file input
        e.target.value = '';
      } else {
        toast.error(result.message || 'فشل في استيراد المنتجات');
      }
    } catch (error: unknown) {
      console.error('Error importing products:', error);
      
      // Enhanced error logging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number; statusText: string; data: unknown; headers: unknown } };
        console.error('Error response:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
          headers: axiosError.response.headers
        });
      } else if (error && typeof error === 'object' && 'request' in error) {
        const axiosError = error as { request: unknown; message: string };
        console.error('Error request:', {
          request: axiosError.request,
          message: axiosError.message
        });
      } else {
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      toast.error(error instanceof Error ? error.message : 'خطأ في الاتصال بالخادم');
    } finally {
      setImportProgress(null);
    }
  };

  const handleStartScan = () => {
    setShowScanModal(true);
    setIsScanning(true);
    setScannedBarcode("");
    // Focus the input after a short delay to ensure the modal is open
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  const handleOpenMovements = (product: Product) => {
    console.log('Opening movements modal for product:', product.id);
    setSelectedProduct(product);
    setShowMovementsModal(true);
  };

  const handleOpenAdjustment = (product: Product) => {
    console.log('Opening adjustment modal for product:', product.id);
    setSelectedProduct(product);
    setShowAdjustmentModal(true);
  };



  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 bg-white border-b">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h1 className="text-3xl font-bold">المنتجات</h1>
          <div className="flex gap-2 items-center">
            {canAddProducts && (
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة منتج
              </Button>
            )}

            <AddProductModal
              open={isCreateModalOpen}
              onOpenChange={(open) => {
                setIsCreateModalOpen(open);
                if (!open) {
                  setFormData(initialFormData);
                }
              }}
              initialBarcode={formData.barcode}
              onSuccess={() => {
                setIsCreateModalOpen(false);
                setFormData(initialFormData);
                dispatch(getProducts({ page: 1, limit: 50 }));
              }}
            />

            {/* File upload and other buttons */}
            <div className="relative">
              <Input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                disabled={importProgress?.importing}
              />
              <div className="flex gap-2">
                {canAddProducts && (
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    disabled={importProgress?.importing}
                  >
                    {importProgress?.importing ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        {importProgress.message}
                      </>
                    ) : (
                      <>
                        <Upload className="ml-2 h-4 w-4" />
                        استيراد من Excel/CSV
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowCsvFormatModal(true)}
                  title="مساعدة في تنسيق الملف"
                >
                  ?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Create a sample CSV template
                    const csvContent = `name,price,company,expiration
منتج تجريبي 1,10.50,شركة تجريبية,2024-12-31
منتج تجريبي 2,25.00,شركة أخرى,2024-06-30`;
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'sample_products.csv');
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    toast.success('تم تحميل نموذج الملف بنجاح');
                  }}
                  title="تحميل نموذج الملف"
                >
                  تحميل النموذج
                </Button>
              </div>
            </div>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  المزيد
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canViewProducts && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const blob = await exportToCSV();
                        const url = window.URL.createObjectURL(new Blob([blob]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'inventory_export.csv');
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode?.removeChild(link);
                        toast.success('تم تصدير المنتجات بنجاح');
                      } catch (error) {
                        toast.error('حدث خطأ أثناء تصدير المنتجات');
                      }
                    }}
                  >
                    تصدير الكل كـ CSV
                  </DropdownMenuItem>
                )}
                {canViewProducts && (
                  <DropdownMenuItem
                    onClick={() => setShowReportsModal(true)}
                  >
                    تقارير المنتجات
                  </DropdownMenuItem>
                )}
                {/* Add more actions here as needed */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchInputChange}
            onClear={handleClearSearch}
            loading={searchLoading}
            ref={searchInputRef}
            resultCount={pagination?.total}
          />
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-500">
              البحث عن: "{searchTerm}" - {pagination?.total || filteredProducts.length} نتيجة
              {pagination?.total && pagination.total > pageSize && (
                <span className="text-gray-400 ml-1">
                  (عرض {Math.min(pageSize, filteredProducts.length)} من {pagination.total})
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="ml-2 text-blue-600 hover:text-blue-700"
              >
                مسح البحث
              </Button>
            </div>
          )}
          
          {/* Search Tips */}
          {!searchTerm && (
            <div className="mt-2 text-xs text-gray-500">
              💡 يمكنك البحث في: اسم المنتج، الباركود، SKU، اسم الشركة
              {/* Debug button - remove in production */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testSearch('test')}
                className="ml-2 text-xs text-blue-600 hover:text-blue-700"
              >
                اختبار البحث
              </Button>
            </div>
          )}
          
          {/* Search Results Summary */}
          {searchResultDisplay}
          
          {/* All Products Indicator */}
          {!searchTerm && selectedCategory === 'all' && stockFilter === 'all' && expiryFilter === 'all' && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-700">
                <Package className="h-4 w-4" />
                <span className="font-medium">جميع المنتجات</span>
                <span className="text-sm text-gray-500">
                  (عرض {filteredProducts.length} من {pagination?.total || filteredProducts.length} منتج)
                </span>
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              فلاتر متقدمة
              {showAdvancedFilters && <ChevronUp className="h-4 w-4" />}
              {!showAdvancedFilters && <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showAdvancedFilters && (
              <div className="flex flex-wrap gap-4 items-center">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">الفئة:</span>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Stock Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">المنتجات:</span>
                  <Select value={getStockFilterValue()} onValueChange={(value) => {
                    if (value === 'all' || value === 'low' || value === 'out') {
                      setStockFilter(value);
                    } else if (value === 'stock') {
                      // Keep the current stock ID
                      return;
                    } else {
                      setStockFilter(parseInt(value));
                    }
                  }}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المنتجات</SelectItem>
                      <SelectItem value="low">منخفض المنتجات</SelectItem>
                      <SelectItem value="out">نفذ المنتجات</SelectItem>
                      {typeof stockFilter === 'number' && (
                        <SelectItem value="stock">مخزن محدد</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Expiry Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">الصلاحية:</span>
                  <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المنتجات</SelectItem>
                      <SelectItem value="expiring">قاربة على الانتهاء</SelectItem>
                      <SelectItem value="expired">منتهية الصلاحية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Clear Filters */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('all');
                    setStockFilter('all');
                    setExpiryFilter('all');
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  مسح الفلاتر
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
        {/* Products Table Container */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-auto h-full">
            <table className="w-full text-right">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">الاسم</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">الباركود</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">الشركة</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">الوحدة</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">سعر الشراء</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">سعر البيع</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">المخزون</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">تاريخ الصلاحية</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">المنتج مدعوم</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-600 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500">
                      {isLoading && !hasInitialData ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {searchLoading ? 'جاري البحث...' : 'جاري التحميل...'}
                        </div>
                      ) : searchTerm ? (
                        <div>
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">لا توجد نتائج</p>
                          <p className="text-sm">جرب البحث بكلمات مختلفة</p>
                        </div>
                      ) : (
                        <div>
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">لا توجد منتجات</p>
                          <p className="text-sm">ابدأ بإضافة منتج جديد</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, idx) => product ? (
                    <tr
                      key={product.id}
                      className={`transition-colors duration-150 hover:bg-blue-50 border-b border-gray-100 ${
                        (product.current_stock !== undefined && product.min_stock !== undefined && product.current_stock <= product.min_stock) ? 'bg-red-50' : 
                        (product.expiry_date && new Date(product.expiry_date) < new Date()) ? 'bg-red-100' : 
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-base">
                        <div className="flex items-center gap-2">
                          <span>
                            {searchTerm ? highlightText(product.name || '', searchTerm) : (product.name || 'غير محدد')}
                          </span>
                          {(product.total_purchased || 0) > 0 && (
                            <div className="relative group">
                              <ShoppingCart className="h-4 w-4 text-blue-500" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                له سجلات شراء
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {searchTerm ? highlightText(product.barcode || '', searchTerm) : product.barcode}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {searchTerm ? highlightText(product.company_name || '', searchTerm) : product.company_name}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{product.unit || 'قطعة'}{(product.units_per_box || 1) > 1 && ` (${product.units_per_box} في العلبة)`}</td>
                      <td className="py-3 px-4 font-bold text-blue-700 text-base">{formatCurrency(product.purchase_price || 0)}</td>
                      <td className="py-3 px-4 font-bold text-green-700 text-base">{formatCurrency(product.selling_price || 0)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{product.current_stock || 0}</span>
                          {((product.current_stock || 0) <= (product.min_stock || 0)) && (product.current_stock !== undefined && product.min_stock !== undefined) && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">منخفض</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product.expiry_date ? (
                          <div className="flex items-center gap-2">
                            <span>{formatDate(product.expiry_date)}</span>
                            {product.expiry_date && new Date(product.expiry_date) < new Date() && (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">منتهي</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{product.supported ? 'مدعوم' : 'غير مدعوم'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
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
                            <DropdownMenuContent align="center" className="w-40 ml-12 rtl z-50">
                              <DropdownMenuItem
                                onClick={() => {
                                  console.log('View product clicked:', product.id);
                                  navigate(`/inventory/${product.id}`);
                                }}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <Eye className="ml-2 h-4 w-4 text-blue-600" />
                                <span>عرض</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenMovements(product)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <History className="ml-2 h-4 w-4 text-purple-600" />
                                <span>سجل الحركات</span>
                              </DropdownMenuItem>
                              {product.total_purchased > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    console.log('Purchase records clicked:', product.id);
                                    navigate(`/purchases?product_id=${product.id}`);
                                  }}
                                  onSelect={(e) => e.preventDefault()}
                                  className="cursor-pointer border-b border-gray-100"
                                >
                                  <ShoppingCart className="ml-2 h-4 w-4 text-orange-600" />
                                  <span>سجلات الشراء</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  console.log('Stock adjustment clicked:', product.id);
                                  handleOpenAdjustment(product);
                                }}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <ArrowUpDown className="ml-2 h-4 w-4 text-orange-600" />
                                <span>تعديل المخزون</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  console.log('Opening transfer modal for product:', product.id);
                                  setSelectedProduct(product);
                                  setShowTransferModal(true);
                                }}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <ArrowRight className="ml-2 h-4 w-4 text-purple-600" />
                                <span>نقل المنتج</span>
                              </DropdownMenuItem>
                              {canEditProducts && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    console.log('Edit product clicked:', product.id);
                                    openEditModal(product);
                                  }}
                                  onSelect={(e) => e.preventDefault()}
                                  className="cursor-pointer border-b border-gray-100"
                                >
                                  <Pencil className="ml-2 h-4 w-4 text-blue-600" />
                                  <span>تعديل</span>
                                </DropdownMenuItem>
                              )}
                              {canDeleteProducts && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    console.log('Delete product clicked:', product.id);
                                    handleDeleteClick(product);
                                  }}
                                  onSelect={(e) => e.preventDefault()}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  <span>حذف</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ) : null)
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {(pagination || products.length > 0) && (
          <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">عرض</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">
                  من {pagination?.total || products.length} منتج
                </span>
              </div>
            </div>
            
            {(pagination?.total || 0) > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange((pagination?.page || 1) - 1)}
                    disabled={(pagination?.page || 1) <= 1 || isLoading}
                  >
                    السابق
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.ceil((pagination?.total || products.length) / pageSize);
                      const maxVisiblePages = 5;
                      const currentPageNum = pagination?.page || 1;
                      let startPage = Math.max(1, currentPageNum - Math.floor(maxVisiblePages / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                        const page = startPage + i;
                        const isCurrentPage = page === (pagination?.page || 1);
                        return (
                          <Button
                            key={page}
                            variant={isCurrentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                            disabled={isLoading}
                          >
                            {page}
                          </Button>
                        );
                      });
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange((pagination?.page || 1) + 1)}
                    disabled={(pagination?.page || 1) >= Math.ceil((pagination?.total || products.length) / pageSize) || isLoading}
                  >
                    التالي
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  صفحة {pagination?.page || 1} من {Math.ceil((pagination?.total || products.length) / pageSize)}
                  {isLoading && <span className="ml-2 text-blue-600">جاري التحميل...</span>}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                لا توجد منتجات لعرضها
              </div>
            )}
          </div>
        )}
      

      {/* Product Movements Modal */}
      <ProductMovementsModal
        open={showMovementsModal}
        onOpenChange={setShowMovementsModal}
        product={selectedProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={showAdjustmentModal}
        onOpenChange={setShowAdjustmentModal}
        product={selectedProduct}
        onSuccess={() => {
          setShowAdjustmentModal(false);
          dispatch(getProducts({ page: 1, limit: pageSize }));
        }}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        product={selectedProduct}
        onSuccess={() => {
          setShowTransferModal(false);
          dispatch(getProducts({ page: 1, limit: pageSize }));
        }}
      />

      {/* CSV Format Guide Modal */}
      <CsvFormatGuideModal
        isOpen={showCsvFormatModal}
        onClose={() => setShowCsvFormatModal(false)}
      />
    </div>
  );
};

export default Inventory;
