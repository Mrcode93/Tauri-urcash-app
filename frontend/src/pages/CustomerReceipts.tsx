import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../app/store';
import { customerReceiptsService, CustomerReceipt, CreateCustomerReceiptData, CustomerReceiptFilters, CustomerReceiptStatistics, CustomerDebt, CustomerBill, CustomerFinancialSummary } from '../features/customerReceipts/customerReceiptsService';
import { getCustomers } from '../features/customers/customersSlice';
import { fetchSettings } from '../features/settings/settingsSlice';
import { fetchAllMoneyBoxes } from '../features/moneyBoxes/moneyBoxesSlice';
import { fetchDelegates } from '../features/delegates/delegatesSlice';
import { fetchEmployees } from '../features/employees/employeesSlice';
import { Customer } from '../features/customers/customersService';
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
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Printer,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CustomerReceiptPrint from '@/components/CustomerReceiptPrint';
import { printReceiptWithPreview } from '@/utils/printReceiptUtils';
import { useSettings } from '@/features/settings/useSettings';
import { printPaymentVoucherWithPreview } from '@/utils/printPaymentVoucherUtils';

const CustomerReceipts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: settingsData } = useSelector((state: RootState) => state.settings);
  const { settings } = useSettings();
  const { items: customers, loading: customersLoading } = useSelector((state: RootState) => state.customers);
  const { moneyBoxes } = useSelector((state: RootState) => state.moneyBoxes);
  const { delegates, loading: delegatesLoading } = useSelector((state: RootState) => state.delegates);
  const { employees, loading: employeesLoading } = useSelector((state: RootState) => state.employees);
  
  // Debug logging
  
  
  // State management
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, // Increased page size for better performance
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<CustomerReceiptFilters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDebtValidationModal, setShowDebtValidationModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerReceipt | null>(null);
  const [formData, setFormData] = useState<CreateCustomerReceiptData>({
    customer_id: 0,
    sale_id: undefined,
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    money_box_id: undefined,
    delegate_id: undefined,
    employee_id: undefined
  });
  const [customerSales, setCustomerSales] = useState<{ id: number; invoice_no: string; remaining_amount: number }[]>([]);
  const [statistics, setStatistics] = useState<null | CustomerReceiptStatistics>(null);
  const [activeTab, setActiveTab] = useState('receipts');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([]);
  const [customerBills, setCustomerBills] = useState<CustomerBill[]>([]);
  const [customerFinancialSummary, setCustomerFinancialSummary] = useState<CustomerFinancialSummary | null>(null);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<CustomerReceipt | null>(null);
  const [selectedCustomerDebts, setSelectedCustomerDebts] = useState<CustomerDebt[]>([]);
  const [checkingCustomerDebts, setCheckingCustomerDebts] = useState(false);

  // Helper function to calculate total debt
  const getTotalDebt = useCallback(() => {
    console.log('getTotalDebt called, selectedCustomerDebts:', selectedCustomerDebts);
    const total = selectedCustomerDebts.reduce((sum, debt) => sum + (debt.debt_amount || 0), 0);
    console.log('Calculated total debt:', total);
    return total;
  }, [selectedCustomerDebts]);

  // Helper function to calculate remaining debt after payment
  const getRemainingDebtAfterPayment = useCallback(() => {
    const totalDebt = getTotalDebt();
    return Math.max(0, totalDebt - formData.amount);
  }, [getTotalDebt, formData.amount]);

  // Helper function to check if payment is valid
  const isPaymentValid = useCallback(() => {
    if (!formData.customer_id) {
      return false;
    }
    
    // Check if amount is positive
    if (formData.amount <= 0) {
      return false;
    }
    
    // If there are debts, validate against total debt
    if (selectedCustomerDebts.length > 0) {
      if (formData.amount > getTotalDebt()) {
        return false;
      }
    }
    
    // For customer receipts, we don't need to check money box balance
    // because we're adding money to the box, not withdrawing from it
    
    return true;
  }, [formData.customer_id, formData.amount, formData.money_box_id, selectedCustomerDebts.length, getTotalDebt, moneyBoxes]);

  // Memoized load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [receiptsData, statsData] = await Promise.all([
        customerReceiptsService.getAll({ 
          ...filters, 
          page: pagination?.page || 1, 
          limit: pagination?.limit || 20 
        }),
        customerReceiptsService.getStatistics(filters)
      ]);
      
      setReceipts(receiptsData.data);
      setPagination(receiptsData.pagination);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
      setReceipts([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination?.page, pagination?.limit]);

  // Load data when filters or pagination changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load customers from Redux only once
  useEffect(() => {
    if (customers.length === 0) {
      dispatch(getCustomers({ limit: 1000 }));
    }
  }, [dispatch, customers.length]);

  // Load settings from Redux
  useEffect(() => {
    if (!settingsData) {
      dispatch(fetchSettings());
    }
  }, [dispatch, settingsData]);

  // Load money boxes
  useEffect(() => {
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  // Load delegates and employees
  useEffect(() => {
    dispatch(fetchDelegates({ page: 1, limit: 100 }));
    dispatch(fetchEmployees({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Debug selectedCustomerDebts changes
  useEffect(() => {
    console.log('selectedCustomerDebts changed:', selectedCustomerDebts);
    console.log('selectedCustomerDebts.length:', selectedCustomerDebts.length);
  }, [selectedCustomerDebts]);

  // Memoized load customer data function
  const loadCustomerData = useCallback(async (customerId: number) => {
    if (!customerId) return;
    
    try {
      setLoadingCustomerData(true);
      const [debts, bills, summary] = await Promise.all([
        customerReceiptsService.getCustomerDebts(customerId),
        customerReceiptsService.getCustomerBills(customerId),
        customerReceiptsService.getCustomerFinancialSummary(customerId)
      ]);
      
      setCustomerDebts(debts || []);
      setCustomerBills(bills || []);
      setCustomerFinancialSummary(summary);
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات العميل');
      setCustomerDebts([]);
      setCustomerBills([]);
      setCustomerFinancialSummary(null);
    } finally {
      setLoadingCustomerData(false);
    }
  }, []);

  // Load customer data when customer is selected for debts/bills tabs
  useEffect(() => {
    if (selectedCustomerId && activeTab !== 'receipts') {
      loadCustomerData(selectedCustomerId);
    }
  }, [selectedCustomerId, activeTab, loadCustomerData]);

  // Memoized load customer sales function
  const loadCustomerSales = useCallback(async (customerId: number) => {
    try {
      const sales = await customerReceiptsService.getCustomerSales(customerId);
      setCustomerSales(sales);
    } catch (error) {
      console.error('Error loading customer sales:', error);
      toast.error('حدث خطأ أثناء تحميل فواتير العميل');
      setCustomerSales([]);
    }
  }, []);

  // Function to check if customer has unpaid debts
  const checkCustomerDebts = useCallback(async (customerId: number) => {
    try {
      console.log('Checking customer debts for customer ID:', customerId);
      setCheckingCustomerDebts(true);
      const debts = await customerReceiptsService.getCustomerDebts(customerId);
      console.log('Customer debts response:', debts);
      console.log('Setting selectedCustomerDebts to:', debts || []);
      setSelectedCustomerDebts(debts || []);
      console.log('State update triggered for selectedCustomerDebts');
    } catch (error) {
      console.error('Error checking customer debts:', error);
      setSelectedCustomerDebts([]);
    } finally {
      setCheckingCustomerDebts(false);
    }
  }, []);

  const handleCustomerChange = useCallback((customerId: number) => {
    console.log('Customer changed to ID:', customerId);
    setFormData(prev => ({ ...prev, customer_id: customerId, sale_id: undefined }));
    if (customerId) {
      loadCustomerSales(customerId);
      // Check customer debts
      checkCustomerDebts(customerId);
    } else {
      setCustomerSales([]);
      setSelectedCustomerDebts([]);
    }
  }, [loadCustomerSales, checkCustomerDebts]);

  const handleCreate = useCallback(async () => {
    try {
      // Check if amount is zero or negative
      if (formData.amount <= 0) {
        toast.error('يجب أن يكون المبلغ أكبر من صفر');
        return;
      }

      // Check if payment amount exceeds total debt (only if there are debts)
      if (formData.customer_id && selectedCustomerDebts.length > 0) {
        const totalDebt = getTotalDebt();
        if (formData.amount > totalDebt) {
          toast.error(`لا يمكن دفع مبلغ أكبر من إجمالي الديون. إجمالي الديون: ${totalDebt.toLocaleString()}`);
          return;
        }
      }

      await customerReceiptsService.create(formData);
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
  }, [formData, selectedCustomerDebts, getTotalDebt, loadData]);

  const handleCreateWithDebtValidation = useCallback(async () => {
    if (formData.customer_id && selectedCustomerDebts.length > 0) {
      const totalDebt = getTotalDebt();
      if (formData.amount > totalDebt) {
        toast.error(`لا يمكن دفع مبلغ أكبر من إجمالي الديون. إجمالي الديون: ${totalDebt.toLocaleString()}`);
        return;
      }
      
      if (formData.amount <= 0) {
        toast.error('يجب أن يكون المبلغ أكبر من صفر');
        return;
      }
      
      // Open debt validation modal
      setShowDebtValidationModal(true);
    } else {
      // No debts to validate, proceed with creation
      await handleCreate();
    }
  }, [formData, selectedCustomerDebts, getTotalDebt, handleCreate]);

  const handleConfirmPayment = useCallback(async () => {
    try {
      await customerReceiptsService.create(formData);
      toast.success('تم إنشاء الإيصال بنجاح');
      setShowDebtValidationModal(false);
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
  }, [formData, loadData]);

  const handleUpdate = useCallback(async () => {
    if (!selectedReceipt) return;
    
    try {
      await customerReceiptsService.update(selectedReceipt.id, formData);
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
  }, [selectedReceipt, formData, loadData]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await customerReceiptsService.delete(id);
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
  }, [loadData]);

  const resetForm = useCallback(() => {
    setFormData({
      customer_id: 0,
      sale_id: undefined,
      receipt_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
    setSelectedReceipt(null);
    setSelectedCustomerDebts([]);
  }, []);

  const openEditDialog = useCallback((receipt: CustomerReceipt) => {
    setSelectedReceipt(receipt);
    setFormData({
      customer_id: receipt.customer_id,
      sale_id: receipt.sale_id,
      receipt_date: receipt.receipt_date,
      amount: receipt.amount,
      payment_method: receipt.payment_method,
      reference_number: receipt.reference_number || '',
      notes: receipt.notes || '',
      money_box_id: receipt.money_box_id || ''
    });
    setShowEditDialog(true);
  }, []);

  const openViewDialog = useCallback((receipt: CustomerReceipt) => {
    setSelectedReceipt(receipt);
    setShowViewDialog(true);
  }, []);

  const handleCustomerSelect = useCallback((customerId: number) => {
    setSelectedCustomerId(customerId);
  }, []);

  const handleExportCSV = useCallback(async () => {
    try {
      await customerReceiptsService.downloadCSV(filters);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  }, [filters]);

  const handleExportPDF = useCallback(async () => {
    try {
      await customerReceiptsService.downloadPDF(filters);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  }, [filters]);

  const handlePrintReceipt = useCallback((receipt: CustomerReceipt) => {
    const customer = customers.find(c => c.id === receipt.customer_id);
    printPaymentVoucherWithPreview(receipt, customer || null, settings as Record<string, unknown>, 'a4');
  }, [customers, settings]);

  // Memoized utility functions
  const getPaymentMethodIcon = useCallback((method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer': return <Building className="w-4 h-4" />;
      case 'check': return <FileText className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  }, []);

  const getPaymentMethodText = useCallback((method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'check': return 'شيك';
      default: return method;
    }
  }, []);

  // Memoized loading state
  const isLoading = useMemo(() => {
    return (loading || customersLoading) && receipts.length === 0;
  }, [loading, customersLoading, receipts.length]);

  if (isLoading) {
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
    <div className=" p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */} 
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">سند قبض</h1>
            <p className="text-gray-500">إدارة إيصالات الدفع للعملاء</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 ml-2" />
                  تصدير
                  <ChevronDown className="w-4 h-4 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="w-4 h-4 ml-2" />
                  تصدير CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 ml-2" />
                  تصدير PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveTab('debts');
                // This will show the customer selection for debts
              }}
            >
              <DollarSign className="w-4 h-4 ml-2" />
              دفع المستحقات
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
                    إنشاء إيصال دفع جديد للعميل
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>العميل</Label>
                    <Select value={formData.customer_id.toString()} onValueChange={(value) => handleCustomerChange(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العميل" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Customer Debt Status */}
                  {formData.customer_id > 0 && (
                    <div className="p-3 rounded-md border">
                      {checkingCustomerDebts ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          جاري فحص ديون العميل...
                        </div>
                      ) : selectedCustomerDebts.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          <DollarSign className="w-4 h-4" />
                          هذا العميل لا يملك أي فواتير غير مدفوعة
                          <div className="text-xs mt-1 text-blue-700">
                            يمكنك إنشاء إيصال جديد لإضافة المبلغ إلى رصيد العميل
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                            <DollarSign className="w-4 h-4" />
                            إجمالي الديون: {getTotalDebt().toLocaleString()}
                          </div>
                          {formData.amount > 0 && (
                            <div className="text-xs text-gray-600">
                              المبلغ المطلوب: {formData.amount.toLocaleString()} | 
                              المتبقي بعد الدفع: {getRemainingDebtAfterPayment().toLocaleString()}
                            </div>
                          )}
                          {formData.amount > getTotalDebt() && (
                            <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                              ⚠️ المبلغ يتجاوز إجمالي الديون
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <Label>فاتورة البيع (اختياري)</Label>
                    <Select value={formData.sale_id?.toString() || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, sale_id: value === 'none' ? undefined : parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفاتورة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون فاتورة</SelectItem>
                        {customerSales?.map((sale) => (
                          <SelectItem key={sale.id} value={sale.id.toString()}>
                            {sale.invoice_no} - المتبقي: {sale.remaining_amount || 0}
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
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, amount: value }));
                      }}
                      max={selectedCustomerDebts.length > 0 ? getTotalDebt() : undefined}
                      className={
                        formData.customer_id > 0 && selectedCustomerDebts.length > 0 && 
                        (formData.amount > getTotalDebt() || formData.amount <= 0) 
                          ? 'border-red-500' 
                          : formData.customer_id > 0 && formData.amount <= 0
                          ? 'border-red-500'
                          : ''
                      }
                      placeholder="أدخل المبلغ"
                    />
                    {formData.customer_id > 0 && (
                      <div className="text-xs mt-1">
                        {formData.amount <= 0 ? (
                          <span className="text-red-500">
                            يجب أن يكون المبلغ أكبر من صفر
                          </span>
                        ) : selectedCustomerDebts.length > 0 && formData.amount > getTotalDebt() ? (
                          <span className="text-red-500">
                            المبلغ يتجاوز إجمالي الديون: {getTotalDebt().toLocaleString()}
                          </span>
                        ) : selectedCustomerDebts.length > 0 ? (
                          <span className="text-gray-500">
                            الحد الأقصى: {getTotalDebt().toLocaleString()} | المتبقي: {getRemainingDebtAfterPayment().toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-blue-500">
                            إيصال جديد - سيتم إضافة المبلغ إلى رصيد العميل
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>طريقة الدفع</Label>
                    <Select value={formData.payment_method} onValueChange={(value: string) => setFormData(prev => ({ ...prev, payment_method: value as 'cash' | 'card' | 'bank_transfer' | 'check' }))}>
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
                    <Select value={formData.money_box_id?.toString() || ''} onValueChange={(value: string) => setFormData(prev => ({ ...prev, money_box_id: value ? parseInt(value) : undefined }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر صندوق المال" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash_box">صندوق النقد</SelectItem>
                        {moneyBoxes?.map((moneyBox) => (
                          <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                            {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.money_box_id && formData.money_box_id !== 'cash_box' && (
                      <div className="mt-1">
                        {(() => {
                          const selectedMoneyBox = moneyBoxes.find(box => box.id === formData.money_box_id);
                          if (selectedMoneyBox) {
                            return (
                              <span className="text-green-500 text-sm">
                                ✓ سيتم إضافة {formData.amount.toLocaleString()} دينار إلى {selectedMoneyBox.name}
                              </span>
                            );
                          }
                          return null;
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
                    <Label>المندوب (اختياري)</Label>
                    <Select value={formData.delegate_id?.toString() || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, delegate_id: value === 'none' ? undefined : parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المندوب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مندوب</SelectItem>
                        {delegates?.map((delegate) => (
                          <SelectItem key={delegate.id} value={delegate.id.toString()}>
                            {delegate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>الموظف (اختياري)</Label>
                    <Select value={formData.employee_id?.toString() || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value === 'none' ? undefined : parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون موظف</SelectItem>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    onClick={handleCreateWithDebtValidation}
                    disabled={!isPaymentValid()}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <CardTitle className="text-sm font-medium">العملاء الفريدين</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.unique_customers}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700">المستحقات المعلقة</CardTitle>
                <Building className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-2xl font-bold text-red-700"
                    onClick={() => setActiveTab('debts')}
                  >
                    عرض المستحقات
                  </Button>
                </div>
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
                <Label>العميل</Label>
                <Select value={filters.customer_id?.toString() || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, customer_id: value === 'all' ? undefined : parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع العملاء" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العملاء</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={filters.payment_method || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, payment_method: value === 'all' ? undefined : value }))}>
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

        {/* Customer Selection for Debts/Bills */}
        {activeTab !== 'receipts' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                اختر العميل لعرض البيانات
              </CardTitle>
              <CardDescription>
                اختر عميل لعرض ديونه وفواتيره غير المدفوعة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedCustomerId?.toString() || ''} onValueChange={(value) => handleCustomerSelect(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل لعرض ديونه وفواتيره" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomerId && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                    ✓ تم اختيار العميل. يمكنك الآن عرض ديونه وفواتيره في التبويبات أدناه.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Financial Summary */}
        {selectedCustomerId && customerFinancialSummary && activeTab !== 'receipts' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerFinancialSummary.total_bills?.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المدفوع</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerFinancialSummary.total_paid?.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{customerFinancialSummary.total_debt?.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الفواتير المستحقة</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerFinancialSummary.unpaid_bills_count}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="receipts">الإيصالات</TabsTrigger>
                <TabsTrigger value="debts">الديون والمستحقات</TabsTrigger>
                <TabsTrigger value="bills">الفواتير</TabsTrigger>
              </TabsList>

              <TabsContent value="receipts" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الإيصال</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>المندوب</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>صندوق المال</TableHead>
                      <TableHead>المرجع</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts?.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                        <TableCell>{receipt.customer_name}</TableCell>
                        <TableCell>{format(new Date(receipt.receipt_date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                        <TableCell>{(receipt.amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getPaymentMethodIcon(receipt.payment_method)}
                            {getPaymentMethodText(receipt.payment_method)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {receipt.delegate_name ? (
                            <Badge variant="secondary" className="text-xs">
                              {receipt.delegate_name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {receipt.employee_name ? (
                            <Badge variant="secondary" className="text-xs">
                              {receipt.employee_name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {receipt.money_box_id === 'cash_box' || !receipt.money_box_id 
                              ? 'صندوق النقد' 
                              : moneyBoxes.find(box => box.id.toString() === receipt.money_box_id)?.name || 'غير محدد'
                            }
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
                {pagination?.totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={pagination?.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      >
                        السابق
                      </Button>
                      <span className="flex items-center px-4">
                        صفحة {pagination?.page} من {pagination?.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        disabled={pagination?.page === pagination?.totalPages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        التالي
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="debts" className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  عرض الفواتير غير المدفوعة والفواتير المدفوعة جزئياً
                </div>
                {selectedCustomerId && customerFinancialSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">إجمالي المستحقات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-700">{customerFinancialSummary.total_debt?.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-700">الفواتير المستحقة</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-700">{customerFinancialSummary.unpaid_bills_count}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">إجمالي المدفوع</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-700">{customerFinancialSummary.total_paid?.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {!selectedCustomerId ? (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">اختر عميل أولاً</h3>
                    <p className="text-gray-500 mb-4">يجب اختيار عميل من القائمة أعلاه لعرض ديونه والمستحقات</p>
                  </div>
                ) : loadingCustomerData ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-500">جاري التحميل...</p>
                    </div>
                  </div>
                ) : customerDebts.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد ديون</h3>
                    <p className="text-gray-500">هذا العميل لا يملك أي فواتير غير مدفوعة أو مدفوعة جزئياً</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        إجمالي الديون: <span className="font-bold text-red-600">
                          {customerDebts.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <Button 
                        onClick={() => {
                          setActiveTab('receipts');
                          setShowCreateDialog(true);
                          setFormData(prev => ({ ...prev, customer_id: selectedCustomerId }));
                        }}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء إيصال دفع
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الفاتورة</TableHead>
                          <TableHead>تاريخ الفاتورة</TableHead>
                          <TableHead>تاريخ الاستحقاق</TableHead>
                          <TableHead>إجمالي المبلغ</TableHead>
                          <TableHead>المدفوع</TableHead>
                          <TableHead>المتبقي</TableHead>
                          <TableHead>حالة الدفع</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerDebts?.map((debt) => (
                          <TableRow key={debt.id}>
                            <TableCell className="font-medium">{debt.invoice_no}</TableCell>
                            <TableCell>{format(new Date(debt.invoice_date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                            <TableCell>{debt.due_date ? format(new Date(debt.due_date), 'dd/MM/yyyy', { locale: ar }) : '-'}</TableCell>
                            <TableCell>{(debt.total_amount || 0).toLocaleString()}</TableCell>
                            <TableCell>{(debt.paid_amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="font-bold text-red-600">{(debt.remaining_amount || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={debt.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                                {debt.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setActiveTab('receipts');
                                  setShowCreateDialog(true);
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    customer_id: selectedCustomerId,
                                    sale_id: debt.id,
                                    amount: debt.remaining_amount || 0
                                  }));
                                }}
                              >
                                <Plus className="w-4 h-4 ml-1" />
                                دفع
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bills" className="space-y-4">
                {!selectedCustomerId ? (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">اختر عميل أولاً</h3>
                    <p className="text-gray-500 mb-4">يجب اختيار عميل من القائمة أعلاه لعرض فواتيره</p>
                  </div>
                ) : loadingCustomerData ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-500">جاري التحميل...</p>
                    </div>
                  </div>
                ) : customerBills.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد فواتير</h3>
                    <p className="text-gray-500">هذا العميل لا يملك أي فواتير</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        إجمالي الفواتير: <span className="font-bold">
                          {customerBills.length}
                        </span> | 
                        إجمالي المدفوع: <span className="font-bold text-green-600">
                          {customerBills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0).toLocaleString()}
                        </span> | 
                        إجمالي المستحقات: <span className="font-bold text-red-600">
                          {customerBills.reduce((sum, bill) => sum + (bill.remaining_amount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <Button 
                        onClick={() => {
                          setActiveTab('receipts');
                          setShowCreateDialog(true);
                          setFormData(prev => ({ ...prev, customer_id: selectedCustomerId }));
                        }}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء إيصال دفع
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الفاتورة</TableHead>
                          <TableHead>تاريخ الفاتورة</TableHead>
                          <TableHead>تاريخ الاستحقاق</TableHead>
                          <TableHead>إجمالي المبلغ</TableHead>
                          <TableHead>المدفوع</TableHead>
                          <TableHead>المتبقي</TableHead>
                          <TableHead>حالة الدفع</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerBills?.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium">{bill.invoice_no}</TableCell>
                            <TableCell>{format(new Date(bill.invoice_date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                            <TableCell>{bill.due_date ? format(new Date(bill.due_date), 'dd/MM/yyyy', { locale: ar }) : '-'}</TableCell>
                            <TableCell>{(bill.total_amount || 0).toLocaleString()}</TableCell>
                            <TableCell>{(bill.paid_amount || 0).toLocaleString()}</TableCell>
                            <TableCell className={(bill.remaining_amount || 0) > 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'}>
                              {(bill.remaining_amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={bill.payment_status === 'paid' ? 'default' : bill.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                                {bill.payment_status === 'paid' ? 'مدفوع' : bill.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={bill.status === 'completed' ? 'default' : 'secondary'}>
                                {bill.status === 'completed' ? 'مكتمل' : bill.status === 'pending' ? 'معلق' : bill.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(bill.remaining_amount || 0) > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setActiveTab('receipts');
                                    setShowCreateDialog(true);
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      customer_id: selectedCustomerId,
                                      sale_id: bill.id,
                                      amount: bill.remaining_amount || 0
                                    }));
                                  }}
                                >
                                  <Plus className="w-4 h-4 ml-1" />
                                  دفع
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل الإيصال</DialogTitle>
              <DialogDescription>
                تعديل بيانات الإيصال
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العميل</Label>
                <Select value={formData.customer_id.toString()} onValueChange={(value) => handleCustomerChange(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>فاتورة البيع (اختياري)</Label>
                <Select value={formData.sale_id?.toString() || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, sale_id: value === 'none' ? undefined : parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفاتورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فاتورة</SelectItem>
                    {customerSales?.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id.toString()}>
                        {sale.invoice_no} - المتبقي: {sale.remaining_amount || 0}
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
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={formData.payment_method} onValueChange={(value: string) => setFormData(prev => ({ ...prev, payment_method: value as 'cash' | 'card' | 'bank_transfer' | 'check' }))}>
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
                <Select value={formData.money_box_id?.toString() || ''} onValueChange={(value: string) => setFormData(prev => ({ ...prev, money_box_id: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر صندوق المال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_box">صندوق النقد</SelectItem>
                    {moneyBoxes?.map((moneyBox) => (
                      <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                        {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.money_box_id && formData.money_box_id !== 'cash_box' && (
                  <div className="mt-1">
                    {(() => {
                      const selectedMoneyBox = moneyBoxes.find(box => box.id === formData.money_box_id);
                      if (selectedMoneyBox) {
                        return (
                          <span className="text-green-500 text-sm">
                            ✓ سيتم إضافة {formData.amount.toLocaleString()} دينار إلى {selectedMoneyBox.name}
                          </span>
                        );
                      }
                      return null;
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
              <Button onClick={() => {
                if (selectedReceipt) {
                  handlePrintReceipt(selectedReceipt);
                }
              }} variant="outline">
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
              <Button onClick={handleUpdate}>
                تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
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
                    <Label className="text-sm font-medium">العميل</Label>
                    <p className="text-sm">{selectedReceipt.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">المبلغ</Label>
                    <p className="text-sm font-bold">{(selectedReceipt.amount || 0).toLocaleString()}</p>
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
                {selectedReceipt.sale_invoice_no && (
                  <div>
                    <Label className="text-sm font-medium">فاتورة البيع</Label>
                    <p className="text-sm">{selectedReceipt.sale_invoice_no}</p>
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
              <Button onClick={() => {
                if (selectedReceipt) {
                  handlePrintReceipt(selectedReceipt);
                  setShowViewDialog(false);
                }
              }}>
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <CustomerReceiptPrint
          receipt={receiptToPrint}
          customer={receiptToPrint ? customers.find(c => c.id === receiptToPrint.customer_id) || null : null}
          settings={settingsData}
          open={showPrintDialog}
          onClose={() => {
            setShowPrintDialog(false);
            setReceiptToPrint(null);
          }}
        />

        {/* Debt Validation Modal */}
        <Dialog open={showDebtValidationModal} onOpenChange={setShowDebtValidationModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                تأكيد الدفع
              </DialogTitle>
              <DialogDescription>
                مراجعة تفاصيل الدفع قبل التأكيد
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Customer Information */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">معلومات العميل</h4>
                <div className="text-sm text-blue-700">
                  {customers.find(c => c.id === formData.customer_id)?.name}
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">تفاصيل الدفع</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المبلغ المطلوب:</span>
                    <span className="font-bold">{formData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>طريقة الدفع:</span>
                    <span>{getPaymentMethodText(formData.payment_method)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>صندوق المال:</span>
                    <span>
                      {formData.money_box_id === 'cash_box' || !formData.money_box_id 
                        ? 'صندوق النقد' 
                        : moneyBoxes.find(box => box.id.toString() === formData.money_box_id)?.name || 'غير محدد'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الدفع:</span>
                    <span>{format(new Date(formData.receipt_date), 'dd/MM/yyyy', { locale: ar })}</span>
                  </div>
                </div>
              </div>

              {/* Debt Information */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">معلومات الديون</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>إجمالي الديون الحالية:</span>
                    <span className="font-bold text-orange-700">{getTotalDebt().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ المدفوع:</span>
                    <span className="font-bold text-green-700">{formData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>المتبقي بعد الدفع:</span>
                    <span className="font-bold text-blue-700">{getRemainingDebtAfterPayment().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Debt Breakdown */}
              {selectedCustomerDebts.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">تفاصيل الفواتير</h4>
                  <div className="space-y-1 text-xs">
                    {selectedCustomerDebts?.map((debt, index) => (
                      <div key={index} className="flex justify-between text-gray-600">
                        <span>فاتورة {debt.invoice_no}:</span>
                        <span>{debt.remaining_amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Message */}
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">تنبيه</span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  سيتم خصم هذا المبلغ من ديون العميل. تأكد من صحة المبلغ قبل التأكيد.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDebtValidationModal(false)}>
                إلغاء
              </Button>
              <Button onClick={handleConfirmPayment} className="bg-green-600 hover:bg-green-700">
                <DollarSign className="w-4 h-4 ml-2" />
                تأكيد الدفع
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default CustomerReceipts; 