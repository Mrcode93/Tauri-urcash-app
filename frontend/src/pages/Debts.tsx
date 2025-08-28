import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '@/app/store';
import { createSelector } from '@reduxjs/toolkit';
import { getDebts, getDebtStats, updateDebt, deleteDebt, repayDebt } from '@/features/debts/debtsSlice';
import { fetchAllMoneyBoxes } from '@/features/moneyBoxes/moneyBoxesSlice';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from "@/lib/toast";
import { DebtData } from '@/features/debts/debtsService';
import debtsService from '@/features/debts/debtsService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SaleData } from '@/features/sales/salesService';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Loader2, 
  Eye, 
  X, 
  DollarSign, 
  User, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DebtsWrapper } from '@/components/PremiumFeatureWrapper';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CashBoxGuard } from '@/components/CashBoxGuard';
import { usePrintBill } from '@/hooks/usePrintBill';
import BillReceipt from '@/components/BillReceipt';
import DebtPaymentReceipt from '@/components/DebtPaymentReceipt';
import { Skeleton } from "@/components/ui/skeleton";
import printDebtUtils from '@/utils/printDebtUtils';
import debtUtils from '@/utils/debtUtils';

// Declare gtag type
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Enhanced interfaces for better type safety
interface DebtPaymentReceiptData {
  receipt_number: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  receipt_date: string;
  reference_number?: string;
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  sale_invoice_no?: string;
  sale_total_amount?: number;
  sale_remaining_amount?: number;
  created_by_name?: string;
}

interface FormData {
  status: 'pending' | 'paid' | 'partial' | 'unpaid';
  paid_amount: number;
  due_date: string;
}

interface RepayData {
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check';
  reference_number: string;
  notes: string;
  receipt_date: string;
  money_box_id: string;
}

interface DebtsState {
  items: DebtData[];
  loading: boolean;
  error: string | null;
  stats: {
    total_pending: number;
    total_paid: number;
    total_count: number;
  } | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

interface CustomerDebtSummary {
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  totalDebt: number;
  debtCount: number;
  debts: DebtData[];
}

// Optimized selectors with deep equality checks
const selectDebts = createSelector(
  [(state: RootState) => state.debts],
  (debts: DebtsState) => ({
    items: debts.items || [],
    loading: debts.loading || false,
    error: debts.error,
    stats: debts.stats,
    pagination: debts.pagination
  })
);

const selectSettings = createSelector(
  [(state: RootState) => state.settings],
  (settings) => settings.data
);

// Memoized Search Input Component
const SearchInput = memo(({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder: string; 
}) => (
  <div className="relative flex-1">
    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
      autoComplete="off"
    />
  </div>
));

SearchInput.displayName = 'SearchInput';

// Memoized Stats Cards Component
const StatsCards = memo(({ stats }: { stats: DebtsState['stats'] }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">إجمالي الديون المعلقة</CardTitle>
        <AlertCircle className="h-4 w-4 text-yellow-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(stats?.total_pending || 0)}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">إجمالي الديون المدفوعة</CardTitle>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(stats?.total_paid || 0)}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">عدد الديون</CardTitle>
        <Clock className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats?.total_count || 0}</div>
      </CardContent>
    </Card>
  </div>
));

StatsCards.displayName = 'StatsCards';

// Memoized Loading Skeleton Component
const DebtTableSkeleton = memo(() => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2 ml-auto">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    ))}
  </div>
));

DebtTableSkeleton.displayName = 'DebtTableSkeleton';

