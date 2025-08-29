import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { createMoneyBox, clearError, clearSuccessMessage } from '@/features/moneyBoxes/moneyBoxesSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { Plus, Loader2 } from 'lucide-react';

interface CreateMoneyBoxModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateMoneyBoxModal: React.FC<CreateMoneyBoxModalProps> = ({ open: externalOpen, onOpenChange, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('اسم صندوق المال مطلوب');
      return;
    }

    if (formData.amount && parseFloat(formData.amount) < 0) {
      toast.error('المبلغ يجب أن يكون أكبر من أو يساوي صفر');
      return;
    }

    setLoading(true);
    try {
      await dispatch(createMoneyBox({
        name: formData.name.trim(),
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        notes: formData.notes.trim()
      })).unwrap();
      
      toast.success('تم إنشاء صندوق المال بنجاح');
      setOpen(false);
      setFormData({ name: '', amount: '', notes: '' });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating money box:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء صندوق المال');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({ name: '', amount: '', notes: '' });
      dispatch(clearError());
      dispatch(clearSuccessMessage());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إنشاء صندوق مال جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم صندوق المال *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسم صندوق المال"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ الابتدائي</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات اختيارية"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء صندوق المال'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMoneyBoxModal; 