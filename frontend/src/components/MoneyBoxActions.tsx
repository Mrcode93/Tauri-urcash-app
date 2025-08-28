import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
// now lets made the logic of make المصروفات when made new one chose 
import { 
  updateMoneyBox, 
  deleteMoneyBox, 
  fetchMoneyBoxTransactions,
  fetchMoneyBoxSummary,
  clearError, 
  clearSuccessMessage 
} from '@/features/moneyBoxes/moneyBoxesSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { MoneyBox, MoneyBoxTransaction } from '@/services/moneyBoxesService';
import AddMoneyBoxTransactionModal from '@/components/AddMoneyBoxTransactionModal';
import TransferBetweenMoneyBoxesModal from '@/components/TransferBetweenMoneyBoxesModal';

interface MoneyBoxActionsProps {
  moneyBox: MoneyBox;
  moneyBoxes: MoneyBox[];
  onSuccess?: () => void;
  onViewDetails?: (moneyBox: MoneyBox) => void;
}

const MoneyBoxActions: React.FC<MoneyBoxActionsProps> = ({ 
  moneyBox, 
  moneyBoxes, 
  onSuccess,
  onViewDetails 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // State management
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<MoneyBoxTransaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: moneyBox.name,
    notes: moneyBox.notes || ''
  });

  // Handle edit money box
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editForm.name.trim()) {
      toast.error('اسم صندوق المال مطلوب');
      return;
    }

    setLoading(true);
    try {
      await dispatch(updateMoneyBox({
        id: moneyBox.id,
        data: {
          name: editForm.name.trim(),
          notes: editForm.notes.trim()
        }
      })).unwrap();
      
      toast.success('تم تحديث صندوق المال بنجاح');
      setEditDialog(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating money box:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث صندوق المال');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete money box
  const handleDelete = async () => {
    setLoading(true);
    try {
      await dispatch(deleteMoneyBox(moneyBox.id)).unwrap();
      toast.success('تم حذف صندوق المال بنجاح');
      setDeleteDialog(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting money box:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف صندوق المال');
    } finally {
      setLoading(false);
    }
  };

  // Handle view transactions
  const handleViewTransactions = async () => {
    
    setShowTransactions(true);
    
    setLoading(true);
    setTransactions([]);
    setSummary(null);
    
    try {
      const transactionsResult = await dispatch(fetchMoneyBoxTransactions({ id: moneyBox.id })).unwrap();
      const summaryResult = await dispatch(fetchMoneyBoxSummary(moneyBox.id)).unwrap();

      
      

      setTransactions(transactionsResult.transactions);
      setSummary(summaryResult);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error(error?.message || 'حدث خطأ أثناء جلب المعاملات');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'إيداع';
      case 'withdraw': return 'سحب';
      case 'transfer_in': return 'تحويل وارد';
      case 'transfer_out': return 'تحويل صادر';
      default: return type;
    }
  };

  const getTransactionTypeVariant = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return 'default';
      case 'withdraw':
      case 'transfer_out':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      {/* Action Buttons */}
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
              onClick={() => onViewDetails?.(moneyBox)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer border-b border-gray-100"
            >
              <Eye className="ml-2 h-4 w-4 text-blue-600" />
              <span>عرض التفاصيل</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDepositOpen(true)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer border-b border-gray-100"
            >
              <PlusCircle className="ml-2 h-4 w-4 text-green-600" />
              <span>إيداع</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setWithdrawOpen(true)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer border-b border-gray-100"
            >
              <MinusCircle className="ml-2 h-4 w-4 text-orange-600" />
              <span>سحب</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTransferOpen(true)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer border-b border-gray-100"
            >
              <ArrowRightLeft className="ml-2 h-4 w-4 text-purple-600" />
              <span>تحويل بين الصناديق</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setEditDialog(true)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer border-b border-gray-100"
            >
              <Edit className="ml-2 h-4 w-4 text-blue-600" />
              <span>تعديل</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteDialog(true)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="ml-2 h-4 w-4" />
              <span>حذف</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Transaction Modals */}
      <AddMoneyBoxTransactionModal
        moneyBox={moneyBox}
        type="deposit"
        open={depositOpen}
        onOpenChange={setDepositOpen}
        onSuccess={onSuccess}
      />
      <AddMoneyBoxTransactionModal
        moneyBox={moneyBox}
        type="withdraw"
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        onSuccess={onSuccess}
      />

      {/* Transfer Modal */}
      <TransferBetweenMoneyBoxesModal
        fromMoneyBox={moneyBox}
        moneyBoxes={moneyBoxes}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSuccess={onSuccess}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل صندوق المال</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم صندوق المال *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم صندوق المال"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات اختيارية"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialog(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={loading || !editForm.name.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  'تحديث صندوق المال'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف صندوق المال</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف صندوق المال "{moneyBox.name}"؟
              <br />
              <br />
              <div className="bg-red-50 p-3 rounded-md">
                <p className="text-sm font-medium text-red-800">تحذير:</p>
                <p className="text-sm text-red-700">لا يمكن التراجع عن هذا الإجراء. سيتم حذف صندوق المال وجميع معاملاته نهائياً.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                'حذف صندوق المال'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
          {/* Debug indicator */}
          <div className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded z-[10000]">
            MODAL IS RENDERED
          </div>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                معاملات صندوق المال: {moneyBox.name}
              </h2>
                              <div className="flex items-center gap-2">
                  <button 
                    onClick={handleViewTransactions}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700 p-1 disabled:opacity-50"
                    title="تحديث المعاملات"
                  >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">جاري تحميل المعاملات...</span>
                </div>
              )}

              {/* Content when loaded */}
              {!loading && summary && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600">الرصيد الحالي</p>
                          <p className="text-xl font-bold text-blue-800">
                            {formatCurrency(summary.statistics.current_balance)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">إجمالي الإيداعات</p>
                          <p className="text-xl font-bold text-green-800">
                            {formatCurrency(summary.statistics.total_deposits)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600">إجمالي السحوبات</p>
                          <p className="text-xl font-bold text-red-800">
                            {formatCurrency(summary.statistics.total_withdrawals)}
                          </p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-red-600" />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">عدد المعاملات</p>
                          <p className="text-xl font-bold text-gray-800">
                            {summary.statistics.total_transactions}
                          </p>
                        </div>
                        <ArrowRightLeft className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">المعاملات الأخيرة</h3>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>لا توجد معاملات</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>النوع</TableHead>
                              <TableHead>المبلغ</TableHead>
                              <TableHead>الرصيد بعد</TableHead>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>الملاحظات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  <Badge variant={getTransactionTypeVariant(transaction.type)}>
                                    {getTransactionTypeLabel(transaction.type)}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`font-semibold ${
                                  ['deposit', 'transfer_in'].includes(transaction.type)
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {['deposit', 'transfer_in'].includes(transaction.type) ? '+' : ''}
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell>{formatCurrency(transaction.balance_after)}</TableCell>
                                <TableCell>{formatDate(transaction.created_at)}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-sm">{transaction.notes || '-'}</p>
                                    {transaction.created_by_name && (
                                      <p className="text-xs text-gray-500">بواسطة: {transaction.created_by_name}</p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {!loading && !summary && (
                <div className="text-center py-8 text-gray-500">
                  <p>لا توجد بيانات للعرض أو حدث خطأ في التحميل</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewTransactions}
                    className="mt-2"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoneyBoxActions;