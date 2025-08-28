import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, MapPin, Phone, Mail, User, BarChart3, ArrowRightLeft, Eye, PackagePlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { stocksService, Stock, CreateStockData } from '../features/stocks/stocksService';
import { getProductsByStock } from '../features/inventory/inventoryService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from '../lib/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
import StockTransferModal from '../components/StockTransferModal';
import ProductSelectionModal from '../components/ProductSelectionModal';

const Stocks: React.FC = () => {
  const navigate = useNavigate();
  
  // Permission checks for inventory management
  const canViewInventory = useSelector(selectHasPermission(PERMISSIONS.INVENTORY_VIEW));
  const canAddInventory = useSelector(selectHasPermission(PERMISSIONS.INVENTORY_ADD));
  const canEditInventory = useSelector(selectHasPermission(PERMISSIONS.INVENTORY_EDIT));
  const canDeleteInventory = useSelector(selectHasPermission(PERMISSIONS.INVENTORY_DELETE));
  
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddProductsDialogOpen, setIsAddProductsDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableProductsLoading, setAvailableProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [productLocation, setProductLocation] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const [showStockProductsModal, setShowStockProductsModal] = useState(false);
  const [stockProducts, setStockProducts] = useState<any[]>([]);
  const [stockProductsLoading, setStockProductsLoading] = useState(false);
  const [transferProduct, setTransferProduct] = useState<any>(null);
  const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<Stock | null>(null);
  const [formData, setFormData] = useState<CreateStockData>({
    name: '',
    code: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'Iraq',
    postal_code: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    is_main_stock: false,
    capacity: 0,
    notes: ''
  });



  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await stocksService.getAllStocks();
      setStocks(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تحميل المخازن');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStock = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.code.trim() || !formData.address.trim()) {
        toast.error('يرجى ملء جميع الحقول المطلوبة (الاسم، الرمز، العنوان)');
        return;
      }

      await stocksService.createStock(formData);
      toast.success('تم إنشاء المخزن بنجاح');
      setIsCreateDialogOpen(false);
      resetForm();
      await loadStocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إنشاء المخزن');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedStock) return;
    
    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.code.trim() || !formData.address.trim()) {
        toast.error('يرجى ملء جميع الحقول المطلوبة (الاسم، الرمز، العنوان)');
        return;
      }

      await stocksService.updateStock(selectedStock.id, formData);
      toast.success('تم تحديث المخزن بنجاح');
      setIsEditDialogOpen(false);
      resetForm();
      loadStocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تحديث المخزن');
    }
  };

  const handleDeleteStock = async (stock: Stock) => {
    try {
      await stocksService.deleteStock(stock.id);
      toast.success('تم حذف المخزن بنجاح');
      loadStocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في حذف المخزن');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      address: '',
      city: '',
      state: '',
      country: 'Iraq',
      postal_code: '',
      phone: '',
      email: '',
      manager_name: '',
      manager_phone: '',
      manager_email: '',
      is_main_stock: false,
      capacity: 0,
      notes: ''
    });
  };

  const openEditDialog = (stock: Stock) => {
    setSelectedStock(stock);
    setFormData({
      name: stock.name,
      code: stock.code,
      description: stock.description || '',
      address: stock.address,
      city: stock.city || '',
      state: stock.state || '',
      country: stock.country || 'Iraq',
      postal_code: stock.postal_code || '',
      phone: stock.phone || '',
      email: stock.email || '',
      manager_name: stock.manager_name || '',
      manager_phone: stock.manager_phone || '',
      manager_email: stock.manager_email || '',
      is_main_stock: stock.is_main_stock,
      capacity: stock.capacity || 0,
      notes: stock.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };



  const openAddProductsDialog = async (stock: Stock) => {
    setSelectedStock(stock);
    await loadAvailableProducts();
    setIsAddProductsDialogOpen(true);
  };

  const openTransferModal = async (stock: Stock) => {
    setSelectedStockForTransfer(stock);
    setShowProductSelectionModal(true);
  };

  const handleProductSelect = (product: any) => {
    setTransferProduct(product);
    setShowTransferModal(true);
  };

  const loadAvailableProducts = async () => {
    try {
      setAvailableProductsLoading(true);
      const products = await stocksService.getAvailableProducts();
      // Ensure products is always an array
      setAvailableProducts(Array.isArray(products) ? products : []);
    } catch (error: any) {
      console.error('Error loading available products:', error);
      setAvailableProducts([]);
      toast.error(error.response?.data?.message || 'فشل في تحميل المنتجات المتاحة');
    } finally {
      setAvailableProductsLoading(false);
    }
  };

  const handleAddProductToStock = async () => {
    if (!selectedStock || !selectedProduct) return;
    
    try {
      // Validate required fields
      if (!selectedProduct || productQuantity <= 0) {
        toast.error('يرجى اختيار منتج وكمية صحيحة');
        return;
      }

      await stocksService.addProductToStock(selectedStock.id, {
        product_id: selectedProduct,
        quantity: productQuantity,
        location_in_stock: productLocation
      });
      toast.success('تم إضافة المنتج إلى المخزن بنجاح');
      setIsAddProductsDialogOpen(false);
      setSelectedProduct('');
      setProductQuantity(1);
      setProductLocation('');
      loadStocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة المنتج إلى المخزن');
    }
  };

  const loadStockProducts = async (stockId: number) => {
    try {
      setStockProductsLoading(true);
      const response = await getProductsByStock(stockId);
      setStockProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error loading stock products:', error);
      setStockProducts([]);
      toast.error(error.response?.data?.message || 'فشل في تحميل منتجات المخزن');
    } finally {
      setStockProductsLoading(false);
    }
  };

  const openStockProductsModal = async (stock: Stock) => {
    setSelectedStock(stock);
    setShowStockProductsModal(true);
    await loadStockProducts(stock.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-full mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة المخازن</h1>
          <p className="text-gray-600 mt-2">إدارة مخازن المنتجات والمواقع</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/stock-movements')}
          >
            <ArrowRightLeft className="ml-2 h-4 w-4" />
            حركات المنتجات
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/inventory')}
          >
            <Package className="ml-2 h-4 w-4" />
            إدارة المنتجات
          </Button>
          {canAddInventory && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة مخزن جديد
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>إضافة مخزن جديد</DialogTitle>
              <DialogDescription>
                أدخل معلومات المخزن الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المخزن *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="اسم المخزن"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">رمز المخزن *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="رمز المخزن"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المخزن"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">العنوان *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="عنوان المخزن"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="المدينة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">الولاية</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="الولاية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">البلد</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="البلد"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">الرمز البريدي</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="الرمز البريدي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_name">اسم المدير</Label>
                <Input
                  id="manager_name"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  placeholder="اسم مدير المخزن"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_phone">هاتف المدير</Label>
                <Input
                  id="manager_phone"
                  value={formData.manager_phone}
                  onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                  placeholder="هاتف المدير"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_email">بريد المدير</Label>
                <Input
                  id="manager_email"
                  type="email"
                  value={formData.manager_email}
                  onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                  placeholder="بريد المدير"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">السعة</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                  placeholder="سعة المخزن"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_main_stock"
                    checked={formData.is_main_stock}
                    onChange={(e) => setFormData({ ...formData, is_main_stock: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_main_stock">المخزن الرئيسي</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateStock}>
                إنشاء المخزن
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stocks.map((stock) => (
          <Card key={stock.id} className="bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div className="flex h-120">
              {/* Left Section - Header & Basic Info */}
              <div className="w-1/3 bg-gradient-to-b from-blue-600 to-blue-800 text-white p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{stock.name}</h3>
                    <p className="text-blue-100 text-xs">{stock.code}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {stock.is_main_stock && (
                    <Badge className="bg-yellow-500 text-white border-0 text-xs px-1 py-0.5">
                      رئيسي
                    </Badge>
                  )}
                  {!stock.is_active && (
                    <Badge className="bg-red-500 text-white border-0 text-xs px-1 py-0.5">
                      غير نشط
                    </Badge>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-auto space-y-2">
                  <div className="bg-white/10 rounded p-2 text-center">
                    <div className="text-lg font-bold">{stock.total_products?.toLocaleString('ar-IQ') || 0}</div>
                    <div className="text-blue-100 text-xs">منتج</div>
                  </div>
                  <div className="bg-white/10 rounded p-2 text-center">
                    <div className="text-lg font-bold">{stock.total_stock_quantity?.toLocaleString('ar-IQ') || 0}</div>
                    <div className="text-blue-100 text-xs">قطعة</div>
                  </div>
                </div>
              </div>

              {/* Right Section - Details & Actions */}
              <div className="w-2/3 p-4 flex flex-col">
                {/* Description */}
                {stock.description && (
                  <div className="mb-3">
                    <p className="text-gray-700 text-sm font-medium line-clamp-2">
                      {stock.description}
                    </p>
                  </div>
                )}

                {/* Location & Contact - Compact */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{stock.address}</span>
                  </div>
                  
                  {stock.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{stock.phone}</span>
                    </div>
                  )}
                  
                  {stock.manager_name && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3 w-3 text-orange-600 flex-shrink-0" />
                      <span className="text-gray-700">{stock.manager_name}</span>
                    </div>
                  )}
                </div>

                {/* Capacity - Compact */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">السعة</span>
                    {stock.capacity > 0 ? (
                      <span className="text-blue-600 font-bold">
                        {Math.round((stock.current_capacity_used / stock.capacity) * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">غير محدد</span>
                    )}
                  </div>
                  {stock.capacity > 0 ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            (stock.current_capacity_used / stock.capacity) > 0.8 
                              ? 'bg-red-500' 
                              : (stock.current_capacity_used / stock.capacity) > 0.6 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((stock.current_capacity_used / stock.capacity) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{stock.current_capacity_used?.toLocaleString('ar-IQ')}</span>
                        <span>{stock.capacity?.toLocaleString('ar-IQ')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">
                      المستخدم: {stock.current_capacity_used?.toLocaleString('ar-IQ') || 0}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Compact */}
                <div className="flex flex-wrap gap-1 mt-auto">
                  {canEditInventory && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(stock)}
                      className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-xs px-2 py-1"
                      title="تعديل المخزن"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openStockProductsModal(stock)}
                    className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white text-xs px-2 py-1"
                    title="عرض المنتجات في المخزن"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  {canAddInventory && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddProductsDialog(stock)}
                      className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white text-xs px-2 py-1"
                      title="إضافة منتجات"
                    >
                      <PackagePlus className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {canEditInventory && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransferModal(stock)}
                      className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white text-xs px-2 py-1"
                      title="نقل منتجات من المخزن"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {canDeleteInventory && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white text-xs px-2 py-1"
                          title="حذف المخزن"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف المخزن "{stock.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteStock(stock)}>
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {canEditInventory && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>تعديل المخزن</DialogTitle>
            <DialogDescription>
              تعديل معلومات المخزن
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم المخزن *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اسم المخزن"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">رمز المخزن *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="رمز المخزن"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف المخزن"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-address">العنوان *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="عنوان المخزن"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">المدينة</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="المدينة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">الولاية</Label>
              <Input
                id="edit-state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="الولاية"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">البلد</Label>
              <Input
                id="edit-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="البلد"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postal_code">الرمز البريدي</Label>
              <Input
                id="edit-postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="الرمز البريدي"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="رقم الهاتف"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="البريد الإلكتروني"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager_name">اسم المدير</Label>
              <Input
                id="edit-manager_name"
                value={formData.manager_name}
                onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                placeholder="اسم مدير المخزن"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager_phone">هاتف المدير</Label>
              <Input
                id="edit-manager_phone"
                value={formData.manager_phone}
                onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                placeholder="هاتف المدير"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manager_email">بريد المدير</Label>
              <Input
                id="edit-manager_email"
                type="email"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                placeholder="بريد المدير"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">السعة</Label>
              <Input
                id="edit-capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                placeholder="سعة المخزن"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_main_stock"
                  checked={formData.is_main_stock}
                  onChange={(e) => setFormData({ ...formData, is_main_stock: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit-is_main_stock">المخزن الرئيسي</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateStock}>
              تحديث المخزن
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        )}



       {/* Add Products Dialog */}
       {canAddInventory && (
         <Dialog open={isAddProductsDialogOpen} onOpenChange={setIsAddProductsDialogOpen}>
         <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
             <DialogTitle>إضافة منتجات إلى المخزن: {selectedStock?.name}</DialogTitle>
             <DialogDescription>
               اختر المنتجات لإضافتها إلى المخزن
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="product">المنتج</Label>
               <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={availableProductsLoading}>
                 <SelectTrigger>
                   <SelectValue placeholder={availableProductsLoading ? "جاري التحميل..." : "اختر المنتج"} />
                 </SelectTrigger>
                 <SelectContent>
                   {availableProductsLoading ? (
                     <SelectItem value="" disabled>
                       جاري تحميل المنتجات...
                     </SelectItem>
                   ) : Array.isArray(availableProducts) && availableProducts.length > 0 ? (
                     availableProducts.map((product) => (
                       <SelectItem key={product.id} value={product.id.toString()}>
                         {product.name} - {product.sku}
                       </SelectItem>
                     ))
                   ) : (
                     <SelectItem value="" disabled>
                       لا توجد منتجات متاحة
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="quantity">الكمية</Label>
               <Input
                 id="quantity"
                 type="number"
                 value={productQuantity}
                 onChange={(e) => setProductQuantity(Number(e.target.value))}
                 min="1"
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="location">الموقع في المخزن</Label>
               <Input
                 id="location"
                 value={productLocation}
                 onChange={(e) => setProductLocation(e.target.value)}
                 placeholder="مثال: رف A، صف 3"
               />
             </div>
           </div>
           <div className="flex justify-end space-x-2 mt-4">
             <Button variant="outline" onClick={() => setIsAddProductsDialogOpen(false)}>
               إلغاء
             </Button>
             <Button onClick={handleAddProductToStock} disabled={!selectedProduct}>
               إضافة المنتج
             </Button>
           </div>
         </DialogContent>
       </Dialog>
         )}

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        product={transferProduct}
        onSuccess={(transferData) => {
          setShowTransferModal(false);
          setTransferProduct(null);
          
          // Update stocks data with the returned updated data
          if (transferData) {
            // Refresh stocks data to get the latest information
            loadStocks();
            
            // If we have stock products modal open, refresh it too
            if (showStockProductsModal && selectedStock) {
              loadStockProducts(selectedStock.id);
            }
          }
        }}
      />

      {/* Product Selection Modal */}
      <ProductSelectionModal
        open={showProductSelectionModal}
        onOpenChange={setShowProductSelectionModal}
        stock={selectedStockForTransfer}
        onProductSelect={handleProductSelect}
      />

      {/* Stock Products Modal */}
      <Dialog open={showStockProductsModal} onOpenChange={setShowStockProductsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              منتجات المخزن: {selectedStock?.name}
            </DialogTitle>
            <DialogDescription>
              عرض جميع المنتجات الموجودة في هذا المخزن
            </DialogDescription>
          </DialogHeader>
          
          {stockProductsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">جاري تحميل المنتجات...</p>
              </div>
            </div>
          ) : stockProducts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  إجمالي المنتجات: {stockProducts.length}
                </div>
                <div className="text-sm text-gray-600">
                  إجمالي الكمية: {stockProducts.reduce((sum, product) => sum + (product.current_stock_in_stock || 0), 0).toLocaleString('ar-IQ')}
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الرمز</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الموقع</TableHead>
                      <TableHead className="text-right">آخر تحديث</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-right">
                          <div>
                            <div className="font-bold">{product.product_name || product.name}</div>
                            {product.product_sku && (
                              <div className="text-xs text-gray-500">{product.product_sku}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.product_sku || product.sku || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-bold">
                            {product.current_stock_in_stock?.toLocaleString('ar-IQ') || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.location_in_stock || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-gray-500">
                          {product.updated_at ? new Date(product.updated_at).toLocaleDateString('ar-IQ') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-600">لا توجد منتجات في هذا المخزن حالياً</p>
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setShowStockProductsModal(false)}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stocks; 