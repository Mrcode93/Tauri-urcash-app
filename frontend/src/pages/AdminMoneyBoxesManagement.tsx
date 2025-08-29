import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import {
  fetchAllMoneyBoxes,
  fetchAllMoneyBoxesSummary,
  fetchMoneyBoxTransactions,
  fetchMoneyBoxSummary,
  addMoneyBoxTransaction,
  transferBetweenMoneyBoxes,
  clearError,
  clearSuccessMessage,
  clearSelectedMoneyBox,
  setSelectedMoneyBox
} from '@/features/moneyBoxes/moneyBoxesSlice';
import {
  MoneyBox,
  MoneyBoxTransaction,
  MoneyBoxSummary,
  AllMoneyBoxesSummary,
  AddTransactionData,
  TransferData
} from '@/services/moneyBoxesService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  X, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  RefreshCw,
  AlertCircle,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Coins,
  Wallet,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import CreateMoneyBoxModal from '@/components/CreateMoneyBoxModal';
import MoneyBoxActions from '@/components/MoneyBoxActions';

const AdminMoneyBoxesManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const {
    moneyBoxes,
    allMoneyBoxesSummary,
    selectedMoneyBox,
    selectedMoneyBoxTransactions,
    selectedMoneyBoxSummary,
    loading,
    error,
    successMessage
  } = useSelector((state: RootState) => state.moneyBoxes);

  // Debug log to see state changes
  console.log('AdminMoneyBoxesManagement - moneyBoxes count:', moneyBoxes.length);

  const [createMoneyBoxDialog, setCreateMoneyBoxDialog] = useState(false);
  const [moneyBoxDetailsDialog, setMoneyBoxDetailsDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [addTransactionDialog, setAddTransactionDialog] = useState(false);
  const [selectedMoneyBoxForAction, setSelectedMoneyBoxForAction] = useState<MoneyBox | null>(null);
  
  // Transfer state
  const [transferData, setTransferData] = useState({
    fromBoxId: 0,
    toBoxId: 0,
    amount: 0,
    notes: ''
  });

  // Transaction state
  const [transactionData, setTransactionData] = useState({
    type_: 'deposit' as 'deposit' | 'withdraw',
    amount: 0,
    notes: ''
  });

  useEffect(() => {
    dispatch(fetchAllMoneyBoxes());
    dispatch(fetchAllMoneyBoxesSummary());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      console.error('MoneyBoxes Error:', error);
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearSuccessMessage());
    }
  }, [successMessage, dispatch]);

  const openMoneyBoxDetailsDialog = async (moneyBox: MoneyBox) => {
    setSelectedMoneyBoxForAction(moneyBox);
    dispatch(setSelectedMoneyBox(moneyBox));
    await dispatch(fetchMoneyBoxSummary(moneyBox.id)).unwrap();
    await dispatch(fetchMoneyBoxTransactions({ id: moneyBox.id, limit: 50 })).unwrap();
    setMoneyBoxDetailsDialog(true);
  };

  const openTransferDialog = (moneyBox: MoneyBox) => {
    setSelectedMoneyBoxForAction(moneyBox);
    setTransferData({
      fromBoxId: moneyBox.id,
      toBoxId: 0,
      amount: 0,
      notes: ''
    });
    setTransferDialog(true);
  };

  const openAddTransactionDialog = (moneyBox: MoneyBox) => {
    setSelectedMoneyBoxForAction(moneyBox);
    setTransactionData({
      type_: 'deposit',
      amount: 0,
      notes: ''
    });
    setAddTransactionDialog(true);
  };

  const handleTransfer = async () => {
    if (!transferData.fromBoxId || !transferData.toBoxId || transferData.amount <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      await dispatch(transferBetweenMoneyBoxes({
        fromBoxId: transferData.fromBoxId,
        toBoxId: transferData.toBoxId,
        amount: transferData.amount,
        notes: transferData.notes
      })).unwrap();
      
      setTransferDialog(false);
      setTransferData({
        fromBoxId: 0,
        toBoxId: 0,
        amount: 0,
        notes: ''
      });
      toast.success('تم التحويل بنجاح');
      
      // Refresh data
      dispatch(fetchAllMoneyBoxes());
      dispatch(fetchAllMoneyBoxesSummary());
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التحويل');
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedMoneyBoxForAction || transactionData.amount <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      await dispatch(addMoneyBoxTransaction({
        id: selectedMoneyBoxForAction.id,

        data: {
          type_: transactionData.type_,
          amount: transactionData.amount,
          notes: transactionData.notes
        }
      })).unwrap();
      
      setAddTransactionDialog(false);
      setTransactionData({
        type_: 'deposit',
        amount: 0,
        notes: ''
      });
      toast.success('تم إضافة العملية بنجاح');
      
      // Refresh data
      dispatch(fetchAllMoneyBoxes());
      dispatch(fetchAllMoneyBoxesSummary());
      if (selectedMoneyBoxForAction) {
        dispatch(fetchMoneyBoxSummary(selectedMoneyBoxForAction.id));
        dispatch(fetchMoneyBoxTransactions({ id: selectedMoneyBoxForAction.id, limit: 50 }));
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة العملية');
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer_in':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      case 'transfer_out':
        return <ArrowRightLeft className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'إيداع';
      case 'withdrawal':
        return 'سحب';
      case 'transfer_in':
        return 'تحويل وارد';
      case 'transfer_out':
        return 'تحويل صادر';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الصناديق</h1>
          <p className="text-gray-600 mt-2">إدارة صناديق المال والعمليات المالية</p>
        </div>
        <Button onClick={() => setCreateMoneyBoxDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إضافة صندوق جديد
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الصناديق</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moneyBoxes.length}</div>
            <p className="text-xs text-muted-foreground">صندوق</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(allMoneyBoxesSummary?.total_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">دينار عراقي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الصناديق النشطة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moneyBoxes.length}
            </div>
            <p className="text-xs text-muted-foreground">صندوق نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">آخر تحديث</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              -
            </div>
            <p className="text-xs text-muted-foreground">تاريخ</p>
          </CardContent>
        </Card>
      </div>

      {/* Money Boxes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            صناديق المال
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">جاري التحميل...</span>
            </div>
          ) : moneyBoxes.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد صناديق مالية</h3>
              <p className="text-gray-600 mb-4">ابدأ بإنشاء صندوق مالي جديد</p>
              <Button onClick={() => setCreateMoneyBoxDialog(true)}>
                إضافة صندوق جديد
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الصندوق</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الرصيد الحالي</TableHead>
                  <TableHead>العملة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>العمليات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moneyBoxes.map((moneyBox) => (
                  <TableRow key={moneyBox.id}>
                    <TableCell className="font-medium">{moneyBox.name}</TableCell>
                    <TableCell>{moneyBox.notes || '-'}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(moneyBox.balance)}
                    </TableCell>
                    <TableCell>IQD</TableCell>
                    <TableCell>
                      <Badge variant="default">نشط</Badge>
                    </TableCell>
                    <TableCell>{formatDate(moneyBox.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMoneyBoxDetailsDialog(moneyBox)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddTransactionDialog(moneyBox)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTransferDialog(moneyBox)}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Money Box Dialog */}
      <CreateMoneyBoxModal
        open={createMoneyBoxDialog}
        onOpenChange={setCreateMoneyBoxDialog}
        onSuccess={() => {
          dispatch(fetchAllMoneyBoxes());
          dispatch(fetchAllMoneyBoxesSummary());
        }}
      />

      {/* Money Box Details Dialog */}
      <Dialog open={moneyBoxDetailsDialog} onOpenChange={(open) => {
        setMoneyBoxDetailsDialog(open);
        if (!open) {
          dispatch(clearSelectedMoneyBox());
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              تفاصيل صندوق المال
            </DialogTitle>
          </DialogHeader>
          
          {selectedMoneyBox && selectedMoneyBoxSummary && (
            <div className="space-y-6">
              {/* Money Box Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">معلومات الصندوق</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">الاسم:</span>
                      <span>{selectedMoneyBox.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">الوصف:</span>
                      <span>{selectedMoneyBox.notes || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">العملة:</span>
                      
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">الحالة:</span>
                      <Badge variant="default">
                        نشط
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملخص مالي</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">الرصيد الحالي:</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(selectedMoneyBox.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">إجمالي الإيداعات:</span>
                      <span className="text-green-600">
                        {formatCurrency(selectedMoneyBoxSummary.total_deposits)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">إجمالي السحوبات:</span>
                      <span className="text-red-600">
                        {formatCurrency(selectedMoneyBoxSummary.total_withdrawals)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">عدد العمليات:</span>
                      <span>{selectedMoneyBoxSummary.total_transactions}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">آخر العمليات</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedMoneyBoxTransactions.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      لا توجد عمليات لهذا الصندوق
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>النوع</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>الوصف</TableHead>
                          <TableHead>التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMoneyBoxTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionTypeIcon(transaction.type)}
                                {getTransactionTypeText(transaction.type)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>{transaction.notes || '-'}</TableCell>
                            <TableCell>{formatDate(transaction.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحويل بين الصناديق</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>من صندوق</Label>
              <Input
                value={moneyBoxes.find(box => box.id === transferData.fromBoxId)?.name || ''}
                disabled
              />
            </div>
            
            <div>
              <Label>إلى صندوق</Label>
              <Select
                value={transferData.toBoxId.toString()}
                onValueChange={(value) => setTransferData(prev => ({ ...prev, toBoxId: parseInt(value) || 0 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصندوق الهدف" />
                </SelectTrigger>
                <SelectContent>
                  {moneyBoxes
                    .filter(box => box.id !== transferData.fromBoxId)
                    .map((moneyBox) => (
                      <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                        {moneyBox.name} - {formatCurrency(moneyBox.balance)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>المبلغ</Label>
              <Input
                type="number"
                value={transferData.amount}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="أدخل المبلغ"
              />
            </div>
            
            <div>
              <Label>الوصف</Label>
              <Input
                value={transferData.notes}
                onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="وصف التحويل"
              />
            </div>
            
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={transferData.notes}
                onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleTransfer}>
              تأكيد التحويل
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={addTransactionDialog} onOpenChange={setAddTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة عملية جديدة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>نوع العملية</Label>
              <Select
                value={transactionData.transaction_type}
                onValueChange={(value) => setTransactionData(prev => ({ ...prev, transaction_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>المبلغ</Label>
              <Input
                type="number"
                value={transactionData.amount}
                onChange={(e) => setTransactionData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="أدخل المبلغ"
              />
            </div>
            
            <div>
              <Label>الوصف</Label>
              <Input
                value={transactionData.description}
                onChange={(e) => setTransactionData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف العملية"
              />
            </div>
            
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={transactionData.notes}
                onChange={(e) => setTransactionData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddTransactionDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddTransaction}>
              إضافة العملية
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMoneyBoxesManagement;
