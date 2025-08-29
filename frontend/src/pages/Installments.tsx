import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { getCustomers } from '@/features/customers/customersSlice';
import { getProducts } from '@/features/inventory/inventorySlice';
import { getDebtsByCustomer } from '@/features/debts/debtsSlice';
import { fetchAllMoneyBoxes } from '@/features/moneyBoxes/moneyBoxesSlice';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
import { 
  getGroupedInstallments,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  recordPayment,
  createInstallmentPlan,
  clearError,
  clearPlanError
} from '@/features/installments/installmentsSlice';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from "@/lib/toast";
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Loader2, 
  Eye, 
  Calendar, 
  DollarSign,
  User,
  CreditCard,
  ShoppingCart,
  Minus,
  X,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallmentsWrapper } from '@/components/PremiumFeatureWrapper';
// import { CashBoxGuard } from '@/components/CashBoxGuard'; // Removed - using money boxes only
import { usePrintBill } from '@/hooks/usePrintBill';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import InstallmentPrintView from '@/components/InstallmentPrintView';
import { printInstallmentWithPreview } from '@/utils/printInstallmentUtils';
import { useSettings } from '@/features/settings/useSettings';

interface Installment {
  id: number;
  sale_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  payment_method: 'cash' | 'card' | 'bank_transfer';
  paid_at: string | null;
  notes: string;
  invoice_no: string;
}

interface PaymentFormData {
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes: string;
  money_box_id: string;
}

interface InstallmentFormData {
  sale_id: number;
  customer_id: number;
  due_date: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes: string;
}

interface InstallmentPlanData {
  customer_id: number;
  selectedProducts: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    stock: number;
  }>;
  installmentMonths: number;
  startingDueDate: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  notes: string;
}

interface InstallmentPlan {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  total_installments: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: Installment[];
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

// Type guard to check if an item is an InstallmentPlan
const isInstallmentPlan = (item: Installment | InstallmentPlan): item is InstallmentPlan => {
  return item && typeof item.sale_id === 'number' && Array.isArray((item as InstallmentPlan).installments);
};

// Memoized filter types
interface FilterState {
  search: string;
  payment_status: string;
  customer_id: string;
}

// Memoized Search Component with better debouncing
const OptimizedSearchInput = memo(({ 
  value, 
  onChange, 
  placeholder,
  isLoading = false
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  isLoading?: boolean;
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the search with useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300); // Faster debounce for better UX

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative flex-1">
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        autoComplete="off"
        disabled={isLoading}
      />
      {isLoading && (
        <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
      )}
    </div>
  );
});

OptimizedSearchInput.displayName = 'OptimizedSearchInput';

