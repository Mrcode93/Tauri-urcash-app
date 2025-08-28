import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { addMoneyBoxTransaction, clearError, clearSuccessMessage } from '@/features/moneyBoxes/moneyBoxesSlice';
import { MoneyBox } from '@/services/moneyBoxesService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface AddMoneyBoxTransactionModalProps {
  moneyBox: MoneyBox;
  type: 'deposit' | 'withdraw';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddMoneyBoxTransactionModal: React.FC<AddMoneyBoxTransactionModalProps> = ({ moneyBox, type, open, onOpenChange, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const title = type === 'deposit' ? `إيداع في صندوق المال: ${moneyBox.name}` : `سحب من صندوق المال: ${moneyBox.name}`;
  const submitLabel = type === 'deposit' ? 'إيداع' : 'سحب';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    if (type === 'withdraw' && numericAmount > (moneyBox.amount || 0)) {
      toast.error('لا يوجد رصيد كافٍ لإتمام عملية السحب');
      return;
    }

    setLoading(true);
    try {
      await dispatch(addMoneyBoxTransaction({
        id: moneyBox.id,
        data: {
          type,
          amount: numericAmount,
          notes: notes.trim() || undefined,
        },
      })).unwrap();

      toast.success(`تم ${type === 'deposit' ? 'الإيداع' : 'السحب'} بنجاح`);
      onOpenChange(false);
      setAmount('');
      setNotes('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding money box transaction:', error);
      toast.error(error?.message || 'حدث خطأ أثناء حفظ المعاملة');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setAmount('');
      setNotes('');
      dispatch(clearError());
      dispatch(clearSuccessMessage());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>الرصيد الحالي</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted/30 text-sm">
                {moneyBox.amount}
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMoneyBoxTransactionModal;


