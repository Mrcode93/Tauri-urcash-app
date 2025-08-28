import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { deleteBill, fetchSaleBills, fetchSaleBillById } from '../../features/bills/billsSlice';
import { getSaleBillById } from '../../features/bills/billsService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Printer,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '../../lib/toast';
import { usePrintBill } from '../../hooks/usePrintBill';
import BillPrintModal from './BillPrintModal';
import BillDetailsModal from './BillDetailsModal';
// TODO: Create EditBillModal component
// import EditBillModal from './EditBillModal';

const SaleBillsTab: React.FC = () => {
  const dispatch = useDispatch();
  const billsState = useSelector((state: RootState) => state.bills);
  const { 
    saleBills = [], 
    loading = { saleBills: false }, 
    error = { saleBills: null } 
  } = billsState || {};

  // Ensure saleBills is always an array
  const safeSaleBills = Array.isArray(saleBills) ? saleBills : [];

  // Debug logging
  

  // Load sales data on component mount
  useEffect(() => {
    dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 20 }) as any);
  }, [dispatch]);

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Handle view bill details
  const handleViewBill = async (bill: any) => {
    try {
      // Fetch complete bill details including items
      const result = await dispatch(fetchSaleBillById(bill.id) as any);
      if (result.payload) {
        setSelectedBill(result.payload);
        setShowDetailsModal(true);
      } else {
        // Fallback to basic bill data if detailed fetch fails
        setSelectedBill(bill);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching bill details:', error);
      // Fallback to basic bill data
      setSelectedBill(bill);
      setShowDetailsModal(true);
    }
  };

  // Handle edit bill
  const handleEditBill = (bill: any) => {
    setSelectedBill(bill);
    setShowEditModal(true);
  };

  // Handle delete bill
  const handleDeleteBill = (bill: any) => {
    setBillToDelete(bill);
    setShowDeleteDialog(true);
  };

  // Handle print bill with full settings integration (same as Sales page)
  const handlePrintBill = (bill: any) => {
    try {
      const customer = { id: bill.customer_id, name: bill.customer_name };
      setSelectedBill(bill);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error preparing bill for printing:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحضير الفاتورة للطباعة",
        variant: "destructive",
      });
    }
  };

  // Function to handle opening bill preview with complete sale data
  const handleOpenBillPreview = async (bill: any) => {
    try {
      // Fetch complete bill data with items
      const completeBill = await getSaleBillById(bill.id);
      if (completeBill) {
        const customer = { id: completeBill.customer_id, name: completeBill.customer_name };
        printWithPreview(completeBill, customer);
      } else {
        toast.error('فشل في جلب تفاصيل الفاتورة');
      }
    } catch (error: any) {
      console.error('Error fetching bill details:', error);
      toast.error(error.message || 'حدث خطأ أثناء جلب تفاصيل الفاتورة');
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!billToDelete) return;

    try {
      await dispatch(deleteBill(billToDelete.id) as any);
      toast({
        title: "نجح",
        description: "تم حذف الفاتورة بنجاح",
      });
      // Refresh the sales list
      dispatch(fetchSaleBills({ filters: {}, page: 1, limit: 20 }) as any);
      setShowDeleteDialog(false);
      setBillToDelete(null);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفاتورة",
        variant: "destructive",
      });
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    dispatch(fetchSaleBills({ filters: {}, page, limit: 20 }) as any);
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">غير مدفوع</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">مدفوع جزئياً</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'غير محدد';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ar });
    } catch (error) {
      return 'غير محدد';
    }
  };

  const getBillTypeBadge = (billType: string | null | undefined) => {
    switch (billType) {
      case 'retail':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">مفرد</Badge>;
      case 'wholesale':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">جملة</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  if (loading.saleBills) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bills Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>نوع الفاتورة</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>الإرجاع</TableHead>
              <TableHead>حالة الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeSaleBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  لا توجد فواتير بيع
                </TableCell>
              </TableRow>
            ) : (
              safeSaleBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">
                    {bill.invoice_no}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{bill.customer_name}</div>
                      <div className="text-sm text-gray-500">{bill.customer?.name || 'غير محدد'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(bill.invoice_date)}</TableCell>
                  <TableCell>
                    {getBillTypeBadge(bill.bill_type)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(bill.total_amount)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(bill.paid_amount)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(bill.total_amount - bill.paid_amount)}
                  </TableCell>
                  <TableCell>
                    {bill.return_count && bill.return_count > 0 ? (
                      <div className="flex flex-col items-start">
                        <Badge variant="destructive" className="text-xs">
                          {bill.return_count} إرجاع
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(bill.total_returned_amount || 0)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">لا يوجد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(bill.payment_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewBill(bill)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBill(bill)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBill(bill)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPrinting}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => handleOpenBillPreview(bill)}>
                             <Eye className="w-4 h-4 mr-2" />
                             معاينة وطباعة
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Not available for sales slice */}
      {safeSaleBills.length > 0 && (
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-700">
            عرض {safeSaleBills.length} نتيجة
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      <BillDetailsModal
        bill={selectedBill}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />

      {/* Edit Bill Modal - TODO: Create modal component */}

      {/* Print Modal */}
      <BillPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        bill={selectedBill}
        billType="sale"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
                              هل أنت متأكد من حذف الفاتورة رقم {billToDelete?.invoice_no}؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SaleBillsTab; 