// Memoized Debt Row Component
const DebtRow = memo(({ 
  debt, 
  index, 
  onEdit, 
  onView, 
  onRepay, 
  onDelete,
  onPrint,
  canViewDebts,
  canEditDebts,
  canDeleteDebts
}: {
  debt: DebtData;
  index: number;
  onEdit: (debt: DebtData) => void;
  onView: (debt: DebtData) => void;
  onRepay: (debt: DebtData) => void;
  onDelete: (id: number) => void;
  onPrint: (debt: DebtData) => void;
  canViewDebts: boolean;
  canEditDebts: boolean;
  canDeleteDebts: boolean;
}) => {
  const handleView = useCallback(() => onView(debt), [debt, onView]);
  const handleRepay = useCallback(() => onRepay(debt), [debt, onRepay]);
  const handleDelete = useCallback(() => onDelete(debt.sale_id), [debt.sale_id, onDelete]);
  const handlePrint = useCallback(() => onPrint(debt), [debt, onPrint]);

  const statusBadge = useMemo(() => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'مدفوع' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'جزئي' },
      pending: { bg: 'bg-red-100', text: 'text-red-700', label: 'غير مدفوع' },
      unpaid: { bg: 'bg-red-100', text: 'text-red-700', label: 'غير مدفوع' } // Add support for 'unpaid'
    };
    
    // Check if amount is 0 and automatically mark as paid
    const effectiveStatus = debt.remaining_amount <= 0 ? 'paid' : debt.status;
    
    // Map status values and provide fallback
    const normalizedStatus = effectiveStatus === 'unpaid' ? 'pending' : effectiveStatus;
    const config = statusConfig[normalizedStatus] || statusConfig.pending; // Default to pending if status is undefined
    
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  }, [debt.status, debt.remaining_amount]);

  return (
    <tr className={`transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
      <td className="py-3 px-4 text-right font-medium">{debt.customer_name}</td>
      <td className="py-3 px-4 text-right">{debt.invoice_no || 'N/A'}</td>
      <td className="py-3 px-4 text-right font-bold text-blue-700">
        {formatCurrency(debt.remaining_amount)}
      </td>
      <td className="py-3 px-4 text-right">{formatDate(debt.due_date)}</td>
      <td className="py-3 px-4 text-right">{statusBadge}</td>
      <td className="py-3 px-4 text-right">
        <div className="flex gap-1 justify-end">
          {canViewDebts && (
            <Button variant="outline" size="icon" className="border-gray-300 hover:bg-blue-100" onClick={handleView}>
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          {canViewDebts && (
            <Button variant="outline" size="icon" className="border-gray-300 hover:bg-green-100" onClick={handlePrint}>
              <Printer className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {canEditDebts && (
            <Button variant="outline" size="icon" className="border-gray-300 hover:bg-purple-100" onClick={handleRepay}>
              <Receipt className="h-4 w-4 text-purple-600" />
            </Button>
          )}
          {canDeleteDebts && (
            <Button variant="outline" size="icon" className="border-gray-300 hover:bg-red-100 text-red-600" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});

DebtRow.displayName = 'DebtRow';

// Memoized Customer Card Component
const CustomerCard = memo(({ 
  customer, 
  onViewDetails,
  onPrintStatement
}: { 
  customer: CustomerDebtSummary;
  onViewDetails: (customerId: number) => void;
  onPrintStatement: (customer: CustomerDebtSummary) => void;
}) => {
  const handleViewDetails = useCallback(() => {
    onViewDetails(customer.customer_id);
  }, [customer.customer_id, onViewDetails]);

  const handlePrintStatement = useCallback(() => {
    onPrintStatement(customer);
  }, [customer, onPrintStatement]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {customer.customer_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Mail className="h-4 w-4" />
            {customer.customer_email || 'لا يوجد بريد إلكتروني'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="h-4 w-4" />
            {customer.customer_phone || 'لا يوجد رقم هاتف'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {customer.customer_address || 'لا يوجد عنوان'}
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">إجمالي الديون:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(customer.totalDebt)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium">عدد الفواتير:</span>
              <span className="text-lg font-bold">
                {customer.debtCount}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleViewDetails}
            >
              <Eye className="h-4 w-4 mr-2" />
              عرض التفاصيل
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePrintStatement}
              title="طباعة كشف حساب العميل"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CustomerCard.displayName = 'CustomerCard';

// Memoized Pagination Component
const PaginationControls = memo(({ 
  pagination, 
  onPageChange 
}: { 
  pagination: DebtsState['pagination']; 
  onPageChange: (page: number) => void;
}) => {
  const handlePrevious = useCallback(() => {
    if (pagination && pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  }, [pagination, onPageChange]);

  const handleNext = useCallback(() => {
    if (pagination && pagination.page < pagination.totalPages) {
      onPageChange(pagination.page + 1);
    }
  }, [pagination, onPageChange]);

  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
      <div className="text-sm text-gray-700">
        عرض {((pagination.page - 1) * pagination.limit) + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} نتيجة
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={pagination.page <= 1}
        >
          السابق
        </Button>
        <span className="text-sm text-gray-700">
          صفحة {pagination.page} من {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={pagination.page >= pagination.totalPages}
        >
          التالي
        </Button>
      </div>
    </div>
  );
});

PaginationControls.displayName = 'PaginationControls';

// Main optimized Debts component
const Debts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: debts, loading: debtsLoading, error: debtsError, stats, pagination } = useSelector(selectDebts);
  const { moneyBoxes } = useSelector((state: RootState) => state.moneyBoxes);
  const settingsData = useSelector(selectSettings);
  
  // Permission checks for debts management
  const canViewDebts = useSelector(selectHasPermission(PERMISSIONS.DEBTS_VIEW));
  const canAddDebts = useSelector(selectHasPermission(PERMISSIONS.DEBTS_ADD));
  const canEditDebts = useSelector(selectHasPermission(PERMISSIONS.DEBTS_EDIT));
  const canDeleteDebts = useSelector(selectHasPermission(PERMISSIONS.DEBTS_DELETE));
  
  // Local state
  const [selectedDebt, setSelectedDebt] = useState<DebtData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<DebtPaymentReceiptData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dataInitialized, setDataInitialized] = useState(false);
  
  // Cache management
  const CACHE_KEY = 'debts_last_fetch';
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
  
  const [formData, setFormData] = useState<FormData>({
    status: 'pending',
    paid_amount: 0,
    due_date: '',
  });
  
  const [repayData, setRepayData] = useState<RepayData>({
    paid_amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    money_box_id: ''
  });

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Memoized computed values
  const customerDebtSummaries = useMemo((): CustomerDebtSummary[] => {
    // Skip computation if data is still loading
    if (debtsLoading || debts.length === 0) {
      return [];
    }
    
    const customerMap = new Map<number, CustomerDebtSummary>();
    
    debts.forEach(debt => {
      if (!customerMap.has(debt.customer_id)) {
        customerMap.set(debt.customer_id, {
          customer_id: debt.customer_id,
          customer_name: debt.customer_name,
          customer_email: debt.customer_email,
          customer_phone: debt.customer_phone,
          customer_address: debt.customer_address,
          totalDebt: 0,
          debtCount: 0,
          debts: []
        });
      }
      
      const summary = customerMap.get(debt.customer_id)!;
      summary.totalDebt += debt.remaining_amount;
      summary.debtCount += 1;
      summary.debts.push(debt);
    });
    
    return Array.from(customerMap.values());
  }, [debts, debtsLoading]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data with pagination and filters
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check cache before loading
        const lastFetch = localStorage.getItem(CACHE_KEY);
        const now = Date.now();
        
        // Skip loading if we have data and cache is still valid
        if (debts.length > 0 && lastFetch && (now - parseInt(lastFetch)) < CACHE_DURATION) {
          setDataInitialized(true);
          return;
        }
        
        // Load debts first (critical data)
        
        
        const result = await dispatch(getDebts({
          page: currentPage,
          limit: 20, // Reduced from 50 to 20 for faster initial load
          search: debouncedSearchQuery,
          status: statusFilter === 'all' ? undefined : statusFilter
        })).unwrap();
        
        
        
        // Update cache timestamp
        localStorage.setItem(CACHE_KEY, now.toString());
        setDataInitialized(true);
        
        // Load stats in background (non-blocking)
        dispatch(getDebtStats({}));
      } catch (error) {
        console.error('[Debts] Error loading debts:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
        setDataInitialized(true);
      }
    };
    
    // Only load if not initialized or when filters change
    if (!dataInitialized || debouncedSearchQuery || statusFilter !== 'all' || currentPage > 1) {
      loadData();
    }
  }, [dispatch, currentPage, debouncedSearchQuery, statusFilter, dataInitialized, debts.length]);

  // Performance tracking
  useEffect(() => {
    const startTime = performance.now();
    
    // Track when data is loaded
    if (dataInitialized && !debtsLoading) {
      const loadTime = performance.now() - startTime;
      
      
      
      
      // Send to analytics if available
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'debts_page_load',
          value: Math.round(loadTime),
          event_label: `${debts.length} items`
        });
      }
    }
  }, [dataInitialized, debtsLoading, debts.length, debts]);

  // Fetch money boxes
  useEffect(() => {
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  // Memoized event handlers
  const handleStatusFilterChange = useCallback((value: 'all' | 'pending' | 'paid' | 'partial') => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleEdit = useCallback((debt: DebtData) => {
    setSelectedDebt(debt);
    setFormData({
      status: debt.status,
      paid_amount: debt.paid_amount,
      due_date: debt.due_date.split('T')[0],
    });
    setIsEditModalOpen(true);
  }, []);

  const handleView = useCallback(async (debt: DebtData) => {
    try {
      // Fetch detailed debt information including installments
      const response = await debtsService.getDebt(debt.sale_id);
      setSelectedDebt(response.data);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching debt details:', error);
      // Fallback to using the basic debt data
      setSelectedDebt(debt);
      setIsViewModalOpen(true);
      toast.error('حدث خطأ في تحميل تفاصيل الدين');
    }
  }, []);

  const handleRepayClick = useCallback((debt: DebtData) => {
    setSelectedDebt(debt);
    setRepayData({
      paid_amount: debt.remaining_amount,
      payment_method: 'cash',
      reference_number: '',
      notes: `تسديد دين - فاتورة رقم: ${debt.invoice_no}`,
      receipt_date: format(new Date(), 'yyyy-MM-dd'),
      money_box_id: moneyBoxes.length > 0 ? moneyBoxes[0].id.toString() : ''
    });
    setIsRepayModalOpen(true);
  }, [moneyBoxes]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await dispatch(deleteDebt(id)).unwrap();
      toast.success('تم حذف الدين بنجاح');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ');
    }
  }, [dispatch]);

  const handlePrint = useCallback((debt: DebtData) => {
    try {
      const customer = {
        id: debt.customer_id,
        name: debt.customer_name,
        email: debt.customer_email,
        phone: debt.customer_phone,
        address: debt.customer_address
      };
      
      // Use the new debt print utility
      printDebtUtils.printDebtWithPreview(
        debt,
        customer,
        settingsData,
        'a4'
      );
    } catch (error) {
      console.error('Error printing debt:', error);
      toast.error('حدث خطأ أثناء الطباعة');
    }
  }, [settingsData]);

  const handlePrintDebtStatement = useCallback((customerDebts: CustomerDebtSummary) => {
    try {
      const customer = {
        id: customerDebts.customer_id,
        name: customerDebts.customer_name,
        email: customerDebts.customer_email,
        phone: customerDebts.customer_phone,
        address: customerDebts.customer_address
      };
      
      // Use the debt statement print utility
      printDebtUtils.printDebtStatement(
        customerDebts.debts,
        customer,
        settingsData,
        'a4'
      );
    } catch (error) {
      console.error('Error printing debt statement:', error);
      toast.error('حدث خطأ أثناء طباعة كشف الحساب');
    }
  }, [settingsData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    try {
      await dispatch(updateDebt({
        id: selectedDebt.sale_id,
        data: formData
      })).unwrap();
      toast.success('تم تحديث الدين بنجاح');
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ');
    }
  }, [dispatch, selectedDebt, formData]);

  const handleRepay = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    try {
      const result = await dispatch(repayDebt({
        id: selectedDebt.sale_id,
        repayData: repayData
      })).unwrap();
      
      // Show success message
      let successMessage = 'تم تسديد الدين بنجاح وإنشاء إيصال';
      
      // Show applied payments information
      if (result.appliedPayments && result.appliedPayments.length > 0) {
        const appliedDetails = result.appliedPayments.map(payment => 
          `${payment.amount.toLocaleString()} د.ك (فاتورة: ${payment.invoice_no})`
        ).join('، ');
        
        successMessage = `تم تطبيق المدفوع على: ${appliedDetails}`;
        
        // Show additional notification for multiple payments
        if (result.appliedPayments.length > 1) {
          toast.info(`تم سداد ${result.appliedPayments.length} ديون`);
        }
      }
      
      // Show excess amount notification
      if (result.excessAmount && result.excessAmount > 0) {
        toast.success(
          `تم إضافة المبلغ الزائد (${result.excessAmount.toLocaleString()} د.ك) إلى رصيد العميل`,
          { duration: 5000 }
        );
      }
      
      toast.success(successMessage);
      setIsRepayModalOpen(false);
      
      setCreatedReceipt(result.receipt);
      setIsReceiptModalOpen(true);
      
      // Print payment receipt
      try {
        const customer = {
          id: selectedDebt.customer_id,
          name: selectedDebt.customer_name,
          email: selectedDebt.customer_email,
          phone: selectedDebt.customer_phone,
          address: selectedDebt.customer_address
        };
        
        printDebtUtils.quickPrintDebt(
          selectedDebt,
          customer,
          settingsData,
          'a4',
          repayData.paid_amount,
          repayData.payment_method,
          repayData.receipt_date
        );
      } catch (error) {
        console.error('Error printing payment receipt:', error);
        // Don't show error toast as the payment was successful
      }
      
      setRepayData({
        paid_amount: 0,
        payment_method: 'cash',
        reference_number: '',
        notes: '',
        receipt_date: format(new Date(), 'yyyy-MM-dd'),
        money_box_id: moneyBoxes.length > 0 ? moneyBoxes[0].id.toString() : ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ');
    }
  }, [dispatch, selectedDebt, repayData]);

  const handleViewCustomerDetails = useCallback((customerId: number) => {
    // TODO: Implement view customer details
    
  }, []);

  // Form update handlers
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateRepayData = useCallback((updates: Partial<RepayData>) => {
    setRepayData(prev => ({ ...prev, ...updates }));
  }, []);

  // Loading state
  if (debtsLoading && debts.length === 0 && !dataInitialized) {
    return (
      <DebtsWrapper>
        <CashBoxGuard operationType="دفع دين">
          <div className="container mx-auto px-4 py-8" dir="rtl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">الديون</h1>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Table Skeleton */}
            <Card>
              <CardContent className="p-0">
                <DebtTableSkeleton />
              </CardContent>
            </Card>
          </div>
        </CashBoxGuard>
      </DebtsWrapper>
    );
  }

  if (debtsError) {
    return (
      <div className="text-red-500 text-center py-4">
        {debtsError}
      </div>
    );
  }

  return (
    <DebtsWrapper>
      <CashBoxGuard operationType="دفع دين">
        <div className="min-w-full mx-auto px-4 py-8" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
           
            الديون
          </h1>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="ابحث عن دين، عميل، فاتورة، أو مبلغ..."
          />
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">غير مدفوع</SelectItem>
                <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">جميع الديون</TabsTrigger>
            <TabsTrigger value="customers">العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="overflow-x-auto rounded-md shadow-md bg-white mb-8">
                    <table className="min-w-full text-right border-separate border-spacing-y-1">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">العميل</th>
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">رقم الفاتورة</th>
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">المبلغ</th>
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">تاريخ الاستحقاق</th>
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">الحالة</th>
                          <th className="py-3 px-4 text-sm font-bold text-gray-600">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debts.length > 0 ? (
                          debts.map((debt, idx) => (
                            <DebtRow
                              key={debt.sale_id}
                              debt={debt}
                              index={idx}
                              onEdit={handleEdit}
                              onView={handleView}
                              onRepay={handleRepayClick}
                              onDelete={handleDelete}
                              onPrint={handlePrint}
                              canViewDebts={canViewDebts}
                              canEditDebts={canEditDebts}
                              canDeleteDebts={canDeleteDebts}
                            />
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500">
                              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد ديون'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerDebtSummaries.map((customer) => (
                <CustomerCard
                  key={customer.customer_id}
                  customer={customer}
                  onViewDetails={handleViewCustomerDetails}
                  onPrintStatement={handlePrintDebtStatement}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                تعديل الدين
              </DialogTitle>
              <DialogDescription>
                قم بتعديل تفاصيل الدين
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">حالة الدفع</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'pending' | 'paid' | 'partial' | 'unpaid') => 
                    updateFormData({ status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">غير مدفوع</SelectItem>
                    <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  value={formData.paid_amount}
                  onChange={(e) => updateFormData({ paid_amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateFormData({ due_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  <Pencil className="h-4 w-4 mr-2" />
                  تحديث
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذا الدين؟</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedDebt && handleDelete(selectedDebt.sale_id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Repay Modal */}
        <Dialog open={isRepayModalOpen} onOpenChange={setIsRepayModalOpen}>
          <DialogContent className="max-w-md max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                تسديد الدين وإنشاء إيصال
              </DialogTitle>
              <DialogDescription>
                قم بإدخال تفاصيل الدفع لإنشاء إيصال العميل
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRepay} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repay_amount">المبلغ المدفوع</Label>
                <Input
                  id="repay_amount"
                  type="number"
                  value={repayData.paid_amount}
                  onChange={(e) => updateRepayData({ paid_amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-sm text-gray-500">
                  المبلغ المتبقي: {formatCurrency(selectedDebt?.remaining_amount || 0)}
                  {repayData.paid_amount > (selectedDebt?.remaining_amount || 0) && (
                    <span className="text-blue-600 block mt-1">
                      المبلغ الزائد سيتم إضافته إلى رصيد العميل
                    </span>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select 
                  value={repayData.payment_method} 
                  onValueChange={(value: 'cash' | 'card' | 'bank_transfer' | 'check') => 
                    updateRepayData({ payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="money_box">صندوق المال</Label>
                <Select 
                  value={repayData.money_box_id} 
                  onValueChange={(value: string) => 
                    updateRepayData({ money_box_id: value })
                  }
                >
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
                {repayData.money_box_id && repayData.money_box_id !== 'cash_box' && (
                  <div className="mt-1">
                    {(() => {
                      const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === repayData.money_box_id);
                      if (selectedMoneyBox) {
                        return (
                          <span className="text-green-500 text-sm">
                            ✓ سيتم إضافة {repayData.paid_amount.toLocaleString()} دينار إلى {selectedMoneyBox.name}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">رقم المرجع (اختياري)</Label>
                <Input
                  id="reference_number"
                  type="text"
                  value={repayData.reference_number}
                  onChange={(e) => updateRepayData({ reference_number: e.target.value })}
                  placeholder="رقم المرجع أو الشيك"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_date">تاريخ الإيصال</Label>
                <Input
                  id="receipt_date"
                  type="date"
                  value={repayData.receipt_date}
                  onChange={(e) => updateRepayData({ receipt_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                <textarea
                  id="notes"
                  value={repayData.notes}
                  onChange={(e) => updateRepayData({ notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRepayModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  <Receipt className="h-4 w-4 mr-2" />
                  تسديد وإنشاء إيصال
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Professional Receipt Modal */}
        <DebtPaymentReceipt
          receipt={createdReceipt}
          debt={selectedDebt ? {
            customer_name: selectedDebt.customer_name,
            customer_phone: selectedDebt.customer_phone,
            customer_email: selectedDebt.customer_email,
            customer_address: selectedDebt.customer_address,
            invoice_no: selectedDebt.invoice_no,
            total_amount: selectedDebt.total_amount,
            paid_amount: selectedDebt.paid_amount,
            remaining_amount: selectedDebt.remaining_amount,
            due_date: selectedDebt.due_date
          } : null}
          open={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
        />

        {/* View Debt Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                تفاصيل الدين
              </DialogTitle>
              <DialogDescription>
                عرض تفاصيل الدين المحدد
              </DialogDescription>
            </DialogHeader>
            
            {selectedDebt && (
              <div className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      معلومات العميل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">اسم العميل</Label>
                        <p className="text-lg font-semibold">{selectedDebt.customer_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">رقم الهاتف</Label>
                        <p className="text-lg">{selectedDebt.customer_phone || 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">البريد الإلكتروني</Label>
                        <p className="text-lg">{selectedDebt.customer_email || 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">العنوان</Label>
                        <p className="text-lg">{selectedDebt.customer_address || 'غير محدد'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Debt Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      تفاصيل الدين
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">رقم الفاتورة</Label>
                        <p className="text-lg font-semibold">{selectedDebt.invoice_no || 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">نوع الدين</Label>
                        <div className="mt-1">
                          {(() => {
                            // Check if this debt has associated installments
                            const hasInstallments = selectedDebt.installments && selectedDebt.installments.length > 0;
                            if (hasInstallments) {
                              return (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
                                  <CreditCard className="h-3 w-3 inline mr-1" />
                                  قسط
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                                  <Receipt className="h-3 w-3 inline mr-1" />
                                  دين عادي
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">تاريخ الاستحقاق</Label>
                        <p className="text-lg">{selectedDebt.due_date ? formatDate(selectedDebt.due_date) : 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">المبلغ الإجمالي</Label>
                        <p className="text-lg font-bold text-blue-600">{selectedDebt.total_amount ? formatCurrency(selectedDebt.total_amount) : 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">المبلغ المدفوع</Label>
                        <p className="text-lg font-bold text-green-600">{selectedDebt.paid_amount ? formatCurrency(selectedDebt.paid_amount) : 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">المبلغ المتبقي</Label>
                        <p className="text-lg font-bold text-red-600">
                          {selectedDebt.remaining_amount !== undefined && selectedDebt.remaining_amount !== null 
                            ? formatCurrency(selectedDebt.remaining_amount) 
                            : selectedDebt.total_amount && selectedDebt.paid_amount 
                              ? formatCurrency(selectedDebt.total_amount - selectedDebt.paid_amount)
                              : 'غير محدد'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">حالة الدين</Label>
                        <div className="mt-1">
                          {(() => {
                            const statusConfig = {
                              paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'مدفوع' },
                              partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'مدفوع جزئياً' },
                              pending: { bg: 'bg-red-100', text: 'text-red-700', label: 'غير مدفوع' },
                              unpaid: { bg: 'bg-red-100', text: 'text-red-700', label: 'غير مدفوع' }
                            };
                            // Check if amount is 0 and automatically mark as paid
                            const effectiveStatus = selectedDebt.remaining_amount <= 0 ? 'paid' : selectedDebt.status;
                            const normalizedStatus = effectiveStatus === 'unpaid' ? 'pending' : effectiveStatus;
                            const config = statusConfig[normalizedStatus] || statusConfig.pending;
                            return (
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
                                {config.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Installment Details (if applicable) */}
                {selectedDebt.installments && selectedDebt.installments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        تفاصيل الأقساط
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">عدد الأقساط:</span>
                          <span className="font-semibold">{selectedDebt.installments.length}</span>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">الأقساط:</Label>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {selectedDebt.installments.map((installment, index) => (
                              <div key={installment.id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">القسط {index + 1}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    installment.payment_status === 'paid' 
                                      ? 'bg-green-100 text-green-700' 
                                      : installment.payment_status === 'partial'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {installment.payment_status === 'paid' ? 'مدفوع' : 
                                     installment.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                  <div>
                                    <span className="text-gray-600">المبلغ:</span>
                                    <span className="font-medium mr-1">{formatCurrency(installment.amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">المدفوع:</span>
                                    <span className="font-medium mr-1">{formatCurrency(installment.paid_amount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">تاريخ الاستحقاق:</span>
                                    <span className="font-medium mr-1">{formatDate(installment.due_date)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">طريقة الدفع:</span>
                                    <span className="font-medium mr-1">
                                      {installment.payment_method === 'cash' ? 'نقدي' :
                                       installment.payment_method === 'card' ? 'بطاقة' :
                                       installment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                       installment.payment_method === 'check' ? 'شيك' : 'غير محدد'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      معلومات إضافية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">رقم العميل</Label>
                        <p className="text-lg">{selectedDebt.customer_id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">رقم المبيعات</Label>
                        <p className="text-lg">{selectedDebt.sale_id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">تاريخ الإنشاء</Label>
                        <p className="text-lg">{selectedDebt.created_at ? formatDate(selectedDebt.created_at) : 'غير محدد'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">آخر تحديث</Label>
                        <p className="text-lg">{selectedDebt.updated_at ? formatDate(selectedDebt.updated_at) : 'غير محدد'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    إغلاق
                  </Button>
                  {canEditDebts && (
                    <Button 
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleEdit(selectedDebt);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      تعديل
                    </Button>
                  )}
                  {canEditDebts && (
                    <Button 
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleRepayClick(selectedDebt);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      تسديد
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </CashBoxGuard>
    </DebtsWrapper>
  );
};

export default Debts; 