import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { getProductMovements } from '@/features/inventory/inventorySlice';
import { Product } from '@/features/inventory/inventoryService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  ArrowUpDown,
  Filter,
  Download,
  RefreshCw,
  ArrowRight,
  Warehouse
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StockTransferModal from './StockTransferModal';

interface StockMovement {
  id: number;
  movement_date: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial' | 'transfer';
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  notes?: string;
  reference_type?: string;
  reference_id?: number;
  reference_number?: string;
  customer_name?: string;
  supplier_name?: string;
  from_stock_name?: string;
  to_stock_name?: string;
}

interface ProductMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const ProductMovementsModal: React.FC<ProductMovementsModalProps> = ({
  open,
  onOpenChange,
  product
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementType, setMovementType] = useState<string>('all');
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (open && product) {
      fetchMovements();
    }
  }, [open, product, startDate, endDate, movementType]);

  const fetchMovements = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      const params: any = { id: product.id };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (movementType !== 'all') params.movementType = movementType;
      
      const result = await dispatch(getProductMovements(params)).unwrap();
      setMovements(result.movements || []);
    } catch (error) {
      toast.error('فشل في جلب حركات المنتج');
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'sale':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'adjustment':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      case 'return':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'transfer':
        return <ArrowRight className="h-4 w-4 text-purple-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementTypeText = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'شراء';
      case 'sale':
        return 'بيع';
      case 'adjustment':
        return 'تعديل';
      case 'return':
        return 'مرتجع';
      case 'transfer':
        return 'نقل';
      case 'initial':
        return 'رصيد ابتدائي';
      default:
        return type;
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-800';
      case 'sale':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'return':
        return 'bg-orange-100 text-orange-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMovements = movements.filter(movement => {
    if (movementType !== 'all' && movement.movement_type !== movementType) {
      return false;
    }
    return true;
  });

  const exportMovements = () => {
    if (!product) return;
    
    const csvContent = [
      ['التاريخ', 'نوع الحركة', 'الكمية', 'الكمية قبل', 'الكمية بعد', 'المرجع', 'ملاحظات', 'من مخزن', 'إلى مخزن'],
      ...filteredMovements.map(movement => [
        formatDate(movement.movement_date),
        getMovementTypeText(movement.movement_type),
        movement.quantity,
        movement.before_quantity,
        movement.after_quantity,
        movement.reference_number || movement.reference_id || '-',
        movement.notes || '-',
        movement.from_stock_name || '-',
        movement.to_stock_name || '-'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `movements_${product.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTransferSuccess = () => {
    fetchMovements();
    toast.success('تم نقل المنتج بنجاح');
  };

  if (!product) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              حركات المنتج - {product.name}
            </DialogTitle>
          </DialogHeader>

          {/* Product Summary Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>معلومات المنتج</span>
                <Button
                  onClick={() => setShowTransferModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  نقل المنتج
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">المخزون الحالي</Label>
                  <div className="text-xl font-bold text-blue-600">{product.current_stock}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">الحد الأدنى</Label>
                  <div className="text-xl font-bold text-orange-600">{product.min_stock}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">إجمالي المبيعات</Label>
                  <div className="text-xl font-bold text-green-600">{product.total_sold || 0}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">إجمالي المشتريات</Label>
                  <div className="text-xl font-bold text-purple-600">{product.total_purchased || 0}</div>
                </div>
              </div>
              {product.stock_id && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">المخزن الحالي:</span>
                    <span className="font-medium">{product.stock_name || `مخزن رقم ${product.stock_id}`}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                الفلاتر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>نوع الحركة</Label>
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحركات</SelectItem>
                      <SelectItem value="purchase">شراء</SelectItem>
                      <SelectItem value="sale">بيع</SelectItem>
                      <SelectItem value="adjustment">تعديل</SelectItem>
                      <SelectItem value="return">مرتجع</SelectItem>
                      <SelectItem value="transfer">نقل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={fetchMovements} disabled={loading} className="flex-1">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={exportMovements}>
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>سجل الحركات</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>جاري تحميل الحركات...</p>
                </div>
              ) : filteredMovements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3">نوع الحركة</th>
                        <th className="px-4 py-3">الكمية</th>
                        <th className="px-4 py-3">الكمية قبل</th>
                        <th className="px-4 py-3">الكمية بعد</th>
                        <th className="px-4 py-3">من مخزن</th>
                        <th className="px-4 py-3">إلى مخزن</th>
                        <th className="px-4 py-3">المرجع</th>
                        <th className="px-4 py-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => (
                        <tr key={movement.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            {formatDate(movement.movement_date)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {getMovementIcon(movement.movement_type)}
                              <Badge className={getMovementTypeColor(movement.movement_type)}>
                                {getMovementTypeText(movement.movement_type)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`font-bold ${
                              movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4">{movement.before_quantity}</td>
                          <td className="px-4 py-4 font-bold">{movement.after_quantity}</td>
                          <td className="px-4 py-4">
                            {movement.from_stock_name || '-'}
                          </td>
                          <td className="px-4 py-4">
                            {movement.to_stock_name || '-'}
                          </td>
                          <td className="px-4 py-4">
                            {movement.reference_number || movement.reference_id || '-'}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد حركات مخزون لهذا المنتج</p>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Modal */}
      <StockTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        product={product}
        onSuccess={handleTransferSuccess}
      />
    </>
  );
};

export default ProductMovementsModal; 