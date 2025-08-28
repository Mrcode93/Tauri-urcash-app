import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { createProduct } from '@/features/inventory/inventorySlice';
import { Product, CreateProductData } from '@/features/inventory/inventoryService';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, X } from 'lucide-react';

interface AddProductFromPurchaseProps {
  onProductCreated: (product: Product) => void;
  supplierId?: number;
  purchasePrice?: number;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

const AddProductFromPurchase: React.FC<AddProductFromPurchaseProps> = ({
  onProductCreated,
  supplierId,
  purchasePrice = 0,
  className = "",
  onOpenChange
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    scientific_name: '',
    supported: false,
    sku: '',
    barcode: '',
    purchase_price: purchasePrice,
    selling_price: 0,
    current_stock: 0,
    min_stock: 0,
    unit: 'قطعة',
    category_id: undefined,
    supplier_id: supplierId,
    expiry_date: '',
    units_per_box: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("الرجاء إدخال اسم المنتج");
      return;
    }

    if (formData.purchase_price <= 0) {
      toast.error("الرجاء إدخال سعر الشراء");
      return;
    }

    if (formData.selling_price <= 0) {
      toast.error("الرجاء إدخال سعر البيع");
      return;
    }

    setIsLoading(true);
    try {
      const newProduct = await dispatch(createProduct(formData)).unwrap();
      toast.success("تم إضافة المنتج بنجاح");
      onProductCreated(newProduct);
      setIsOpen(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        scientific_name: '',
        supported: false,
        sku: '',
        barcode: '',
        purchase_price: purchasePrice,
        selling_price: 0,
        current_stock: 0,
        min_stock: 0,
        unit: 'قطعة',
        category_id: undefined,
        supplier_id: supplierId,
        expiry_date: '',
        units_per_box: 1,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء إضافة المنتج");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset form
    setFormData({
      name: '',
      description: '',
      scientific_name: '',
      supported:false,
      sku: '',
      barcode: '',
      purchase_price: purchasePrice,
      selling_price: 0,
      current_stock: 0,
      min_stock: 0,
      unit: 'قطعة',
      category_id: undefined,
      supplier_id: supplierId,
      expiry_date: '',
      units_per_box: 1,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
    
    if (!open) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 text-green-600 border-green-200 hover:bg-green-50 ${className}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Plus className="w-4 h-4" />
          إضافة منتج جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rtl scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            إضافة منتج جديد
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">المعلومات الأساسية</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المنتج *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم المنتج"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scientific_name">الاسم العلمي</Label>
                <Input
                  id="scientific_name"
                  value={formData.scientific_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, scientific_name: e.target.value }))}
                  placeholder="أدخل الاسم العلمي للمنتج (اختياري)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">رمز المنتج (SKU)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="أدخل رمز المنتج"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">الباركود</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="أدخل الباركود"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">الوحدة</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="قطعة">قطعة</SelectItem>
                    <SelectItem value="كيلو">كيلو</SelectItem>
                    <SelectItem value="لتر">لتر</SelectItem>
                    <SelectItem value="متر">متر</SelectItem>
                    <SelectItem value="صندوق">صندوق</SelectItem>
                    <SelectItem value="علبة">علبة</SelectItem>
                    <SelectItem value="زجاجة">زجاجة</SelectItem>
                    <SelectItem value="عبوة">عبوة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف المنتج</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="أدخل وصف المنتج"
                rows={3}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">الأسعار والمخزون</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">سعر الشراء *</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">سعر البيع *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={formData.selling_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, selling_price: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_stock">المخزون الحالي</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">الحد الأدنى للمخزون</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="units_per_box">الوحدات في الصندوق</Label>
                <Input
                  id="units_per_box"
                  type="number"
                  value={formData.units_per_box}
                  onChange={(e) => setFormData(prev => ({ ...prev, units_per_box: Number(e.target.value) }))}
                  min="1"
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">تاريخ انتهاء الصلاحية</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "جاري الإضافة..." : "إضافة المنتج"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductFromPurchase; 