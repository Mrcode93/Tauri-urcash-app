import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';
import {
  fetchUserCashBox,
  fetchCashBoxSummary,
  fetchCashBoxSettings,
  fetchCashBoxHistory,
  fetchCashBoxTransactions,
  openCashBox,
  closeCashBox,
  transferToMoneyBox,
  addManualTransaction,
  updateCashBoxSettings,
  clearError,
  clearSuccessMessage,
  CashBox,
  CashBoxTransaction,
  CashBoxSettings
} from '@/features/cashBox/cashBoxSlice';
import { fetchAllMoneyBoxes } from '@/features/moneyBoxes/moneyBoxesSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Plus, 
  X, 
  Settings, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  ArrowRightLeft
} from 'lucide-react';

const CashBoxManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const {
    currentCashBox,
    cashBoxSummary,
    cashBoxSettings,
    cashBoxHistory,
    transactions,
    loading,
    error,
    successMessage
  } = useSelector((state: RootState) => state.cashBox);
  
  const { moneyBoxes } = useSelector((state: RootState) => state.moneyBoxes);
  
  // Permission checks for cash box management
  const canManageCashBox = useSelector(selectHasPermission(PERMISSIONS.CASHBOX_MANAGE));
  const canViewCashBox = useSelector(selectHasPermission(PERMISSIONS.CASHBOX_VIEW));
  const canAddCashBox = useSelector(selectHasPermission(PERMISSIONS.CASHBOX_ADD));
  const canEditCashBox = useSelector(selectHasPermission(PERMISSIONS.CASHBOX_EDIT));
  const canDeleteCashBox = useSelector(selectHasPermission(PERMISSIONS.CASHBOX_DELETE));

  const [openCashBoxDialog, setOpenCashBoxDialog] = useState(false);
  const [closeCashBoxDialog, setCloseCashBoxDialog] = useState(false);
  const [transactionDialog, setTransactionDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [forceCloseDialog, setForceCloseDialog] = useState(false);
  const [selectedCashBox, setSelectedCashBox] = useState<CashBox | null>(null);

  // Form states
  const [openingAmount, setOpeningAmount] = useState(0);
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedMoneyBox, setSelectedMoneyBox] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState(0);
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [forceCloseReason, setForceCloseReason] = useState('');

  // Settings form
  const [settings, setSettings] = useState<Partial<CashBoxSettings>>({});

  useEffect(() => {
    dispatch(fetchUserCashBox());
    dispatch(fetchCashBoxSummary());
    dispatch(fetchCashBoxSettings());
    dispatch(fetchCashBoxHistory());
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  useEffect(() => {
    if (currentCashBox) {
      dispatch(fetchCashBoxTransactions({ cashBoxId: currentCashBox.id }));
    }
  }, [dispatch, currentCashBox]);

  useEffect(() => {
    if (error) {
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

  useEffect(() => {
    if (cashBoxSettings) {
      setSettings(cashBoxSettings);
    }
  }, [cashBoxSettings]);

  const handleOpenCashBox = async () => {
    try {
      await dispatch(openCashBox({ openingAmount, notes: openingNotes })).unwrap();
      setOpenCashBoxDialog(false);
      setOpeningAmount(0);
      setOpeningNotes('');
      dispatch(fetchCashBoxSummary());
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const handleOpenCloseDialog = () => {
    if (currentCashBox) {
      setClosingAmount(currentCashBox.current_amount);
      // Auto-set transfer amount if cash box has money
      if (currentCashBox.current_amount > 0) {
        setTransferAmount(currentCashBox.current_amount);
      }
    }
    setCloseCashBoxDialog(true);
  };

  const handleCloseCashBox = async () => {
    try {
      // Validate transfer requirements when cash box has money
      if (currentCashBox && currentCashBox.current_amount > 0) {
        if (!selectedMoneyBox) {
          toast.error('يجب اختيار صندوق المال الوجهة');
          return;
        }
        
        if (transferAmount <= 0) {
          toast.error('يجب إدخال مبلغ التحويل');
          return;
        }
        
        if (transferAmount > currentCashBox.current_amount) {
          toast.error('مبلغ التحويل لا يمكن أن يتجاوز الرصيد المتاح');
          return;
        }

        // Perform transfer
        await dispatch(transferToMoneyBox({
          cashBoxId: currentCashBox.id,
          amount: transferAmount,
          targetType: 'custom_money_box',
          targetMoneyBox: selectedMoneyBox,
          notes: `تحويل عند إغلاق الصندوق: ${closingNotes}`
        })).unwrap();
      }

      await dispatch(closeCashBox({ closingAmount, notes: closingNotes })).unwrap();
      setCloseCashBoxDialog(false);
      setClosingAmount(0);
      setClosingNotes('');
      
      // Reset transfer states
      setTransferAmount(0);
      setSelectedMoneyBox('');
      
      dispatch(fetchCashBoxSummary());
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const handleAddTransaction = async () => {
    if (!currentCashBox) return;

    try {
      await dispatch(addManualTransaction({
        cashBoxId: currentCashBox.id,
        transactionType,
        amount: transactionAmount,
        description: transactionDescription,
        notes: transactionNotes
      })).unwrap();
      setTransactionDialog(false);
      setTransactionAmount(0);
      setTransactionDescription('');
      setTransactionNotes('');
      dispatch(fetchCashBoxTransactions({ cashBoxId: currentCashBox.id }));
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await dispatch(updateCashBoxSettings(settings)).unwrap();
      setSettingsDialog(false);
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'sale':
      case 'customer_receipt':
      case 'purchase_return':
      case 'opening':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
      case 'purchase':
      case 'expense':
      case 'supplier_payment':
      case 'sale_return':
      case 'closing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'adjustment':
        return <Settings className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionTypeLabel = (transaction: CashBoxTransaction) => {
    // Check reference_type first for debt and installment
    if (transaction.reference_type === 'debt') return 'سداد دين';
    if (transaction.reference_type === 'installment') return 'سداد قسط';
    
    // Then check transaction_type for others
    switch (transaction.transaction_type) {
      case 'opening': return 'فتح الصندوق';
      case 'closing': return 'إغلاق الصندوق';
      case 'deposit': return 'إيداع';
      case 'withdrawal': return 'سحب';
      case 'sale': return 'مبيعات';
      case 'purchase': return 'مشتريات';
      case 'expense': return 'مصروفات';
      case 'customer_receipt': return 'إيصال عميل';
      case 'supplier_payment': return 'دفع مورد';
      case 'sale_return': return 'إرجاع مبيعات';
      case 'purchase_return': return 'إرجاع مشتريات';
      case 'adjustment': return 'تعديل';
      default: return transaction.transaction_type;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'open') {
      return <Badge className="bg-green-100 text-green-800">مفتوح</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">مغلق</Badge>;
  };

  return (
    <div className="min-w-full mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">إدارة الصندوق</h1>
        </div>
        <div className="flex gap-2">
          {!currentCashBox && canManageCashBox && canAddCashBox && (
            <Dialog open={openCashBoxDialog} onOpenChange={setOpenCashBoxDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  فتح الصندوق
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>فتح الصندوق</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="openingAmount">المبلغ الابتدائي</Label>
                    <Input
                      id="openingAmount"
                      type="number"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="openingNotes">ملاحظات</Label>
                    <Textarea
                      id="openingNotes"
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                      placeholder="ملاحظات اختيارية..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenCashBoxDialog(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleOpenCashBox} disabled={loading}>
                      فتح الصندوق
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {currentCashBox && canManageCashBox && canEditCashBox && (
            <>
              <Dialog open={transactionDialog} onOpenChange={setTransactionDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة معاملة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة معاملة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transactionType">نوع المعاملة</Label>
                      <Select value={transactionType} onValueChange={(value: string) => setTransactionType(value as 'deposit' | 'withdrawal' | 'adjustment')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">إيداع</SelectItem>
                          <SelectItem value="withdrawal">سحب</SelectItem>
                          <SelectItem value="adjustment">تعديل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="transactionAmount">المبلغ</Label>
                      <Input
                        id="transactionAmount"
                        type="number"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="transactionDescription">الوصف</Label>
                      <Input
                        id="transactionDescription"
                        value={transactionDescription}
                        onChange={(e) => setTransactionDescription(e.target.value)}
                        placeholder="وصف المعاملة..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="transactionNotes">ملاحظات</Label>
                      <Textarea
                        id="transactionNotes"
                        value={transactionNotes}
                        onChange={(e) => setTransactionNotes(e.target.value)}
                        placeholder="ملاحظات اختيارية..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setTransactionDialog(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleAddTransaction} disabled={loading}>
                        إضافة المعاملة
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={closeCashBoxDialog} onOpenChange={(open) => {
                setCloseCashBoxDialog(open);
                if (!open) {
                  // Reset form when dialog is closed
                  setClosingAmount(0);
                  setClosingNotes('');
                  setTransferAmount(0);
                  setSelectedMoneyBox('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="destructive" onClick={handleOpenCloseDialog}>
                    <X className="h-4 w-4 mr-2" />
                    إغلاق الصندوق
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إغلاق الصندوق</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="closingAmount">المبلغ النهائي</Label>
                      <Input
                        id="closingAmount"
                        type="number"
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(Number(e.target.value))}
                        placeholder="0"
                      />
                      {currentCashBox && (
                        <p className="text-xs text-gray-500 mt-1">
                          الرصيد الحالي: {formatCurrency(currentCashBox.current_amount)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="closingNotes">ملاحظات</Label>
                      <Textarea
                        id="closingNotes"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="ملاحظات اختيارية..."
                      />
                    </div>

                    {/* Transfer Options - Required when cash box has money */}
                    {currentCashBox && currentCashBox.current_amount > 0 && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="flex items-center gap-2 text-red-600">
                            <ArrowRightLeft className="h-4 w-4" />
                            <Label className="font-semibold">تحويل المال المتبقي إلى صندوق المال *</Label>
                          </div>
                        </div>
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                          <p>يجب اختيار صندوق المال لتحويل المال المتبقي إليه قبل إغلاق الصندوق</p>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>مبلغ التحويل</Label>
                              <Input
                                type="number"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(Number(e.target.value))}
                                placeholder="0"
                                max={currentCashBox.current_amount}
                              />
                              <p className="text-xs text-gray-500">
                                المبلغ المتاح: {formatCurrency(currentCashBox.current_amount)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-red-600">صندوق المال الوجهة *</Label>
                              <Select value={selectedMoneyBox} onValueChange={setSelectedMoneyBox}>
                                <SelectTrigger className={!selectedMoneyBox ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="اختر صندوق المال" />
                                </SelectTrigger>
                                <SelectContent>
                                  {moneyBoxes.map((moneyBox) => (
                                    <SelectItem key={moneyBox.id} value={moneyBox.name}>
                                      {moneyBox.name} - {formatCurrency(moneyBox.amount)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCloseCashBoxDialog(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleCloseCashBox} disabled={loading}>
                        إغلاق الصندوق
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                الإعدادات
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إعدادات الصندوق</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="defaultOpeningAmount">المبلغ الافتراضي لفتح الصندوق</Label>
                  <Input
                    id="defaultOpeningAmount"
                    type="number"
                    value={settings.default_opening_amount || 0}
                    onChange={(e) => setSettings({ ...settings, default_opening_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireOpeningAmount">إلزام مبلغ فتح الصندوق</Label>
                  <Switch
                    id="requireOpeningAmount"
                    checked={settings.require_opening_amount || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, require_opening_amount: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowNegativeBalance">السماح برصيد سالب</Label>
                  <Switch
                    id="allowNegativeBalance"
                    checked={settings.allow_negative_balance || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_negative_balance: checked })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxWithdrawalAmount">أقصى مبلغ للسحب</Label>
                  <Input
                    id="maxWithdrawalAmount"
                    type="number"
                    value={settings.max_withdrawal_amount || 0}
                    onChange={(e) => setSettings({ ...settings, max_withdrawal_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireApprovalForWithdrawal">تطلب موافقة للسحب</Label>
                  <Switch
                    id="requireApprovalForWithdrawal"
                    checked={settings.require_approval_for_withdrawal || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, require_approval_for_withdrawal: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoCloseAtEndOfDay">إغلاق تلقائي في نهاية اليوم</Label>
                  <Switch
                    id="autoCloseAtEndOfDay"
                    checked={settings.auto_close_at_end_of_day || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, auto_close_at_end_of_day: checked })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSettingsDialog(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleUpdateSettings} disabled={loading}>
                    حفظ الإعدادات
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Cash Box Status */}
      {currentCashBox && (
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              الصندوق مفتوح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">الرصيد الحالي</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentCashBox.current_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">المبلغ الابتدائي</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(currentCashBox.initial_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">تاريخ الفتح</p>
                <p className="text-lg font-semibold">
                  {formatDate(currentCashBox.opened_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">المعاملات اليوم</p>
                <p className="text-lg font-semibold">
                  {cashBoxSummary?.todayTransactions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentCashBox && cashBoxSummary && (
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              الصندوق مغلق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">لا يوجد صندوق مفتوح حالياً. قم بفتح صندوق جديد للبدء.</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">المعاملات</TabsTrigger>
          <TabsTrigger value="history">التاريخ</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {currentCashBox && (
            <Card>
              <CardHeader>
                <CardTitle>معاملات الصندوق الحالي</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الرصيد قبل</TableHead>
                      <TableHead>الرصيد بعد</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>المستخدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionTypeIcon(transaction.transaction_type)}
                            {getTransactionTypeLabel(transaction)}
                          </div>
                        </TableCell>
                        <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.balance_before)}</TableCell>
                        <TableCell>{formatCurrency(transaction.balance_after)}</TableCell>
                        <TableCell>{transaction.description || '-'}</TableCell>
                        <TableCell>{transaction.user_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تاريخ الصناديق</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الصندوق</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المبلغ الابتدائي</TableHead>
                    <TableHead>المبلغ النهائي</TableHead>
                    <TableHead>تاريخ الفتح</TableHead>
                    <TableHead>تاريخ الإغلاق</TableHead>
                    <TableHead>المستخدم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashBoxHistory.map((cashBox) => (
                    <TableRow key={cashBox.id}>
                      <TableCell>{cashBox.name}</TableCell>
                      <TableCell>{getStatusBadge(cashBox.status)}</TableCell>
                      <TableCell>{formatCurrency(cashBox.initial_amount)}</TableCell>
                      <TableCell>{formatCurrency(cashBox.current_amount)}</TableCell>
                      <TableCell>{formatDate(cashBox.opened_at)}</TableCell>
                      <TableCell>{cashBox.closed_at ? formatDate(cashBox.closed_at) : '-'}</TableCell>
                      <TableCell>{cashBox.user_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashBoxManagement; 