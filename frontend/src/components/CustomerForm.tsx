import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { createCustomer, updateCustomer } from '@/features/customers/customersSlice';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Customer } from '@/features/customers/customersService';
import { useFormNavigation } from '@/hooks/useFormNavigation';
import { Keyboard, User, Mail, Phone, MapPin, CreditCard, Building, FileText, DollarSign, Users, X } from 'lucide-react';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  credit_limit: string;
  current_balance: string;
  customer_type: 'retail' | 'wholesale' | 'vip';
  tax_number: string;
  is_active: boolean;
}

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

const CustomerForm = ({ open, onOpenChange, editingCustomer, onSuccess }: CustomerFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    credit_limit: '1000000',
    current_balance: '0',
    customer_type: 'retail',
    tax_number: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<CustomerFormData>>({});

  // Define field order for navigation
  const fieldOrder = [
    'name',
    'email',
    'phone',
    'address',
    'credit_limit',
    'current_balance',
    'customer_type',
    'tax_number'
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

  // Update form data when editingCustomer changes
  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || '',
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        address: editingCustomer.address || '',
        credit_limit: editingCustomer.credit_limit?.toString() || '1000000',
        current_balance: editingCustomer.current_balance?.toString() || '0',
        customer_type: editingCustomer.customer_type || 'retail',
        tax_number: editingCustomer.tax_number || '',
        is_active: editingCustomer.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        credit_limit: '1000000',
        current_balance: '0',
        customer_type: 'retail',
        tax_number: '',
        is_active: true,
      });
    }
    setFormErrors({});
  }, [editingCustomer]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<CustomerFormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    } else if (formData.name.length < 2 || formData.name.length > 100) {
      errors.name = 'يجب أن يكون الاسم بين 2 و 100 حرف';
    }

    // Email is optional, but if provided, validate it
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^07[3-9][0-9]{8}$/.test(formData.phone)) {
      errors.phone = 'رقم الهاتف غير صالح (يجب أن يبدأ بـ 07 ويتكون من 11 رقم)';
    }

    // Address is optional, but if provided, validate its length
    if (formData.address.trim() && (formData.address.length < 5 || formData.address.length > 200)) {
      errors.address = 'يجب أن يكون العنوان بين 5 و 200 حرف';
    }

    // Validate credit limit
    const creditLimit = parseFloat(formData.credit_limit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      errors.credit_limit = 'يجب أن يكون حد الائتمان رقم موجب';
    }

    // Validate current balance
    const currentBalance = parseFloat(formData.current_balance);
    if (isNaN(currentBalance)) {
      errors.current_balance = 'يجب أن يكون الرصيد الحالي رقم صحيح';
    }

    // Tax number is optional, but if provided, validate its length
    if (formData.tax_number.trim() && (formData.tax_number.length < 3 || formData.tax_number.length > 50)) {
      errors.tax_number = 'يجب أن يكون الرقم الضريبي بين 3 و 50 حرف';
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
      const customerData = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        address: formData.address.trim() || undefined,
        credit_limit: parseFloat(formData.credit_limit),
        current_balance: parseFloat(formData.current_balance),
        customer_type: formData.customer_type,
        tax_number: formData.tax_number.trim() || undefined,
        is_active: formData.is_active,
      };

      if (editingCustomer) {
        await dispatch(updateCustomer({ id: editingCustomer.id, customerData })).unwrap();
        toast.success('تم تحديث بيانات العميل بنجاح');
      } else {
        await dispatch(createCustomer(customerData)).unwrap();
        toast.success('تم إضافة العميل بنجاح');
      }
      
      onOpenChange(false);
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        address: '', 
        credit_limit: '1000000',
        current_balance: '0',
        customer_type: 'retail',
        tax_number: '',
        is_active: true 
      });
      setFormErrors({});
      onSuccess?.(editingCustomer || customerData as Customer);
    } catch (error) {
      // Display Arabic error message from backend
      const errorMessage = error?.message || error?.toString() || 'حدث خطأ أثناء حفظ بيانات العميل';
      toast.error(errorMessage);
      console.error('Error saving customer:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide p-0">
        {/* Windows-style header */}
        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between border-b border-blue-500">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            {editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-blue-500 hover:text-white p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6">
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
          
          <form onSubmit={handleSubmit} className="space-y-6 text-right">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <User className="h-5 w-5" />
                المعلومات الأساسية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-right block">الاسم *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown('name')}
                    ref={setInputRef('name')}
                    className={`text-right ${formErrors.name ? 'border-red-500' : ''}`}
                    dir="rtl"
                    placeholder="أدخل اسم العميل"
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500">{formErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-right block">رقم الهاتف *</Label>
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
                  <Label htmlFor="email" className="text-right block">البريد الإلكتروني</Label>
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
                  <Label htmlFor="customer_type" className="text-right block">نوع العميل</Label>
                  <Select
                    value={formData.customer_type}
                    onValueChange={(value) => handleSelectChange('customer_type', value)}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر نوع العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">تجزئة</SelectItem>
                      <SelectItem value="wholesale">جملة</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-right block">العنوان</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`text-right ${formErrors.address ? 'border-red-500' : ''}`}
                  dir="rtl"
                  placeholder="أدخل عنوان العميل"
                  rows={3}
                />
                {formErrors.address && (
                  <p className="text-sm text-red-500">{formErrors.address}</p>
                )}
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                المعلومات المالية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit_limit" className="text-right block">حد الائتمان</Label>
                  <Input
                    id="credit_limit"
                    name="credit_limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.credit_limit}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown('credit_limit')}
                    ref={setInputRef('credit_limit')}
                    className={`text-right ${formErrors.credit_limit ? 'border-red-500' : ''}`}
                    dir="rtl"
                    placeholder="1000000"
                  />
                  {formErrors.credit_limit && (
                    <p className="text-sm text-red-500">{formErrors.credit_limit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_balance" className="text-right block">الرصيد الحالي</Label>
                  <Input
                    id="current_balance"
                    name="current_balance"
                    type="number"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown('current_balance')}
                    ref={setInputRef('current_balance')}
                    className={`text-right ${formErrors.current_balance ? 'border-red-500' : ''}`}
                    dir="rtl"
                    placeholder="0"
                  />
                  {formErrors.current_balance && (
                    <p className="text-sm text-red-500">{formErrors.current_balance}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_number" className="text-right block">الرقم الضريبي</Label>
                  <Input
                    id="tax_number"
                    name="tax_number"
                    value={formData.tax_number}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown('tax_number')}
                    ref={setInputRef('tax_number')}
                    className={`text-right ${formErrors.tax_number ? 'border-red-500' : ''}`}
                    dir="rtl"
                    placeholder="الرقم الضريبي (اختياري)"
                  />
                  {formErrors.tax_number && (
                    <p className="text-sm text-red-500">{formErrors.tax_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                حالة العميل
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm font-medium">
                    العميل نشط
                  </Label>
                </div>
                <span className="text-sm text-gray-600">
                  {formData.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingCustomer ? 'تحديث العميل' : 'إضافة العميل'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;
                  