import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { stocksService, Stock } from '@/features/stocks/stocksService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Search,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StockProduct {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  current_stock: number;
  current_stock_in_stock?: number;
  purchase_price: number;
  unit: string;
  company_name?: string;
}

interface ProductSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: Stock | null;
  onProductSelect: (product: StockProduct) => void;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  open,
  onOpenChange,
  stock,
  onProductSelect
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open && stock) {
      loadStockProducts();
    }
  }, [open, stock]);

  const loadStockProducts = async () => {
    if (!stock) return;
    
    try {
      setLoading(true);
      const stockProducts = await stocksService.getStockProducts(stock.id);
      
      // Filter products that have stock > 0
      const availableProducts = stockProducts.filter((product: StockProduct) => 
        (product.current_stock_in_stock || product.current_stock) > 0
      );
      
      setProducts(availableProducts);
    } catch (error) {
      console.error('Error loading stock products:', error);
      toast.error('فشل في تحميل منتجات المخزن');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.company_name && product.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProductSelect = (product: StockProduct) => {
    onProductSelect(product);
    onOpenChange(false);
  };

  if (!stock) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            اختيار منتج للنقل من {stock.name}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="ابحث عن منتج بالاسم، SKU، الباركود، أو اسم الشركة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              المنتجات المتاحة للنقل ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>جاري تحميل المنتجات...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">SKU</TableHead>
                      <TableHead className="text-right">الباركود</TableHead>
                      <TableHead className="text-right">الكمية المتاحة</TableHead>
                      <TableHead className="text-right">سعر الشراء</TableHead>
                      <TableHead className="text-right">الوحدة</TableHead>
                      <TableHead className="text-right">الشركة</TableHead>
                      <TableHead className="text-right">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>{product.sku || '-'}</TableCell>
                        <TableCell>{product.barcode || '-'}</TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            {product.current_stock_in_stock || product.current_stock}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(product.purchase_price)}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{product.company_name || '-'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleProductSelect(product)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <ArrowRight className="h-4 w-4 ml-1" />
                            اختيار للنقل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {searchTerm 
                    ? 'لا توجد منتجات تطابق البحث' 
                    : 'لا توجد منتجات متاحة للنقل في هذا المخزن'
                  }
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    مسح البحث
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSelectionModal;
