import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { createProduct } from '@/features/inventory/inventorySlice';
// import { getSuppliers } from '@/features/suppliers/suppliersSlice';
import { Product } from '@/features/inventory/inventoryService';
import { stocksService, Stock } from '@/features/stocks/stocksService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/lib/toast";
import { Loader2, Package, Tag, FileText, DollarSign, Calendar, AlertTriangle, Keyboard, Building, Plus, Warehouse } from 'lucide-react';
import { useFormNavigation } from '@/hooks/useFormNavigation';
import { Switch } from '@/components/ui/switch';
// import SupplierForm from './SupplierForm';
// import CategoryForm from './CategoryForm';

const unitOptions = ["قطعة", "علبة", "كرتون", "كيلوغرام", "لتر", "متر", "صندوق", "عبوة", "زجاجة"];

const initialFormData = {
  name: '',
  description: '',
  sku: '',
  scientific_name: '',
  barcode: '',
  supported: false,
  purchase_price: 0,
  selling_price: 0,
  wholesale_price: 0,
  company_name: '',
  current_stock: 0,
  min_stock: 0,
  unit: 'قطعة',
  units_per_box: 1,
  expiry_date: '',
  category_id: null as number | null,
  stock_id: null as number | null,
  is_dolar: false,
};

interface AddProductFormProps {
  initialBarcode?: string;
  onSuccess: (product?: Product) => void;
  onCancel: () => void;
}

const AddProductForm = ({ initialBarcode = '', onSuccess, onCancel }: AddProductFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ...initialFormData,
    barcode: initialBarcode || '',
  });
  // Categories disabled - no longer using categories from server
  // const categories = useSelector((state: RootState) => state.inventory.categories);
  // const categoriesLoading = useSelector((state: RootState) => state.inventory.categoriesLoading);
  // const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  // const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksFetched, setStocksFetched] = useState(false);

  // Supplier fetching removed - simplified product creation

  // Categories are disabled - no longer used
  // useEffect(() => {
  //   if (!categoriesFetched) {
  //     dispatch(getCategories());
  //     setCategoriesFetched(true);
  //   }
  // }, [dispatch, categoriesFetched]);

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
      toast.error('فشل في تحميل المخازن');
    } finally {
      setStocksLoading(false);
    }
  };

  // Define field order for navigation
  const fieldOrder = [
    'name',
    'sku',
    'scientific_name',
    'barcode', 
    'description',
    'company_name',
    'supported',
    'purchase_price',
    'selling_price',
    'wholesale_price',
    'is_dolar',
    'current_stock',
    'min_stock',
    'unit',
    'units_per_box',
    'expiry_date',
    'category_id',
    'stock_id',
  ];

  const { setInputRef, handleKeyDown, focusFirstField } = useFormNavigation({
    fieldOrder,
    skipFields: ['unit', 'category_id'], // Skip select fields as they have different navigation
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
    // Only auto-focus if no field is currently focused
    const timer = setTimeout(() => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement.tagName === 'BODY') {
        focusFirstField();
      }
    }, 200); // Increased delay to ensure modal is fully open
    return () => clearTimeout(timer);
  }, [focusFirstField]);

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, barcode: value }));
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
  };

  const handleSupplierChange = (value: string) => {
            // Supplier selection removed - simplified product creation
  };

  // Category selection removed - keeping category_id as null
  // const handleCategoryChange = (value: string) => {
  //   setFormData(prev => ({ ...prev, category_id: value ? parseInt(value) : null }));
  // };

  const handleStockChange = (value: string) => {
    setFormData(prev => ({ ...prev, stock_id: value ? parseInt(value) : null }));
  };

      const handleSupplierSuccess = (supplier: { id: number }) => {
    // Supplier selection removed - simplified product creation
  };

  // Category functionality removed
  // const handleCategorySuccess = (category: any) => {
  //   // Select the new category
  //   setFormData(prev => ({ ...prev, category_id: category.id }));
  //   // Refresh categories list
  //   dispatch(getCategories());
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields (supplier and SKU are now optional)
      if (!formData.name || !formData.purchase_price || !formData.selling_price || !formData.unit) {
        toast.error('يرجى تعبئة جميع الحقول المطلوبة (الاسم، أسعار، الوحدة)');
        setLoading(false);
        return;
      }
      // Validate barcode format if provided
      if (formData.barcode && formData.barcode.length < 8) {
        toast.error('يجب أن يكون الباركود 8 أرقام على الأقل');
        setLoading(false);
        return;
      }
      const newProduct = await dispatch(createProduct(formData)).unwrap();
      toast.success('تم إضافة المنتج بنجاح');
      setFormData({ ...initialFormData, barcode: '', sku: '', stock_id: 1 });
      onSuccess(newProduct);
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Keyboard shortcuts help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
              الباركود
            </Label>
            <Input
              type="text"
              ref={setInputRef('barcode')}
              value={formData.barcode}
              onChange={handleBarcodeInput}
              onKeyDown={handleKeyDown('barcode')}
              placeholder="Scan or enter barcode"
              className="flex-1"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              المنتج مدعوم
            </Label>
            <Switch 
              checked={formData.supported}
              onCheckedChange={value => setFormData(prev => ({ ...prev, supported: value }))}
            />
          </div>
          {/* <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              الوصف
            </Label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onKeyDown={handleKeyDown('description')}
              ref={setInputRef('description')}
              rows={3}
              placeholder="أدخل وصف المنتج"
            />
          </div> */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              اسم الشركة
            </Label>
            <Input
              type="text"
              value={formData.company_name}
              onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              onKeyDown={handleKeyDown('company_name')}
              ref={setInputRef('company_name')}
              placeholder="أدخل اسم الشركة"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              الاسم العلمي (اختياري)
            </Label>
            <Input
              type="text"
              value={formData.scientific_name}
              onChange={e => setFormData(prev => ({ ...prev, scientific_name: e.target.value }))}
              onKeyDown={handleKeyDown('scientific_name')}
              ref={setInputRef('scientific_name')}
              placeholder="أدخل الاسم العلمي للمنتج (اختياري)"
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
              سعر البيع بالجملة
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
              الكمية الحالية
            </Label>
            <Input
              type="number"
              value={formData.current_stock}
              onChange={e => setFormData(prev => ({ ...prev, current_stock: parseInt(e.target.value) }))}
              onKeyDown={handleKeyDown('current_stock')}
              ref={setInputRef('current_stock')}
              min="0"
              required
              placeholder="0"
            />
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
              تاريخ الانتهاء
            </Label>
            <Input
              type="date"
              value={formData.expiry_date || ''}
              onChange={e => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              onKeyDown={handleKeyDown('expiry_date')}
              ref={setInputRef('expiry_date')}
            />
          </div>
          {/* Category selection removed - categories are not implemented in backend */}
          {/* <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              المخزن (اختياري)
            </Label>
            <Select
              value={formData.stock_id ? String(formData.stock_id) : ''}
              onValueChange={handleStockChange}
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
          </div> */}
          {/* Supplier selection removed - simplified product creation */}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({ ...initialFormData, barcode: initialBarcode, stock_id: null })}
            disabled={loading}
          >
            إعادة تعيين
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : (formData.barcode ? 'تحديث المنتج' : 'إضافة منتج')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;