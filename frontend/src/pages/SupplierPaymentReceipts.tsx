import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../app/store';
import { fetchAllMoneyBoxes } from '../features/moneyBoxes/moneyBoxesSlice';
import { supplierPaymentReceiptsService, SupplierPaymentReceipt, CreateSupplierPaymentReceiptData, SupplierPaymentReceiptFilters } from '../features/supplierPaymentReceipts/supplierPaymentReceiptsService';
import suppliersService from '../features/suppliers/suppliersService';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// import { CashBoxGuard } from '@/components/CashBoxGuard'; // Removed - using money boxes only
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  Receipt,
  DollarSign,
  Calendar,
  User,
  FileText,
  CreditCard,
  Banknote,
  Building,
  ArrowUpDown,
  Store,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { printSupplierPaymentVoucherWithPreview } from '@/utils/printSupplierPaymentVoucherUtils';
import { useSettings } from '@/features/settings/useSettings';

const SupplierPaymentReceipts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: settingsData } = useSelector((state: RootState) => state.settings);
  const { settings } = useSettings();
  const { moneyBoxes } = useSelector((state: RootState) => state.moneyBoxes);
  const [receipts, setReceipts] = useState<SupplierPaymentReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<SupplierPaymentReceiptFilters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SupplierPaymentReceipt | null>(null);
  const [formData, setFormData] = useState<CreateSupplierPaymentReceiptData>({
    supplier_id: 0,
    purchase_id: undefined,
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    money_box_id: ''
  });
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [pagination?.page, filters]);

  // Load money boxes
  useEffect(() => {
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [receiptsData, suppliersData, statsData] = await Promise.all([
        supplierPaymentReceiptsService.getAll({ ...filters, page: pagination.page, limit: pagination.limit }),
        suppliersService.getSuppliers(),
        supplierPaymentReceiptsService.getStatistics(filters)
      ]);

      setReceipts(receiptsData.data || []);
      setPagination(receiptsData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
      setSuppliers(suppliersData || []);
      setStatistics(statsData || null);
    } catch (error: any) {
      console.error('Error loading data:', error);
      
      // Handle validation errors
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        
        // Show field-specific errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء تحميل البيانات');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierPurchases = async (supplierId: number) => {
    try {
      const purchases = await supplierPaymentReceiptsService.getSupplierPurchases(supplierId);
      setSupplierPurchases(purchases);
    } catch (error: any) {
      console.error('Error loading supplier purchases:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء تحميل فواتير الشراء للمورد');
      }
    }
  };

  const handleCreate = async () => {
    try {
      await supplierPaymentReceiptsService.create(formData);
      toast.success('تم إنشاء الإيصال بنجاح');
      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      
      // Handle validation errors
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        
        // Show field-specific errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء إنشاء الإيصال');
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedReceipt) return;
    
    try {
      await supplierPaymentReceiptsService.update(selectedReceipt.id, formData);
      toast.success('تم تحديث الإيصال بنجاح');
      setShowEditDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating receipt:', error);
      
      // Handle validation errors
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        
        // Show field-specific errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء تحديث الإيصال');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supplierPaymentReceiptsService.delete(id);
      toast.success('تم حذف الإيصال بنجاح');
      loadData();
    } catch (error: any) {
      console.error('Error deleting receipt:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء حذف الإيصال');
      }
    }
  };

  const handlePrintReceipt = (receipt: SupplierPaymentReceipt) => {
    const supplier = suppliers.find(s => s.id === receipt.supplier_id);
    printSupplierPaymentVoucherWithPreview(receipt, supplier || null, settings as unknown as Record<string, unknown>, 'a4');
  };

  const resetForm = () => {
    setFormData({
      supplier_id: 0,
      purchase_id: undefined,
      receipt_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
    setSelectedReceipt(null);
  };

  const openEditDialog = (receipt: SupplierPaymentReceipt) => {
    setSelectedReceipt(receipt);
    setFormData({
      supplier_id: receipt.supplier_id,
      purchase_id: receipt.purchase_id,
      receipt_date: receipt.receipt_date,
      amount: receipt.amount,
      payment_method: receipt.payment_method,
      reference_number: receipt.reference_number || '',
      notes: receipt.notes || ''
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (receipt: SupplierPaymentReceipt) => {
    setSelectedReceipt(receipt);
    setShowViewDialog(true);
  };

  const handleSupplierChange = (supplierId: number) => {
    setFormData(prev => ({ ...prev, supplier_id: supplierId, purchase_id: undefined }));
    setSelectedPurchase(null);
    if (supplierId) {
      loadSupplierPurchases(supplierId);
    }
  };

  const handlePurchaseChange = (purchaseId: string) => {
    if (purchaseId === 'none') {
      setFormData(prev => ({ ...prev, purchase_id: undefined }));
      setSelectedPurchase(null);
    } else {
      const purchase = supplierPurchases.find(p => p.id.toString() === purchaseId);
      setFormData(prev => ({ ...prev, purchase_id: parseInt(purchaseId) }));
      setSelectedPurchase(purchase);
    }
  };

  const getMaxPaymentAmount = () => {
    if (selectedPurchase) {
      return selectedPurchase.remaining_amount || 0;
    }
    return undefined;
  };

  const isAmountValid = () => {
    if (!formData.amount || formData.amount <= 0) {
      return false;
    }
    if (selectedPurchase && formData.amount > selectedPurchase.remaining_amount) {
      return false;
    }
    return true;
  };

  const handleExport = async () => {
    try {
      await supplierPaymentReceiptsService.downloadCSV(filters);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer': return <Building className="w-4 h-4" />;
      case 'check': return <FileText className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'check': return 'شيك';
      default: return method;
    }
  };

  if (loading && receipts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">سند صرف</h1>
            <p className="text-gray-500">إدارة إيصالات الدفع للموردين</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  إيصال جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <DialogHeader>
                  <DialogTitle>إيصال جديد</DialogTitle>
                  <DialogDescription>
                    إنشاء إيصال دفع جديد للمورد
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>المورد</Label>
                    <Select value={formData.supplier_id.toString()} onValueChange={(value) => handleSupplierChange(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>فاتورة الشراء (اختياري)</Label>
                    <Select value={formData.purchase_id?.toString() || ''} onValueChange={(value) => handlePurchaseChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفاتورة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون فاتورة</SelectItem>
                        {supplierPurchases.map((purchase) => (
                          <SelectItem key={purchase.id} value={purchase.id.toString()}>
                            {purchase.invoice_no} - المتبقي: {purchase.remaining_amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>تاريخ الإيصال</Label>
                    <Input
                      type="date"
                      value={formData.receipt_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder={`الحد الأقصى: ${getMaxPaymentAmount()?.toLocaleString() || 'غير محدد'}`}
                      className={
                        selectedPurchase && formData.amount > selectedPurchase.remaining_amount 
                          ? 'border-red-500' 
                          : ''
                      }
                    />
                    {selectedPurchase && (
                      <div className="text-xs mt-1">
                        {formData.amount > selectedPurchase.remaining_amount ? (
                          <span className="text-red-500">
                            المبلغ يتجاوز المتبقي من الفاتورة: {selectedPurchase.remaining_amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            المتبقي من الفاتورة: {selectedPurchase.remaining_amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>طريقة الدفع</Label>
                    <Select value={formData.payment_method} onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="card">بطاقة</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>صندوق المال</Label>
                    <Select value={formData.money_box_id} onValueChange={(value: string) => setFormData(prev => ({ ...prev, money_box_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صندوق المال" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash_box">صندوق النقد</SelectItem>
                        {moneyBoxes.map((moneyBox) => (
                          <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                            {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.money_box_id && formData.money_box_id !== 'cash_box' && (
                      <div className="mt-1">
                        {(() => {
                          const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.money_box_id);
                          if (selectedMoneyBox && selectedMoneyBox.amount < formData.amount) {
                            return (
                              <span className="text-red-500 text-sm">
                                ⚠️ الرصيد غير كافٍ. المطلوب: {formData.amount.toLocaleString()}، المتوفر: {selectedMoneyBox.amount.toLocaleString()}
                              </span>
                            );
                          }
                          return (
                            <span className="text-green-500 text-sm">
                              ✓ الرصيد كافٍ. المتبقي: {(selectedMoneyBox?.amount || 0) - formData.amount} دينار
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>رقم المرجع</Label>
                    <Input
                      value={formData.reference_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                      placeholder="رقم المرجع (اختياري)"
                    />
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="ملاحظات إضافية (اختياري)"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={
                      !formData.supplier_id || 
                      !formData.amount || 
                      formData.amount <= 0 ||
                      (selectedPurchase && formData.amount > selectedPurchase.remaining_amount) ||
                      (formData.money_box_id && formData.money_box_id !== 'cash_box' && 
                       (() => {
                         const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.money_box_id);
                         return selectedMoneyBox && selectedMoneyBox.amount < formData.amount;
                       })())
                    }
                  >
                    إنشاء
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيصالات</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_receipts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_amount?.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط المبلغ</CardTitle>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.average_amount?.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الموردين الفريدين</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.unique_suppliers}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>المورد</Label>
                <Select value={filters.supplier_id?.toString() || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, supplier_id: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الموردين" />
                  </SelectTrigger>
                  <SelectContent>
                                        <SelectItem value="all">جميع الموردين</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={filters.payment_method || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, payment_method: value || undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الطرق" />
                  </SelectTrigger>
                  <SelectContent>
                                        <SelectItem value="all">جميع الطرق</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value || undefined }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>الإيصالات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الإيصال</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                    <TableCell>{receipt.supplier_name}</TableCell>
                    <TableCell>{format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                    <TableCell>{receipt.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getPaymentMethodIcon(receipt.payment_method)}
                        {getPaymentMethodText(receipt.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>{receipt.reference_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handlePrintReceipt(receipt)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openViewDialog(receipt)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(receipt)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف هذا الإيصال؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(receipt.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    السابق
                  </Button>
                  <span className="flex items-center px-4">
                    صفحة {pagination.page} من {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل الإيصال</DialogTitle>
              <DialogDescription>
                تعديل بيانات الإيصال
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المورد</Label>
                <Select value={formData.supplier_id.toString()} onValueChange={(value) => handleSupplierChange(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>فاتورة الشراء (اختياري)</Label>
                <Select value={formData.purchase_id?.toString() || ''} onValueChange={(value) => handlePurchaseChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفاتورة" />
                  </SelectTrigger>
                  <SelectContent>
                                        <SelectItem value="none">بدون فاتورة</SelectItem>
                    {supplierPurchases.map((purchase) => (
                      <SelectItem key={purchase.id} value={purchase.id.toString()}>
                        {purchase.invoice_no} - المتبقي: {purchase.remaining_amount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ الإيصال</Label>
                <Input
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder={`الحد الأقصى: ${getMaxPaymentAmount()?.toLocaleString() || 'غير محدد'}`}
                  className={
                    selectedPurchase && formData.amount > selectedPurchase.remaining_amount 
                      ? 'border-red-500' 
                      : ''
                  }
                />
                {selectedPurchase && (
                  <div className="text-xs mt-1">
                    {formData.amount > selectedPurchase.remaining_amount ? (
                      <span className="text-red-500">
                        المبلغ يتجاوز المتبقي من الفاتورة: {selectedPurchase.remaining_amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        المتبقي من الفاتورة: {selectedPurchase.remaining_amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={formData.payment_method} onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>صندوق المال</Label>
                <Select value={formData.money_box_id} onValueChange={(value: string) => setFormData(prev => ({ ...prev, money_box_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر صندوق المال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_box">صندوق النقد</SelectItem>
                    {moneyBoxes.map((moneyBox) => (
                      <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                        {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.money_box_id && formData.money_box_id !== 'cash_box' && (
                  <div className="mt-1">
                    {(() => {
                      const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.money_box_id);
                      if (selectedMoneyBox && selectedMoneyBox.amount < formData.amount) {
                        return (
                          <span className="text-red-500 text-sm">
                            ⚠️ الرصيد غير كافٍ. المطلوب: {formData.amount.toLocaleString()}، المتوفر: {selectedMoneyBox.amount.toLocaleString()}
                          </span>
                        );
                      }
                      return (
                        <span className="text-green-500 text-sm">
                          ✓ الرصيد كافٍ. المتبقي: {(selectedMoneyBox?.amount || 0) - formData.amount} دينار
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div>
                <Label>رقم المرجع</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="رقم المرجع (اختياري)"
                />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={
                  !formData.supplier_id || 
                  !formData.amount || 
                  formData.amount <= 0 ||
                  (selectedPurchase && formData.amount > selectedPurchase.remaining_amount) ||
                  (formData.money_box_id && formData.money_box_id !== 'cash_box' && 
                   (() => {
                     const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.money_box_id);
                     return selectedMoneyBox && selectedMoneyBox.amount < formData.amount;
                   })())
                }
              >
                تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تفاصيل الإيصال</DialogTitle>
            </DialogHeader>
            {selectedReceipt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">رقم الإيصال</Label>
                    <p className="text-sm">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">التاريخ</Label>
                    <p className="text-sm">{format(new Date(selectedReceipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">المورد</Label>
                    <p className="text-sm">{selectedReceipt.supplier_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">المبلغ</Label>
                    <p className="text-sm font-bold">{selectedReceipt.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">طريقة الدفع</Label>
                    <p className="text-sm">{getPaymentMethodText(selectedReceipt.payment_method)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">صندوق المال</Label>
                    <p className="text-sm">
                      {selectedReceipt.money_box_id === 'cash_box' || !selectedReceipt.money_box_id 
                        ? 'صندوق النقد' 
                        : moneyBoxes.find(box => box.id.toString() === selectedReceipt.money_box_id)?.name || 'غير محدد'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">رقم المرجع</Label>
                    <p className="text-sm">{selectedReceipt.reference_number || '-'}</p>
                  </div>
                </div>
                {selectedReceipt.purchase_invoice_no && (
                  <div>
                    <Label className="text-sm font-medium">فاتورة الشراء</Label>
                    <p className="text-sm">{selectedReceipt.purchase_invoice_no}</p>
                  </div>
                )}
                {selectedReceipt.notes && (
                  <div>
                    <Label className="text-sm font-medium">ملاحظات</Label>
                    <p className="text-sm">{selectedReceipt.notes}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">أنشئ بواسطة</Label>
                  <p className="text-sm">{selectedReceipt.created_by_name}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default SupplierPaymentReceipts; 