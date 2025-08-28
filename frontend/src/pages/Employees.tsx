import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { toast } from "@/lib/toast";
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft, 
  Search, 
  Users,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Percent,
  Calendar
} from "lucide-react";
import {
  fetchEmployees,
  addEmployee,
  editEmployee,
  removeEmployee,
  setSearchTerm,
  clearError
} from '@/features/employees/employeesSlice';
import { Employee, CreateEmployeeData } from '@/features/employees/employeesService';

const Employees = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { 
    employees = [], 
    loading, 
    error, 
    pagination = { page: 1, limit: 50, total: 0, totalPages: 0 }, 
    searchTerm 
  } = useSelector((state: RootState) => state.employees);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateEmployeeData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    salary: 0,
    commission_rate: 0,
    commission_type: 'percentage',
    commission_amount: 0,
    commission_start_date: '',
    commission_end_date: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateEmployeeData, string>>>({});

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchEmployees({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchEmployees({ 
        page: 1, 
        limit: 50, 
        search: searchTerm
      }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [dispatch, searchTerm]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Show authentication error if needed
  if (error && error.includes('Unauthorized')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">خطأ في المصادقة</h2>
              <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول إلى هذه الصفحة</p>
              <Button onClick={() => window.location.hash = '/login'}>
                تسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee.id);
      setFormData({
        name: employee.name,
        phone: employee.phone || '',
        email: employee.email || '',
        address: employee.address || '',
        salary: employee.salary,
        commission_rate: employee.commission_rate,
        commission_type: employee.commission_type,
        commission_amount: employee.commission_amount,
        commission_start_date: employee.commission_start_date || '',
        commission_end_date: employee.commission_end_date || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        salary: 0,
        commission_rate: 0,
        commission_type: 'percentage',
        commission_amount: 0,
        commission_start_date: '',
        commission_end_date: ''
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: Partial<Record<keyof CreateEmployeeData, string>> = {};
    if (!formData.name.trim()) errors.name = 'الاسم مطلوب';
    if (formData.salary < 0) errors.salary = 'الراتب لا يمكن أن يكون سالب';
    if (formData.commission_rate < 0 || formData.commission_rate > 100) {
      errors.commission_rate = 'نسبة العمولة يجب أن تكون بين 0 و 100';
    }
    if (formData.commission_amount < 0) errors.commission_amount = 'مبلغ العمولة لا يمكن أن يكون سالب';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingEmployee) {
        await dispatch(editEmployee({ id: editingEmployee, data: formData })).unwrap();
      } else {
        await dispatch(addEmployee(formData)).unwrap();
      }
      
      setIsModalOpen(false);
      dispatch(fetchEmployees({ 
        page: pagination.page, 
        limit: pagination.limit, 
        search: searchTerm
      }));
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      await dispatch(removeEmployee(employeeToDelete)).unwrap();
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      dispatch(fetchEmployees({ 
        page: pagination.page, 
        limit: pagination.limit, 
        search: searchTerm
      }));
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchTerm(value));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD'
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
         
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الموظفين</h1>
            <p className="text-muted-foreground">إدارة الموظفين والرواتب والعمولات</p>
          </div>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              إضافة موظف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="rtl max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold">
                {editingEmployee ? 'تعديل الموظف' : 'إضافة موظف جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-right">الاسم *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="اسم الموظف"
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-right">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="البريد الإلكتروني"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-right">العنوان</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="العنوان"
                />
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-right">الراتب</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  placeholder="الراتب"
                  className={formErrors.salary ? 'border-red-500' : ''}
                />
                {formErrors.salary && (
                  <p className="text-red-500 text-sm">{formErrors.salary}</p>
                )}
              </div>

              {/* Commission Rate */}
              <div className="space-y-2">
                <Label htmlFor="commission_rate" className="text-right">نسبة العمولة (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="نسبة العمولة"
                  className={formErrors.commission_rate ? 'border-red-500' : ''}
                />
                {formErrors.commission_rate && (
                  <p className="text-red-500 text-sm">{formErrors.commission_rate}</p>
                )}
              </div>

              {/* Commission Type */}
              <div className="space-y-2">
                <Label htmlFor="commission_type" className="text-right">نوع العمولة</Label>
                <select
                  id="commission_type"
                  value={formData.commission_type}
                  onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>

              {/* Commission Amount */}
              <div className="space-y-2">
                <Label htmlFor="commission_amount" className="text-right">مبلغ العمولة</Label>
                <Input
                  id="commission_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.commission_amount}
                  onChange={(e) => setFormData({ ...formData, commission_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="مبلغ العمولة"
                  className={formErrors.commission_amount ? 'border-red-500' : ''}
                />
                {formErrors.commission_amount && (
                  <p className="text-red-500 text-sm">{formErrors.commission_amount}</p>
                )}
              </div>

              {/* Commission Start Date */}
              <div className="space-y-2">
                <Label htmlFor="commission_start_date" className="text-right">تاريخ بداية العمولة</Label>
                <Input
                  id="commission_start_date"
                  type="date"
                  value={formData.commission_start_date}
                  onChange={(e) => setFormData({ ...formData, commission_start_date: e.target.value })}
                />
              </div>

              {/* Commission End Date */}
              <div className="space-y-2">
                <Label htmlFor="commission_end_date" className="text-right">تاريخ نهاية العمولة</Label>
                <Input
                  id="commission_end_date"
                  type="date"
                  value={formData.commission_end_date}
                  onChange={(e) => setFormData({ ...formData, commission_end_date: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : (editingEmployee ? 'تحديث' : 'إضافة')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-right">البحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                className="pr-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            الموظفون ({pagination?.total || 0})
          </CardTitle>
          <CardDescription>
            قائمة جميع الموظفين والرواتب والعمولات
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">لا توجد موظفين</h3>
              <p className="text-muted-foreground">ابدأ بإضافة موظف جديد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الراتب</TableHead>
                    <TableHead className="text-right">العمولة</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(employees) && employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        {employee.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {employee.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {employee.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          {formatCurrency(employee.salary)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-muted-foreground" />
                          {employee.commission_type === 'percentage' 
                            ? `${employee.commission_rate}%`
                            : formatCurrency(employee.commission_amount)
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(employee.created_at).toLocaleDateString('ar-IQ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(employee)}
                            className="gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmployeeToDelete(employee.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Employees;
