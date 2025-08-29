import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../app/store';
import { getSales, updateSale, deleteSale } from '@/features/sales/salesSlice';
import { getSale } from '@/features/sales/salesService';
import { fetchSaleBills } from '@/features/bills/billsSlice';
import { getCustomers } from '@/features/customers/customersSlice';
import { fetchSettings } from '@/features/settings/settingsSlice';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Printer,
  Download,
  Calendar,
  User,
  DollarSign,
  RotateCcw,
  MoreVertical
} from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BillReceipt from '@/components/BillReceipt';
import SaleEditModal from '@/components/SaleEditModal';
import ReturnDetails from '@/components/bills/ReturnDetails';
import { usePrintBill } from '@/hooks/usePrintBill';
import type { BillReceiptSale } from '@/types/bill';
import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
// import { CashBoxGuard } from '@/components/CashBoxGuard'; // Removed - using money boxes only

const Sales = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { items: sales, loading: salesLoading, error } = useSelector((state: RootState) => state.sales);
  const { saleBills } = useSelector((state: RootState) => state.bills);
  const { items: customers } = useSelector((state: RootState) => state.customers);
  const { data: settingsData } = useSelector((state: RootState) => state.settings);
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Check if current user is admin
  const isAdmin = user?.role === 'admin';
  
  // Permission checks for sales management
  const canViewSales = useSelector(selectHasPermission(PERMISSIONS.SALES_VIEW));
  const canAddSales = useSelector(selectHasPermission(PERMISSIONS.SALES_ADD));
  const canEditSales = useSelector(selectHasPermission(PERMISSIONS.SALES_EDIT));
  const canDeleteSales = useSelector(selectHasPermission(PERMISSIONS.SALES_DELETE));
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [filterReturns, setFilterReturns] = useState('all');
  
  // Add receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptSale, setReceiptSale] = useState<BillReceiptSale | null>(null);
  const [receiptCustomer, setReceiptCustomer] = useState<Customer | null>(null);
  
  // Add edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleData | null>(null);
  
  // Add return details modal state
  const [showReturnDetails, setShowReturnDetails] = useState(false);
  const [selectedSaleForReturns, setSelectedSaleForReturns] = useState<SaleData | null>(null);
  
  // Add delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleData | null>(null);
  
  // Add print hook
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Function to merge sales data with return information
  const getSalesWithReturns = () => {
    if (!saleBills || saleBills.length === 0) {
      return sales;
    }

    // Create a map of sales with return information
    const salesWithReturns = sales.map(sale => {
      const billWithReturns = saleBills.find(bill => bill.invoice_no === sale.invoice_no);
      if (billWithReturns) {
        return {
          ...sale,
          return_count: billWithReturns.return_count || 0,
          total_returned_amount: billWithReturns.total_returned_amount || 0,
          last_return_date: billWithReturns.last_return_date,
          returns: billWithReturns.returns || []
        };
      }
      return sale;
    });

    return salesWithReturns;
  };
  


  // Add settings loading effect
  useEffect(() => {
    dispatch(getSales({}));
    dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 1000 })); // Get all sales with return info
    dispatch(getCustomers({}));
    
    // Fetch settings if not already loaded
    if (!settingsData) {
      dispatch(fetchSettings());
    }
  }, [dispatch, settingsData]);

  // Function to transform SaleData to BillReceiptSale
  const transformToBillReceiptSale = (sale: SaleData): BillReceiptSale => {
    const items = (sale.items || []).map((item, index) => ({
      id: item.id || index,
      product_id: item.product_id || 0,
      product_name: item.product_name || item.product?.name || '',
      quantity: item.quantity,
      price: item.price,
      total: item.total || (item.price * item.quantity),
      unit: item.product?.unit || '',
      description: item.product?.description || ''
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    return {
      id: sale.id,
      bill_number: sale.invoice_no,
      barcode: sale.barcode || sale.invoice_no, // Use actual barcode from sale data, fallback to invoice number
      invoice_date: sale.invoice_date,
      created_at: sale.created_at,
      subtotal: subtotal,
      discount: sale.discount_amount || 0,
      tax: sale.tax_amount || 0,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      paid_amount: sale.paid_amount,
      remaining_amount: sale.remaining_amount || 0,
      created_by_name: sale.created_by_name,
      created_by_username: sale.created_by_username,
      items: items
    };
  };

  // Function to handle opening bill preview with complete sale data
  const handleOpenBillPreview = async (sale: SaleData) => {
    try {
      // Fetch complete sale data with items
      const response = await getSale(sale.id);
      if (response.success && response.data) {
        const completeSale = response.data;
        const customer = customers.find(c => c.id === completeSale.customer_id) || null;
        
        // Use printWithPreview to open in new window (same as Bills page)
        printWithPreview(completeSale as SaleData, customer);
      } else {
        toast.error('فشل في جلب تفاصيل المبيعة');
      }
    } catch (error: any) {
      console.error('Error fetching sale details:', error);
      toast.error(error.message || 'حدث خطأ أثناء جلب تفاصيل المبيعة');
    }
  };



  // Handle delete sale
  const handleDeleteSale = async (saleId: number) => {
    try {
      await dispatch(deleteSale(saleId)).unwrap();
      toast.success('تم حذف المبيعة بنجاح');
      setShowDeleteDialog(false);
      setSaleToDelete(null);
    } catch (error: any) {
      // Handle Arabic error message from backend
      if (error && typeof error === 'string') {
        toast.error(error);
      } else if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error('حدث خطأ أثناء حذف المبيعة');
      }
      console.error('Error deleting sale:', error);
    }
  };

  // Handle delete click
  const handleDeleteClick = (sale: SaleData) => {
    setSaleToDelete(sale);
    setShowDeleteDialog(true);
  };

  // Handle edit sale
  const handleEditSale = (sale: SaleData) => {
    setSelectedSale(sale);
    setShowEditModal(true);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    dispatch(getSales({})); // Refresh the sales list
  };

  // Handle view return details
  const handleViewReturnDetails = (sale: SaleData) => {
    setSelectedSaleForReturns(sale);
    setShowReturnDetails(true);
  };



  // Filter sales based on search term and filters
  const salesWithReturns = getSalesWithReturns();
  const filteredSales = salesWithReturns.filter(sale => {
    const customer = customers.find(c => c.id === sale.customer_id);
    const customerName = customer?.name || 'عميل  نقدي';
    
    const matchesSearch = (sale.invoice_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.barcode?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || sale.payment_status === filterStatus;
    
    const matchesDate = !dateFilter || (sale.invoice_date?.startsWith(dateFilter) || false);
    
    const matchesReturns = filterReturns === 'all' || 
                          (filterReturns === 'returned' && sale.return_count && sale.return_count > 0) ||
                          (filterReturns === 'partially_returned' && sale.status === 'partially_returned') ||
                          (filterReturns === 'no_returns' && (!sale.return_count || sale.return_count === 0));
    
    return matchesSearch && matchesStatus && matchesDate && matchesReturns;
  });

  if (salesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-w-full mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            إدارة المبيعات
          </h1>
          <p className="text-gray-600 mt-1">
            عرض وإدارة جميع عمليات البيع
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {canAddSales && (
            <Button 
              className="gap-2"
              onClick={() => navigate('/pos')}
            >
              <Plus className="w-4 h-4" />
              مبيعة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* Return Statistics Summary */}
      {salesWithReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              ملخص المرتجعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <RotateCcw className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">إجمالي المبيعات</div>
                  <div className="font-semibold text-blue-600">{salesWithReturns.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <RotateCcw className="w-6 h-6 text-red-600" />
                <div>
                  <div className="text-sm text-gray-600">المبيعات مع المرتجعات</div>
                  <div className="font-semibold text-red-600">
                    {salesWithReturns.filter(sale => sale.return_count && sale.return_count > 0).length}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">إجمالي المرتجع</div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(salesWithReturns.reduce((total, sale) => total + (sale.total_returned_amount || 0), 0))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
                <div>
                  <div className="text-sm text-gray-600">عدد المرتجعات</div>
                  <div className="font-semibold text-orange-600">
                    {salesWithReturns.reduce((total, sale) => total + (sale.return_count || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">البحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="البحث برقم الفاتورة، الباركود، أو اسم العميل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">حالة الدفع</Label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="paid">مدفوع</option>
                  <option value="partial">مدفوع جزئياً</option>
                  <option value="unpaid">غير مدفوع</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="returns-filter">المرتجعات</Label>
                <select
                  id="returns-filter"
                  value={filterReturns}
                  onChange={(e) => setFilterReturns(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">جميع المبيعات</option>
                  <option value="returned">مرجع كلياً</option>
                  <option value="partially_returned">مرجع جزئياً</option>
                  <option value="no_returns">بدون مرتجعات</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-filter">التاريخ</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterReturns('all');
                    setDateFilter('');
                  }}
                  className="w-full"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">{sales.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المبيعات المدفوعة</p>
                <p className="text-2xl font-bold text-green-600">
                  {sales.filter(s => s.payment_status === 'paid').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المبيعات المعلقة</p>
                <p className="text-2xl font-bold text-orange-600">
                  {sales.filter(s => s.payment_status === 'partial').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المرتجعات</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    {sales.filter(s => s.status === 'returned' || s.status === 'partially_returned').length}
                  </p>
                  <p className="text-xs text-gray-500">
                    {sales.filter(s => s.status === 'returned').length} مرجع كلي
                  </p>
                </div>
              </div>
              <RotateCcw className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0))}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            قائمة المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">الباركود</th>
                  <th className="text-right p-2">العميل</th>
                  <th className="text-right p-2">المستخدم</th>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">المبلغ الإجمالي</th>
                  <th className="text-right p-2">حالة الدفع</th>
                  <th className="text-right p-2">المرتجعات</th>
                  <th className="text-center p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-200 hover:text-primary">
                    <td className="p-2 font-mono text-sm">{sale.barcode || '-'}</td>
                    <td className="p-2">
                      {customers.find(c => c.id === sale.customer_id)?.name || 'عميل نقدي'}
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div className="font-medium">{sale.created_by_name || 'غير محدد'}</div>
                        <div className="text-gray-500 text-xs">{sale.created_by_username || ''}</div>
                      </div>
                    </td>
                    <td className="p-2">{formatDate(sale.invoice_date || '')}</td>
                    <td className="p-2">{formatCurrency(sale.total_amount || 0)}</td>
                    <td className="p-2">
                      <Badge 
                        variant={
                          sale.payment_status === 'paid' ? 'default' :
                          sale.payment_status === 'partial' ? 'secondary' : 'destructive'
                        }
                      >
                        {sale.payment_status === 'paid' ? 'مدفوع' :
                         sale.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {sale.return_count && sale.return_count > 0 ? (
                        <div 
                          className="space-y-1 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => handleViewReturnDetails(sale)}
                        >
                          <Badge variant="destructive" className="gap-1">
                            <RotateCcw className="w-3 h-3" />
                            {sale.return_count} إرجاع
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(sale.total_returned_amount || 0)}
                          </div>
                          {sale.last_return_date && (
                            <div className="text-xs text-gray-400">
                              آخر إرجاع: {formatDate(sale.last_return_date)}
                            </div>
                          )}
                          <div className="text-xs text-blue-600 mt-1">
                            انقر لعرض التفاصيل
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">لا توجد مرتجعات</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-2 bg-gray-200 hover:bg-gray-600 hover:text-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">فتح القائمة</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-40 ml-12 rtl">
                            <DropdownMenuItem
                              onClick={() => navigate(`/sales/${sale.id}`)}
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer border-b border-gray-100"
                            >
                              <Eye className="ml-2 h-4 w-4 text-blue-600" />
                              <span>عرض</span>
                            </DropdownMenuItem>
                            {canViewSales && (
                              <DropdownMenuItem
                                onClick={() => handleOpenBillPreview(sale)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <Eye className="ml-2 h-4 w-4 text-green-600" />
                                <span>طباعة ومعاينة</span>
                              </DropdownMenuItem>
                            )}
                            {canEditSales && (
                              <DropdownMenuItem
                                onClick={() => handleEditSale(sale)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <Edit className="ml-2 h-4 w-4 text-blue-600" />
                                <span>تعديل</span>
                              </DropdownMenuItem>
                            )}
                            {canEditSales && sale.status !== 'returned' && (
                              <DropdownMenuItem
                                onClick={() => handleEditSale(sale)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer border-b border-gray-100"
                              >
                                <RotateCcw className="ml-2 h-4 w-4 text-orange-600" />
                                <span>إرجاع</span>
                              </DropdownMenuItem>
                            )}
                            {canDeleteSales && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(sale)}
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="ml-2 h-4 w-4" />
                                <span>حذف</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSales.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">لا توجد مبيعات</p>
                <p>لا توجد مبيعات تطابق معايير البحث الحالية</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Modal with Full Settings Support */}
      <BillReceipt
        sale={receiptSale}
        customer={receiptCustomer}
        settings={settingsData}
        open={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setReceiptSale(null);
          setReceiptCustomer(null);
        }}
      />

      {/* Edit Modal */}
      <SaleEditModal
        sale={selectedSale}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSale(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Return Details Modal */}
      {selectedSaleForReturns && (
        <Dialog open={showReturnDetails} onOpenChange={setShowReturnDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                تفاصيل المرتجعات - {selectedSaleForReturns.invoice_no}
              </DialogTitle>
            </DialogHeader>
            <ReturnDetails
              returns={selectedSaleForReturns.returns || []}
              totalReturnedAmount={selectedSaleForReturns.total_returned_amount || 0}
              returnCount={selectedSaleForReturns.return_count || 0}
              lastReturnDate={selectedSaleForReturns.last_return_date}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المبيعة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saleToDelete && handleDeleteSale(saleToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>
  );
};

export default Sales;
