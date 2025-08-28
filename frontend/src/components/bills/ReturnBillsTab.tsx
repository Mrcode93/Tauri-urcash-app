import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { fetchReturnBills, deleteReturn } from '../../features/bills/billsSlice';
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
  MoreHorizontal,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '../../lib/toast';
import { usePrintBill } from '../../hooks/usePrintBill';
import BillPrintModal from './BillPrintModal';
import { printReturnWithPreview } from '../../utils/printReturnUtils';
import { useSettings } from '../../features/settings/useSettings';
// TODO: Create this modal component
// import ReturnDetailsModal from './ReturnDetailsModal';

const ReturnBillsTab: React.FC = () => {
  const dispatch = useDispatch();
  const billsState = useSelector((state: RootState) => state.bills);
  const { 
    returnBills = [], 
    returnBillsPagination = { page: 1, limit: 20, total: 0, totalPages: 0 }, 
    loading = { returnBills: false }, 
    error = { returnBills: null } 
  } = billsState || {};

  // Ensure returnBills is always an array
  const safeReturnBills = Array.isArray(returnBills) ? returnBills : [];

  // Debug logging
  

  // Debug individual return bill data
  if (safeReturnBills.length > 0) {
    
  }

  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Get settings for printing
  const { settings } = useSettings();

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Handle view return details
  const handleViewReturn = (returnBill: any) => {
    setSelectedReturn(returnBill);
    setShowDetailsModal(true);
  };

  // Handle delete return
  const handleDeleteReturn = (returnBill: any) => {
    setReturnToDelete(returnBill);
    setShowDeleteDialog(true);
  };

  // Handle print return with full settings integration (same as Sales page)
  const handlePrintReturn = (returnBill: any) => {
    try {
      const customer = { id: 0, name: returnBill.customer_name || returnBill.supplier_name || 'غير محدد' };
      setSelectedReturn(returnBill);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error preparing return bill for printing:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحضير فاتورة الإرجاع للطباعة",
        variant: "destructive",
      });
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!returnToDelete) return;

    try {
      await dispatch(deleteReturn(returnToDelete.id) as any);
      toast({
        title: "نجح",
        description: "تم حذف فاتورة الإرجاع بنجاح",
      });
      setShowDeleteDialog(false);
      setReturnToDelete(null);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف فاتورة الإرجاع",
        variant: "destructive",
      });
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    dispatch(fetchReturnBills({ page, limit: returnBillsPagination.limit }) as any);
  };

  // Get return status badge
  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ملغي</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'غير محدد';
    }
    try {
      return new Intl.NumberFormat('ar-IQ', {
        style: 'currency',
        currency: 'IQD'
      }).format(amount);
    } catch (error) {
      return 'غير محدد';
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return format(date, 'dd/MM/yyyy', { locale: ar });
    } catch (error) {
      return 'غير محدد';
    }
  };

  if (loading.returnBills) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Return Bills Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم فاتورة الإرجاع</TableHead>
              <TableHead>الفاتورة الأصلية</TableHead>
              <TableHead>تاريخ الفاتورة الأصلية</TableHead>
              <TableHead>العميل/المورد</TableHead>
              <TableHead>تاريخ الإرجاع</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>مبلغ الاسترداد</TableHead>
              <TableHead>سبب الإرجاع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeReturnBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  لا توجد فواتير إرجاع
                </TableCell>
              </TableRow>
            ) : (
              safeReturnBills.map((returnBill) => (
                <TableRow key={returnBill.id}>
                  <TableCell className="font-medium">
                    {returnBill.id}
                  </TableCell>
                  <TableCell>
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      {returnBill.original_invoice_no || 'غير محدد'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(returnBill.original_sale_date || returnBill.original_purchase_date)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{returnBill.customer_name || returnBill.supplier_name || 'غير محدد'}</div>
                      <div className="text-sm text-gray-500">
                        {returnBill.return_type === 'sale' ? 'عميل' : 'مورد'}
                        {returnBill.customer_phone && ` - ${returnBill.customer_phone}`}
                        {returnBill.supplier_phone && ` - ${returnBill.supplier_phone}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(returnBill.return_date)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(returnBill.total_amount || 0)}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(returnBill.refund_amount || returnBill.total_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={returnBill.reason || ''}>
                      {returnBill.reason || 'لا يوجد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {getReturnStatusBadge(returnBill.status)}
                      {returnBill.refund_method && (
                        <div className="text-xs text-gray-500 mt-1">
                          {returnBill.refund_method === 'cash' ? 'نقداً' : returnBill.refund_method}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReturn(returnBill)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReturn(returnBill)}
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
                           <DropdownMenuItem onClick={() => {
                             const customer = { id: 0, name: returnBill.customer_name || returnBill.supplier_name || 'غير محدد' };
                             printReturnWithPreview(returnBill, customer, settings, 'a4');
                           }}>
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

      {/* Pagination */}
      {returnBillsPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            عرض {((returnBillsPagination.page - 1) * returnBillsPagination.limit) + 1} إلى{' '}
            {Math.min(returnBillsPagination.page * returnBillsPagination.limit, returnBillsPagination.total)} من{' '}
            {returnBillsPagination.total} نتيجة
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(returnBillsPagination.page - 1)}
              disabled={returnBillsPagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              السابق
            </Button>
            <span className="text-sm">
              صفحة {returnBillsPagination.page} من {returnBillsPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(returnBillsPagination.page + 1)}
              disabled={returnBillsPagination.page === returnBillsPagination.totalPages}
            >
              التالي
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Return Details Modal - TODO: Create modal component */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
                              هل أنت متأكد من حذف فاتورة الإرجاع رقم {returnToDelete?.id}؟
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

export default ReturnBillsTab; 