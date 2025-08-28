import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import {
  fetchAllOpenCashBoxes,
  fetchAllUsersCashBoxHistory,
  fetchCashBoxDetails,
  fetchCashBoxTransactions,
  forceCloseCashBox,
  clearError,
  clearSuccessMessage,
  clearSelectedCashBoxDetails,
  CashBox,
  CashBoxTransaction
} from '@/features/cashBox/cashBoxSlice';
import {
  fetchAllMoneyBoxes,
  fetchAllMoneyBoxesSummary,
  fetchMoneyBoxTransactions,
  clearError as clearMoneyBoxesError,
  clearSuccessMessage as clearMoneyBoxesSuccessMessage,
} from '@/features/moneyBoxes/moneyBoxesSlice';
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
  Wallet
} from 'lucide-react';
import CreateMoneyBoxModal from '@/components/CreateMoneyBoxModal';
import MoneyBoxActions from '@/components/MoneyBoxActions';

const AdminCashBoxManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const {
    openCashBoxes,
    allUsersCashBoxHistory,
    selectedCashBoxDetails,
    transactions,
    loading,
    error,
    successMessage
  } = useSelector((state: RootState) => state.cashBox);

  // Debug log to see state changes
  console.log('AdminCashBoxManagement - openCashBoxes count:', openCashBoxes.length);

  const {
    moneyBoxes,
    allMoneyBoxesSummary,
    loading: moneyBoxesLoading,
    error: moneyBoxesError,
    successMessage: moneyBoxesSuccessMessage
  } = useSelector((state: RootState) => state.moneyBoxes);

  const [forceCloseDialog, setForceCloseDialog] = useState(false);
  const [selectedCashBox, setSelectedCashBox] = useState<CashBox | null>(null);
  const [forceCloseReason, setForceCloseReason] = useState('');
  const [forceCloseMoneyBoxId, setForceCloseMoneyBoxId] = useState('cash_box');
  const [cashBoxDetailsDialog, setCashBoxDetailsDialog] = useState(false);
  const [moneyBoxDetailsDialog, setMoneyBoxDetailsDialog] = useState(false);
  const [selectedMoneyBox, setSelectedMoneyBox] = useState<any>(null);
  const [moneyBoxTransactions, setMoneyBoxTransactions] = useState<any[]>([]);
  const [transactionFilter, setTransactionFilter] = useState('');

  useEffect(() => {
    dispatch(fetchAllOpenCashBoxes());
    dispatch(fetchAllUsersCashBoxHistory({ limit: 100 }));
    dispatch(fetchAllMoneyBoxes());
    dispatch(fetchAllMoneyBoxesSummary());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      console.error('CashBox Error:', error);
      
      // Handle validation errors
      if (typeof error === 'object' && error && 'errors' in error && Array.isArray((error as any).errors)) {
        const validationErrors = (error as any).errors;
        validationErrors.forEach((err: any) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(error);
      }
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
    if (moneyBoxesError) {
      console.error('MoneyBoxes Error:', moneyBoxesError);
      
      // Handle validation errors
      if (typeof moneyBoxesError === 'object' && moneyBoxesError && 'errors' in moneyBoxesError && Array.isArray((moneyBoxesError as any).errors)) {
        const validationErrors = (moneyBoxesError as any).errors;
        validationErrors.forEach((err: any) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(moneyBoxesError);
      }
      dispatch(clearMoneyBoxesError());
    }
  }, [moneyBoxesError, dispatch]);

  useEffect(() => {
    if (moneyBoxesSuccessMessage) {
      toast.success(moneyBoxesSuccessMessage);
      dispatch(clearMoneyBoxesSuccessMessage());
    }
  }, [moneyBoxesSuccessMessage, dispatch]);

  const handleForceClose = async () => {
    if (!selectedCashBox) return;

    // Validate reason is provided
    if (!forceCloseReason.trim()) {
      toast.error('سبب الإغلاق الإجباري مطلوب');
      return;
    }

    try {
      await dispatch(forceCloseCashBox({ 
        cashBoxId: selectedCashBox.id, 
        reason: forceCloseReason,
        moneyBoxId: forceCloseMoneyBoxId === 'cash_box' ? undefined : forceCloseMoneyBoxId
      })).unwrap();
      setForceCloseDialog(false);
      setSelectedCashBox(null);
      setForceCloseReason('');
      setForceCloseMoneyBoxId('cash_box');
      toast.success('تم إغلاق الصندوق إجبارياً بنجاح');
    } catch (error: any) {
      console.error('Error force closing cash box:', error);
      
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
        toast.error('حدث خطأ أثناء إغلاق الصندوق إجبارياً');
      }
    }
  };

  const openForceCloseDialog = (cashBox: CashBox) => {
    setSelectedCashBox(cashBox);
    setForceCloseDialog(true);
  };

  const openCashBoxDetailsDialog = async (cashBox: CashBox) => {
    try {
      await dispatch(fetchCashBoxDetails(cashBox.id)).unwrap();
      await dispatch(fetchCashBoxTransactions({ cashBoxId: cashBox.id, limit: 50 })).unwrap();
      setCashBoxDetailsDialog(true);
    } catch (error: any) {
      console.error('Error opening cash box details:', error);
      
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
        toast.error('حدث خطأ أثناء جلب تفاصيل الصندوق');
      }
    }
  };

  const openMoneyBoxDetailsDialog = async (moneyBox: any) => {
    try {
      setSelectedMoneyBox(moneyBox);
      setMoneyBoxDetailsDialog(true);
      
      // Fetch money box transactions
      const transactionsResult = await dispatch(fetchMoneyBoxTransactions({ id: moneyBox.id })).unwrap();
      setMoneyBoxTransactions(transactionsResult.transactions);
    } catch (error: any) {
      console.error('Error opening money box details:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء جلب تفاصيل صندوق المال');
      }
    }
  };

  const refreshData = () => {
    try {
      dispatch(fetchAllOpenCashBoxes());
      dispatch(fetchAllUsersCashBoxHistory({ limit: 100 }));
      dispatch(fetchAllMoneyBoxes());
      dispatch(fetchAllMoneyBoxesSummary());
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء تحديث البيانات');
      }
    }
  };

  return (
    <div className="min-w-full mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">إدارة الصناديق</h1>
        </div>
        <div className="flex gap-2">
          <CreateMoneyBoxModal onSuccess={refreshData} />
          <Button variant="outline" onClick={refreshData} disabled={loading || moneyBoxesLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || moneyBoxesLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الصناديق المفتوحة</p>
                <p className="text-2xl font-bold text-green-600">
                  {openCashBoxes.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(openCashBoxes.reduce((sum, box) => sum + box.current_amount, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">أقدم صندوق</p>
                <p className="text-lg font-semibold">
                  {openCashBoxes.length > 0 
                    ? formatDate(new Date(Math.min(...openCashBoxes.map(box => new Date(box.opened_at).getTime()))).toISOString())
                    : '-'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">المستخدمين النشطين</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(openCashBoxes.map(box => box.user_id)).size}
                </p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Money Boxes Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">صناديق المال</p>
                <p className="text-2xl font-bold text-purple-600">
                  {allMoneyBoxesSummary?.totalBoxes || 0}
                </p>
              </div>
              <Coins className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي أرصدة صناديق المال</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(allMoneyBoxesSummary?.totalBalance || 0)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الصندوق اليومي</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(moneyBoxes.find(box => box.name === 'الصندوق اليومي')?.amount || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">القاصة</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(moneyBoxes.find(box => box.name === 'القاصة')?.amount || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Cash Boxes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            الصناديق المفتوحة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openCashBoxes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد صناديق مفتوحة حالياً</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>اسم الصندوق</TableHead>
                  <TableHead>المبلغ الابتدائي</TableHead>
                  <TableHead>الرصيد الحالي</TableHead>
                  <TableHead>تاريخ الفتح</TableHead>
                  <TableHead>المدة المفتوحة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openCashBoxes.map((cashBox) => {
                  const openedDate = new Date(cashBox.opened_at);
                  const now = new Date();
                  const duration = now.getTime() - openedDate.getTime();
                  const hours = Math.floor(duration / (1000 * 60 * 60));
                  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <TableRow key={cashBox.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="font-medium">{cashBox.user_name}</p>
                            <p className="text-sm text-gray-500">{cashBox.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cashBox.name}</TableCell>
                      <TableCell>{formatCurrency(cashBox.initial_amount)}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          cashBox.current_amount >= cashBox.initial_amount 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(cashBox.current_amount)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(cashBox.opened_at)}</TableCell>
                      <TableCell>
                        <Badge variant={hours > 24 ? 'destructive' : hours > 12 ? 'secondary' : 'default'}>
                          {hours > 0 ? `${hours}س` : ''}{minutes > 0 ? `${minutes}د` : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCashBoxDetailsDialog(cashBox)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openForceCloseDialog(cashBox)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Money Boxes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            صناديق المال
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moneyBoxesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : moneyBoxes.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد صناديق مال</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم صندوق المال</TableHead>
                  <TableHead>الرصيد الحالي</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>أنشئ بواسطة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moneyBoxes.map((moneyBox) => (
                  <TableRow key={moneyBox.id}>
                    <TableCell>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{moneyBox.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        moneyBox.amount > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatCurrency(moneyBox.amount)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(moneyBox.created_at)}</TableCell>
                    <TableCell>{moneyBox.created_by_name || 'غير محدد'}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {moneyBox.notes || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MoneyBoxActions 
                        moneyBox={moneyBox} 
                        moneyBoxes={moneyBoxes}
                        onSuccess={refreshData}
                        onViewDetails={openMoneyBoxDetailsDialog}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Users Cash Box History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            تاريخ جميع صناديق المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : allUsersCashBoxHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-600">لا يوجد تاريخ للصناديق بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>اسم الصندوق</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المبلغ الابتدائي</TableHead>
                    <TableHead>المبلغ النهائي</TableHead>
                    <TableHead>تاريخ الفتح</TableHead>
                    <TableHead>تاريخ الإغلاق</TableHead>
                    <TableHead>فتح بواسطة</TableHead>
                    <TableHead>أغلق بواسطة</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsersCashBoxHistory.map((cashBox) => (
                    <TableRow key={cashBox.id}>
                      <TableCell>{cashBox.user_name} <span className="text-xs text-gray-400">({cashBox.username})</span></TableCell>
                      <TableCell>{cashBox.name}</TableCell>
                      <TableCell>{cashBox.status === 'open' ? <Badge variant="default">مفتوح</Badge> : <Badge variant="destructive">مغلق</Badge>}</TableCell>
                      <TableCell>{formatCurrency(cashBox.initial_amount)}</TableCell>
                      <TableCell>{formatCurrency(cashBox.current_amount)}</TableCell>
                      <TableCell>{formatDate(cashBox.opened_at)}</TableCell>
                      <TableCell>{cashBox.closed_at ? formatDate(cashBox.closed_at) : '-'}</TableCell>
                      <TableCell>{cashBox.opened_by_name || '-'}</TableCell>
                      <TableCell>{cashBox.closed_by_name || '-'}</TableCell>
                      <TableCell>{cashBox.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Force Close Dialog */}
      <AlertDialog open={forceCloseDialog} onOpenChange={setForceCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              إغلاق الصندوق إجبارياً
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إغلاق صندوق المستخدم{' '}
              <strong>{selectedCashBox?.user_name}</strong>؟
              <br />
              <br />
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium">تفاصيل الصندوق:</p>
                <p className="text-sm">الرصيد الحالي: {formatCurrency(selectedCashBox?.current_amount || 0)}</p>
                <p className="text-sm">تاريخ الفتح: {selectedCashBox?.opened_at ? formatDate(selectedCashBox.opened_at) : '-'}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="forceCloseReason">سبب الإغلاق الإجباري</Label>
              <Textarea
                id="forceCloseReason"
                value={forceCloseReason}
                onChange={(e) => setForceCloseReason(e.target.value)}
                placeholder="أدخل سبب الإغلاق الإجباري..."
                rows={3}
                className={!forceCloseReason.trim() ? 'border-red-500' : ''}
              />
              {!forceCloseReason.trim() && (
                <p className="text-sm text-red-500 mt-1">سبب الإغلاق الإجباري مطلوب</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="forceCloseMoneyBox">تحويل المال إلى صندوق المال</Label>
              <Select
                value={forceCloseMoneyBoxId}
                onValueChange={setForceCloseMoneyBoxId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر صندوق المال..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_box">الصندوق النقدي الرئيسي</SelectItem>
                  {moneyBoxes.map((moneyBox) => (
                    <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{moneyBox.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatCurrency(moneyBox.amount)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                سيتم تحويل الرصيد الحالي ({formatCurrency(selectedCashBox?.current_amount || 0)}) إلى الصندوق المختار
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceClose}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading || !forceCloseReason.trim()}
            >
              {loading ? 'جاري الإغلاق...' : 'إغلاق إجباري'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cash Box Details Dialog */}
      <Dialog open={cashBoxDetailsDialog} onOpenChange={(open) => {
        setCashBoxDetailsDialog(open);
        if (!open) {
          dispatch(clearSelectedCashBoxDetails());
        }
      }}>
        <DialogContent className="w-[90vw] h-[90vh] max-w-none max-h-none overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              تفاصيل الصندوق
            </DialogTitle>
          </DialogHeader>
          
          {selectedCashBoxDetails ? (
            <div className="space-y-6">
              {/* Cash Box Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">المستخدم</p>
                        <p className="font-semibold">{selectedCashBoxDetails.user_name}</p>
                        <p className="text-xs text-gray-500">{selectedCashBoxDetails.username}</p>
                      </div>
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">الرصيد الحالي</p>
                        <p className={`text-xl font-bold ${
                          selectedCashBoxDetails.current_amount >= selectedCashBoxDetails.initial_amount 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(selectedCashBoxDetails.current_amount)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">المبلغ الابتدائي</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(selectedCashBoxDetails.initial_amount)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Box Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معلومات الصندوق</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">اسم الصندوق</Label>
                      <p className="text-lg">{selectedCashBoxDetails.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">الحالة</Label>
                      <Badge variant={selectedCashBoxDetails.status === 'open' ? 'default' : 'destructive'}>
                        {selectedCashBoxDetails.status === 'open' ? 'مفتوح' : 'مغلق'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">تاريخ الفتح</Label>
                      <p className="text-lg">{formatDate(selectedCashBoxDetails.opened_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">فتح بواسطة</Label>
                      <p className="text-lg">{selectedCashBoxDetails.opened_by_name || 'غير محدد'}</p>
                    </div>
                    {selectedCashBoxDetails.closed_at && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">تاريخ الإغلاق</Label>
                          <p className="text-lg">{formatDate(selectedCashBoxDetails.closed_at)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">أغلق بواسطة</Label>
                          <p className="text-lg">{selectedCashBoxDetails.closed_by_name || 'غير محدد'}</p>
                        </div>
                      </>
                    )}
                    {selectedCashBoxDetails.notes && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">ملاحظات</Label>
                        <p className="text-lg bg-gray-50 p-3 rounded-md">{selectedCashBoxDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">المعاملات الأخيرة</CardTitle>
                </CardHeader>
                <CardContent>
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
                            <TableHead>الرصيد قبل</TableHead>
                            <TableHead>الرصيد بعد</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الوصف</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <Badge variant={
                                  ['deposit', 'sale', 'customer_receipt', 'purchase_return'].includes(transaction.transaction_type) 
                                    ? 'default' 
                                    : ['withdrawal', 'purchase', 'expense', 'supplier_payment', 'sale_return'].includes(transaction.transaction_type)
                                    ? 'destructive'
                                    : 'secondary'
                                }>
                                  {transaction.transaction_type === 'deposit' && 'إيداع'}
                                  {transaction.transaction_type === 'withdrawal' && 'سحب'}
                                  {transaction.transaction_type === 'sale' && 'مبيعات'}
                                  {transaction.transaction_type === 'purchase' && 'مشتريات'}
                                  {transaction.transaction_type === 'expense' && 'مصروفات'}
                                  {transaction.transaction_type === 'customer_receipt' && 'إيصال عميل'}
                                  {transaction.transaction_type === 'supplier_payment' && 'دفع مورد'}
                                  {transaction.transaction_type === 'sale_return' && 'إرجاع مبيعات'}
                                  {transaction.transaction_type === 'purchase_return' && 'إرجاع مشتريات'}
                                  {transaction.transaction_type === 'adjustment' && 'تعديل'}
                                  {transaction.transaction_type === 'opening' && 'فتح'}
                                  {transaction.transaction_type === 'closing' && 'إغلاق'}
                                  {transaction.reference_type === 'debt' && 'سداد دين'}
                                  {transaction.reference_type === 'installment' && 'سداد قسط'}
                                </Badge>
                              </TableCell>
                              <TableCell className={`font-semibold ${
                                ['deposit', 'sale', 'customer_receipt', 'purchase_return'].includes(transaction.transaction_type)
                                  ? 'text-green-600'
                                  : ['withdrawal', 'purchase', 'expense', 'supplier_payment', 'sale_return'].includes(transaction.transaction_type)
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}>
                                {['deposit', 'sale', 'customer_receipt', 'purchase_return'].includes(transaction.transaction_type) ? '+' : ''}
                                {formatCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell>{formatCurrency(transaction.balance_before)}</TableCell>
                              <TableCell>{formatCurrency(transaction.balance_after)}</TableCell>
                              <TableCell>{formatDate(transaction.created_at)}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{transaction.description || '-'}</p>
                                  {transaction.notes && (
                                    <p className="text-xs text-gray-500">{transaction.notes}</p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Money Box Details Dialog - Redesigned */}
      <Dialog open={moneyBoxDetailsDialog} onOpenChange={(open) => {
        setMoneyBoxDetailsDialog(open);
        if (!open) {
          setSelectedMoneyBox(null);
          setMoneyBoxTransactions([]);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Coins className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{selectedMoneyBox?.name}</div>
                  <div className="text-sm font-normal text-gray-500">تفاصيل صندوق المال</div>
                </div>
              </DialogTitle>
            </div>
          </DialogHeader>
          
          {selectedMoneyBox ? (
            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">


              <div className="space-y-6">
                {/* Money Box Information */}
                <div className="w-full">
                  <Card className="h-fit bg-white border-0  rounded-2xl">
                    
                    <CardContent className="p-6">
                      {/* Money Box Details Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Money Box Name */}
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                              <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">اسم صندوق المال</p>
                              <p className="text-lg font-bold text-gray-900">{selectedMoneyBox.name}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Creation Date */}
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600 rounded-lg">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">تاريخ الإنشاء</p>
                              <p className="text-sm font-semibold text-gray-900">{formatDate(selectedMoneyBox.created_at)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(selectedMoneyBox.created_at).toLocaleTimeString('ar-IQ', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Created By */}
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600 rounded-lg">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">أنشئ بواسطة</p>
                              <p className="text-sm font-semibold text-gray-900">{selectedMoneyBox.created_by_name || 'غير محدد'}</p>
                              {selectedMoneyBox.created_by && (
                                <p className="text-xs text-gray-500">ID: {selectedMoneyBox.created_by}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Notes */}
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-600 rounded-lg mt-1">
                              <AlertCircle className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                              <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                {selectedMoneyBox.notes || 'لا توجد ملاحظات'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Simple Analytics */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="p-2 bg-blue-600 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Current Balance */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {formatCurrency(selectedMoneyBox.amount)}
                            </div>
                            <div className="text-sm text-gray-600">الرصيد الحالي</div>
                          </div>
                          
                          {/* Total Transactions */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                              {moneyBoxTransactions.length}
                            </div>
                            <div className="text-sm text-gray-600">إجمالي المعاملات</div>
                          </div>
                          
                          {/* Average Transaction */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                              {moneyBoxTransactions.length > 0 
                                ? formatCurrency(moneyBoxTransactions.reduce((sum, t) => sum + t.amount, 0) / moneyBoxTransactions.length)
                                : formatCurrency(0)
                              }
                            </div>
                            <div className="text-sm text-gray-600">متوسط المعاملة</div>
                          </div>
                          
                          {/* Days Active */}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                              {Math.ceil((new Date().getTime() - new Date(selectedMoneyBox.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                            </div>
                            <div className="text-sm text-gray-600">أيام النشاط</div>
                          </div>
                        </div>
                      </div>


                    </CardContent>
                  </Card>
                </div>

                {/* Transactions Table */}
                <div className="w-full">
                  <Card className="bg-white border-0 shadow-xl rounded-2xl">
                    <CardHeader className="pb-6 border-b border-gray-100">
                      <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                        <div className="p-3 bg-green-600 rounded-2xl">
                          <ArrowRightLeft className="h-6 w-6 text-white" />
                        </div>
                        المعاملات الأخيرة
                        <div className="ml-auto flex items-center gap-4">
                          <div className="relative">
                            <Input
                              placeholder="البحث في المعاملات..."
                              value={transactionFilter}
                              onChange={(e) => setTransactionFilter(e.target.value)}
                              className="w-64 h-12 text-sm bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500/20 rounded-xl transition-all duration-200"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshData}
                            disabled={loading || moneyBoxesLoading}
                            className="h-12 w-12 p-0 bg-gray-50 border-gray-200 hover:bg-green-50 hover:border-green-300 rounded-xl transition-all duration-200"
                            title="تحديث المعاملات"
                          >
                            <RefreshCw className={`h-5 w-5 text-gray-600 ${(loading || moneyBoxesLoading) ? 'animate-spin' : ''}`} />
                          </Button>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 font-semibold px-4 py-2 rounded-xl">
                            {moneyBoxTransactions.filter(t => 
                              !transactionFilter || 
                              t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                              t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                              t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                            ).length} معاملة
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Transaction Summary */}
                      {moneyBoxTransactions.length > 0 && (
                        <div className="mb-6 p-6 bg-gray-50 rounded-2xl">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {moneyBoxTransactions.filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                ).length}
                              </div>
                              <div className="text-sm text-gray-600">المعاملات المعروضة</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(moneyBoxTransactions.filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                ).reduce((sum, t) => 
                                  ['deposit', 'transfer_in', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box'].includes(t.transaction_type) ? sum + t.amount : sum, 0
                                ))}
                              </div>
                              <div className="text-sm text-gray-600">إجمالي الإيداعات</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(moneyBoxTransactions.filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                ).reduce((sum, t) => 
                                  ['withdrawal', 'transfer_out', 'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank'].includes(t.transaction_type) ? sum + t.amount : sum, 0
                                ))}
                              </div>
                              <div className="text-sm text-gray-600">إجمالي السحوبات</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {formatCurrency(moneyBoxTransactions[moneyBoxTransactions.length - 1]?.balance_after || 0)}
                              </div>
                              <div className="text-sm text-gray-600">الرصيد الحالي</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {moneyBoxTransactions.filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                ).length > 0 ? formatDate(moneyBoxTransactions[0]?.created_at) : '-'}
                              </div>
                              <div className="text-sm text-gray-600">أول معاملة</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-indigo-600">
                                {moneyBoxTransactions.filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                ).length > 0 ? formatDate(moneyBoxTransactions[moneyBoxTransactions.length - 1]?.created_at) : '-'}
                              </div>
                              <div className="text-sm text-gray-600">آخر معاملة</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {moneyBoxTransactions.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <ArrowRightLeft className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-lg">لا توجد معاملات</p>
                          <p className="text-gray-400 text-sm">لم يتم تسجيل أي معاملات في هذا الصندوق بعد</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">النوع</TableHead>
                                <TableHead className="font-semibold">المبلغ</TableHead>
                                <TableHead className="font-semibold">الرصيد قبل</TableHead>
                                <TableHead className="font-semibold">الرصيد بعد</TableHead>
                                <TableHead className="font-semibold">التاريخ والوقت</TableHead>
                                <TableHead className="font-semibold">المستخدم</TableHead>
                                <TableHead className="font-semibold">الوصف والملاحظات</TableHead>
                                <TableHead className="font-semibold">المرجع</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {moneyBoxTransactions
                                .filter(t => 
                                  !transactionFilter || 
                                  t.notes?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.description?.toLowerCase().includes(transactionFilter.toLowerCase()) ||
                                  t.transaction_type?.toLowerCase().includes(transactionFilter.toLowerCase())
                                )
                                .map((transaction, index) => (
                                <TableRow 
                                  key={transaction.id} 
                                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-200 cursor-pointer`}
                                >
                                  <TableCell>
                                    <Badge variant={
                                      ['deposit', 'sale', 'customer_receipt', 'purchase_return', 'transfer_in', 'cash_box_transfer', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box'].includes(transaction.transaction_type) 
                                        ? 'default' 
                                        : ['withdrawal', 'purchase', 'expense', 'supplier_payment', 'sale_return', 'transfer_out', 'cash_box_closing', 'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank'].includes(transaction.transaction_type)
                                        ? 'destructive'
                                        : 'secondary'
                                    } className="font-medium">
                                      {transaction.transaction_type === 'deposit' && 'إيداع'}
                                      {transaction.transaction_type === 'withdraw' && 'سحب'}
                                      {transaction.transaction_type === 'withdrawal' && 'سحب'}
                                      {transaction.transaction_type === 'sale' && 'مبيعات'}
                                      {transaction.transaction_type === 'purchase' && 'مشتريات'}
                                      {transaction.transaction_type === 'expense' && 'مصروفات'}
                                      {transaction.transaction_type === 'customer_receipt' && 'إيصال عميل'}
                                      {transaction.transaction_type === 'supplier_payment' && 'دفع مورد'}
                                      {transaction.transaction_type === 'sale_return' && 'إرجاع مبيعات'}
                                      {transaction.transaction_type === 'purchase_return' && 'إرجاع مشتريات'}
                                      {transaction.transaction_type === 'transfer_in' && 'تحويل وارد'}
                                      {transaction.transaction_type === 'transfer_out' && 'تحويل صادر'}
                                      {transaction.transaction_type === 'cash_box_transfer' && 'تحويل من صندوق نقدي'}
                                      {transaction.transaction_type === 'cash_box_closing' && 'تحويل عند إغلاق الصندوق'}
                                      {transaction.transaction_type === 'transfer_to_cashier' && 'تحويل إلى القاصة'}
                                      {transaction.transaction_type === 'transfer_to_money_box' && 'تحويل إلى صندوق رواتب'}
                                      {transaction.transaction_type === 'transfer_to_bank' && 'تحويل إلى الصيرفة'}
                                      {transaction.transaction_type === 'cash_deposit' && 'إيداع نقدي'}
                                      {transaction.transaction_type === 'transfer_from' && 'تحويل من'}
                                      {transaction.transaction_type === 'transfer_from_cash_box' && 'تحويل من صندوق نقدي'}
                                      {transaction.transaction_type === 'transfer_from_daily_box' && 'تحويل من الصندوق اليومي'}
                                      {transaction.transaction_type === 'transfer_from_money_box' && 'تحويل من صندوق رواتب'}
                                      {transaction.transaction_type === 'adjustment' && 'تعديل'}
                                      {transaction.transaction_type === 'opening' && 'فتح'}
                                      {transaction.transaction_type === 'closing' && 'إغلاق'}
                                      {transaction.reference_type === 'debt' && 'سداد دين'}
                                      {transaction.reference_type === 'installment' && 'سداد قسط'}
                                      {!['deposit', 'withdraw', 'withdrawal', 'sale', 'purchase', 'expense', 'customer_receipt', 'supplier_payment', 'sale_return', 'purchase_return', 'transfer_in', 'transfer_out', 'cash_box_transfer', 'cash_box_closing', 'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box', 'adjustment', 'opening', 'closing'].includes(transaction.transaction_type) && transaction.transaction_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className={`font-bold text-lg ${
                                      ['deposit', 'sale', 'customer_receipt', 'purchase_return', 'transfer_in', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box'].includes(transaction.transaction_type)
                                        ? 'text-green-600'
                                        : ['withdrawal', 'purchase', 'expense', 'supplier_payment', 'sale_return', 'transfer_out', 'transfer_to_cashier', 'transfer_to_money_box', 'transfer_to_bank'].includes(transaction.transaction_type)
                                        ? 'text-red-600'
                                        : 'text-gray-600'
                                    }`}>
                                      {['deposit', 'sale', 'customer_receipt', 'purchase_return', 'transfer_in', 'cash_deposit', 'transfer_from', 'transfer_from_cash_box', 'transfer_from_daily_box', 'transfer_from_money_box'].includes(transaction.transaction_type) ? '+' : ''}
                                      {formatCurrency(transaction.amount)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-gray-600">
                                      {formatCurrency(transaction.balance_after - transaction.amount)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-gray-700">
                                      {formatCurrency(transaction.balance_after)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm text-gray-600">
                                      <div className="font-medium">{formatDate(transaction.created_at)}</div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(transaction.created_at).toLocaleTimeString('ar-IQ', { 
                                          hour: '2-digit', 
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900">
                                        {transaction.created_by_name || 'غير محدد'}
                                      </div>
                                      {transaction.created_by && (
                                        <div className="text-xs text-gray-500">
                                          ID: {transaction.created_by}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-xs">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {transaction.notes || '-'}
                                      </p>
                                      {transaction.description && transaction.description !== transaction.notes && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                          {transaction.description}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {transaction.related_box_id && (
                                        <div className="text-xs text-blue-600 font-medium">
                                          صندوق مرتبط: {transaction.related_box_id}
                                        </div>
                                      )}
                                      {transaction.box_name && (
                                        <div className="text-xs text-gray-500">
                                          {transaction.box_name}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل تفاصيل صندوق المال...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCashBoxManagement;