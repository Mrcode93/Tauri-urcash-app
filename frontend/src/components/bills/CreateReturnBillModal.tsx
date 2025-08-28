import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Plus, 
  Trash2, 
  Search,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { createReturnBill } from '../../features/bills/billsService';
import { fetchReturnBills } from '../../features/bills/billsSlice';
import { getAllPurchaseBills } from '../../features/bills/billsService';
import { getSales } from '../../features/sales/salesService';
import type { Purchase, BillItem } from '../../features/bills/billsService';
import type { SaleData } from '../../features/sales/salesService';

interface CreateReturnBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillCreated?: () => void;
}

interface ReturnItem extends BillItem {
  original_quantity: number;
  returned_quantity: number;
  product_name: string;
  product_sku: string;
}

const CreateReturnBillModal: React.FC<CreateReturnBillModalProps> = ({ 
  open, 
  onOpenChange,
  onBillCreated
}) => {
  const dispatch = useDispatch();
  
  // Form state
  const [returnType, setReturnType] = useState<'sale' | 'purchase'>('sale');
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');
  
  // Data state
  const [originalBills, setOriginalBills] = useState<SaleData[] | Purchase[]>([]);
  const [selectedBill, setSelectedBill] = useState<SaleData | Purchase | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  
  // Load original bills based on return type
  useEffect(() => {
    if (open) {
      loadOriginalBills();
    } else {
      // Reset form when modal closes
      resetForm();
    }
  }, [open, returnType]);

  const loadOriginalBills = async () => {
    setLoadingBills(true);
    try {
      if (returnType === 'sale') {
        const response = await getSales({});
        setOriginalBills(response?.data || []);
      } else {
        const response = await getAllPurchaseBills({}, 1, 1000);
        setOriginalBills(response?.data || []);
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الفواتير الأصلية",
        variant: "destructive",
      });
      setOriginalBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  // Filter bills based on search term
  const filteredBills = (originalBills || []).filter(bill => {
    const invoiceNo = 'invoice_no' in bill ? bill.invoice_no : '';
    const customerName = 'customer_name' in bill ? bill.customer_name : '';
    const supplierName = 'supplier_name' in bill ? bill.supplier_name : '';
    
    const searchLower = searchTerm.toLowerCase();
    return (
      invoiceNo.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower) ||
      supplierName.toLowerCase().includes(searchLower)
    );
  });

  // Handle bill selection
  const handleBillSelect = (bill: SaleData | Purchase) => {
    setSelectedBill(bill);
    setOriginalInvoiceNo('invoice_no' in bill ? bill.invoice_no : '');
    
    // Convert bill items to return items
    const items: ReturnItem[] = (bill.items || []).map(item => ({
      ...item,
      original_quantity: item.quantity,
      returned_quantity: 0,
      product_name: item.product_name || 'غير محدد',
      product_sku: item.product_sku || 'غير محدد'
    }));
    
    setReturnItems(items);
  };

  // Handle quantity change for return items
  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.product_id === itemId) {
        const returnedQty = Math.min(newQuantity, item.original_quantity);
        return { ...item, returned_quantity: returnedQty };
      }
      return item;
    }));
  };

  // Remove item from return
  const removeReturnItem = (itemId: number) => {
    setReturnItems(prev => prev.filter(item => item.product_id !== itemId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalAmount = returnItems.reduce((sum, item) => {
      return sum + (item.price * item.returned_quantity);
    }, 0);
    
    const totalItems = returnItems.reduce((sum, item) => sum + item.returned_quantity, 0);
    
    return { totalAmount, totalItems };
  };

  const { totalAmount, totalItems } = calculateTotals();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBill) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الفاتورة الأصلية",
        variant: "destructive",
      });
      return;
    }

    if (returnItems.length === 0 || totalItems === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة منتجات للإرجاع",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const returnData = {
        return_type: returnType,
        sale_id: returnType === 'sale' ? selectedBill.id : undefined,
        purchase_id: returnType === 'purchase' ? selectedBill.id : undefined,
        return_date: returnDate,
        total_amount: totalAmount,
        refund_amount: totalAmount,
        reason: reason,
        refund_method: refundMethod === 'bank' ? 'bank_transfer' : refundMethod,
        notes: notes,
        created_by: 1 // TODO: Get from auth context
      };

      const items: BillItem[] = returnItems
        .filter(item => item.returned_quantity > 0)
        .map(item => ({
          product_id: item.product_id,
          quantity: item.returned_quantity,
          price: item.price,
          reason: reason,
          sale_item_id: returnType === 'sale' ? item.id : undefined,
          purchase_item_id: returnType === 'purchase' ? item.id : undefined
        }));

      await createReturnBill(returnData, items);
      
      toast({
        title: "نجح",
        description: "تم إنشاء فاتورة الإرجاع بنجاح",
      });
      
      // Refresh return bills list
      dispatch(fetchReturnBills({ filters: {}, page: 1, limit: 20 }) as any);
      
      // Reset form and close modal
      resetForm();
      onOpenChange(false);
      
      // Call the callback if provided
      if (onBillCreated) {
        onBillCreated();
      }
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء فاتورة الإرجاع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Reset form
  const resetForm = () => {
    setReturnType('sale');
    setOriginalInvoiceNo('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setRefundMethod('cash');
    setNotes('');
    setSelectedBill(null);
    setReturnItems([]);
    setSearchTerm('');
    setOriginalBills([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>فاتورة إرجاع جديدة</DialogTitle>
          <DialogDescription>
            إنشاء فاتورة إرجاع جديدة من فاتورة موجودة
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="returnType">نوع الإرجاع</Label>
                <Select value={returnType} onValueChange={(value: 'sale' | 'purchase') => setReturnType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">إرجاع مبيعات</SelectItem>
                    <SelectItem value="purchase">إرجاع مشتريات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="returnDate">تاريخ الإرجاع</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="refundMethod">طريقة الاسترداد</Label>
                <Select value={refundMethod} onValueChange={(value: 'cash' | 'bank') => setRefundMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="bank">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">سبب الإرجاع</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="سبب الإرجاع"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Select Original Bill */}
          <Card>
            <CardHeader>
              <CardTitle>اختيار الفاتورة الأصلية</CardTitle>
              <CardDescription>
                {!loadingBills && `${filteredBills.length} فاتورة متاحة`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">البحث في الفواتير</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="البحث برقم الفاتورة أو اسم العميل/المورد"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loadingBills ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'لا توجد فواتير تطابق البحث' : 'لا توجد فواتير متاحة'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>{returnType === 'sale' ? 'العميل' : 'المورد'}</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الإجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((bill) => (
                        <TableRow 
                          key={bill.id}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            selectedBill?.id === bill.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleBillSelect(bill)}
                        >
                          <TableCell className="font-medium">
                            {'invoice_no' in bill ? bill.invoice_no : ''}
                          </TableCell>
                          <TableCell>
                            {'customer_name' in bill ? bill.customer_name : 
                             'supplier_name' in bill ? bill.supplier_name : ''}
                          </TableCell>
                          <TableCell>
                            {'invoice_date' in bill ? bill.invoice_date : ''}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('ar-IQ', {
                              style: 'currency',
                              currency: 'IQD'
                            }).format(bill.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant={selectedBill?.id === bill.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleBillSelect(bill)}
                            >
                              {selectedBill?.id === bill.id ? 'محدد' : 'اختيار'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedBill && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      تم اختيار الفاتورة: {originalInvoiceNo}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Items */}
          {selectedBill && returnItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>المنتجات المراد إرجاعها</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية الأصلية</TableHead>
                      <TableHead>كمية الإرجاع</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-gray-500">{item.product_sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.original_quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.original_quantity}
                            value={item.returned_quantity}
                            onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('ar-IQ', {
                            style: 'currency',
                            currency: 'IQD'
                          }).format(item.price)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('ar-IQ', {
                            style: 'currency',
                            currency: 'IQD'
                          }).format(item.price * item.returned_quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReturnItem(item.product_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">إجمالي المنتجات: </span>
                      <Badge variant="secondary">{totalItems}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">المبلغ الإجمالي: </span>
                      <span className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat('ar-IQ', {
                          style: 'currency',
                          currency: 'IQD'
                        }).format(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات إضافية</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية (اختياري)"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedBill || totalItems === 0}
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء فاتورة الإرجاع'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReturnBillModal; 