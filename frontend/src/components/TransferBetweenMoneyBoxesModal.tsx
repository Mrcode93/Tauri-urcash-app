import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { transferBetweenMoneyBoxes, clearError, clearSuccessMessage } from '@/features/moneyBoxes/moneyBoxesSlice';
import { MoneyBox } from '@/services/moneyBoxesService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface TransferBetweenMoneyBoxesModalProps {
  fromMoneyBox: MoneyBox;
  moneyBoxes: MoneyBox[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TransferBetweenMoneyBoxesModal: React.FC<TransferBetweenMoneyBoxesModalProps> = ({ fromMoneyBox, moneyBoxes, open, onOpenChange, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [toBoxId, setToBoxId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const destinationBoxes = useMemo(() => moneyBoxes.filter(b => b.id !== fromMoneyBox.id), [moneyBoxes, fromMoneyBox.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toBoxId) {
      toast.error('يرجى اختيار الصندوق المستلم');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (numericAmount > (fromMoneyBox.amount || 0)) {
      toast.error('لا يوجد رصيد كافٍ لإتمام عملية التحويل');
      return;
    }

    setLoading(true);
    try {
      await dispatch(transferBetweenMoneyBoxes({
        fromBoxId: fromMoneyBox.id,
        toBoxId: parseInt(toBoxId, 10),
        amount: numericAmount,
        notes
      })).unwrap();

      toast.success('تم التحويل بين الصناديق بنجاح');
      onOpenChange(false);
      setToBoxId('');
      setAmount('');
      setNotes('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error transferring between money boxes:', error);
      toast.error(error?.message || 'حدث خطأ أثناء التحويل بين الصناديق');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setToBoxId('');
      setAmount('');
      setNotes('');
      dispatch(clearError());
      dispatch(clearSuccessMessage());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>تحويل بين صناديق المال: {fromMoneyBox.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>الصندوق المستلم</Label>
            <Select value={toBoxId} onValueChange={setToBoxId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الصندوق المستلم" />
              </SelectTrigger>
              <SelectContent>
                {destinationBoxes.map((box) => (
                  <SelectItem key={box.id} value={String(box.id)}>
                    {box.name} — الرصيد: {box.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>الرصيد المتاح</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                {fromMoneyBox.amount}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات اختيارية"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading || !toBoxId}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري التحويل...
                </>
              ) : (
                'تحويل'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferBetweenMoneyBoxesModal;