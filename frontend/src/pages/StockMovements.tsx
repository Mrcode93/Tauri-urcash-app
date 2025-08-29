import React, { useState, useEffect } from 'react';
import { ArrowRight, Package, Calendar, User, FileText } from 'lucide-react';
import { stocksService, StockMovement, CreateMovementData } from '../features/stocks/stocksService';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

const StockMovements: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateMovementData>({
    movement_type: 'transfer',
    from_stock_id: undefined,
    to_stock_id: undefined,
    product_id: 0,
    quantity: 0,
    unit_cost: 0,
    total_value: 0,
    reference_type: '',
    reference_id: 0,
    reference_number: '',
    notes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [movementsData, stocksData] = await Promise.all([
        stocksService.getAllMovements({ limit: 100 }),
        stocksService.getAllStocks()
      ]);
      setMovements(movementsData.data);
      setStocks(stocksData);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل حركات المنتجات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMovement = async () => {
    try {
      await stocksService.createMovement(formData);
      toast({
        title: 'نجح',
        description: 'تم إنشاء حركة المنتج بنجاح'
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء حركة المنتج',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      movement_type: 'transfer',
      from_stock_id: undefined,
      to_stock_id: undefined,
      product_id: 0,
      quantity: 0,
      unit_cost: 0,
      total_value: 0,
      reference_type: '',
      reference_id: 0,
      reference_number: '',
      notes: ''
    });
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-yellow-100 text-yellow-800';
      case 'purchase': return 'bg-green-100 text-green-800';
      case 'sale': return 'bg-red-100 text-red-800';
      case 'return': return 'bg-purple-100 text-purple-800';
      case 'damage': return 'bg-red-100 text-red-800';
      case 'expiry': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer': return 'نقل';
      case 'adjustment': return 'تعديل';
      case 'purchase': return 'شراء';
      case 'sale': return 'بيع';
      case 'return': return 'إرجاع';
      case 'damage': return 'تلف';
      case 'expiry': return 'انتهاء صلاحية';
      default: return type;
    }
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">حركات المنتجات</h1>
          <p className="text-gray-600 mt-2">تتبع حركات المنتجات بين المخازن</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Package className="ml-2 h-4 w-4" />
              إضافة حركة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>إضافة حركة مخزون جديدة</DialogTitle>
                          <DialogDescription>
              أدخل تفاصيل حركة المنتج
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="movement_type">نوع الحركة</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) => setFormData({ ...formData, movement_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">نقل</SelectItem>
                    <SelectItem value="adjustment">تعديل</SelectItem>
                    <SelectItem value="purchase">شراء</SelectItem>
                    <SelectItem value="sale">بيع</SelectItem>
                    <SelectItem value="return">إرجاع</SelectItem>
                    <SelectItem value="damage">تلف</SelectItem>
                    <SelectItem value="expiry">انتهاء صلاحية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_stock">من مخزن</Label>
                  <Select
                    value={formData.from_stock_id?.toString() || ''}
                    onValueChange={(value) => setFormData({ ...formData, from_stock_id: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المخزن المصدر" />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks?.map((stock) => (
                        <SelectItem key={stock.id} value={stock.id.toString()}>
                          {stock.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to_stock">إلى مخزن</Label>
                  <Select
                    value={formData.to_stock_id?.toString() || ''}
                    onValueChange={(value) => setFormData({ ...formData, to_stock_id: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المخزن الهدف" />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks?.map((stock) => (
                        <SelectItem key={stock.id} value={stock.id.toString()}>
                          {stock.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_id">المنتج</Label>
                <Input
                  id="product_id"
                  type="number"
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: parseInt(e.target.value) || 0 })}
                  placeholder="معرف المنتج"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="الكمية"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_cost">سعر الوحدة</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="سعر الوحدة"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">رقم المرجع</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="رقم المرجع"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateMovement}>
                إنشاء الحركة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {movements.map((movement) => (
          <Card key={movement.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 ml-2" />
                    {movement.product_name || `المنتج ${movement.product_id}`}
                  </CardTitle>
                  <CardDescription>
                    {movement.product_sku && `SKU: ${movement.product_sku}`}
                  </CardDescription>
                </div>
                <Badge className={getMovementTypeColor(movement.movement_type)}>
                  {getMovementTypeLabel(movement.movement_type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {movement.from_stock_name && (
                      <>
                        <span className="text-sm font-medium">{movement.from_stock_name}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                    <span className="text-sm font-medium">{movement.to_stock_name || 'إلى مخزن'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {movement.quantity} قطعة
                  </div>
                </div>

                {movement.unit_cost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">سعر الوحدة:</span>
                    <span className="font-medium">{movement.unit_cost} د.ك</span>
                  </div>
                )}

                {movement.total_value && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">القيمة الإجمالية:</span>
                    <span className="font-medium">{movement.total_value} د.ك</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 ml-1" />
                    <span>{new Date(movement.movement_date).toLocaleDateString('ar-IQ')}</span>
                  </div>
                  {movement.created_by_name && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 ml-1" />
                      <span>{movement.created_by_name}</span>
                    </div>
                  )}
                </div>

                {movement.reference_number && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 ml-1" />
                    <span>مرجع: {movement.reference_number}</span>
                  </div>
                )}

                {movement.notes && (
                  <p className="text-sm text-gray-600">{movement.notes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {movements.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حركات مخزون</h3>
          <p className="text-gray-600">ابدأ بإضافة حركة مخزون جديدة</p>
        </div>
      )}
    </div>
  );
};

export default StockMovements; 