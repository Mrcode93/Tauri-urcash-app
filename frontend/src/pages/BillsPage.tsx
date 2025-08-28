import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../app/store';
import { 
  fetchSaleBills,
  fetchPurchaseBills,
  fetchReturnBills,
  fetchBillsStatistics,
  fetchPurchasesStatistics,
  fetchReturnsStatistics,
  setReturnBillsFilters,
  clearAllBills
} from '../features/bills/billsSlice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  FileText,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import SaleBillsTab from '../components/bills/SaleBillsTab';
import PurchaseBillsTab from '../components/bills/PurchaseBillsTab';
import ReturnBillsTab from '../components/bills/ReturnBillsTab';
import CreateReturnBillModal from '../components/bills/CreateReturnBillModal';
import CreateEnhancedSaleBillModal from '../components/bills/CreateEnhancedSaleBillModal';
import CreatePurchaseInvoiceModal from '../components/bills/CreatePurchaseInvoiceModal';
import { CashBoxGuard } from '../components/CashBoxGuard';

const BillsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get data from bills state (which includes return information)
  const billsState = useSelector((state: RootState) => state.bills);
  
  const { 
    saleBills = [],
    purchaseBills = [],
    returnBills = [],
    billsStatistics,
    purchasesStatistics,
    returnsStatistics,
    loading = { saleBills: false, purchaseBills: false, returnBills: false },
    error = { saleBills: null, purchaseBills: null, returnBills: null },
    filters = { saleBills: {}, purchaseBills: {}, returnBills: {} }
  } = billsState || {};

  // Ensure arrays are always arrays
  const safeSaleBills = Array.isArray(saleBills) ? saleBills : [];
  const safePurchaseBills = Array.isArray(purchaseBills) ? purchaseBills : [];
  const safeReturnBills = Array.isArray(returnBills) ? returnBills : [];

  // Debug logging
  

  const [activeTab, setActiveTab] = useState('sale');
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [showCreatePurchaseModal, setShowCreatePurchaseModal] = useState(false);
  const [showCreateReturnModal, setShowCreateReturnModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [billTypeFilter, setBillTypeFilter] = useState('all');

  // Load initial data
  useEffect(() => {
    // Clear any existing state and reload fresh data
    // Add a small delay to ensure state is cleared
    const loadData = async () => {
      // Clear state first
      dispatch(clearAllBills());
      
             // Then load fresh data
       await Promise.all([
         dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 20 })),
         dispatch(fetchPurchaseBills({ filters: {}, page: 1, limit: 20 })),
         dispatch(fetchReturnBills({ filters: {}, page: 1, limit: 20 }))
       ]);
      
      dispatch(fetchBillsStatistics({}));
      dispatch(fetchPurchasesStatistics({}));
      dispatch(fetchReturnsStatistics({}));
    };
    
    loadData();
  }, [dispatch]);

  // Handle search
  const handleSearch = () => {
    const newFilters = {
      search: searchTerm,
      date_from: dateFrom?.toISOString().split('T')[0],
      date_to: dateTo?.toISOString().split('T')[0],
      payment_status: statusFilter === 'all' ? undefined : statusFilter,
      bill_type: billTypeFilter === 'all' ? undefined : billTypeFilter as 'retail' | 'wholesale'
    };

         if (activeTab === 'sale') {
       dispatch(fetchSaleBills({ filters: newFilters, page: 1, limit: 20 }));
     } else if (activeTab === 'purchase') {
       dispatch(fetchPurchaseBills({ filters: newFilters, page: 1, limit: 20 }));
     } else if (activeTab === 'return') {
       dispatch(setReturnBillsFilters(newFilters));
       dispatch(fetchReturnBills({ filters: newFilters, page: 1, limit: 20 }));
     }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatusFilter('all');
    setBillTypeFilter('all');
    
         // Force reload data for the selected tab
     if (value === 'sale') {
       dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 20 }));
     } else if (value === 'purchase') {
       dispatch(fetchPurchaseBills({ filters: {}, page: 1, limit: 20 }));
     } else if (value === 'return') {
       dispatch(fetchReturnBills({ filters: {}, page: 1, limit: 20 }));
     }
  };

  // Handle successful bill creation
  const handleBillCreated = () => {
    // Refresh data after creating a new bill based on active tab
    if (activeTab === 'sale') {
      dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 20 }));
      dispatch(fetchBillsStatistics({}));
    } else if (activeTab === 'purchase') {
      dispatch(fetchPurchaseBills({ filters: {}, page: 1, limit: 20 }));
      dispatch(fetchPurchasesStatistics({}));
    } else if (activeTab === 'return') {
      dispatch(fetchReturnBills({ filters: {}, page: 1, limit: 20 }));
      dispatch(fetchReturnsStatistics({}));
    }
  };

  // Get current statistics
  const getCurrentStatistics = () => {
    switch (activeTab) {
      case 'sale':
        return billsStatistics;
      case 'purchase':
        return purchasesStatistics;
      case 'return':
        return returnsStatistics;
      default:
        return null;
    }
  };

  const stats = getCurrentStatistics();



  return (
    <CashBoxGuard operationType="إنشاء الفواتير">
      <div className="min-w-full mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الفواتير</h1>
          <p className="text-gray-600 mt-2">إدارة فواتير البيع والشراء والإرجاع</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'sale' && (
            <Button onClick={() => setShowCreateSaleModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              فاتورة بيع جديدة
            </Button>
          )}
          {activeTab === 'purchase' && (
            <Button onClick={() => setShowCreatePurchaseModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              فاتورة شراء جديدة
            </Button>
          )}
          {activeTab === 'return' && (
            <Button onClick={() => setShowCreateReturnModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              فاتورة إرجاع جديدة
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeTab === 'sale' && stats.total_bills}
                {activeTab === 'purchase' && stats.total_purchases}
                {activeTab === 'return' && stats.total_returns}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_amount?.toLocaleString('ar-IQ')} د.ع
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المدفوع</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total_paid?.toLocaleString('ar-IQ')} د.ع
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المتبقي</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {activeTab === 'return' 
                  ? stats.total_refunded?.toLocaleString('ar-IQ')
                  : stats.total_unpaid?.toLocaleString('ar-IQ')
                } د.ع
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="البحث في الفواتير..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'yyyy-MM-dd') : 'من تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'yyyy-MM-dd') : 'إلى تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="حالة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeTab === 'sale' && (
              <div>
                <Select value={billTypeFilter} onValueChange={setBillTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع الفاتورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="retail">مفرد (بيع بالتجزئة)</SelectItem>
                    <SelectItem value="wholesale">جملة (بيع بالجملة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              بحث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sale" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            فواتير البيع
            <Badge variant="secondary">{safeSaleBills.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            فواتير الشراء
            <Badge variant="secondary">{safePurchaseBills.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="return" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            فواتير الإرجاع
            <Badge variant="secondary">{safeReturnBills.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sale" className="space-y-4">
          <SaleBillsTab />
        </TabsContent>

        <TabsContent value="purchase" className="space-y-4">
          <PurchaseBillsTab />
        </TabsContent>

        <TabsContent value="return" className="space-y-4">
          <ReturnBillsTab />
        </TabsContent>
      </Tabs>

             {/* Modals */}
       <CreateReturnBillModal
         open={showCreateReturnModal}
         onOpenChange={setShowCreateReturnModal}
         onBillCreated={handleBillCreated}
       />
       
       <CreateEnhancedSaleBillModal
         open={showCreateSaleModal}
         onOpenChange={setShowCreateSaleModal}
         onBillCreated={handleBillCreated}
       />

       <CreatePurchaseInvoiceModal
         open={showCreatePurchaseModal}
         onOpenChange={setShowCreatePurchaseModal}
         onBillCreated={handleBillCreated}
       />

      {/* Error handling will be done in useEffect */}
      </div>
    </CashBoxGuard>
  );
};

export default BillsPage; 