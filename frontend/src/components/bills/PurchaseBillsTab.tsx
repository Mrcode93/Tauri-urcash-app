import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { deletePurchase, fetchPurchaseBills, fetchPurchaseBillById } from '../../features/bills/billsSlice';
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
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '../../lib/toast';
import { usePrintBill } from '../../hooks/usePrintBill';
import BillPrintModal from './BillPrintModal';
import PurchaseDetailsModal from './PurchaseDetailsModal';
import { printPurchaseWithPreview } from '../../utils/printPurchaseUtils';
import { useSettings } from '../../features/settings/useSettings';
// TODO: Create EditPurchaseModal component
// import EditPurchaseModal from './EditPurchaseModal';

const PurchaseBillsTab: React.FC = () => {
  const dispatch = useDispatch();
  const billsState = useSelector((state: RootState) => state.bills);
  const { 
    purchaseBills = [], 
    loading = { purchaseBills: false }, 
    error = { purchaseBills: null } 
  } = billsState || {};

  // Ensure purchaseBills is always an array
  const safePurchaseBills = Array.isArray(purchaseBills) ? purchaseBills : [];

  // Debug logging
  

  // Load purchases data on component mount
  useEffect(() => {
    dispatch(fetchPurchaseBills({ filters: {}, page: 1, limit: 20 }) as any);
  }, [dispatch]);

  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Get settings for printing
  const { settings } = useSettings();

  // Add enhanced print functionality
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  // Handle view purchase details
  const handleViewPurchase = async (purchase: any) => {
    try {
      // Fetch complete purchase details including items
      const result = await dispatch(fetchPurchaseBillById(purchase.id) as any);
      if (result.payload) {
        setSelectedPurchase(result.payload);
        setShowDetailsModal(true);
      } else {
        // Fallback to basic purchase data if detailed fetch fails
        setSelectedPurchase(purchase);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      // Fallback to basic purchase data
      setSelectedPurchase(purchase);
      setShowDetailsModal(true);
    }
  };

  // Handle edit purchase
  const handleEditPurchase = (purchase: any) => {
    setSelectedPurchase(purchase);
    setShowEditModal(true);
  };

  // Handle delete purchase
  const handleDeletePurchase = (purchase: any) => {
    setPurchaseToDelete(purchase);
    setShowDeleteDialog(true);
  };

  // Handle print purchase with full settings integration (same as Sales page)
  const handlePrintPurchase = (purchase: any) => {
    try {
      const supplier = { id: purchase.supplier_id, name: purchase.supplier_name };
      setSelectedPurchase(purchase);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error preparing purchase for printing:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحضير فاتورة الشراء للطباعة",
        variant: "destructive",
      });
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!purchaseToDelete) return;

    try {
      await dispatch(deletePurchase(purchaseToDelete.id) as any);
      toast({
        title: "نجح",
        description: "تم حذف فاتورة الشراء بنجاح",
      });
      // Refresh the purchases list
      dispatch(fetchPurchaseBills({ filters: {}, page: 1, limit: 20 }) as any);
      setShowDeleteDialog(false);
      setPurchaseToDelete(null);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف فاتورة الشراء",
        variant: "destructive",
      });
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    dispatch(fetchPurchaseBills({ filters: {}, page, limit: 20 }) as any);
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
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'غير محدد';
      return format(date, 'dd/MM/yyyy', { locale: ar });
    } catch (error) {
      return 'غير محدد';
    }
  };

  if (loading.purchaseBills) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Purchase Bills Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>المورد</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>الإرجاع</TableHead>
              <TableHead>حالة الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safePurchaseBills.length === 0 && (
              <TableRow key="no-purchases">
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  لا توجد فواتير شراء
                </TableCell>
              </TableRow>
            )}
            {safePurchaseBills.length > 0 && safePurchaseBills.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">
                  {purchase.invoice_no}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{purchase.supplier_name}</div>
                    <div className="text-sm text-gray-500">{purchase.supplier_phone}</div>
                  </div>
                </TableCell>
                <TableCell>{formatDate(purchase.invoice_date)}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(purchase.total_amount)}
                </TableCell>
                <TableCell>
                  {formatCurrency(purchase.paid_amount)}
                </TableCell>
                <TableCell>
                  {formatCurrency(purchase.total_amount - purchase.paid_amount)}
                </TableCell>
                <TableCell>
                  {purchase.return_count && purchase.return_count > 0 ? (
                    <div className="flex flex-col items-start">
                      <Badge variant="destructive" className="text-xs">
                        {purchase.return_count} إرجاع
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(purchase.total_returned_amount || 0)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">لا يوجد</span>
                  )}
                </TableCell>
                <TableCell>
                  {getPaymentStatusBadge(purchase.payment_status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPurchase(purchase)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPurchase(purchase)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePurchase(purchase)}
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
                         <DropdownMenuItem onClick={async () => {
                           try {
                             // Fetch complete purchase details including items
                             const result = await dispatch(fetchPurchaseBillById(purchase.id) as any);
                             const completePurchase = result.payload || purchase;
                             const supplier = { id: purchase.supplier_id, name: purchase.supplier_name };
                             printPurchaseWithPreview(completePurchase, supplier, settings, 'a4');
                           } catch (error) {
                             console.error('Error fetching purchase details for printing:', error);
                             // Fallback to basic purchase data
                             const supplier = { id: purchase.supplier_id, name: purchase.supplier_name };
                             printPurchaseWithPreview(purchase, supplier, settings, 'a4');
                           }
                         }}>
                           <Eye className="w-4 h-4 mr-2" />
                           معاينة وطباعة
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Not available for purchases slice */}
      {safePurchaseBills.length > 0 && (
        <div className="flex items-center justify-center">
          <div className="text-sm text-gray-700">
            عرض {safePurchaseBills.length} نتيجة
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        purchase={selectedPurchase}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />

      {/* Edit Purchase Modal - TODO: Create modal component */}

      {/* Print Modal */}
      <BillPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        bill={selectedPurchase}
        billType="purchase"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف فاتورة الشراء رقم {purchaseToDelete?.invoice_no}؟
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

export default PurchaseBillsTab; 