import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { createSupplier, updateSupplier } from '@/features/suppliers/suppliersSlice';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFormNavigation } from '@/hooks/useFormNavigation';
import { Keyboard } from 'lucide-react';
import { Switch } from '@/components/ui/switch';


interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSupplier?: any | null;
  onSuccess?: (supplier: any) => void;
}

const SupplierForm = ({ open, onOpenChange, editingSupplier, onSuccess }: SupplierFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<SupplierFormData>>({});

  // Define field order for navigation
  const fieldOrder = [
    'name',
    'contact_person',
    'phone',
    'email',
    'address'
  ];

  const { setInputRef, handleKeyDown, focusFirstField } = useFormNavigation({
    fieldOrder,
    skipFields: [], // No fields to skip
    onSubmit: () => {
      // Trigger form submission when Enter is pressed on last field
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }
  });

  // Update form data when editingSupplier changes
  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || '',
        contact_person: editingSupplier.contact_person || '',
        phone: editingSupplier.phone || '',
        email: editingSupplier.email || '',
        address: editingSupplier.address || '',
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setFormErrors({});
  }, [editingSupplier]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormErrors({});
    }
  }, [open]);

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement || activeElement.tagName === 'BODY') {
          focusFirstField();
        }
      }, 200); // Delay to ensure modal is fully open
      return () => clearTimeout(timer);
    }
  }, [open, focusFirstField]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<SupplierFormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'اسم المورد مطلوب';
    } else if (formData.name.length < 2 || formData.name.length > 100) {
      errors.name = 'يجب أن يكون اسم المورد بين 2 و 100 حرف';
    }

    if (!formData.contact_person.trim()) {
      errors.contact_person = 'اسم المسؤول مطلوب';
    } else if (formData.contact_person.length < 2 || formData.contact_person.length > 100) {
      errors.contact_person = 'يجب أن يكون اسم المسؤول بين 2 و 100 حرف';
    }

    // Phone is optional, but if provided, validate it
    if (formData.phone.trim() && !/^07[3-9][0-9]{8}$/.test(formData.phone)) {
      errors.phone = 'رقم الهاتف غير صالح (يجب أن يبدأ بـ 07 ويتكون من 11 رقم)';
    }

    // Email is optional, but if provided, validate it
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }

    // Address is optional, but if provided, validate its length
    if (formData.address.trim() && (formData.address.length < 5 || formData.address.length > 200)) {
      errors.address = 'يجب أن يكون العنوان بين 5 و 200 حرف';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingSupplier) {
        await dispatch(updateSupplier({ id: editingSupplier.id, data: formData })).unwrap();
        toast.success('تم تحديث بيانات المورد بنجاح');
      } else {
        const result = await dispatch(createSupplier(formData)).unwrap();
        toast.success('تم إضافة المورد بنجاح');
        onSuccess?.(result);
      }
      
      onOpenChange(false);
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
      setFormErrors({});
    } catch (error) {
      // Error is already handled by the slice and shown via toast
      console.error('Error saving supplier:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {editingSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}
          </DialogTitle>
        </DialogHeader>
        {/* Keyboard shortcuts help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Keyboard className="h-4 w-4" />
            <span className="font-medium">اختصارات لوحة المفاتيح</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-blue-600">
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> للانتقال للحقل التالي</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> للتنقل بين الحقول</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Tab</kbd> للتنقل العادي</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> في الحقل الأخير للحفظ</div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right block">اسم المورد *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown('name')}
              ref={setInputRef('name')}
              className={`text-right ${formErrors.name ? 'border-red-500' : ''}`}
              dir="rtl"
              placeholder="أدخل اسم المورد"
              required
            />
            {formErrors.name && (
              <p className="text-sm text-red-500">{formErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person" className="text-right block">اسم المسؤول *</Label>
            <Input
              id="contact_person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown('contact_person')}
              ref={setInputRef('contact_person')}
              className={`text-right ${formErrors.contact_person ? 'border-red-500' : ''}`}
              dir="rtl"
              placeholder="أدخل اسم المسؤول"
              required
            />
            {formErrors.contact_person && (
              <p className="text-sm text-red-500">{formErrors.contact_person}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-right block">رقم الهاتف (اختياري)</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown('phone')}
              ref={setInputRef('phone')}
              className={`text-right ${formErrors.phone ? 'border-red-500' : ''}`}
              dir="rtl"
              placeholder="07xxxxxxxxx"
            />
            {formErrors.phone && (
              <p className="text-sm text-red-500">{formErrors.phone}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-right block">البريد الإلكتروني (اختياري)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown('email')}
              ref={setInputRef('email')}
              className={`text-right ${formErrors.email ? 'border-red-500' : ''}`}
              dir="rtl"
              placeholder="example@email.com"
            />
            {formErrors.email && (
              <p className="text-sm text-red-500">{formErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-right block">العنوان (اختياري)</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown('address')}
              ref={setInputRef('address')}
              className={`text-right ${formErrors.address ? 'border-red-500' : ''}`}
              dir="rtl"
              placeholder="أدخل عنوان المورد"
            />
            {formErrors.address && (
              <p className="text-sm text-red-500">{formErrors.address}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="ml-2">
              {editingSupplier ? 'تحديث' : 'إضافة'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setFormErrors({});
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierForm; 