// Memoized Filter Panel
const FilterPanel = memo(({ 
  filters, 
  onFilterChange,
  customers,
  onClearFilters
}: {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  customers: Array<{ id: number; name: string; phone?: string }>;
  onClearFilters: () => void;
}) => {
  const hasActiveFilters = filters.payment_status !== 'all' || filters.customer_id !== '';

  return (
    <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">فلاتر:</span>
      </div>
      
      <Select 
        value={filters.payment_status} 
        onValueChange={(value) => onFilterChange('payment_status', value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="حالة السداد" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="unpaid">غير مدفوع</SelectItem>
          <SelectItem value="partial">مدفوع جزئياً</SelectItem>
          <SelectItem value="paid">مدفوع</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.customer_id} 
        onValueChange={(value) => onFilterChange('customer_id', value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="اختر العميل" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع العملاء</SelectItem>
          {customers.map(customer => (
            <SelectItem key={customer.id} value={customer.id.toString()}>
              {customer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearFilters}
          className="text-gray-600 hover:text-gray-800"
        >
          <X className="h-4 w-4 ml-1" />
          مسح الفلاتر
        </Button>
      )}
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

// Memoized Payment Status Badge
const PaymentStatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'paid':
        return { color: 'bg-green-100 text-green-800 border-green-200', text: 'مدفوع' };
      case 'partial':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'مدفوع جزئياً' };
      case 'unpaid':
        return { color: 'bg-red-100 text-red-800 border-red-200', text: 'غير مدفوع' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'غير محدد' };
    }
  }, [status]);

  return (
    <Badge variant="outline" className={statusConfig.color}>
      {statusConfig.text}
    </Badge>
  );
});

PaymentStatusBadge.displayName = 'PaymentStatusBadge';

// Memoized Installment Plan Row Component
const InstallmentPlanRow = memo(({ 
  plan, 
  isExpanded, 
  onToggleExpand,
  onPayment,
  onEdit,
  onDelete,
  onPrint,
  isPrinting,
  canViewInstallments,
  canEditInstallments,
  canDeleteInstallments
}: {
  plan: InstallmentPlan;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPayment: (installment: Installment) => void;
  onEdit: (installment: Installment) => void;
  onDelete: (installmentId: number) => void;
  onPrint: (plan: InstallmentPlan) => void;
  isPrinting: boolean;
  canViewInstallments: boolean;
  canEditInstallments: boolean;
  canDeleteInstallments: boolean;
}) => {
  // Helper function to safely format currency
  const safeFormatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined || amount === '') {
      return '0 IQD';
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(numAmount)) {
      return '0 IQD';
    }
    
    return formatCurrency(numAmount);
  };

  // Calculate totals from installments if plan totals are missing
  const calculatedTotals = useMemo(() => {
    if (!plan.installments) return { totalAmount: 0, paidAmount: 0, remainingAmount: 0 };
    
    const totalAmount = plan.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const paidAmount = plan.installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);
    const remainingAmount = totalAmount - paidAmount;
    
    return { totalAmount, paidAmount, remainingAmount };
  }, [plan.installments]);

  // Use calculated totals if plan totals are undefined
  const displayTotalAmount = plan.total_amount !== undefined ? plan.total_amount : calculatedTotals.totalAmount;
  const displayPaidAmount = plan.paid_amount !== undefined ? plan.paid_amount : calculatedTotals.paidAmount;
  const displayRemainingAmount = plan.remaining_amount !== undefined ? plan.remaining_amount : calculatedTotals.remainingAmount;

  const overduePlansCount = useMemo(() => {
    if (!plan.installments || !Array.isArray(plan.installments)) return 0;
    try {
      return plan.installments.filter(inst => {
        if (!inst || !inst.due_date || !inst.payment_status) return false;
        try {
          const dueDate = new Date(inst.due_date);
          return !isNaN(dueDate.getTime()) && dueDate < new Date() && inst.payment_status !== 'paid';
        } catch (error) {
          return false;
        }
      }).length;
    } catch (error) {
      return 0;
    }
  }, [plan.installments]);

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggleExpand}>
        <td className="py-3 px-4">
          <Button variant="ghost" size="sm">
            {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </td>
        <td className="py-3 px-4 font-medium">{plan.invoice_no}</td>
        <td className="py-3 px-4">
          <div>
            <div className="font-medium">{plan.customer_name}</div>
            <div className="text-sm text-gray-600">{plan.customer_phone}</div>
          </div>
        </td>
        <td className="py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="font-medium">{plan.total_installments || 0}</span>
            {overduePlansCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overduePlansCount} متأخر
              </Badge>
            )}
          </div>
        </td>
        <td className="py-3 px-4 font-semibold text-blue-700">
          {safeFormatCurrency(displayTotalAmount)}
        </td>
        <td className="py-3 px-4 font-semibold text-green-700">
          {safeFormatCurrency(displayPaidAmount)}
        </td>
        <td className="py-3 px-4 font-semibold text-orange-700">
          {safeFormatCurrency(displayRemainingAmount)}
        </td>
        <td className="py-3 px-4">
          <PaymentStatusBadge status={plan.payment_status} />
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-2">
            {canViewInstallments && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPrinting}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onPrint(plan)}>
                    <Printer className="w-4 h-4 mr-2" />
                    طباعة خطة الأقساط
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canViewInstallments && (
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={9} className="px-4 py-0">
            <div className="bg-gray-50 rounded-lg p-4 mb-2">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تفاصيل الأقساط ({plan.total_installments} أقساط)
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-2 px-3 font-medium text-gray-600">القسط</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">تاريخ الاستحقاق</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">المبلغ</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">المدفوع</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">المتبقي</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">الحالة</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 min-w-[140px]">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(plan.installments || [])
                      .filter((installment) => {
                        // Validate installment data before rendering
                        return installment && 
                               typeof installment.id !== 'undefined' &&
                               installment.due_date &&
                               typeof installment.amount === 'number' &&
                               typeof installment.paid_amount === 'number' &&
                               installment.payment_status;
                      })
                      .sort((a, b) => {
                        try {
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        } catch (error) {
                          return 0;
                        }
                      })
                      .map((installment, idx) => {
                        try {
                          const dueDate = new Date(installment.due_date);
                          const isValidDate = !isNaN(dueDate.getTime());
                          const isOverdue = isValidDate && dueDate < new Date() && installment.payment_status !== 'paid';
                          
                          return (
                            <tr 
                              key={installment.id} 
                              className={cn(
                                "hover:bg-white border-b border-gray-100",
                                isOverdue && "bg-red-50"
                              )}
                            >
                              <td className="py-2 px-3 text-sm text-gray-700">
                                القسط {idx + 1}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-600">
                                <div className={cn(
                                  "flex items-center gap-1",
                                  isOverdue && "text-red-600 font-medium"
                                )}>
                                  <Calendar className="h-3 w-3" />
                                  {isValidDate ? (
                                    format(dueDate, 'dd MMM yyyy', { locale: ar })
                                  ) : (
                                    'تاريخ غير صحيح'
                                  )}
                                  {isOverdue && <span className="text-xs">(متأخر)</span>}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-sm font-medium text-blue-700">
                                {formatCurrency(installment.amount || 0)}
                              </td>
                              <td className="py-2 px-3 text-sm text-green-700">
                                {formatCurrency(installment.paid_amount || 0)}
                              </td>
                              <td className="py-2 px-3 text-sm text-orange-700">
                                {formatCurrency((installment.amount || 0) - (installment.paid_amount || 0))}
                              </td>
                              <td className="py-2 px-3">
                                <PaymentStatusBadge status={installment.payment_status || 'unpaid'} />
                              </td>
                              <td className="py-2 px-3 min-w-[140px]">
                                <div className="flex gap-1 justify-start">
                                  {installment.payment_status !== 'paid' && canEditInstallments && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onPayment(installment);
                                      }}
                                      className="h-8 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100"
                                    >
                                      <DollarSign className="h-3 w-3 ml-1" />
                                      دفع
                                    </Button>
                                  )}
                                  {canEditInstallments && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(installment);
                                      }}
                                      className="h-8 px-2 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {canDeleteInstallments && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(installment.id);
                                      }}
                                      className="h-8 px-2 text-xs bg-red-50 border-red-200 hover:bg-red-100"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        } catch (error) {
                          return (
                            <tr key={installment.id || `error-${idx}`}>
                              <td colSpan={7} className="py-2 px-3 text-center text-red-500 text-sm">
                                خطأ في عرض بيانات القسط
                              </td>
                            </tr>
                          );
                        }
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

InstallmentPlanRow.displayName = 'InstallmentPlanRow';

const Installments = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux selectors with memoization
  const { items: customers, loading: customersLoading } = useSelector((state: RootState) => state.customers);
  const { items: products, loading: productsLoading } = useSelector((state: RootState) => state.inventory);
  const { 
    items: groupedInstallments, 
    loading: installmentsLoading, 
    error: installmentsError,
    planCreating,
    planError,
    pagination
  } = useSelector((state: RootState) => state.installments);
  const { moneyBoxes } = useSelector((state: RootState) => state.moneyBoxes);
  
  // Permission checks for installments management
  const canViewInstallments = useSelector(selectHasPermission(PERMISSIONS.INSTALLMENTS_VIEW));
  const canAddInstallments = useSelector(selectHasPermission(PERMISSIONS.INSTALLMENTS_ADD));
  const canEditInstallments = useSelector(selectHasPermission(PERMISSIONS.INSTALLMENTS_EDIT));
  const canDeleteInstallments = useSelector(selectHasPermission(PERMISSIONS.INSTALLMENTS_DELETE));
  

  
  // Local state with better organization
  const [modals, setModals] = useState({
    create: false,
    payment: false,
    plan: false,
    delete: false,
    selectDebt: false,
    print: false
  });
  
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState<InstallmentPlan | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    payment_status: 'all',
    customer_id: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debt selection state
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<number>(0);
  const [customerDebts, setCustomerDebts] = useState<any[]>([]);
  const [selectedDebts, setSelectedDebts] = useState<Set<number>>(new Set());
  const [debtLoading, setDebtLoading] = useState(false);
  
  // Installment configuration for debt conversion
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);
  const [startingDueDate, setStartingDueDate] = useState<string>(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  // Receipt state
  const [createdReceipt, setCreatedReceipt] = useState<any>(null);

  // Form data states
  const [formData, setFormData] = useState<InstallmentFormData>({
    sale_id: 0,
    customer_id: 0,
    due_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    notes: ''
  });
  
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    paid_amount: 0,
    payment_method: 'cash',
    notes: '',
    money_box_id: ''
  });
  
  const [installmentPlanData, setInstallmentPlanData] = useState<InstallmentPlanData>({
    customer_id: 0,
    selectedProducts: [],
    installmentMonths: 3,
    startingDueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    paymentMethod: 'cash',
    notes: ''
  });

  // Get settings for printing
  const { settings } = useSettings();

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Memoized computations
  const filteredPlans = useMemo(() => {
    if (!groupedInstallments.length) return [];
    
    try {
      // Filter only InstallmentPlan items and apply filters
      return groupedInstallments
        .filter((item) => {
          try {
            return isInstallmentPlan(item);
      } catch (error) {
            console.warn('Error checking if item is InstallmentPlan:', error, item);
            return false;
          }
        })
        .filter((plan) => {
          try {
            // Validate plan object
            if (!plan || typeof plan.sale_id === 'undefined') {
              console.warn('Invalid plan object:', plan);
              return false;
            }

            // Payment status filter
            if (filters.payment_status !== 'all' && plan.payment_status !== filters.payment_status) {
              return false;
            }
            
            // Customer filter
            if (filters.customer_id && filters.customer_id !== 'all' && plan.customer_id?.toString() !== filters.customer_id) {
              return false;
            }
            
            // Search filter
            if (filters.search.trim()) {
              const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(term => term.length > 0);
              return searchTerms.every(searchTerm => {
                return (
                  plan.customer_name?.toLowerCase().includes(searchTerm) ||
                  plan.customer_phone?.toLowerCase().includes(searchTerm) ||
                  plan.invoice_no?.toLowerCase().includes(searchTerm) ||
                  plan.sale_id?.toString().includes(searchTerm)
                );
              });
            }
            
            return true;
          } catch (error) {
            console.error('Error filtering plan:', error, plan);
            return false;
          }
        });
    } catch (error) {
      console.error('Error in filteredPlans computation:', error);
      return [];
    }
  }, [groupedInstallments, filters]);

  // Optimized callbacks
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      payment_status: 'all',
      customer_id: ''
    });
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  }, []);

  const togglePlanExpansion = useCallback((saleId: number) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  }, []);

  const openModal = useCallback((modalType: keyof typeof modals, installment?: Installment) => {
    if (installment) {
      setSelectedInstallment(installment);
      if (modalType === 'payment') {
        setPaymentFormData(prev => ({
          ...prev,
          paid_amount: Math.max(0, installment.amount - (installment.paid_amount || 0)),
          money_box_id: prev.money_box_id // Preserve the money box selection
        }));
      } else if (modalType === 'create') {
        // Populate form for editing
        setFormData({
          sale_id: installment.sale_id,
          customer_id: installment.customer_id,
          due_date: installment.due_date,
          amount: installment.amount,
          payment_method: installment.payment_method,
          notes: installment.notes || ''
        });
      }
    }
    
    // Ensure products are loaded when opening the plan modal
    if (modalType === 'plan' && products.length === 0) {
      dispatch(getProducts({ page: 1, limit: 100 }));
    }
    
    setModals(prev => ({ ...prev, [modalType]: true }));
    
    // Force a brief delay to allow state to update, then refresh
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refreshCashBox'));
    }, 100);
  }, [dispatch, products.length]);

  const closeModal = useCallback((modalType: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalType]: false }));
    if (modalType === 'payment' || modalType === 'create') {
      setSelectedInstallment(null);
    }
    if (modalType === 'payment') {
      setCreatedReceipt(null);
    }
  }, []);

  // Error handling effect
  useEffect(() => {
    if (modals.plan) {
      dispatch(clearPlanError());
    }
  }, [modals.plan, dispatch]);

  // Fetch money boxes
  useEffect(() => {
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  // Event handlers
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedInstallment) {
        // Update existing installment
        await dispatch(updateInstallment({ 
          id: selectedInstallment.id, 
          installmentData: formData 
        })).unwrap();
        toast.success('تم تحديث القسط بنجاح');
      } else {
        // Create new installment
        await dispatch(createInstallment(formData)).unwrap();
        toast.success('تم إنشاء القسط بنجاح');
      }
      
      // Refresh data after successful operation
      closeModal('create');
      setFormData({
        sale_id: 0,
        customer_id: 0,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        payment_method: 'cash',
        notes: ''
      });
      setSelectedInstallment(null);
    } catch (error: any) {
      
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
        toast.error(selectedInstallment ? 'حدث خطأ أثناء تحديث القسط' : 'حدث خطأ أثناء إنشاء القسط');
      }
    }
  }, [dispatch, formData, selectedInstallment, closeModal]);

  const handlePayment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;

    
    // Create a copy of the form data to ensure we have the latest state
    const currentFormData = { ...paymentFormData };
    
    // Auto-select first money box if none selected and money boxes are available
    if (!currentFormData.money_box_id && moneyBoxes.length > 0) {
      currentFormData.money_box_id = moneyBoxes[0].id.toString();
    }

    try {
      const result = await dispatch(recordPayment({ 
        id: selectedInstallment.id, 
        paymentData: currentFormData 
      })).unwrap();
      
      // Show success message with receipt information  
      if (result && typeof result === 'object' && result !== null && 'receipt' in result) {
        const resultWithReceipt = result as { receipt: { 
          receipt_number: string;
          customer_name?: string;
          sale_invoice_no?: string;
          amount: number;
          payment_method: string;
        } };
        if (resultWithReceipt.receipt?.receipt_number) {
          const paymentMethodText = resultWithReceipt.receipt.payment_method === 'cash' ? 'نقداً' : 
                                   resultWithReceipt.receipt.payment_method === 'card' ? 'بطاقة ائتمان' : 'تحويل بنكي';
          
          // Store the receipt for viewing
          setCreatedReceipt(resultWithReceipt.receipt);
          
          toast.success(
            `تم تسجيل الدفع بنجاح\n` +
            `رقم الإيصال: ${resultWithReceipt.receipt.receipt_number}\n` +
            `المبلغ: ${formatCurrency(resultWithReceipt.receipt.amount)}\n` +
            `طريقة الدفع: ${paymentMethodText}`,
            { duration: 5000 }
          );
        } else {
          toast.success('تم تسجيل الدفع بنجاح');
        }
      } else {
        toast.success('تم تسجيل الدفع بنجاح');
      }
      
      // Reset form and close modal
      setPaymentFormData({
        paid_amount: 0,
        payment_method: 'cash',
        notes: '',
        money_box_id: ''
      });
      closeModal('payment');
    } catch (error: any) {
      
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
        toast.error('حدث خطأ أثناء تسجيل الدفع');
      }
    }
  }, [dispatch, selectedInstallment, paymentFormData, closeModal]);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القسط؟')) {
      try {
        await dispatch(deleteInstallment(id)).unwrap();
        toast.success('تم حذف القسط بنجاح');
        
        // Trigger a page refresh by updating filters
        setIsRefreshing(true);
        try {
          const filterParams: {
            page: number;
            limit: number;
            search?: string;
            payment_status?: 'paid' | 'unpaid' | 'partial';
            customer_id?: number;
          } = {
            page: currentPage,
            limit: 20,
            search: filters.search
          };
          if (filters.payment_status !== 'all') {
            filterParams.payment_status = filters.payment_status as 'paid' | 'unpaid' | 'partial';
          }
          if (filters.customer_id && filters.customer_id !== 'all') {
            filterParams.customer_id = parseInt(filters.customer_id);
          }
          await dispatch(getGroupedInstallments(filterParams)).unwrap();
        } catch (error) {
        } finally {
          setIsRefreshing(false);
        }
      } catch (error: any) {
        
        if (error?.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('حدث خطأ أثناء حذف القسط');
        }
      }
    }
  }, [dispatch, currentPage, filters]);

  const handlePrint = useCallback((plan: InstallmentPlan) => {
    const customer = customers.find(c => c.id === plan.customer_id);
    printInstallmentWithPreview(plan, customer || null, settings, 'a4');
  }, [customers, settings]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Define handleRefresh before other functions that use it
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Create properly typed filter parameters
      const filterParams: {
        page: number;
        limit: number;
        search?: string;
        payment_status?: 'paid' | 'unpaid' | 'partial';
        customer_id?: number;
      } = {
        page: currentPage,
        limit: 20,
        search: filters.search
      };

      if (filters.payment_status !== 'all') {
        filterParams.payment_status = filters.payment_status as 'paid' | 'unpaid' | 'partial';
      }

      if (filters.customer_id && filters.customer_id !== 'all') {
        filterParams.customer_id = parseInt(filters.customer_id);
      }

      await dispatch(getGroupedInstallments(filterParams)).unwrap();
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, currentPage, filters]);

  // Data loading effect with optimizations
  useEffect(() => {
    const loadData = async () => {
      try {
        // Create properly typed filter parameters
        const filterParams: {
          page: number;
          limit: number;
          search?: string;
          payment_status?: 'paid' | 'unpaid' | 'partial';
          customer_id?: number;
        } = {
          page: currentPage,
          limit: 20,
          search: filters.search
        };

        if (filters.payment_status !== 'all') {
          filterParams.payment_status = filters.payment_status as 'paid' | 'unpaid' | 'partial';
        }

        if (filters.customer_id && filters.customer_id !== 'all') {
          filterParams.customer_id = parseInt(filters.customer_id);
        }

        // Load installments
        await dispatch(getGroupedInstallments(filterParams)).unwrap();

        // Load customers and products separately if needed
        if (customers.length === 0) {
          dispatch(getCustomers({}));
        }
        
        // Only load products if not already loaded
        if (products.length === 0) {
          dispatch(getProducts({ page: 1, limit: 100 }));
        }
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل البيانات');
      }
    };
    
    loadData();
  }, [dispatch, currentPage, filters.search, filters.payment_status, filters.customer_id, customers.length, products.length]);

  // Helper functions
  const calculateTotal = useCallback(() => {
    return installmentPlanData.selectedProducts.reduce((total, product) => {
      return total + (product.quantity * product.price);
    }, 0);
  }, [installmentPlanData.selectedProducts]);

  const addProduct = useCallback(() => {
    setInstallmentPlanData(prev => ({
      ...prev,
      selectedProducts: [...prev.selectedProducts, {
        product_id: 0,
        product_name: '',
        quantity: 1,
        price: 0,
        stock: 0
      }]
    }));
  }, []);

  const removeProduct = useCallback((index: number) => {
    setInstallmentPlanData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter((_, i) => i !== index)
    }));
  }, []);

  const updateProduct = useCallback((index: number, field: string, value: string | number) => {
    setInstallmentPlanData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.map((product, i) => {
        if (i === index) {
          if (field === 'product_id') {
            const productId = typeof value === 'string' ? parseInt(value) : value;
            const selectedProduct = products.find(p => p.id === productId);
            return {
              ...product,
              product_id: productId,
              product_name: selectedProduct?.name || '',
              price: selectedProduct?.selling_price || 0,
              stock: selectedProduct?.current_stock || 0
            };
          }
          return { ...product, [field]: value };
        }
        return product;
      })
    }));
  }, [products]);

  const handleCreateInstallmentPlan = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!installmentPlanData.customer_id) {
      toast.error('يرجى اختيار عميل');
      return;
    }

    if (installmentPlanData.selectedProducts.length === 0) {
      toast.error('يرجى إضافة منتجات للخطة');
      return;
    }

    // Validate stock availability
    const stockErrors = [];
    
    
    
    for (const selectedProduct of installmentPlanData.selectedProducts) {
      if (!selectedProduct.product_id) {
        stockErrors.push('يرجى اختيار منتج صحيح');
        continue;
      }

      const product = products.find(p => p.id === selectedProduct.product_id);
      
      
      if (!product) {
        stockErrors.push(`المنتج المحدد غير موجود`);
        continue;
      }

      
      
      if (selectedProduct.quantity > product.current_stock) {
        stockErrors.push(`المنتج "${product.name}" لا يحتوي على مخزون كافي. المتاح: ${product.current_stock}, المطلوب: ${selectedProduct.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      
      toast.error(stockErrors[0]);
      return;
    }

    try {
      await dispatch(createInstallmentPlan({
        ...installmentPlanData,
        totalAmount: calculateTotal()
      })).unwrap();
      
      toast.success('تم إنشاء خطة الأقساط بنجاح');
      closeModal('plan');
      
      // Reset to first page to see the newest items
      setCurrentPage(1);
      
      setInstallmentPlanData({
        customer_id: 0,
        selectedProducts: [],
        installmentMonths: 3,
        startingDueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        paymentMethod: 'cash',
        notes: ''
      });
    } catch (error: any) {
      
      // Handle specific error types
      let errorMessage = 'حدث خطأ أثناء إنشاء خطة الأقساط';
      
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
        return;
      }
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string;
        
        if (message.includes('Insufficient stock') || message.includes('Failed to update stock')) {
          // Extract the specific stock information from the server error
          const stockMatch = message.match(/Insufficient stock for product ID (\d+)\. Available: (\d+), Required: (\d+)/);
          if (stockMatch) {
            const [, productId, available, required] = stockMatch;
            errorMessage = `خطأ في المخزون: المنتج رقم ${productId} لا يحتوي على مخزون كافي. المتاح: ${available}, المطلوب: ${required}`;
          } else {
            errorMessage = 'خطأ في المخزون: أحد المنتجات لا يحتوي على مخزون كافي';
          }
        } else if (message.includes('Product with ID') && message.includes('not found')) {
          errorMessage = 'خطأ في المنتج: المنتج المحدد غير موجود';
        } else if (message.includes('Network Error')) {
          errorMessage = 'خطأ في الاتصال بالخادم. يرجى التحقق من الاتصال والمحاولة مرة أخرى';
        } else if (message.includes('customer_id')) {
          errorMessage = 'يرجى اختيار عميل صحيح';
        } else if (message.includes('selectedProducts') || message.includes('products')) {
          errorMessage = 'يرجى إضافة منتجات صحيحة للخطة';
        } else {
          errorMessage = message;
        }
      }
      
      toast.error(errorMessage);
    }
  }, [dispatch, installmentPlanData, calculateTotal, closeModal, products, handleRefresh]);

  const handleCustomerDebtChange = useCallback(async (customerId: number) => {
    setSelectedCustomerForDebt(customerId);
    setSelectedDebts(new Set());
    
    if (customerId === 0) {
      setCustomerDebts([]);
      return;
    }

    setDebtLoading(true);
    try {
      const result = await dispatch(getDebtsByCustomer(customerId)).unwrap();
      // Filter debts that don't already have installments
      const availableDebts = result.filter((debt: any) => 
        debt.status !== 'paid' && (!debt.installments || debt.installments.length === 0)
      );
      setCustomerDebts(availableDebts);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب ديون العميل');
      setCustomerDebts([]);
    } finally {
      setDebtLoading(false);
    }
  }, [dispatch]);

  const handleConvertDebtsToInstallments = useCallback(async () => {
    if (selectedDebts.size === 0) {
      toast.error('يرجى اختيار ديون لتحويلها إلى أقساط');
      return;
    }

    if (installmentMonths <= 0) {
      toast.error('عدد الأشهر يجب أن يكون أكبر من صفر');
      return;
    }

    try {
      const selectedDebtData = customerDebts.filter(debt => selectedDebts.has(debt.debt_id || debt.sale_id));
      let successCount = 0;
      let errorCount = 0;
      let totalInstallmentsCreated = 0;

      for (const debt of selectedDebtData) {
        try {
          // Calculate installment amount for this debt
          const installmentAmount = Math.ceil(debt.remaining_amount / installmentMonths);
          
          // Create multiple installments for this debt
          for (let i = 0; i < installmentMonths; i++) {
            const dueDate = new Date(startingDueDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            // For the last installment, adjust for rounding differences
            const amount = i === installmentMonths - 1 ? 
              debt.remaining_amount - (installmentAmount * (installmentMonths - 1)) : 
              installmentAmount;

            await dispatch(createInstallment({
              sale_id: debt.sale_id,
              customer_id: debt.customer_id,
              due_date: dueDate.toISOString().split('T')[0],
              amount: amount,
              payment_method: 'cash',
              notes: `تحويل من دين - ${debt.invoice_no} - القسط ${i + 1} من ${installmentMonths}`
            })).unwrap();
            
            totalInstallmentsCreated++;
          }
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم تحويل ${successCount} دين إلى ${totalInstallmentsCreated} قسط بنجاح`);
        if (errorCount > 0) {
          toast.error(`فشل في تحويل ${errorCount} دين`);
        }
        
        // Close modal and refresh data
        closeModal('selectDebt');
        setSelectedDebts(new Set());
        setCustomerDebts([]);
        setSelectedCustomerForDebt(0);
        setInstallmentMonths(3);
        setStartingDueDate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
        
        // Refresh installments data
        handleRefresh();
      } else {
        toast.error('فشل في تحويل أي دين إلى أقساط');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحويل الديون إلى أقساط');
    }
  }, [selectedDebts, customerDebts, installmentMonths, startingDueDate, dispatch, closeModal, handleRefresh]);

  const handleDebtSelection = useCallback((debtId: number) => {
    setSelectedDebts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(debtId)) {
        newSet.delete(debtId);
      } else {
        newSet.add(debtId);
      }
      return newSet;
    });
  }, [selectedDebts]);

  const handleSelectAllDebts = useCallback(() => {
    const allDebtIds = customerDebts.map(debt => debt.debt_id || debt.sale_id);
    setSelectedDebts(new Set(allDebtIds));
  }, [customerDebts]);

  const handleDeselectAllDebts = useCallback(() => {
    setSelectedDebts(new Set());
  }, []);

  // Show loading if installments are still loading initially
  if (installmentsLoading && !groupedInstallments.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل الأقساط...</p>
        </div>
      </div>
    );
  }

  if (installmentsError) {
    return (
      <div className="text-red-500 text-center py-8">
        <p className="text-lg font-medium">{installmentsError}</p>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 ml-2" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <InstallmentsWrapper>
      <div className="min-w-full mx-auto px-4 py-8" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            الأقساط
          </h1>
          <div className="flex gap-2">
            <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                تحديث
              </Button>
              <Button
                onClick={() => openModal('plan')}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            إنشاء خطة أقساط
          </Button>
              {canAddInstallments && (
              <Button
                  onClick={() => openModal('selectDebt')}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                تحويل ديون
              </Button>
            )}
        
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأقساط المعلقة</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredPlans.reduce((sum, plan) => {
                    if (isInstallmentPlan(plan)) {
                      const remaining = plan.remaining_amount !== undefined ? plan.remaining_amount : 
                        (plan.installments || []).reduce((instSum, inst) => instSum + (inst.amount - inst.paid_amount), 0);
                      return sum + remaining;
                    }
                    return sum;
                  }, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأقساط المدفوعة</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredPlans.reduce((sum, plan) => {
                    if (isInstallmentPlan(plan)) {
                      const paid = plan.paid_amount !== undefined ? plan.paid_amount : 
                        (plan.installments || []).reduce((instSum, inst) => instSum + inst.paid_amount, 0);
                      return sum + paid;
                    }
                    return sum;
                  }, 0)
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عدد خطط الأقساط</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredPlans.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <OptimizedSearchInput
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="ابحث عن قسط، عميل، فاتورة، أو مبلغ..."
            isLoading={installmentsLoading}
          />
          <div className="w-full md:w-48">
            <Select value={filters.payment_status} onValueChange={(value) => handleFilterChange('payment_status', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="unpaid">غير مدفوع</SelectItem>
                <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* Installment Plans Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="overflow-x-auto rounded-md shadow-md bg-white mb-8">
              <table className="min-w-full text-right border-separate border-spacing-y-1">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-sm font-bold text-gray-600 w-8"></th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">العميل</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">عدد الأقساط</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">المبلغ الكلي</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">المبلغ المدفوع</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">المبلغ المتبقي</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">حالة السداد</th>
                    <th className="py-3 px-4 text-sm font-bold text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                    {filteredPlans.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <CreditCard className="h-12 w-12 text-gray-300" />
                            <p>لا توجد أقساط متاحة</p>
                            {filters.search && (
                              <Button variant="outline" onClick={handleClearFilters}>
                                مسح الفلاتر
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPlans.map((plan) => (
                        <InstallmentPlanRow
                          key={plan.sale_id}
                          plan={plan as InstallmentPlan}
                          isExpanded={expandedPlans.has(plan.sale_id)}
                          onToggleExpand={() => togglePlanExpansion(plan.sale_id)}
                          onPayment={(installment) => openModal('payment', installment)}
                          onEdit={(installment) => {
                            setSelectedInstallment(installment as Installment);
                            openModal('create'); // Reuse create modal for editing
                          }}
                          onDelete={handleDelete}
                          onPrint={handlePrint}
                          isPrinting={isPrinting}
                          canViewInstallments={canViewInstallments}
                          canEditInstallments={canEditInstallments}
                          canDeleteInstallments={canDeleteInstallments}
                        />
                      ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-700">
                  عرض {((pagination.page - 1) * pagination.limit) + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} نتيجة
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || installmentsLoading}
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-gray-700">
                    صفحة {pagination.page} من {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || installmentsLoading}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>



        {/* Loading overlay for data refresh */}
        {installmentsLoading && groupedInstallments.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-gray-600">جاري تحديث البيانات...</p>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <Dialog open={modals.payment} onOpenChange={() => closeModal('payment')}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto text-right">
            <DialogHeader className="text-right">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('refreshCashBox'))}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="h-3 w-3 ml-1" />
                  تحديث الصندوق
                </Button>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  تسجيل دفع قسط
                </DialogTitle>
              </div>
              <DialogDescription className="text-right">
                تسجيل دفعة جديدة للقسط المحدد
              </DialogDescription>
            </DialogHeader>
            
            {selectedInstallment && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">مبلغ القسط:</span>
                      <span className="font-medium block">{formatCurrency(selectedInstallment.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">المبلغ المدفوع:</span>
                      <span className="font-medium block">{formatCurrency(selectedInstallment.paid_amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">المبلغ المتبقي:</span>
                      <span className="font-medium block text-orange-600">
                        {formatCurrency(selectedInstallment.amount - selectedInstallment.paid_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">تاريخ الاستحقاق:</span>
                      <span className="font-medium block">
                        {format(new Date(selectedInstallment.due_date), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right block">المبلغ المدفوع</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedInstallment.amount - selectedInstallment.paid_amount}
                      value={paymentFormData.paid_amount || ''}
                      onChange={(e) => setPaymentFormData(prev => ({ 
                        ...prev, 
                        paid_amount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="أدخل المبلغ المدفوع"
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-right block">طريقة الدفع</Label>
                    <Select 
                      value={paymentFormData.payment_method} 
                      onValueChange={(value: 'cash' | 'card' | 'bank_transfer') => 
                        setPaymentFormData(prev => ({ ...prev, payment_method: value }))
                      }
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="card">بطاقة ائتمان</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-right block">صندوق المال</Label>
                  <Select 
                    value={paymentFormData.money_box_id} 
                    onValueChange={(value: string) => {
                      setPaymentFormData(prev => {
                        const newData = { ...prev, money_box_id: value };
                        return newData;
                      });
                    }}
                    required
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر صندوق المال" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_box">صندوق النقد</SelectItem>
                      {moneyBoxes.map((moneyBox) => {
                        return (
                          <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                            {moneyBox.name} - الرصيد: {moneyBox.amount?.toLocaleString()}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {paymentFormData.money_box_id && paymentFormData.money_box_id !== 'cash_box' && (
                    <div className="mt-1">
                      {(() => {
                        const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === paymentFormData.money_box_id);
                        if (selectedMoneyBox) {
                          return (
                            <span className="text-green-500 text-sm">
                              ✓ سيتم إضافة {paymentFormData.paid_amount.toLocaleString()} دينار إلى {selectedMoneyBox.name}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  
                  {!paymentFormData.money_box_id && (
                    <div className="mt-1">
                      <span className="text-red-500 text-sm">
                        ⚠️ يجب اختيار صندوق المال
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-right block">ملاحظات</Label>
                  <Textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="ملاحظات اختيارية..."
                    className="text-right"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => closeModal('payment')}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={!paymentFormData.paid_amount || paymentFormData.paid_amount <= 0 || !paymentFormData.money_box_id}>
                    <DollarSign className="h-4 w-4 ml-2" />
                    تسجيل الدفع
                  </Button>
                </div>
              </form>
              
              {/* Receipt Information */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  معلومات الإيصال
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex justify-between">
                    <span>نوع الإيصال:</span>
                    <span className="font-medium">إيصال دفع قسط</span>
                  </div>
                  <div className="flex justify-between">
                    <span>العميل:</span>
                    <span className="font-medium">{selectedInstallment.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رقم الفاتورة:</span>
                    <span className="font-medium">{selectedInstallment.invoice_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الإيصال:</span>
                    <span className="font-medium">{format(new Date(), 'dd MMM yyyy', { locale: ar })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>طريقة الدفع:</span>
                    <span className="font-medium">
                      {paymentFormData.payment_method === 'cash' ? 'نقداً' : 
                       paymentFormData.payment_method === 'card' ? 'بطاقة ائتمان' : 'تحويل بنكي'}
                    </span>
                  </div>
                </div>
                
                {/* View Receipt Button */}
                {createdReceipt && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to customer receipts page with filter for this receipt
                        window.open(`/customer-receipts?receipt_number=${createdReceipt.receipt_number}`, '_blank');
                      }}
                      className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4 ml-2" />
                      عرض الإيصال في إيصالات العملاء
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

      {/* Create Installment Modal */}
        <Dialog open={modals.create} onOpenChange={() => closeModal('create')}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 justify-end">
              <Plus className="h-5 w-5" />
              {selectedInstallment ? 'تعديل القسط' : 'إضافة قسط جديد'}
            </DialogTitle>
            <DialogDescription className="text-right">
              {selectedInstallment ? 'يرجى تعديل البيانات المطلوبة.' : 'يرجى تعبئة جميع الحقول المطلوبة لإضافة قسط جديد.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">رقم الفاتورة</Label>
                <Input
                  type="number"
                  value={formData.sale_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sale_id: parseInt(e.target.value) || 0 }))}
                  placeholder="أدخل رقم الفاتورة"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">رقم العميل</Label>
                <Input
                  type="number"
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: parseInt(e.target.value) || 0 }))}
                  placeholder="أدخل رقم العميل"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">المبلغ</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="أدخل المبلغ"
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">طريقة الدفع</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value as 'cash' | 'card' | 'bank_transfer' }))}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-right">نقدي</SelectItem>
                    <SelectItem value="card" className="text-right">بطاقة ائتمان</SelectItem>
                    <SelectItem value="bank_transfer" className="text-right">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أضف ملاحظاتك هنا..."
                className="h-20 text-right"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                      closeModal('create');
                  setFormData({
                    sale_id: 0,
                    customer_id: 0,
                    due_date: format(new Date(), 'yyyy-MM-dd'),
                    amount: 0,
                    payment_method: 'cash',
                    notes: ''
                  });
                    setSelectedInstallment(null);
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary">
                    {selectedInstallment ? 'تحديث القسط' : 'إضافة القسط'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Installment Plan Modal */}
        <Dialog open={modals.plan} onOpenChange={() => closeModal('plan')}>
        <DialogContent className="sm:max-w-[90%] max-h-[90%] overflow-y-auto text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 justify-start">
              <ShoppingCart className="h-5 w-5" />
              إنشاء خطة أقساط جديدة
            </DialogTitle>
            <DialogDescription className="text-right">
              قم بإنشاء خطة أقساط جديدة بتحديد العميل والمنتجات وشروط السداد.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateInstallmentPlan} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="text-right block">اختيار العميل *</Label>
              <Select
                value={installmentPlanData.customer_id.toString()}
                onValueChange={(value) => setInstallmentPlanData(prev => ({ ...prev, customer_id: parseInt(value) }))}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر العميل..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id.toString()} className="text-right">
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Selection */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  onClick={addProduct}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة منتج
                </Button>
                <Label className="text-lg font-medium">المنتجات *</Label>
              </div>

              {installmentPlanData.selectedProducts.map((selectedProduct, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>المنتج</Label>
                      <Select
                        value={selectedProduct.product_id.toString()}
                        onValueChange={(value) => updateProduct(index, 'product_id', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنتج..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.current_stock > 0).map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} (المخزون: {product.current_stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedProduct.stock}
                        value={selectedProduct.quantity}
                        onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-right"
                      />
                      {selectedProduct.stock > 0 && (
                        <p className="text-xs text-gray-500">المتاح: {selectedProduct.stock}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>السعر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={selectedProduct.price}
                        onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>المجموع</Label>
                      <Input
                        type="text"
                        value={formatCurrency(selectedProduct.quantity * selectedProduct.price)}
                        disabled
                        className="text-right bg-gray-100"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeProduct(index)}
                      className="border-red-300 hover:bg-red-100"
                    >
                      <Minus className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Installment Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-right block">عدد الأشهر *</Label>
                <Select
                  value={installmentPlanData.installmentMonths.toString()}
                  onValueChange={(value) => setInstallmentPlanData(prev => ({ ...prev, installmentMonths: parseInt(value) }))}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر عدد الأشهر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3" className="text-right">3 أشهر</SelectItem>
                    <SelectItem value="4" className="text-right">4 أشهر</SelectItem>
                    <SelectItem value="5" className="text-right">5 أشهر</SelectItem>
                    <SelectItem value="6" className="text-right">6 أشهر</SelectItem>
                    <SelectItem value="7" className="text-right">7 أشهر</SelectItem>
                    <SelectItem value="8" className="text-right">8 أشهر</SelectItem>
                    <SelectItem value="9" className="text-right">9 أشهر</SelectItem>
                    <SelectItem value="10" className="text-right">10 أشهر</SelectItem>
                    <SelectItem value="11" className="text-right">11 شهر</SelectItem>
                    <SelectItem value="12" className="text-right">12 شهر</SelectItem>
                    <SelectItem value="13" className="text-right">13 شهر</SelectItem>
                    <SelectItem value="14" className="text-right">14 شهر</SelectItem>
                    <SelectItem value="15" className="text-right">15 شهر</SelectItem>
                    <SelectItem value="16" className="text-right">16 شهر</SelectItem>
                    <SelectItem value="17" className="text-right">17 شهر</SelectItem>
                    <SelectItem value="18" className="text-right">18 شهر</SelectItem>
                    <SelectItem value="19" className="text-right">19 شهر</SelectItem>
                    <SelectItem value="20" className="text-right">20 شهر</SelectItem>
                    <SelectItem value="21" className="text-right">21 شهر</SelectItem>
                    <SelectItem value="22" className="text-right">22 شهر</SelectItem>
                    <SelectItem value="23" className="text-right">23 شهر</SelectItem>
                    <SelectItem value="24" className="text-right">24 شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-right block">تاريخ أول قسط *</Label>
                <Input
                  type="date"
                  value={installmentPlanData.startingDueDate}
                  onChange={(e) => setInstallmentPlanData(prev => ({ ...prev, startingDueDate: e.target.value }))}
                  className="text-right"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">طريقة الدفع</Label>
                <Select
                  value={installmentPlanData.paymentMethod}
                  onValueChange={(value) => setInstallmentPlanData(prev => ({ ...prev, paymentMethod: value as 'cash' | 'card' | 'bank_transfer' }))}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-right">نقدي</SelectItem>
                    <SelectItem value="card" className="text-right">بطاقة ائتمان</SelectItem>
                    <SelectItem value="bank_transfer" className="text-right">تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total Summary */}
            {installmentPlanData.selectedProducts.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-right">
                    <div className="flex justify-between">
                      <span className="font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
                      <span>المجموع الكلي:</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-green-600">
                        {formatCurrency(calculateTotal() / installmentPlanData.installmentMonths)}
                      </span>
                      <span>قيمة القسط الشهري:</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-right block">ملاحظات</Label>
              <Textarea
                value={installmentPlanData.notes}
                onChange={(e) => setInstallmentPlanData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أضف ملاحظاتك هنا..."
                className="h-20 text-right"
              />
            </div>

            {/* Show plan creation error */}
            {planError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{planError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                  onClick={() => closeModal('plan')}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={planCreating}
              >
                {planCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جارٍ الإنشاء...
                  </>
                ) : (
                  'إنشاء خطة الأقساط'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

        {/* Delete Installment Modal */}
        <Dialog open={modals.delete} onOpenChange={() => closeModal('delete')}>
          <DialogContent className="sm:max-w-[425px] text-right">
            <DialogHeader>
              <DialogTitle>حذف القسط</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا القسط؟ هذا الإجراء غير قابل للتراجع.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <AlertDialogAction onClick={() => closeModal('delete')}>إلغاء</AlertDialogAction>
              <AlertDialogAction onClick={() => {
                if (selectedInstallment) {
                  handleDelete(selectedInstallment.id);
                }
                closeModal('delete');
              }}>حذف</AlertDialogAction>
            </div>
        </DialogContent>
      </Dialog>

        {/* Select Debts for Installment Modal */}
        <Dialog open={modals.selectDebt} onOpenChange={() => closeModal('selectDebt')}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto text-right">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 justify-end">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                تحويل ديون إلى أقساط
              </DialogTitle>
              <DialogDescription className="text-right">
                اختر الديون التي تريد تحويلها إلى أقساط. يمكنك تحديد أكثر من دين.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium text-gray-700">اختر العميل:</Label>
                </div>
                <Select
                  value={selectedCustomerForDebt.toString()}
                  onValueChange={(value) => handleCustomerDebtChange(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر العميل..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">جميع العملاء</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loading State */}
              {debtLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="mr-2 text-gray-600">جاري تحميل ديون العميل...</span>
                </div>
              )}

              {/* Debts List */}
              {selectedCustomerForDebt !== 0 && !debtLoading && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <Label className="text-sm font-medium text-gray-700">
                        الديون المتاحة ({customerDebts.length})
                      </Label>
                    </div>
                    {customerDebts.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllDebts}
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 ml-1" />
                          تحديد الكل
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDeselectAllDebts}
                          className="text-xs"
                        >
                          <X className="h-3 w-3 ml-1" />
                          إلغاء التحديد
                        </Button>
                      </div>
                    )}
                  </div>

                  {customerDebts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>لا توجد ديون متاحة لهذا العميل</p>
                      <p className="text-sm">جميع الديون مدفوعة أو محولة إلى أقساط</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-right border-separate border-spacing-y-1">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="py-2 px-3 text-sm font-medium text-gray-600 w-8">
                              <input
                                type="checkbox"
                                checked={selectedDebts.size === customerDebts.length && customerDebts.length > 0}
                                onChange={() => {
                                  if (selectedDebts.size === customerDebts.length) {
                                    handleDeselectAllDebts();
                                  } else {
                                    handleSelectAllDebts();
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">رقم الفاتورة</th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">المبلغ الكلي</th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">المبلغ المدفوع</th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">المبلغ المتبقي</th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">تاريخ الاستحقاق</th>
                            <th className="py-2 px-3 text-sm font-medium text-gray-600">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerDebts.map(debt => {
                            return (
                            <tr key={debt.debt_id || debt.sale_id} className="hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={selectedDebts.has(debt.debt_id || debt.sale_id)}
                                  onChange={() => handleDebtSelection(debt.debt_id || debt.sale_id)}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-700 font-medium">
                                {debt.invoice_no}
                              </td>
                              <td className="py-2 px-3 text-sm font-medium text-blue-700">
                                {formatCurrency(debt.total_amount)}
                              </td>
                              <td className="py-2 px-3 text-sm text-green-700">
                                {formatCurrency(debt.paid_amount)}
                              </td>
                              <td className="py-2 px-3 text-sm text-orange-700 font-medium">
                                {formatCurrency(debt.remaining_amount)}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-600">
                                {format(new Date(debt.due_date), 'dd MMM yyyy', { locale: ar })}
                              </td>
                              <td className="py-2 px-3">
                                <PaymentStatusBadge status={debt.status} />
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary and Actions */}
                  {selectedDebts.size > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-blue-800">
                          تم تحديد {selectedDebts.size} دين
                        </span>
                        <span className="text-sm font-medium text-blue-800">
                          إجمالي المبلغ: {formatCurrency(
                            customerDebts
                              .filter(debt => selectedDebts.has(debt.debt_id || debt.sale_id))
                              .reduce((sum, debt) => sum + debt.remaining_amount, 0)
                          )}
                        </span>
                      </div>
                      
                      {/* Installment Configuration */}
                      <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          إعدادات الأقساط
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">عدد الأشهر</Label>
                            <Select
                              value={installmentMonths.toString()}
                              onValueChange={(value) => setInstallmentMonths(parseInt(value))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="اختر عدد الأشهر" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 أشهر</SelectItem>
                                <SelectItem value="3">3 أشهر</SelectItem>
                                <SelectItem value="4">4 أشهر</SelectItem>
                                <SelectItem value="5">5 أشهر</SelectItem>
                                <SelectItem value="6">6 أشهر</SelectItem>
                                <SelectItem value="7">7 أشهر</SelectItem>
                                <SelectItem value="8">8 أشهر</SelectItem>
                                <SelectItem value="9">9 أشهر</SelectItem>
                                <SelectItem value="10">10 أشهر</SelectItem>
                                <SelectItem value="11">11 شهر</SelectItem>
                                <SelectItem value="12">12 شهر</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">تاريخ أول قسط</Label>
                            <Input
                              type="date"
                              value={startingDueDate}
                              onChange={(e) => setStartingDueDate(e.target.value)}
                              className="w-full"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">قيمة القسط الشهري</Label>
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(
                                customerDebts
                                  .filter(debt => selectedDebts.has(debt.id))
                                  .reduce((sum, debt) => sum + debt.remaining_amount, 0) / installmentMonths
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Installment Preview */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">معاينة الأقساط:</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            {Array.from({ length: Math.min(installmentMonths, 5) }, (_, i) => {
                              const dueDate = new Date(startingDueDate);
                              dueDate.setMonth(dueDate.getMonth() + i);
                              const installmentAmount = Math.ceil(
                                customerDebts
                                  .filter(debt => selectedDebts.has(debt.id))
                                  .reduce((sum, debt) => sum + debt.remaining_amount, 0) / installmentMonths
                              );
                              
                              return (
                                <div key={i} className="flex justify-between">
                                  <span>القسط {i + 1}:</span>
                                  <span>{format(dueDate, 'dd MMM yyyy', { locale: ar })}</span>
                                  <span>{formatCurrency(installmentAmount)}</span>
                                </div>
                              );
                            })}
                            {installmentMonths > 5 && (
                              <div className="text-gray-500 italic">
                                ... و {installmentMonths - 5} أقساط أخرى
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => closeModal('selectDebt')}>
                          إلغاء
                        </Button>
                        <Button
                          type="button"
                          onClick={handleConvertDebtsToInstallments}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 ml-2" />
                          تحويل الديون المحددة
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Installment Print View Modal */}
        <InstallmentPrintView
          plan={selectedPlanForPrint}
          open={modals.print}
          onClose={() => {
            setModals(prev => ({ ...prev, print: false }));
            setSelectedPlanForPrint(null);
          }}
        />
        </div>
      </div>
    </InstallmentsWrapper>
  );
};

export default Installments;