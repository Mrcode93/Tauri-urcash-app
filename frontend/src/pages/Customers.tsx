import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { getCustomers, deleteCustomer } from '@/features/customers/customersSlice';
import { toast } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Eye, ChevronLeft, ChevronRight, User, DollarSign, Building, CreditCard, Phone } from "lucide-react";
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Customer } from '@/features/customers/customersService';
import CustomerForm from '@/components/CustomerForm';
import CustomerDetailsModal from '@/components/CustomerDetailsModal';
import { CustomersWrapper } from '@/components/PremiumFeatureWrapper';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/utils';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';

const Customers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: customers = [], loading: isLoading, error, pagination } = useSelector((state: RootState) => state.customers);
  
  // Permission checks for customers management
  const canViewCustomers = useSelector(selectHasPermission(PERMISSIONS.CUSTOMERS_VIEW));
  const canAddCustomers = useSelector(selectHasPermission(PERMISSIONS.CUSTOMERS_ADD));
  const canEditCustomers = useSelector(selectHasPermission(PERMISSIONS.CUSTOMERS_EDIT));
  const canDeleteCustomers = useSelector(selectHasPermission(PERMISSIONS.CUSTOMERS_DELETE));
  
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Load customers with pagination and search
  const loadCustomers = useCallback(async (page: number = 1, search: string = '') => {
    try {
      await dispatch(getCustomers({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        exclude_anonymous: true
      })).unwrap();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'حدث خطأ أثناء جلب بيانات العملاء');
    }
  }, [dispatch, pageSize]);

  // Initial load
  useEffect(() => {
    loadCustomers(1);
  }, [loadCustomers]);

  // Handle search changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when searching
    loadCustomers(1, debouncedSearch);
  }, [debouncedSearch, loadCustomers]);

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    loadCustomers(newPage, debouncedSearch);
  }, [loadCustomers, debouncedSearch]);

  // Memoized search input to prevent focus loss
  const SearchInput = useMemo(() => (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <Input
        type="text"
        placeholder="ابحث عن اسم، بريد إلكتروني، رقم هاتف، أو عنوان..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        dir="rtl"
      />
    </div>
  ), [searchQuery]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setCustomerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      dispatch(deleteCustomer(customerToDelete))
        .unwrap()
        .then(() => {
          toast.success('تم حذف العميل بنجاح');
          loadCustomers(currentPage, debouncedSearch);
        })
        .catch((error) => {
          toast.error(error?.message || 'حدث خطأ أثناء حذف العميل');
        });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case 'retail':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">تجزئة</Badge>;
      case 'wholesale':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">جملة</Badge>;
      case 'vip':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">VIP</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge className="bg-green-100 text-green-800 border border-green-200">نشط</Badge> :
      <Badge className="bg-red-100 text-red-800 border border-red-200">غير نشط</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-600">جاري تحميل العملاء...</span>
      </div>
    );
  }

  return (
    <CustomersWrapper>
      <div className="min-w-full mx-auto px-4 py-8">
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {canAddCustomers && (
          <CustomerForm
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                setEditingCustomer(null);
              }
            }}
            editingCustomer={editingCustomer}
            onSuccess={() => {
              loadCustomers(currentPage, debouncedSearch);
            }}
          />
        )}

        {canViewCustomers && (
          <CustomerDetailsModal
            open={detailsModalOpen}
            onOpenChange={(open) => {
              setDetailsModalOpen(open);
              if (!open) {
                setSelectedCustomer(null);
              }
            }}
            customer={selectedCustomer}
          />
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">العملاء</h1>
          {canAddCustomers && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              إضافة عميل جديد
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          {SearchInput}
        </div>

        <div className="overflow-x-auto rounded-2xl shadow-md bg-white mb-8">
          <table className="min-w-full text-right border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الاسم</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">نوع العميل</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">رقم الهاتف</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">البريد الإلكتروني</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">حد الائتمان</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الرصيد الحالي</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الحالة</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers && customers.length > 0 ? (
                customers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                  >
                    <td className="py-3 px-4 font-medium whitespace-normal break-words">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        {customer.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      {getCustomerTypeBadge(customer.customer_type || 'retail')}
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        {customer.phone || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      {customer.email || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-gray-500" />
                        {customer.credit_limit ? formatCurrency(customer.credit_limit) : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-500" />
                        <span className={customer.current_balance && customer.current_balance < 0 ? 'text-red-600 font-medium' : ''}>
                          {customer.current_balance ? formatCurrency(customer.current_balance) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-normal break-words">
                      {getStatusBadge(customer.is_active ?? true)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end">
                        {canViewCustomers && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="border-gray-300 hover:bg-blue-100" onClick={() => handleViewDetails(customer)}>
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>عرض التفاصيل والديون والأقساط</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {canEditCustomers && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="border-gray-300 hover:bg-green-100" onClick={() => handleEdit(customer)}>
                                  <Pencil className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>تعديل العميل</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {canDeleteCustomers && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="border-gray-300 hover:bg-red-100" onClick={() => handleDelete(customer.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>حذف العميل</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    لا توجد عملاء لعرضها
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CustomersWrapper>
  );
};

export default Customers;
