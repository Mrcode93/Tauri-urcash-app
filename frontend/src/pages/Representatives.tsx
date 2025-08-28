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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft, 
  Search, 
  UserCheck,
  Phone,
  Mail,
  MapPin,
  User,
  Percent,
  DollarSign,
  Target,
  Eye,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Loader2
} from "lucide-react";
import {
  fetchDelegates,
  addDelegate,
  editDelegate,
  removeDelegate,
  setSearchTerm,
  clearError
} from '@/features/delegates/delegatesSlice';
import { Delegate, CreateDelegateData, getDelegateAnalytics, DelegateAnalytics } from '@/features/delegates/delegatesService';
import reportsService, { DelegatesReport } from '@/features/reports/reportsService';

const Representatives = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { 
    delegates = [], 
    loading, 
    error, 
    pagination = { page: 1, limit: 50, total: 0, totalPages: 0 }, 
    searchTerm
  } = useSelector((state: RootState) => state.delegates);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelegate, setEditingDelegate] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [delegateToDelete, setDelegateToDelete] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);
  const [delegateAnalytics, setDelegateAnalytics] = useState<DelegatesReport | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<CreateDelegateData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    commission_rate: 0,
    commission_type: 'percentage',
    commission_amount: 0,
    sales_target: 0
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateDelegateData, string>>>({});

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchDelegates({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchDelegates({ 
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

  const handleOpenModal = (delegate?: Delegate) => {
    if (delegate) {
      setEditingDelegate(delegate.id);
      setFormData({
        name: delegate.name,
        phone: delegate.phone || '',
        email: delegate.email || '',
        address: delegate.address || '',
        commission_rate: delegate.commission_rate || 0,
        commission_type: delegate.commission_type || 'percentage',
        commission_amount: delegate.commission_amount || 0,
        sales_target: delegate.sales_target || 0
      });
    } else {
      setEditingDelegate(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        commission_rate: 0,
        commission_type: 'percentage',
        commission_amount: 0,
        sales_target: 0
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: Partial<Record<keyof CreateDelegateData, string>> = {};
    if (!formData.name.trim()) errors.name = 'الاسم مطلوب';
    if (formData.commission_rate < 0 || formData.commission_rate > 100) {
      errors.commission_rate = 'نسبة العمولة يجب أن تكون بين 0 و 100';
    }
    if (formData.commission_amount < 0) {
      errors.commission_amount = 'مبلغ العمولة لا يمكن أن يكون سالب';
    }
    if (formData.sales_target < 0) {
      errors.sales_target = 'هدف المبيعات لا يمكن أن يكون سالب';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingDelegate) {
        await dispatch(editDelegate({ id: editingDelegate, data: formData })).unwrap();
        toast.success('تم تحديث المندوب بنجاح');
      } else {
        await dispatch(addDelegate(formData)).unwrap();
        toast.success('تم إضافة المندوب بنجاح');
      }
      
      setIsModalOpen(false);
      dispatch(fetchDelegates({ 
        page: pagination.page, 
        limit: pagination.limit, 
        search: searchTerm
      }));
    } catch (error) {
      console.error('Error saving delegate:', error);
      toast.error('حدث خطأ أثناء حفظ المندوب');
    }
  };

  const handleDelete = async () => {
    if (!delegateToDelete) return;
    
    try {
      await dispatch(removeDelegate(delegateToDelete)).unwrap();
      toast.success('تم حذف المندوب بنجاح');
      setDeleteDialogOpen(false);
      setDelegateToDelete(null);
      dispatch(fetchDelegates({ 
        page: pagination.page, 
        limit: pagination.limit, 
        search: searchTerm
      }));
    } catch (error) {
      console.error('Error deleting delegate:', error);
      toast.error('حدث خطأ أثناء حذف المندوب');
    }
  };

  const handleSearchChange = (value: string) => {
    dispatch(setSearchTerm(value));
  };

  const handleViewDelegate = async (delegate: Delegate) => {
    setSelectedDelegate(delegate);
    setViewModalOpen(true);
    setAnalyticsLoading(true);
    setDelegateAnalytics(null);

    try {
      // Get current date and 30 days ago for analytics
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get delegate analytics from reports service
      const analytics = await reportsService.getDelegatesReport({ start: startDate, end: endDate });
      const delegateAnalyticsData = analytics.find(d => d.id === delegate.id);
      
      setDelegateAnalytics(delegateAnalyticsData || null);
    } catch (error) {
      console.error('Error fetching delegate analytics:', error);
      toast.error('حدث خطأ أثناء جلب بيانات التحليلات');
    } finally {
      setAnalyticsLoading(false);
    }
  };



  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
    
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة المندوبين</h1>
            <p className="text-muted-foreground">إدارة مندوبي المبيعات</p>
          </div>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              إضافة مندوب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="rtl max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide p-6">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold">
                {editingDelegate ? 'تعديل المندوب' : 'إضافة مندوب جديد'}
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
                  placeholder="اسم المندوب"
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

              {/* Commission Rate */}
              <div className="space-y-2">
                <Label htmlFor="commission_rate" className="text-right flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  نسبة العمولة (%)
                </Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={formErrors.commission_rate ? 'border-red-500' : ''}
                />
                {formErrors.commission_rate && (
                  <p className="text-red-500 text-sm">{formErrors.commission_rate}</p>
                )}
              </div>

              {/* Commission Type */}
              <div className="space-y-2">
                <Label htmlFor="commission_type" className="text-right">نوع العمولة</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, commission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العمولة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Commission Amount */}
              <div className="space-y-2">
                <Label htmlFor="commission_amount" className="text-right flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  مبلغ العمولة
                </Label>
                <Input
                  id="commission_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.commission_amount}
                  onChange={(e) => setFormData({ ...formData, commission_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={formErrors.commission_amount ? 'border-red-500' : ''}
                />
                {formErrors.commission_amount && (
                  <p className="text-red-500 text-sm">{formErrors.commission_amount}</p>
                )}
              </div>

              {/* Sales Target */}
              <div className="space-y-2">
                <Label htmlFor="sales_target" className="text-right flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  هدف المبيعات
                </Label>
                <Input
                  id="sales_target"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sales_target}
                  onChange={(e) => setFormData({ ...formData, sales_target: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={formErrors.sales_target ? 'border-red-500' : ''}
                />
                {formErrors.sales_target && (
                  <p className="text-red-500 text-sm">{formErrors.sales_target}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : (editingDelegate ? 'تحديث' : 'إضافة')}
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4">
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
            

          </div>
        </CardContent>
      </Card>

      {/* Representatives Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            المندوبون ({pagination.total})
          </CardTitle>
          <CardDescription>
            قائمة جميع مندوبي المبيعات
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
          ) : delegates.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">لا توجد مندوبين</h3>
              <p className="text-muted-foreground">ابدأ بإضافة مندوب جديد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">نسبة العمولة</TableHead>
                    <TableHead className="text-right">هدف المبيعات</TableHead>
                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(delegates) && delegates.map((delegate) => (
                    <TableRow key={delegate.id}>
                      <TableCell className="font-medium">{delegate.name}</TableCell>
                      <TableCell>
                        {delegate.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {delegate.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {delegate.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {delegate.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {delegate.commission_rate}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({delegate.commission_type === 'percentage' ? 'نسبة' : 'ثابت'})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'IQD'
                          }).format(delegate.sales_target || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(delegate.created_at).toLocaleDateString('ar-IQ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDelegate(delegate)}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            عرض
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(delegate)}
                            className="gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDelegateToDelete(delegate.id);
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
              هل أنت متأكد من حذف هذا الممثل؟ لا يمكن التراجع عن هذا الإجراء.
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

      {/* View Delegate Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="rtl max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide p-6">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-bold">
              تفاصيل المندوب والتحليلات
            </DialogTitle>
          </DialogHeader>
          
          {selectedDelegate && (
            <div className="space-y-6">
              {/* Delegate Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    معلومات المندوب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">الاسم</Label>
                      <p className="font-medium">{selectedDelegate.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">رقم الهاتف</Label>
                      <p className="font-medium">{selectedDelegate.phone || 'غير محدد'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</Label>
                      <p className="font-medium">{selectedDelegate.email || 'غير محدد'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">العنوان</Label>
                      <p className="font-medium">{selectedDelegate.address || 'غير محدد'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">نسبة العمولة</Label>
                      <p className="font-medium">{selectedDelegate.commission_rate}%</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">هدف المبيعات</Label>
                      <p className="font-medium">
                        {new Intl.NumberFormat('ar-EG', {
                          style: 'currency',
                          currency: 'IQD'
                        }).format(selectedDelegate.sales_target || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    التحليلات (آخر 30 يوم)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                        <p className="text-muted-foreground">جاري تحميل التحليلات...</p>
                      </div>
                    </div>
                  ) : delegateAnalytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">إجمالي المبيعات</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{delegateAnalytics.total_sales}</p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">إجمالي الإيرادات</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'IQD'
                          }).format(delegateAnalytics.total_revenue || 0)}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">متوسط قيمة البيع</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">
                          {new Intl.NumberFormat('ar-EG', {
                            style: 'currency',
                            currency: 'IQD'
                          }).format(delegateAnalytics.avg_sale_value || 0)}
                        </p>
                      </div>
                      
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-600">العملاء الفريدون</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{delegateAnalytics.unique_customers}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">لا توجد بيانات تحليلية</h3>
                      <p className="text-muted-foreground">لم يتم العثور على بيانات تحليلية لهذا المندوب</p>
                    </div>
                  )}
                  
                  {delegateAnalytics && delegateAnalytics.last_sale_date && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">آخر عملية بيع:</span>
                        <span className="font-medium">
                          {new Date(delegateAnalytics.last_sale_date).toLocaleDateString('ar-IQ')}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Representatives;
