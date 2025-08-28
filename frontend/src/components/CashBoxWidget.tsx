import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { fetchCashBoxSummary } from '@/features/cashBox/cashBoxSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  DollarSign, 
  Plus, 
  X, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { openCashBox, closeCashBox } from '@/features/cashBox/cashBoxSlice';

const CashBoxWidget: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { cashBoxSummary, loading } = useSelector((state: RootState) => state.cashBox);
  const [openCashBoxDialog, setOpenCashBoxDialog] = React.useState(false);
  const [closeCashBoxDialog, setCloseCashBoxDialog] = React.useState(false);
  const [openingAmount, setOpeningAmount] = React.useState(0);
  const [openingNotes, setOpeningNotes] = React.useState('');
  const [closingAmount, setClosingAmount] = React.useState(0);
  const [closingNotes, setClosingNotes] = React.useState('');

  useEffect(() => {
    dispatch(fetchCashBoxSummary());
  }, [dispatch]);

  const handleOpenCashBox = async () => {
    try {
      await dispatch(openCashBox({ openingAmount, notes: openingNotes })).unwrap();
      setOpenCashBoxDialog(false);
      setOpeningAmount(0);
      setOpeningNotes('');
      dispatch(fetchCashBoxSummary());
      toast.success('تم فتح الصندوق بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل في فتح الصندوق');
    }
  };

  const handleCloseCashBox = async () => {
    try {
      await dispatch(closeCashBox({ closingAmount, notes: closingNotes })).unwrap();
      setCloseCashBoxDialog(false);
      setClosingAmount(0);
      setClosingNotes('');
      dispatch(fetchCashBoxSummary());
      toast.success('تم إغلاق الصندوق بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل في إغلاق الصندوق');
    }
  };

  if (!cashBoxSummary) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${cashBoxSummary.hasOpenCashBox ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              {cashBoxSummary.hasOpenCashBox ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              صندوق النقد
            </div>
            <Badge variant={cashBoxSummary.hasOpenCashBox ? 'default' : 'destructive'}>
              {cashBoxSummary.hasOpenCashBox ? 'مفتوح' : 'مغلق'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashBoxSummary.hasOpenCashBox ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الرصيد الحالي</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(cashBoxSummary.currentAmount)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">المعاملات اليوم</p>
                  <p className="font-semibold">{cashBoxSummary.todayTransactions}</p>
                </div>
                <div>
                  <p className="text-gray-600">المبلغ اليوم</p>
                  <p className="font-semibold">{formatCurrency(cashBoxSummary.todayAmount)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog open={closeCashBoxDialog} onOpenChange={setCloseCashBoxDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1">
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
                      </div>
                      <div>
                        <Label htmlFor="closingNotes">ملاحظات</Label>
                        <Textarea
                          id="closingNotes"
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          placeholder="ملاحظات اختيارية..."
                          rows={3}
                        />
                      </div>
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
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">لا يوجد صندوق مفتوح حالياً</p>
                
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
                          rows={3}
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default CashBoxWidget; 