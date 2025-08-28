import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { addCategory, updateCategory } from '@/features/inventory/inventorySlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from "@/lib/toast";
import { Loader2, Tag } from 'lucide-react';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: { id: number; name: string } | null;
  onSuccess: (category: any) => void;
}

const CategoryForm = ({ open, onOpenChange, category, onSuccess }: CategoryFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
    } else {
      setName('');
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الفئة');
      return;
    }

    if (name.trim().length < 2) {
      toast.error('اسم الفئة يجب أن يكون حرفين على الأقل');
      return;
    }

    if (name.trim().length > 50) {
      toast.error('اسم الفئة يجب أن يكون 50 حرف أو أقل');
      return;
    }

    setLoading(true);
    try {
      if (category) {
        // Update existing category
        const updatedCategory = await dispatch(updateCategory({ id: category.id, name: name.trim() })).unwrap();
        toast.success('تم تحديث الفئة بنجاح');
        onSuccess(updatedCategory);
      } else {
        // Add new category
        const newCategory = await dispatch(addCategory(name.trim())).unwrap();
        toast.success('تم إضافة الفئة بنجاح');
        onSuccess(newCategory);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الفئة');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {category ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          </DialogTitle>
          <DialogDescription>
            {category ? 'قم بتعديل بيانات الفئة' : 'أدخل بيانات الفئة الجديدة'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم الفئة</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم الفئة"
              required
              minLength={2}
              maxLength={50}
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryForm; 