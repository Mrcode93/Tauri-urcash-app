import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, Search, Eye, Keyboard } from "lucide-react";
import { toast } from "@/lib/toast";
import { AppDispatch, RootState } from "@/app/store";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  setSelectedSupplier,
  clearError,
} from "@/features/suppliers/suppliersSlice";
import { formatDate } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SupplierDetailsModal from "@/components/SupplierDetailsModal";
import { useFormNavigation } from "@/hooks/useFormNavigation";
import { PERMISSIONS } from '@/constants/permissions';
import { selectHasPermission } from '@/features/auth/authSlice';

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Utility function to format credit limit (handle null/unlimited)
const formatCreditLimit = (credit_limit: number | null) => {
  if (credit_limit === null || credit_limit === 0) {
    return 'غير محدود';
  }
  return formatCurrency(credit_limit);
};

// Utility function to calculate available credit
const getAvailableCredit = (credit_limit: number | null, current_balance: number) => {
  if (credit_limit === null) {
    return 'غير محدود';
  }
  const available = credit_limit - (current_balance || 0);
  return formatCurrency(Math.max(0, available));
};

const Suppliers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { suppliers = [], isLoading, selectedSupplier, isError, message } = useSelector((state: RootState) => state.suppliers);
  
  // Permission checks for suppliers management
  const canViewSuppliers = useSelector(selectHasPermission(PERMISSIONS.SUPPLIERS_VIEW));
  const canAddSuppliers = useSelector(selectHasPermission(PERMISSIONS.SUPPLIERS_ADD));
  const canEditSuppliers = useSelector(selectHasPermission(PERMISSIONS.SUPPLIERS_EDIT));
  const canDeleteSuppliers = useSelector(selectHasPermission(PERMISSIONS.SUPPLIERS_DELETE));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [supplierForDetails, setSupplierForDetails] = useState<any>(null);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState<any>({});

  // Define field order for navigation
  const fieldOrder = ['name', 'contact_person', 'phone', 'email', 'address'];

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

  // Monitor formErrors changes for debugging
  useEffect(() => {
    
  }, [formErrors]);

  useEffect(() => {
    dispatch(getSuppliers());
  }, [dispatch]);

  // Handle error messages
  useEffect(() => {
    if (isError && message) {
      // Don't show toast for validation errors, they're handled in the form
      if (!message.includes('validation')) {
        toast.error(message);
      }
      dispatch(clearError());
    }
  }, [isError, message, dispatch]);

  // Auto-focus first field when create modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      // Reset form data when create modal opens to ensure it's always clean
      setCreateFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
      setFormErrors({});
      const timer = setTimeout(() => {
        focusFirstField();
      }, 200); // Delay to ensure modal is fully open
      return () => clearTimeout(timer);
    } else {
      // Clear errors and reset form data when create modal closes
      setFormErrors({});
      setCreateFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [isCreateModalOpen]);

  // Auto-focus first field when edit modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      const timer = setTimeout(() => {
        focusFirstField();
      }, 200); // Delay to ensure modal is fully open
      return () => clearTimeout(timer);
    } else {
      // Clear errors and reset form data when edit modal closes
      setFormErrors({});
      setEditFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [isEditModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, formType: 'create' | 'edit' = 'create') => {
    const { name, value } = e.target;
    if (formType === 'create') {
      setCreateFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setFormErrors((prev) => ({ ...prev, [name]: undefined })); // Clear error for the field
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createSupplier(createFormData)).unwrap();
      setIsCreateModalOpen(false);
      setCreateFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
      setFormErrors({});
      toast.success("تم إضافة المورد بنجاح");
    } catch (error: any) {
      // Handle validation errors from Redux slice
      if (error?.type === 'validation' && error?.errors) {
        const fieldErrors: any = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        setFormErrors(fieldErrors);
        toast.error('يرجى تصحيح الأخطاء في النموذج');
      } else if (error?.response?.data?.errors) {
        // Handle validation errors from backend directly
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.path] = err.msg;
        });
        
        setFormErrors(fieldErrors);
        toast.error('يرجى تصحيح الأخطاء في النموذج');
      } else {
        // Error is already handled by the slice and shown via toast
        console.error('Error creating supplier:', error);
      }
    }
  };

  const handleEdit = (supplier: any) => {
    dispatch(setSelectedSupplier(supplier));
    setEditFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setFormErrors({}); // Clear errors when opening edit modal
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (supplier: any) => {
    setSupplierForDetails(supplier);
    setDetailsModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedSupplier) return;
      await dispatch(
        updateSupplier({
          id: selectedSupplier.id,
          data: editFormData,
        })
      ).unwrap();
      setIsEditModalOpen(false);
      toast.success("تم تحديث بيانات المورد بنجاح");
    } catch (error: any) {
      // Handle validation errors from Redux slice
      if (error?.type === 'validation' && error?.errors) {
        const fieldErrors: any = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        setFormErrors(fieldErrors);
        toast.error('يرجى تصحيح الأخطاء في النموذج');
      } else if (error?.response?.data?.errors) {
        // Handle validation errors from backend directly
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.path] = err.msg;
        });
        
        setFormErrors(fieldErrors);
        toast.error('يرجى تصحيح الأخطاء في النموذج');
      } else if (typeof error === 'string' && error.includes('خطأ في التحقق من البيانات')) {
        // If we get a validation error message but no structured errors, 
        // we might need to re-fetch the validation errors from the backend
        toast.error('يرجى تصحيح الأخطاء في النموذج');
      } else {
        // Error is already handled by the slice and shown via toast
        console.error('Error updating supplier:', error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteSupplier(id)).unwrap();
      setIsDeleteModalOpen(false);
      toast.success("تم حذف المورد بنجاح");
    } catch (error: any) {
      // Error is already handled by the slice and shown via toast
      console.error('Error deleting supplier:', error);
    }
  };

  const filteredSuppliers = Array.isArray(suppliers) 
    ? suppliers.filter((supplier) =>
        Object.values(supplier).some((value) =>
          value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2463EB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الموردين</h1>
        <div className="flex gap-2">
          {canAddSuppliers && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="ml-2 h-4 w-4" />
              إضافة مورد جديد
            </Button>
          )}
        </div>
      </div>

      {canAddSuppliers && (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="rtl max-h-[95vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>إضافة مورد جديد</DialogTitle>
          </DialogHeader>
          {/* Keyboard shortcuts help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Keyboard className="h-4 w-4" />
              <span className="font-medium">اختصارات لوحة المفاتيح</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> للانتقال للحقل التالي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> للتنقل بين الحقول</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Tab</kbd> للتنقل العادي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> في الحقل الأخير للحفظ</div>
            </div>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم المورد *</Label>
              <Input
                id="name"
                name="name"
                value={createFormData.name}
                onChange={(e) => handleInputChange(e, 'create')}
                onKeyDown={handleKeyDown('name')}
                ref={setInputRef('name')}
                required
                dir="rtl"
                className={`${formErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="contact_person">اسم المسؤول *</Label>
              <Input
                id="contact_person"
                name="contact_person"
                value={createFormData.contact_person}
                onChange={(e) => handleInputChange(e, 'create')}
                onKeyDown={handleKeyDown('contact_person')}
                ref={setInputRef('contact_person')}
                required
                dir="rtl"
                className={`${formErrors.contact_person ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.contact_person && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.contact_person}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
              <Input
                id="phone"
                name="phone"
                value={createFormData.phone}
                onChange={(e) => handleInputChange(e, 'create')}
                onKeyDown={handleKeyDown('phone')}
                ref={setInputRef('phone')}
                dir="rtl"
                placeholder="07xxxxxxxxx"
                className={`${formErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.phone}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => handleInputChange(e, 'create')}
                onKeyDown={handleKeyDown('email')}
                ref={setInputRef('email')}
                dir="rtl"
                placeholder="example@email.com"
                className={`${formErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.email}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="address">العنوان (اختياري)</Label>
              <Input
                id="address"
                name="address"
                value={createFormData.address}
                onChange={(e) => handleInputChange(e, 'create')}
                onKeyDown={handleKeyDown('address')}
                ref={setInputRef('address')}
                dir="rtl"
                placeholder="أدخل عنوان المورد"
                className={`${formErrors.address ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.address && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.address}
                </p>
              )}
            </div>
            <Button type="submit">حفظ</Button>
          </form>
        </DialogContent>
      </Dialog>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="بحث عن مورد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <div className="overflow-x-auto rounded-2xl shadow-md bg-white mb-8">
          <table className="min-w-full text-right border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 text-sm font-bold text-gray-600">اسم المورد</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">اسم المسؤول</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">رقم الهاتف</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">البريد الإلكتروني</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">العنوان</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">تاريخ الإضافة</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier, idx) => (
                <tr
                  key={supplier.id}
                  className={`transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                >
                  <td className="py-3 px-4 font-medium whitespace-normal break-words">{supplier.name}</td>
                  <td className="py-3 px-4 whitespace-normal break-words">{supplier.contact_person}</td>
                  <td className="py-3 px-4 whitespace-normal break-words">{supplier.phone}</td>
                  <td className="py-3 px-4 whitespace-normal break-words">{supplier.email}</td>
                  <td className="py-3 px-4 whitespace-normal break-words">{supplier.address}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{supplier.created_at}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      {canViewSuppliers && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="border-gray-300 hover:bg-blue-100" onClick={() => handleViewDetails(supplier)}>
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>عرض التفاصيل</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canEditSuppliers && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="border-gray-300 hover:bg-green-100" onClick={() => handleEdit(supplier)}>
                                <Pencil className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>تعديل المورد</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canDeleteSuppliers && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="border-gray-300 hover:bg-red-100" onClick={() => handleDelete(supplier.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>حذف المورد</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {canEditSuppliers && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rtl max-h-[95vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المورد</DialogTitle>
          </DialogHeader>
          {/* Keyboard shortcuts help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Keyboard className="h-4 w-4" />
              <span className="font-medium">اختصارات لوحة المفاتيح</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> للانتقال للحقل التالي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">↑↓</kbd> للتنقل بين الحقول</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Tab</kbd> للتنقل العادي</div>
              <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> في الحقل الأخير للحفظ</div>
            </div>
          </div>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المورد *</Label>
              <Input
                id="edit-name"
                name="name"
                value={editFormData.name}
                onChange={(e) => handleInputChange(e, 'edit')}
                onKeyDown={handleKeyDown('name')}
                ref={setInputRef('name')}
                required
                dir="rtl"
                className={`${formErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-contact_person">اسم المسؤول *</Label>
              <Input
                id="edit-contact_person"
                name="contact_person"
                value={editFormData.contact_person}
                onChange={(e) => handleInputChange(e, 'edit')}
                onKeyDown={handleKeyDown('contact_person')}
                ref={setInputRef('contact_person')}
                required
                dir="rtl"
                className={`${formErrors.contact_person ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.contact_person && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.contact_person}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-phone">رقم الهاتف (اختياري)</Label>
              <Input
                id="edit-phone"
                name="phone"
                value={editFormData.phone}
                onChange={(e) => handleInputChange(e, 'edit')}
                onKeyDown={handleKeyDown('phone')}
                ref={setInputRef('phone')}
                dir="rtl"
                placeholder="07xxxxxxxxx"
                className={`${formErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.phone}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-email">البريد الإلكتروني (اختياري)</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => handleInputChange(e, 'edit')}
                onKeyDown={handleKeyDown('email')}
                ref={setInputRef('email')}
                dir="rtl"
                placeholder="example@email.com"
                className={`${formErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.email}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-address">العنوان (اختياري)</Label>
              <Input
                id="edit-address"
                name="address"
                value={editFormData.address}
                onChange={(e) => handleInputChange(e, 'edit')}
                onKeyDown={handleKeyDown('address')}
                ref={setInputRef('address')}
                dir="rtl"
                placeholder="أدخل عنوان المورد"
                className={`${formErrors.address ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {formErrors.address && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {formErrors.address}
                </p>
              )}
            </div>
            <Button type="submit">حفظ التغييرات</Button>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {canViewSuppliers && (
        <SupplierDetailsModal
          open={detailsModalOpen}
          onOpenChange={(open) => {
            setDetailsModalOpen(open);
            if (!open) {
              setSupplierForDetails(null);
            }
          }}
          supplier={supplierForDetails}
        />
      )}
    </div>
  );
};

export default Suppliers;
