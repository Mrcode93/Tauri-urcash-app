import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Settings, ArrowLeft, User, Shield, Crown, Wifi, WifiOff, Smartphone, CheckCircle, XCircle, AlertTriangle, Building2, Users, Smartphone as SmartphoneIcon, RefreshCw, Upload, Calendar, ChevronDown, Key, Lock, Unlock, Package, ShoppingCart, BarChart3, UserCheck, Database, Wallet, PackageOpen, ShoppingBag, Truck, CreditCard, Search, List, Grid } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { useSettings } from '@/features/settings/useSettings';
import { updateSettings } from '@/features/settings/settingsSlice';
import { getLogoUrlSafe as getLogoUrl } from '@/utils/logoUrl';
import { useLicense } from '@/contexts/LicenseContext';
import { licenseService } from '@/services/licenseService';
import { remoteServerService } from '@/services/remoteServerService';

interface AdminFormData {
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

interface Admin {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

interface Permission {
  id: number;
  permission_id: string;
  name: string;
  description: string;
  category: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface UserPermission {
  role: string;
  rolePermissions: Permission[];
  customPermissions: Permission[];
  allPermissions: Permission[];
}

interface PermissionGrant {
  permission_id: string;
  expires_at?: string;
}

const AdminProfiles = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { hasFeatureAccess, activateWithCode } = useLicense();
  
  // Admin management states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    username: '',
    password: '',
    name: '',
    role: 'user'
  });
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([]);
  const [showPermissionSelector, setShowPermissionSelector] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({});
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { settings, loading: settingsLoading, error: settingsError, refetch } = useSettings();
  const [settingsForm, setSettingsForm] = useState<{ company_name: string; logo_url: string; mobile: string; currency: string }>({ company_name: '', logo_url: '', mobile: '', currency: 'دينار' });
  
  // Mobile Live Data states
  const [mobileLiveDataModalOpen, setMobileLiveDataModalOpen] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [mobileLiveDataStatus, setMobileLiveDataStatus] = useState<{
    connected: boolean;
    lastSync: string | null;
    syncStatus: Record<string, unknown>;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  
  // Mobile Live Data User Management
  const [mobileUserModalOpen, setMobileUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [mobileUserForm, setMobileUserForm] = useState({
    username: '',
    name: '',
    password: '',
    role: 'manager' // Default to manager role
  });
  const [mobileUserFormErrors, setMobileUserFormErrors] = useState<Partial<Record<string, string>>>({});
  const [isCreatingMobileUser, setIsCreatingMobileUser] = useState(false);
  const [mobileUsers, setMobileUsers] = useState<Array<{
    id: string;
    username: string;
    name: string;
    role: string;
    created_at: string;
    users?: Array<{
      id: string;
      username: string;
      name: string;
      role: string;
    }>;
  }>>([]);
  const [isLoadingMobileUsers, setIsLoadingMobileUsers] = useState(false);
  const [mainMobileUserId, setMainMobileUserId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  // Permission management states
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<Admin | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [permissionExpiresAt, setPermissionExpiresAt] = useState<string>('');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  
  // Enhanced permission management states
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
  const [selectedPermissionCategory, setSelectedPermissionCategory] = useState<string>('all');
  const [selectedPermissionsForBulk, setSelectedPermissionsForBulk] = useState<string[]>([]);
  const [selectedPermissionsForRevoke, setSelectedPermissionsForRevoke] = useState<string[]>([]);
  const [isGrantingPermission, setIsGrantingPermission] = useState(false);
  const [isRevokingPermission, setIsRevokingPermission] = useState(false);
  const [permissionToRevoke, setPermissionToRevoke] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false);
  const [permissionViewMode, setPermissionViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Role permission management states
  const [selectedRolePermissionsForRevoke, setSelectedRolePermissionsForRevoke] = useState<string[]>([]);
  const [showRolePermissionRevokeConfirm, setShowRolePermissionRevokeConfirm] = useState(false);
  const [rolePermissionToRevoke, setRolePermissionToRevoke] = useState<string | null>(null);
  const [isRevokingRolePermission, setIsRevokingRolePermission] = useState(false);
  const [enableRolePermissionEditing, setEnableRolePermissionEditing] = useState(false);

  // Check if any manager user exists (for hiding add button)
  const hasManagerUser = Array.isArray(mobileUsers) && mobileUsers.some(user => 
    // Check main user role
    user.role === 'Manager' ||
    // Check sub-users roles
    (user.users && user.users.some((subUser: { role: string }) => subUser.role === 'manager'))
  );

  // Data Upload states
  const [isUploadingData, setIsUploadingData] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    dataType: string;
  } | null>(null);
  const [dataAvailability, setDataAvailability] = useState<Record<string, any>>({});
  const [isLoadingDataAvailability, setIsLoadingDataAvailability] = useState(false);

  // Upload Schedule states
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduleName: '',
    scheduleType: 'daily',
    scheduleTime: '09:00',
    scheduleDays: [] as string[],
    dataTypes: [] as string[],
    isAutoSchedule: false,
    intervalMinutes: 60
  });
  const [scheduleFormErrors, setScheduleFormErrors] = useState<Partial<Record<string, string>>>({});
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);



  useEffect(() => {
    fetchAdmins();
  }, [dispatch]);

  useEffect(() => {
    if (hasFeatureAccess('mobile_live_data')) {
      fetchMobileUsers();
      fetchDataAvailability();
      fetchSchedules();
    }
  }, [hasFeatureAccess]);



  useEffect(() => {
    if (settings) {
      setSettingsForm({
        company_name: settings.company_name || '',
        logo_url: settings.logo_url || '',
        mobile: settings.mobile || '',
        currency: settings.currency || 'دينار',
      });
    }
  }, [settings]);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users');
      if (response.data.success) {
        setAdmins(response.data.data);
      } else {
        toast.error('حدث خطأ أثناء جلب بيانات المشرفين');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب بيانات المشرفين');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AdminFormData, string>> = {};
    
    if (!formData.username.trim()) {
      errors.username = 'اسم المستخدم مطلوب';
    } else if (formData.username.length < 3) {
      errors.username = 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل';
    }

    if (!editingAdmin && !formData.password.trim()) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (!editingAdmin && formData.password.length < 6) {
      errors.password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
    }

    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    } else if (formData.name.length < 2) {
      errors.name = 'يجب أن يكون الاسم حرفين على الأقل';
    }

    const allowedRoles = ['admin', 'user', 'manager'] as const;
    if (formData.role && !allowedRoles.includes(formData.role as typeof allowedRoles[number])) {
      errors.role = 'الدور غير صالح';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const url = editingAdmin 
        ? `/users/${editingAdmin}`
        : '/users';
      
      const method = editingAdmin ? 'put' : 'post';
      
      const requestData = editingAdmin 
        ? formData 
        : { ...formData, permissions: selectedUserPermissions };
      
      const response = await api[method](url, requestData);

      if (response.data.success) {
        toast.success(editingAdmin ? 'تم تحديث بيانات المشرف بنجاح' : 'تم إضافة المشرف بنجاح');
        setIsModalOpen(false);
        setEditingAdmin(null);
        setFormData({ username: '', password: '', name: '', role: 'user' });
        setSelectedUserPermissions([]);
        setFormErrors({});
        fetchAdmins();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin.id);
    setFormData({
      username: admin.username,
      password: '',
      name: admin.name,
      role: admin.role
    });
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingAdmin(null);
    setFormData({ username: '', password: '', name: '', role: 'user' });
    setSelectedUserPermissions([]);
    setShowPermissionSelector(false);
    fetchAllPermissions();
  };

  const handleDelete = (id: number) => {
    setAdminToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;

    try {
      const response = await api.delete(`/users/${adminToDelete}`);

      if (response.data.success) {
        toast.success('تم حذف المشرف بنجاح');
        fetchAdmins();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المشرف');
    } finally {
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('company_name', settingsForm.company_name);
    formData.append('mobile', settingsForm.mobile);
    formData.append('currency', settingsForm.currency);
    
    try {
      await dispatch(updateSettings(formData)).unwrap();
      toast.success('تم حفظ الإعدادات بنجاح');
      setSettingsModalOpen(false);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  // Mobile Live Data Functions
  const checkMobileLiveDataStatus = async () => {
    if (!hasFeatureAccess('mobile_live_data')) {
      return;
    }
    
    setIsCheckingStatus(true);
    try {
      const [connectionResponse, syncStatusResponse] = await Promise.all([
        api.get('/mobile-live-data/test-connection'),
        api.get('/mobile-live-data/sync-status')
      ]);
      
      setMobileLiveDataStatus({
        connected: connectionResponse.data.data?.connected || false,
        lastSync: null, // TODO: Implement last sync tracking
        syncStatus: syncStatusResponse.data.data || {}
      });
    } catch (error) {
      console.error('Error checking mobile live data status:', error);
      // Handle network connectivity issues gracefully
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('fetch')) {
        setMobileLiveDataStatus({
          connected: false,
          lastSync: null,
          syncStatus: {}
        });
        // Don't show error toast for network issues
      } else {
        toast.error('حدث خطأ أثناء فحص حالة الاتصال');
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleMobileLiveDataActivation = async () => {
    if (!activationCode.trim()) {
      setActivationError('يرجى إدخال كود التفعيل');
      return;
    }
    
    setIsActivating(true);
    setActivationError(null);
    
    try {
      const success = await activateWithCode(activationCode.trim());
      if (success) {
        toast.success('تم تفعيل ميزة البيانات المباشرة بنجاح!');
        setMobileLiveDataModalOpen(false);
        setActivationCode('');
        // Refresh the page to update the UI
        window.location.reload();
      } else {
        setActivationError('فشل في تفعيل الكود، يرجى التحقق من الكود والمحاولة مرة أخرى');
      }
    } catch (error) {
      setActivationError('حدث خطأ أثناء التفعيل');
    } finally {
      setIsActivating(false);
    }
  };

  // Mobile Live Data User Management Functions
  const fetchMobileUsers = async () => {
    if (!hasFeatureAccess('mobile_live_data')) return;
    
    setIsLoadingMobileUsers(true);
    try {
      const users = await remoteServerService.getMobileUsers();
      
      // Ensure users is always an array
      const usersArray = Array.isArray(users) ? users : [users];
      setMobileUsers(usersArray);
    } catch (error) {
      console.error('Error fetching mobile users:', error);
      // Handle network connectivity issues gracefully
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('fetch')) {
        setMobileUsers([]);
        // Don't show error toast for network issues
      } else {
        toast.error('حدث خطأ أثناء جلب بيانات المستخدمين');
      }
    } finally {
      setIsLoadingMobileUsers(false);
    }
  };

  const validateMobileUserForm = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    
    if (!mobileUserForm.username.trim()) {
      errors.username = 'اسم المستخدم مطلوب';
    } else if (mobileUserForm.username.length < 3) {
      errors.username = 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل';
    }

    if (!mobileUserForm.name.trim()) {
      errors.name = 'الاسم مطلوب';
    } else if (mobileUserForm.name.length < 2) {
      errors.name = 'يجب أن يكون الاسم حرفين على الأقل';
    }

    // Password validation - allow empty when editing
    if (!isEditingUser && !mobileUserForm.password.trim()) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (mobileUserForm.password.trim() && mobileUserForm.password.length < 6) {
      errors.password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
    }

    setMobileUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleMobileUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMobileUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetMobileUserForm = () => {
    setMobileUserForm({ username: '', name: '', password: '', role: 'manager' });
    setMobileUserFormErrors({});
    setIsEditingUser(false);
    setEditingUserId(null);
  };

  const handleEditMobileUser = (user: any) => {
    setIsEditingUser(true);
    setEditingUserId(user._id);
    setMobileUserForm({
      username: user.username || '',
      name: user.name || '',
      password: '', // Don't pre-fill password for security
      role: user.role?.toLowerCase() || 'manager'
    });
    setMobileUserFormErrors({});
    setMobileUserModalOpen(true);
  };

  const handleCreateMobileUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateMobileUserForm()) {
      return;
    }

    setIsCreatingMobileUser(true);
    try {
      let result;
      
      if (isEditingUser && editingUserId) {
        // Update existing user using the same function
        result = await remoteServerService.createMobileUser(mobileUserForm, true, editingUserId);
      } else {
        // Create new user
        result = await remoteServerService.createMobileUser(mobileUserForm);
      }

      if (result.success) {
        const message = isEditingUser ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح';
        toast.success(message);
        setMobileUserModalOpen(false);
        resetMobileUserForm();
        fetchMobileUsers();
      } else {
        throw new Error(result.message || 'حدث خطأ');
      }
    } catch (error) {
      // If userId error, try to refresh it
      if (error.message?.includes('Unable to retrieve user ID')) {
        try {
          await remoteServerService.refreshUserId();
          // Retry the operation
          let retryResult;
          if (isEditingUser && editingUserId) {
            retryResult = await remoteServerService.createMobileUser(mobileUserForm, true, editingUserId);
          } else {
            retryResult = await remoteServerService.createMobileUser(mobileUserForm);
          }
          if (retryResult.success) {
            const message = isEditingUser ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح';
            toast.success(message);
            setMobileUserModalOpen(false);
            resetMobileUserForm();
            fetchMobileUsers();
            return;
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      const errorMessage = isEditingUser ? 'حدث خطأ أثناء تحديث المستخدم' : 'حدث خطأ أثناء إنشاء المستخدم';
      toast.error(error instanceof Error ? error.message : errorMessage);
    } finally {
      setIsCreatingMobileUser(false);
    }
  };

  // Helper function to get current user ID from license cache
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      // Try to get from sessionStorage cache first
      const cachedLicense = sessionStorage.getItem('urcash_license_cache');
      if (cachedLicense) {
        const licenseData = JSON.parse(cachedLicense);
        if (licenseData && licenseData.userId) {
          
          return licenseData.userId;
        }
      }
      
      // Fallback: try to get from license context
      if (hasFeatureAccess('mobile_live_data')) {
        const response = await api.get('/mobile-live-data/license-info');
        if (response.data.success && response.data.data?.licenseData?.userId) {
          return response.data.data.licenseData.userId;
        }
      }
      
      // Final fallback: try to get from current user data
      const userResponse = await api.get('/auth/user');
      if (userResponse.data?.data?.id) {
        
        return userResponse.data.data.id.toString();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  };



  // Arabic translations for data types
  const getDataTypeArabicName = (dataType: string): string => {
    const arabicNames: Record<string, string> = {
      'sales': 'المبيعات',
      'purchases': 'المشتريات',
      'expenses': 'المصروفات',
      'products': 'المنتجات',
      'suppliers': 'الموردين',
      'customers': 'العملاء',
      'debts': 'الديون',
      'installments': 'الأقساط'
    };
    return arabicNames[dataType] || dataType;
  };

  // Upload Schedule Functions
  const fetchSchedules = async () => {
    if (!hasFeatureAccess('mobile_live_data')) return;
    
    setIsLoadingSchedules(true);
    try {
      const response = await api.get('/mobile-live-data/schedules');
      if (response.data.success) {
        setSchedules(response.data.data);
      } else {
        toast.error('حدث خطأ أثناء جلب الجداول الزمنية');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      // Handle network connectivity issues gracefully
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('fetch')) {
        setSchedules([]);
        // Don't show error toast for network issues
      } else {
        toast.error('حدث خطأ أثناء جلب الجداول الزمنية');
      }
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  const validateScheduleForm = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    
    if (!scheduleForm.scheduleName.trim()) {
      errors.scheduleName = 'اسم الجدول الزمني مطلوب';
    }

    // For auto schedules, validate interval instead of time
    if (scheduleForm.isAutoSchedule) {
      if (!scheduleForm.intervalMinutes || scheduleForm.intervalMinutes < 1) {
        errors.intervalMinutes = 'يجب تحديد فترة زمنية صحيحة';
      }
    } else {
      if (!scheduleForm.scheduleTime) {
        errors.scheduleTime = 'وقت الجدول الزمني مطلوب';
      }
    }

    if (scheduleForm.dataTypes.length === 0) {
      errors.dataTypes = 'يجب اختيار نوع بيانات واحد على الأقل';
    }

    if (!scheduleForm.isAutoSchedule) {
      if (scheduleForm.scheduleType === 'weekly' && scheduleForm.scheduleDays.length === 0) {
        errors.scheduleDays = 'يجب اختيار يوم واحد على الأقل للأسبوع';
      }

      if (scheduleForm.scheduleType === 'monthly' && scheduleForm.scheduleDays.length === 0) {
        errors.scheduleDays = 'يجب اختيار يوم واحد على الأقل للشهر';
      }
    }

    setScheduleFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleScheduleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateScheduleForm()) {
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const url = editingSchedule 
        ? `/mobile-live-data/schedules/${editingSchedule.id}`
        : '/mobile-live-data/schedules';
      
      const method = editingSchedule ? 'put' : 'post';
      
      // Prepare schedule data based on type
      const scheduleData = {
        ...scheduleForm,
        schedule_type: scheduleForm.isAutoSchedule ? 'interval' : scheduleForm.scheduleType,
        schedule_time: scheduleForm.isAutoSchedule ? scheduleForm.intervalMinutes.toString() : scheduleForm.scheduleTime,
        interval_minutes: scheduleForm.isAutoSchedule ? scheduleForm.intervalMinutes : null
      };
      
      const response = await api[method](url, scheduleData);

      if (response.data.success) {
        toast.success(editingSchedule ? 'تم تحديث الجدول الزمني بنجاح' : 'تم إنشاء الجدول الزمني بنجاح');
        setScheduleModalOpen(false);
        setEditingSchedule(null);
        setScheduleForm({ 
          scheduleName: '', 
          scheduleType: 'daily', 
          scheduleTime: '09:00', 
          scheduleDays: [], 
          dataTypes: [],
          isAutoSchedule: false,
          intervalMinutes: 60
        });
        setScheduleFormErrors({});
        fetchSchedules();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الجدول الزمني');
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      scheduleName: schedule.schedule_name,
      scheduleType: schedule.schedule_type,
      scheduleTime: schedule.schedule_time,
      scheduleDays: schedule.schedule_days || [],
      dataTypes: schedule.data_types,
      isAutoSchedule: schedule.schedule_type === 'interval',
      intervalMinutes: schedule.interval_minutes || 60
    });
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      const response = await api.delete(`/mobile-live-data/schedules/${scheduleId}`);
      if (response.data.success) {
        toast.success('تم حذف الجدول الزمني بنجاح');
        fetchSchedules();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الجدول الزمني');
    }
  };

  const getScheduleTypeArabicName = (type: string): string => {
    const types: Record<string, string> = {
      'daily': 'يومي',
      'weekly': 'أسبوعي',
      'monthly': 'شهري',
      'custom': 'مخصص'
    };
    return types[type] || type;
  };

  const getScheduleStatusBadge = (schedule: any) => {
    if (!schedule.is_active) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">معطل</Badge>;
    }
    
    const now = new Date();
    const nextRun = new Date(schedule.next_run);
    
    if (nextRun <= now) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">مستحق التنفيذ</Badge>;
    }
    
    return <Badge variant="secondary" className="bg-green-100 text-green-800">نشط</Badge>;
  };



  const getIntervalDisplay = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    } else if (minutes === 60) {
      return 'ساعة واحدة';
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ساعة`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} يوم`;
    }
  };

  // Data Upload Functions
  const fetchDataAvailability = async () => {
    if (!hasFeatureAccess('mobile_live_data')) return;
    
    setIsLoadingDataAvailability(true);
    try {
      const response = await api.get('/mobile-live-data/data-availability');
      if (response.data.success) {
        setDataAvailability(response.data.data);
        
      }
    } catch (error) {
      console.error('Error fetching data availability:', error);
      // Handle network connectivity issues gracefully
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network') || error.message?.includes('fetch')) {
        setDataAvailability({});
        // Don't show error toast for network issues
      }
    } finally {
      setIsLoadingDataAvailability(false);
    }
  };

  const handleUploadAllData = async () => {
    setIsUploadingData(true);
    setUploadProgress(null);
    
    try {
      // Get data from local database first
      const dataTypes = ['sales', 'purchases', 'expenses', 'products', 'suppliers', 'customers', 'debts', 'installments'];
      const allData = {};
      
      for (const dataType of dataTypes) {
        setUploadProgress({
          current: dataTypes.indexOf(dataType) + 1,
          total: dataTypes.length,
          dataType
        });
        
        try {
          // Get local data for this type
          const localDataResponse = await api.get(`/mobile-live-data/local-data/${dataType}`);
          if (localDataResponse.data.success && localDataResponse.data.data) {
            const localData = localDataResponse.data.data;
            if (Array.isArray(localData) && localData.length > 0) {
              allData[dataType] = localData;
              
            } else {
              return;
            }
          } else {
            return;
          }
        } catch (error) {
          console.error(`❌ Error getting data for ${dataType}:`, error);
        }
      }
      
      // Get the userId from license (await the function!)
      const licenseUserId = await getCurrentUserId();

      // Upload all collected data with correct userId
      const response = await api.post('/mobile-live-data/upload', {
        data: {
          ...allData,
          userId: licenseUserId
        }
      });

      if (response.data.success) {
        const totalRecords = Object.values(allData).reduce((total: number, data: any) => total + (Array.isArray(data) ? data.length : 0), 0);
        
        toast.success(`تم رفع ${totalRecords} سجل بنجاح`);
      } else {
        throw new Error(response.data.message || 'حدث خطأ أثناء رفع البيانات');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء رفع البيانات');
    } finally {
      setIsUploadingData(false);
      setUploadProgress(null);
    }
  };

  const handleSyncAllData = async () => {
    setIsUploadingData(true);
    setUploadProgress(null);
    
    try {
      const dataTypes = ['sales', 'purchases', 'expenses', 'products', 'suppliers', 'customers', 'debts', 'installments'];
      let totalRecords = 0;
      
      for (const dataType of dataTypes) {
        setUploadProgress({
          current: dataTypes.indexOf(dataType) + 1,
          total: dataTypes.length,
          dataType
        });
        
        try {
          const response = await api.post(`/mobile-live-data/sync/${dataType}`);
          if (response.data.success) {
            totalRecords += response.data.data?.count || 0;
          }
        } catch (error) {
          console.error(`❌ Error syncing ${dataType}:`, error);
        }
      }
      
      toast.success(`تم مزامنة ${totalRecords} سجل بنجاح`);
    } catch (error) {
      toast.error('حدث خطأ أثناء مزامنة البيانات');
    } finally {
      setIsUploadingData(false);
      setUploadProgress(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels = {
      admin: 'مشرف',
      manager: 'مدير',
      user: 'مستخدم'
    };
    
    const roleColors = {
      admin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      user: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <Badge className={`${roleColors[role as keyof typeof roleColors]} flex items-center gap-1`}>
        {getRoleIcon(role)}
        {roleLabels[role as keyof typeof roleLabels]}
      </Badge>
    );
  };

  // Permission management functions
  const fetchAllPermissions = async () => {
    try {
      const response = await api.get('/auth/permissions/grouped');
      if (response.data.success) {
        const permissions = response.data.data;
        setPermissionsByCategory(permissions);
        
        // Flatten permissions for the allPermissions state
        const allPerms = Object.values(permissions).flat() as Permission[];
        setAllPermissions(allPerms);
      }
    } catch (error) {
      toast.error('فشل في تحميل الصلاحيات');
    }
  };

  const fetchUserPermissions = async (userId: number) => {
    try {
      setIsLoadingPermissions(true);
      const response = await api.get(`/users/${userId}/permissions`);
      if (response.data.success) {
        setUserPermissions(response.data.data);
      }
    } catch (error) {
      toast.error('فشل في تحميل صلاحيات المستخدم');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleOpenPermissionsModal = async (user: Admin) => {
    setSelectedUserForPermissions(user);
    setPermissionsModalOpen(true);
    resetPermissionForm();
    await fetchAllPermissions();
    await fetchUserPermissions(user.id);
  };

  const handleGrantPermission = async () => {
    if (!selectedUserForPermissions || !selectedPermission) {
      toast.error('يرجى اختيار صلاحية');
      return;
    }

    try {
      setIsGrantingPermission(true);
      const permissionData: PermissionGrant = {
        permission_id: selectedPermission,
        expires_at: permissionExpiresAt || undefined
      };

      const response = await api.post(
        `/users/${selectedUserForPermissions.id}/permissions`,
        permissionData
      );

      if (response.data.success) {
        toast.success('تم منح الصلاحية بنجاح');
        setSelectedPermission('');
        setPermissionExpiresAt('');
        await fetchUserPermissions(selectedUserForPermissions.id);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في منح الصلاحية');
    } finally {
      setIsGrantingPermission(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!selectedUserForPermissions) return;

    try {
      const response = await api.delete(
        `/users/${selectedUserForPermissions.id}/permissions/${permissionId}`
      );

      if (response.data.success) {
        toast.success('تم إلغاء الصلاحية بنجاح');
        await fetchUserPermissions(selectedUserForPermissions.id);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في إلغاء الصلاحية');
    }
  };

  const getPermissionSource = (permissionId: string): 'role' | 'custom' | null => {
    if (!userPermissions) return null;
    
    if (userPermissions.customPermissions.some(p => p.permission_id === permissionId)) {
      return 'custom';
    }
    
    if (userPermissions.rolePermissions.some(p => p.permission_id === permissionId)) {
      return 'role';
    }
    
    return null;
  };

  // Get role permissions for display in user creation form
  const getRolePermissionsInfo = (role: string) => {
    const rolePermissions = {
      admin: {
        count: 'جميع الصلاحيات',
        description: 'وصول كامل لجميع ميزات النظام',
        categories: ['المنتجات', 'المبيعات', 'العملاء', 'التقارير', 'الإعدادات', 'المستخدمين', 'النسخ الاحتياطية', 'الصندوق', 'المخزون', 'المشتريات', 'الموردين', 'الديون', 'الأقساط']
      },
      manager: {
        count: 'لا توجد صلاحيات افتراضية',
        description: 'يجب على المدير منح الصلاحيات يدوياً',
        categories: ['لا توجد صلاحيات تلقائية']
      },
      user: {
        count: 'لا توجد صلاحيات افتراضية',
        description: 'يجب على المدير منح الصلاحيات يدوياً',
        categories: ['لا توجد صلاحيات تلقائية']
      }
    };
    
    return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.user;
  };

  // Enhanced permission management functions
  const getFilteredPermissions = () => {
    if (!allPermissions.length) return [];
    
    let filtered = allPermissions;
    
    // Filter by search term
    if (permissionSearchTerm) {
      filtered = filtered.filter(permission => 
        permission.name.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
        permission.description.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
        permission.permission_id.toLowerCase().includes(permissionSearchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (selectedPermissionCategory !== 'all') {
      filtered = filtered.filter(permission => permission.category === selectedPermissionCategory);
    }
    
    // Filter out already granted permissions
    if (userPermissions) {
      const grantedPermissionIds = userPermissions.allPermissions.map(p => p.permission_id);
      filtered = filtered.filter(permission => !grantedPermissionIds.includes(permission.permission_id));
    }
    
    return filtered;
  };

  const getCategoryDisplayName = (category: string): string => {
    const categoryNames: Record<string, string> = {
      'products': 'المنتجات',
      'sales': 'المبيعات',
      'customers': 'العملاء',
      'reports': 'التقارير',
      'settings': 'الإعدادات',
      'users': 'المستخدمين',
      'profile': 'الملف الشخصي',
      'backup': 'النسخ الاحتياطية',
      'cashbox': 'الصندوق',
      'inventory': 'المخزون',
      'purchases': 'المشتريات',
      'suppliers': 'الموردين',
      'debts': 'الديون',
      'installments': 'الأقساط'
    };
    return categoryNames[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'products': <Package className="w-4 h-4" />,
      'sales': <ShoppingCart className="w-4 h-4" />,
      'customers': <Users className="w-4 h-4" />,
      'reports': <BarChart3 className="w-4 h-4" />,
      'settings': <Settings className="w-4 h-4" />,
      'users': <UserCheck className="w-4 h-4" />,
      'profile': <User className="w-4 h-4" />,
      'backup': <Database className="w-4 h-4" />,
      'cashbox': <Wallet className="w-4 h-4" />,
      'inventory': <PackageOpen className="w-4 h-4" />,
      'purchases': <ShoppingBag className="w-4 h-4" />,
      'suppliers': <Truck className="w-4 h-4" />,
      'debts': <CreditCard className="w-4 h-4" />,
      'installments': <Calendar className="w-4 h-4" />
    };
    return icons[category] || <Key className="w-4 h-4" />;
  };

  const handleBulkGrantPermissions = async () => {
    if (!selectedUserForPermissions || selectedPermissionsForBulk.length === 0) {
      toast.error('يرجى اختيار صلاحيات للمنح');
      return;
    }

    try {
      setIsGrantingPermission(true);
      
      const promises = selectedPermissionsForBulk.map(permissionId => {
        const permissionData: PermissionGrant = {
          permission_id: permissionId,
          expires_at: permissionExpiresAt || undefined
        };
        return api.post(`/users/${selectedUserForPermissions.id}/permissions`, permissionData);
      });

      await Promise.all(promises);
      
      toast.success(`تم منح ${selectedPermissionsForBulk.length} صلاحية بنجاح`);
      setSelectedPermissionsForBulk([]);
      setPermissionExpiresAt('');
      await fetchUserPermissions(selectedUserForPermissions.id);
    } catch (error) {
      toast.error('فشل في منح بعض الصلاحيات');
    } finally {
      setIsGrantingPermission(false);
    }
  };

  const handleConfirmRevokePermission = (permissionId: string) => {
    setPermissionToRevoke(permissionId);
    setShowRevokeConfirm(true);
  };

  const handleConfirmRevoke = async () => {
    if (!permissionToRevoke || !selectedUserForPermissions) return;

    try {
      setIsRevokingPermission(true);
      await handleRevokePermission(permissionToRevoke);
    } finally {
      setIsRevokingPermission(false);
      setShowRevokeConfirm(false);
      setPermissionToRevoke(null);
    }
  };

  const handleBulkRevokePermissions = async () => {
    if (!selectedUserForPermissions || selectedPermissionsForRevoke.length === 0) {
      toast.error('يرجى اختيار صلاحيات للإلغاء');
      return;
    }

    try {
      setIsRevokingPermission(true);
      
      const promises = selectedPermissionsForRevoke.map(permissionId => 
        api.delete(`/users/${selectedUserForPermissions.id}/permissions/${permissionId}`)
      );

      await Promise.all(promises);
      
      toast.success(`تم إلغاء ${selectedPermissionsForRevoke.length} صلاحية بنجاح`);
      setSelectedPermissionsForRevoke([]);
      await fetchUserPermissions(selectedUserForPermissions.id);
    } catch (error) {
      toast.error('فشل في إلغاء بعض الصلاحيات');
    } finally {
      setIsRevokingPermission(false);
      setShowBulkRevokeConfirm(false);
    }
  };

  const handleConfirmBulkRevoke = () => {
    setShowBulkRevokeConfirm(true);
  };

  // Role permission management functions
  const handleRevokeRolePermission = async (permissionId: string) => {
    if (!selectedUserForPermissions) return;

    try {
      const response = await api.delete(
        `/users/${selectedUserForPermissions.id}/role-permissions/${permissionId}`
      );

      if (response.data.success) {
        toast.success('تم إلغاء صلاحية الدور بنجاح');
        await fetchUserPermissions(selectedUserForPermissions.id);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في إلغاء صلاحية الدور');
    }
  };

  const handleConfirmRevokeRolePermission = (permissionId: string) => {
    setRolePermissionToRevoke(permissionId);
    setShowRolePermissionRevokeConfirm(true);
  };

  const handleConfirmRevokeRole = async () => {
    if (!rolePermissionToRevoke || !selectedUserForPermissions) return;

    try {
      setIsRevokingRolePermission(true);
      await handleRevokeRolePermission(rolePermissionToRevoke);
    } finally {
      setIsRevokingRolePermission(false);
      setShowRolePermissionRevokeConfirm(false);
      setRolePermissionToRevoke(null);
    }
  };

  const handleBulkRevokeRolePermissions = async () => {
    if (!selectedUserForPermissions || selectedRolePermissionsForRevoke.length === 0) {
      toast.error('يرجى اختيار صلاحيات دور للإلغاء');
      return;
    }

    try {
      setIsRevokingRolePermission(true);
      
      const promises = selectedRolePermissionsForRevoke.map(permissionId => 
        api.delete(`/users/${selectedUserForPermissions.id}/role-permissions/${permissionId}`)
      );

      await Promise.all(promises);
      
      toast.success(`تم إلغاء ${selectedRolePermissionsForRevoke.length} صلاحية دور بنجاح`);
      setSelectedRolePermissionsForRevoke([]);
      await fetchUserPermissions(selectedUserForPermissions.id);
    } catch (error) {
      toast.error('فشل في إلغاء بعض صلاحيات الدور');
    } finally {
      setIsRevokingRolePermission(false);
      setShowRolePermissionRevokeConfirm(false);
    }
  };

  const handleConfirmBulkRevokeRole = () => {
    setShowRolePermissionRevokeConfirm(true);
  };

  const canEditRolePermissions = () => {
    // Only allow editing if user has admin or manager role and is not editing their own permissions
    const currentUser = admins.find(admin => admin.username === localStorage.getItem('username'));
    if (!currentUser || !selectedUserForPermissions) return false;
    
    return (currentUser.role === 'admin' || currentUser.role === 'manager') && 
           currentUser.id !== selectedUserForPermissions.id;
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const resetPermissionForm = () => {
    setSelectedPermission('');
    setPermissionExpiresAt('');
    setSelectedPermissionsForBulk([]);
    setSelectedPermissionsForRevoke([]);
    setSelectedRolePermissionsForRevoke([]);
    setPermissionSearchTerm('');
    setSelectedPermissionCategory('all');
    setEnableRolePermissionEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ direction: 'rtl', textAlign: 'right' }}>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
         
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">إدارة المشرفين</h1>
          <p className="text-muted-foreground">إدارة حسابات المستخدمين والصلاحيات والبيانات المباشرة</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" />
              معلومات الشركة
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Users className="w-4 h-4" />
              إدارة المشرفين
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2">
              <Settings className="w-4 h-4" />
              إدارة
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2">
              <SmartphoneIcon className="w-4 h-4" />
              البيانات المباشرة
            </TabsTrigger>
          </TabsList>

          {/* Company Information Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  معلومات الشركة
                </CardTitle>
                <CardDescription>
                  تحديث معلومات الشركة الأساسية والإعدادات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Info Display */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden border-2 border-background shadow-lg">
                      {settingsForm.logo_url ? (
                        <img 
                          src={getLogoUrl(settingsForm.logo_url)} 
                          alt="Logo" 
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTEyIDEyYzItMiAyLTQgMi02IDAtNC00LTQtNC00UzYgMiA2IDZjMCAyIDAgNCAyIDZ6TTQgMThjMC0yIDItNC42IDgtNC42czggMi42IDggNC42IiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';
                          }}
                        />
                      ) : (
                        <span className="text-primary-foreground text-xl font-bold">ش</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{settingsForm.company_name || 'اسم الشركة/المتجر'}</h2>
                      <p className="text-muted-foreground">{settingsForm.mobile || 'رقم الهاتف'}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSettingsModalOpen(true)}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    تعديل الإعدادات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Management Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  إدارة المشرفين
                </CardTitle>
                <CardDescription>
                  إدارة حسابات المستخدمين والصلاحيات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="flex justify-end">
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={handleOpenModal}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        إضافة مشرف جديد
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rtl max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide p-4">
                      <DialogHeader>
                        <DialogTitle className="text-right text-xl font-bold">
                          {editingAdmin ? 'تعديل المشرف' : 'إضافة مشرف جديد'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-6 text-right">
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-right block font-medium">اسم المستخدم</Label>
                          <Input
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className={`text-right ${formErrors.username ? 'border-red-500' : ''}`}
                            dir="rtl"
                            placeholder="أدخل اسم المستخدم"
                          />
                          {formErrors.username && (
                            <p className="text-sm text-red-500">{formErrors.username}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-right block font-medium">
                            {editingAdmin ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}
                          </Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`text-right ${formErrors.password ? 'border-red-500' : ''}`}
                            dir="rtl"
                            placeholder="أدخل كلمة المرور"
                          />
                          {formErrors.password && (
                            <p className="text-sm text-red-500">{formErrors.password}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-right block font-medium">الاسم</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`text-right ${formErrors.name ? 'border-red-500' : ''}`}
                            dir="rtl"
                            placeholder="أدخل الاسم الكامل"
                          />
                          {formErrors.name && (
                            <p className="text-sm text-red-500">{formErrors.name}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-right block font-medium">الدور</Label>
                          <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            dir="rtl"
                          >
                            <option value="user">مستخدم</option>
                            <option value="manager">مدير</option>
                            <option value="admin">مشرف</option>
                          </select>
                        </div>

                        {/* Role Permissions Preview */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">الصلاحيات الممنوحة</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">نوع الصلاحيات:</span>
                              <Badge variant="secondary" className="text-xs">
                                {getRolePermissionsInfo(formData.role).count}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getRolePermissionsInfo(formData.role).description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {getRolePermissionsInfo(formData.role).categories.slice(0, 4).map((category, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                              {getRolePermissionsInfo(formData.role).categories.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{getRolePermissionsInfo(formData.role).categories.length - 4} أكثر
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Custom Permissions Selector */}
                        {!editingAdmin && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-right block font-medium">الصلاحيات المخصصة</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPermissionSelector(!showPermissionSelector)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                {showPermissionSelector ? (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    إخفاء
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    إضافة صلاحيات مخصصة
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {selectedUserPermissions.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Key className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">
                                    {selectedUserPermissions.length} صلاحية مخصصة محددة
                                  </span>
                            </div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedUserPermissions.slice(0, 3).map((permissionId) => {
                                    const permission = allPermissions.find(p => p.permission_id === permissionId);
                                    return permission ? (
                                      <Badge key={permissionId} variant="outline" className="text-xs bg-blue-100">
                                        {permission.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {selectedUserPermissions.length > 3 && (
                                    <Badge variant="outline" className="text-xs bg-blue-100">
                                      +{selectedUserPermissions.length - 3} أكثر
                                    </Badge>
                                  )}
                          </div>
                        </div>
                            )}

                            {showPermissionSelector && (
                              <div className="bg-muted/30 border rounded-lg p-4 max-h-60 overflow-y-auto">
                                <div className="space-y-3">
                                  {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                                    <div key={category} className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        {getCategoryIcon(category)}
                                        <h5 className="font-medium text-sm">{getCategoryDisplayName(category)}</h5>
                                        <Badge variant="secondary" className="text-xs">
                                          {permissions.length}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {permissions.map((permission) => (
                                          <div key={permission.permission_id} className="flex items-center gap-2">
                                            <Checkbox
                                              id={`perm-${permission.permission_id}`}
                                              checked={selectedUserPermissions.includes(permission.permission_id)}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  setSelectedUserPermissions(prev => [...prev, permission.permission_id]);
                                                } else {
                                                  setSelectedUserPermissions(prev => 
                                                    prev.filter(id => id !== permission.permission_id)
                                                  );
                                                }
                                              }}
                                            />
                                            <Label 
                                              htmlFor={`perm-${permission.permission_id}`}
                                              className="text-sm cursor-pointer flex-1"
                                            >
                                              <div className="font-medium">{permission.name}</div>
                                              <div className="text-xs text-muted-foreground">{permission.description}</div>
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {editingAdmin ? 'تحديث' : 'إضافة'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsModalOpen(false);
                              setFormErrors({});
                            }}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right font-semibold text-foreground">الاسم</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">اسم المستخدم</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">الدور</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">تاريخ الإنشاء</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins && admins.length > 0 ? (
                        admins.map((admin) => (
                          <TableRow key={admin.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium text-foreground">{admin.name}</TableCell>
                            <TableCell className="text-muted-foreground">{admin.username}</TableCell>
                            <TableCell>
                              {getRoleBadge(admin.role)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(admin.created_at).toLocaleDateString('ar-IQ')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleOpenPermissionsModal(admin)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="إدارة الصلاحيات"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEdit(admin)}
                                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(admin.id)}
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            لا يوجد مشرفين
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Representatives Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    إدارة المندوبين
                  </CardTitle>
                  <CardDescription>
                    إدارة مندوبي العملاء والعلاقات التجارية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      إدارة المندوبين المسؤولين عن العملاء
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/representatives')}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إدارة المندوبين
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium">المندوبون</h4>
                        <p className="text-sm text-muted-foreground">
                          إضافة وتعديل وحذف مندوبي العملاء
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employees Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    إدارة الموظفين
                  </CardTitle>
                  <CardDescription>
                    إدارة الموظفين والرواتب والعمولات
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      إدارة الموظفين والرواتب والعمولات
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/employees')}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إدارة الموظفين
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-medium">الموظفون</h4>
                        <p className="text-sm text-muted-foreground">
                          إدارة الموظفين والرواتب والعمولات
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mobile Live Data Tab */}
          <TabsContent value="mobile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SmartphoneIcon className="w-5 h-5" />
                  البيانات المباشرة للموبايل مع تطبيق <span className="text-[#007bff] font-bold">دفتري</span>
                </CardTitle>
                {/* <CardDescription>
                  إدارة مزامنة البيانات مع الأجهزة المحمولة في الوقت الفعلي
                </CardDescription> */}
              </CardHeader>
              <CardContent className="space-y-6">
                {hasFeatureAccess('mobile_live_data') ? (
                  <div className="space-y-6">
                    {/* Status Overview - Simplified */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-green-800">مفعلة</h3>
                            <p className="text-sm text-green-600">الميزة نشطة</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wifi className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-800">الاتصال</h3>
                            <p className="text-sm text-blue-600">فحص الحالة</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connection & Data Status - Combined */}
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground">حالة النظام</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={checkMobileLiveDataStatus}
                          disabled={isCheckingStatus}
                          className="gap-2"
                        >
                          {isCheckingStatus ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          تحديث
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Connection Status */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">حالة الاتصال</h4>
                          {mobileLiveDataStatus ? (
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              {mobileLiveDataStatus.connected ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Wifi className="h-5 w-5" />
                                  <span className="font-medium">متصل بالخادم</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                  <WifiOff className="h-5 w-5" />
                                  <span className="font-medium">غير متصل بالخادم</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">اضغط تحديث لفحص الحالة</div>
                          )}
                        </div>

                        {/* Data Availability */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">توفر البيانات</h4>
                          <div className="flex items-center justify-between">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={fetchDataAvailability}
                              disabled={isLoadingDataAvailability}
                              className="gap-2"
                            >
                              {isLoadingDataAvailability ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              فحص البيانات
                            </Button>
                            {Object.keys(dataAvailability).length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {Object.values(dataAvailability).filter(info => info.exists && info.count > 0).length} نوع متوفر
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions - Simplified */}
                    <div className="bg-card border rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-4">إجراءات سريعة</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button 
                          variant="outline" 
                          className="gap-2 h-12"
                          onClick={handleUploadAllData}
                          disabled={isUploadingData}
                        >
                          {isUploadingData ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          رفع جميع البيانات
                        </Button>

                        <Button 
                          variant="outline" 
                          className="gap-2 h-12"
                          onClick={handleSyncAllData}
                          disabled={isUploadingData}
                        >
                          {isUploadingData ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          مزامنة جميع البيانات
                        </Button>

                        <Button 
                          variant="outline" 
                          className="gap-2 h-12"
                          onClick={() => setScheduleModalOpen(true)}
                        >
                          <Calendar className="h-4 w-4" />
                          إضافة جدول زمني
                        </Button>
                      </div>
                       
                       {/* Upload Progress */}
                       {uploadProgress && (
                         <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-sm font-medium text-blue-800">
                               جاري المزامنة: {getDataTypeArabicName(uploadProgress.dataType)}
                             </span>
                             <span className="text-sm text-blue-600">
                               {uploadProgress.current} / {uploadProgress.total}
                             </span>
                           </div>
                           <div className="w-full bg-blue-200 rounded-full h-2">
                             <div 
                               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                               style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                             ></div>
                           </div>
                         </div>
                       )}
                     </div>

                    {/* Data Types Grid - Simplified */}
                    {Object.keys(dataAvailability).length > 0 && (
                      <div className="bg-card border rounded-lg p-4">
                        <h3 className="font-semibold text-foreground mb-4">أنواع البيانات</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(dataAvailability).map(([dataType, info]) => (
                            <div key={dataType} className="p-3 bg-muted/30 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{getDataTypeArabicName(dataType)}</span>
                                <div className={`w-2 h-2 rounded-full ${
                                  info.status === 'has_data' ? 'bg-green-500' :
                                  info.status === 'empty' ? 'bg-yellow-500' :
                                  info.status === 'table_missing' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`}></div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {info.exists ? (
                                  <span>{info.count} سجل</span>
                                ) : (
                                  <span className="text-red-600">غير متوفر</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}



                     {/* Mobile Users Management */}
                    {/* Mobile Users - Simplified */}
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground">مستخدمي البيانات المباشرة</h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchMobileUsers}
                            disabled={isLoadingMobileUsers}
                            className="gap-2"
                          >
                            {isLoadingMobileUsers ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            تحديث
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              try {
                                await remoteServerService.refreshUserId();
                                toast.success('تم تحديث معرف المستخدم');
                                fetchMobileUsers();
                              } catch (error) {
                                toast.error('فشل في تحديث معرف المستخدم');
                              }
                            }}
                            className="gap-2"
                          >
                            تحديث المعرف
                          </Button>
                          {!hasManagerUser && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setMobileUserModalOpen(true)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              إضافة مستخدم
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {isLoadingMobileUsers ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : mobileUsers.length > 0 ? (
                        <div className="space-y-3">
                          {mobileUsers.map((user) => (
                            <div key={user._id} className="border rounded-lg p-3 bg-card">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {user.username || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {user.name || 'Unknown'} • {user.users?.length || 0} مستخدم فرعي
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                    {user.role || 'unknown'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditMobileUser(user)}
                                    className="h-6 w-6 p-0"
                                    title="تعديل المستخدم"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {user.users && user.users.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const currentExpanded = expandedUsers.includes(user._id);
                                        if (currentExpanded) {
                                          setExpandedUsers(expandedUsers.filter(id => id !== user._id));
                                        } else {
                                          setExpandedUsers([...expandedUsers, user._id]);
                                        }
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedUsers.includes(user._id) ? 'rotate-180' : ''}`} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Sub-users list */}
                              {user.users && user.users.length > 0 && expandedUsers.includes(user._id) && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium text-muted-foreground">المستخدمين الفرعيين:</span>
                                    </div>
                                    {user.users.map((subUser: any, index: number) => (
                                      <div key={subUser._id || index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-secondary/50 rounded-full flex items-center justify-center">
                                            <User className="w-3 h-3 text-secondary-foreground" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-foreground">
                                              {subUser.username || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {subUser.role || 'user'}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {subUser.role || 'user'}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm">لا يوجد مستخدمين</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            تأكد من الاتصال بالإنترنت لعرض المستخدمين
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMobileUserModalOpen(true)}
                            className="mt-2"
                          >
                            إضافة مستخدم جديد
                          </Button>
                        </div>
                      )}
                    </div>

                     {/* Unified Data Synchronization Management */}
                     <div className="bg-card border rounded-lg p-4">
                       <div className="flex items-center justify-between mb-6">
                         <div>
                           <h3 className="font-semibold text-foreground">إدارة مزامنة البيانات</h3>
                           <p className="text-sm text-muted-foreground">
                             تكوين الرفع التلقائي والجدولة اليدوية للبيانات
                           </p>
                         </div>
                         <div className="flex gap-2">
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={fetchSchedules}
                             disabled={isLoadingSchedules}
                             className="gap-2"
                           >
                             {isLoadingSchedules ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <RefreshCw className="h-4 w-4" />
                             )}
                             تحديث
                           </Button>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => setScheduleModalOpen(true)}
                             className="gap-2"
                           >
                             <Plus className="h-4 w-4" />
                             إضافة جدول زمني
                           </Button>
                         </div>
                       </div>



                       {/* Manual Schedules Section */}
                       <div>
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                               <Calendar className="w-5 h-5 text-blue-600" />
                             </div>
                             <div>
                               <h4 className="font-semibold text-foreground">الجداول الزمنية اليدوية</h4>
                               <p className="text-sm text-muted-foreground">
                                 جدولة مزامنة البيانات في أوقات محددة
                               </p>
                             </div>
                           </div>
                         </div>
                       
                       {isLoadingSchedules ? (
                         <div className="flex justify-center items-center py-8">
                           <Loader2 className="h-8 w-8 animate-spin" />
                         </div>
                       ) : schedules.length > 0 ? (
                         <div className="space-y-4">
                           {schedules.map((schedule) => {
                             const isAutoUploadSchedule = schedule.schedule_name === 'الرفع التلقائي';
                             return (
                               <div key={schedule.id} className={`border rounded-lg p-4 ${isAutoUploadSchedule ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
                                 <div className="flex items-center justify-between mb-3">
                                   <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                       isAutoUploadSchedule ? 'bg-green-100' : 'bg-primary/10'
                                     }`}>
                                       {isAutoUploadSchedule ? (
                                         <Upload className="w-5 h-5 text-green-600" />
                                       ) : (
                                         <RefreshCw className="w-5 h-5 text-primary" />
                                       )}
                                     </div>
                                     <div>
                                       <div className="flex items-center gap-2">
                                         <h4 className="font-semibold text-foreground">
                                           {schedule.schedule_name}
                                         </h4>
                                         {isAutoUploadSchedule && (
                                           <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                             تلقائي
                                           </Badge>
                                         )}
                                       </div>
                                       <p className="text-sm text-muted-foreground">
                                         {getScheduleTypeArabicName(schedule.schedule_type)} • {schedule.schedule_time}
                                       </p>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     {getScheduleStatusBadge(schedule)}
                                     {!isAutoUploadSchedule && (
                                       <>
                                         <Button 
                                           variant="ghost" 
                                           size="sm" 
                                           onClick={() => handleEditSchedule(schedule)}
                                           className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                         >
                                           <Pencil className="h-4 w-4" />
                                         </Button>
                                         <Button 
                                           variant="ghost" 
                                           size="sm" 
                                           onClick={() => handleDeleteSchedule(schedule.id)}
                                           className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                         >
                                           <Trash2 className="h-4 w-4" />
                                         </Button>
                                       </>
                                     )}
                                   </div>
                                 </div>
                               
                               {/* Schedule Details */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                 <div>
                                   <p className="font-medium text-muted-foreground mb-1">أنواع البيانات:</p>
                                   <div className="flex flex-wrap gap-1">
                                     {schedule.data_types.map((dataType: string) => (
                                       <Badge key={dataType} variant="outline" className="text-xs">
                                         {getDataTypeArabicName(dataType)}
                                       </Badge>
                                     ))}
                                   </div>
                                 </div>
                                 
                                 <div>
                                   <p className="font-medium text-muted-foreground mb-1">تفاصيل التنفيذ:</p>
                                   <div className="space-y-1">
                                     <p className="text-xs">
                                       <span className="font-medium">آخر تنفيذ:</span> {schedule.last_run ? new Date(schedule.last_run).toLocaleDateString('ar-IQ') : 'لم يتم التنفيذ بعد'}
                                     </p>
                                     <p className="text-xs">
                                       <span className="font-medium">المرة القادمة:</span> {new Date(schedule.next_run).toLocaleDateString('ar-IQ')} {schedule.schedule_time}
                                     </p>
                                     <p className="text-xs">
                                       <span className="font-medium">عدد المرات:</span> {schedule.total_runs}
                                     </p>
                                   </div>
                                 </div>
                               </div>

                               {/* Schedule Days (for weekly/monthly) */}
                               {schedule.schedule_days && schedule.schedule_days.length > 0 && (
                                 <div className="mt-3">
                                   <p className="font-medium text-muted-foreground mb-1 text-sm">الأيام المحددة:</p>
                                   <div className="flex flex-wrap gap-1">
                                     {schedule.schedule_days.map((day: string) => (
                                       <Badge key={day} variant="secondary" className="text-xs">
                                         {day}
                                       </Badge>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                         </div>
                       ) : (
                         <div className="text-center py-8 text-muted-foreground">
                           <RefreshCw className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                           <p>لا توجد جداول زمنية</p>
                           <p className="text-xs text-muted-foreground/70 mt-1">
                             تأكد من الاتصال بالإنترنت لعرض الجداول الزمنية
                           </p>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={() => setScheduleModalOpen(true)}
                             className="mt-3"
                           >
                             إضافة جدول زمني جديد
                           </Button>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
                ) : (
                  <div className="space-y-6">
                    {/* Feature Not Activated */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">الميزة غير مفعلة</h3>
                      <p className="text-red-600 mb-4">
                        ميزة البيانات المباشرة تتيح لك مزامنة البيانات مع الأجهزة المحمولة في الوقت الفعلي.
                        <br />
                        قم بتفعيل الميزة للاستفادة من هذه الخدمة.
                      </p>
                      <Button 
                        onClick={() => setMobileLiveDataModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        size="lg"
                      >
                        <Smartphone className="h-5 w-5" />
                        تفعيل الميزة
                      </Button>
                    </div>

                    {/* Feature Benefits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wifi className="w-4 h-4 text-blue-600" />
                          </div>
                          <h4 className="font-semibold text-blue-800">مزامنة فورية</h4>
                        </div>
                        <p className="text-sm text-blue-600">
                          مزامنة البيانات مع الأجهزة المحمولة في الوقت الفعلي
                        </p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <SmartphoneIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="font-semibold text-green-800">إدارة الأجهزة</h4>
                        </div>
                        <p className="text-sm text-green-600">
                          إدارة متعددة للأجهزة المحمولة المتصلة
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="font-semibold text-purple-800">إعدادات متقدمة</h4>
                        </div>
                        <p className="text-sm text-purple-600">
                          تخصيص إعدادات المزامنة والاتصال
                        </p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-orange-600" />
                          </div>
                          <h4 className="font-semibold text-orange-800">أمان عالي</h4>
                        </div>
                        <p className="text-sm text-orange-600">
                          حماية البيانات مع تشفير متقدم
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Settings Modal */}
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold">تعديل إعدادات الشركة</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleSettingsSave}>
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden border-2 border-background shadow-lg">
                  {settingsForm.logo_url ? (
                    <img 
                      src={getLogoUrl(settingsForm.logo_url)} 
                      alt="Logo" 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSI+PHBhdGggZD0iMTIgMTJjMi0yIDItNCAyLTYgMC00LTQtNC00LTQtNFM2IDIgNiA2YzAgMiAwIDQgMiA2ek00IDE4YzAtMiAyLTQuNiA4LTQuNnM4IDIuNiA4IDQuNiIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==';
                      }}
                    />
                  ) : (
                    <span className="text-primary-foreground text-lg font-bold">ش</span>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSettingsForm((prev) => ({ ...prev, logo_url: URL.createObjectURL(e.target.files[0]) }));
                    }
                  }} 
                  className="text-sm text-gray-600" 
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-right block font-medium">اسم الشركة أو المتجر</Label>
                <Input 
                  name="company_name" 
                  value={settingsForm.company_name} 
                  onChange={handleSettingsChange}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-right block font-medium">رقم الجوال</Label>
                <Input 
                  name="mobile" 
                  value={settingsForm.mobile} 
                  onChange={handleSettingsChange}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-right block font-medium">العملة</Label>
                <Input 
                  name="currency" 
                  value={settingsForm.currency} 
                  onChange={handleSettingsChange}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button type="submit" disabled={settingsLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {settingsLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSettingsModalOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mobile Live Data Activation Modal */}
        <Dialog open={mobileLiveDataModalOpen} onOpenChange={setMobileLiveDataModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                تفعيل البيانات المباشرة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-right">
                أدخل كود التفعيل الخاص بميزة البيانات المباشرة للموبايل
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="activationCode" className="text-right block font-medium">
                  كود التفعيل
                </Label>
                <Input
                  id="activationCode"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="text-right"
                  dir="rtl"
                  placeholder="أدخل كود التفعيل"
                  disabled={isActivating}
                />
                {activationError && (
                  <p className="text-sm text-red-500 text-right">{activationError}</p>
                )}
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  onClick={handleMobileLiveDataActivation}
                  disabled={isActivating || !activationCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التفعيل...
                    </>
                  ) : (
                    'تفعيل'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setMobileLiveDataModalOpen(false);
                    setActivationCode('');
                    setActivationError(null);
                  }}
                  disabled={isActivating}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile User Creation Modal */}
        <Dialog open={mobileUserModalOpen} onOpenChange={setMobileUserModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {isEditingUser ? 'تعديل مستخدم البيانات المباشرة' : 'إضافة مستخدم للبيانات المباشرة'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-right mt-2">
                {isEditingUser 
                  ? 'سيتم تحديث بيانات المستخدم في الخادم البعيد'
                  : 'سيتم إضافة هذا المستخدم إلى بيانات المستخدم الحالي في الخادم البعيد'
                }
              </p>
            </DialogHeader>
            <form onSubmit={handleCreateMobileUser} className="space-y-4">
             
              
              <div className="space-y-2">
                <Label htmlFor="mobileUsername" className="text-right block font-medium">
                  اسم المستخدم
                </Label>
                <Input
                  id="mobileUsername"
                  name="username"
                  value={mobileUserForm.username}
                  onChange={handleMobileUserInputChange}
                  className={`text-right ${mobileUserFormErrors.username ? 'border-red-500' : ''}`}
                  dir="rtl"
                  placeholder="أدخل اسم المستخدم"
                  disabled={isCreatingMobileUser}
                />
                {mobileUserFormErrors.username && (
                  <p className="text-sm text-red-500 text-right">{mobileUserFormErrors.username}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobileName" className="text-right block font-medium">
                  الاسم الكامل
                </Label>
                <Input
                  id="mobileName"
                  name="name"
                  value={mobileUserForm.name}
                  onChange={handleMobileUserInputChange}
                  className={`text-right ${mobileUserFormErrors.name ? 'border-red-500' : ''}`}
                  dir="rtl"
                  placeholder="أدخل الاسم الكامل"
                  disabled={isCreatingMobileUser}
                />
                {mobileUserFormErrors.name && (
                  <p className="text-sm text-red-500 text-right">{mobileUserFormErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobilePassword" className="text-right block font-medium">
                  كلمة المرور
                </Label>
                <Input
                  id="mobilePassword"
                  name="password"
                  type="password"
                  value={mobileUserForm.password}
                  onChange={handleMobileUserInputChange}
                  className={`text-right ${mobileUserFormErrors.password ? 'border-red-500' : ''}`}
                  dir="rtl"
                  placeholder={isEditingUser ? "اتركها فارغة إذا لم ترد تغييرها" : "أدخل كلمة المرور"}
                  disabled={isCreatingMobileUser}
                />
                {mobileUserFormErrors.password && (
                  <p className="text-sm text-red-500 text-right">{mobileUserFormErrors.password}</p>
                )}
                {isEditingUser && (
                  <p className="text-xs text-muted-foreground text-right">
                    اترك كلمة المرور فارغة إذا لم ترد تغييرها
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobileRole" className="text-right block font-medium">
                  الدور
                </Label>
                <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-right text-muted-foreground">
                  مدير (ثابت)
                </div>
                <p className="text-xs text-muted-foreground">يمكن إضافة مستخدم واحد فقط بدور مدير</p>
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  type="submit"
                  disabled={isCreatingMobileUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreatingMobileUser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditingUser ? 'جاري التحديث...' : 'جاري الإنشاء...'}
                    </>
                  ) : (
                    isEditingUser ? 'تحديث المستخدم' : 'إنشاء المستخدم'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setMobileUserModalOpen(false);
                    resetMobileUserForm();
                  }}
                  disabled={isCreatingMobileUser}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المشرف؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Schedule Creation/Editing Modal */}
        <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                {editingSchedule ? 'تعديل الجدول الزمني' : 'إضافة جدول زمني جديد'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-right mt-2">
                قم بتكوين جدول زمني لمزامنة البيانات تلقائياً مع الخادم البعيد
              </p>
            </DialogHeader>
            <form onSubmit={handleScheduleSubmit} className="space-y-6">
              {/* Schedule Type Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">نوع الجدول الزمني</h4>
                      <p className="text-sm text-muted-foreground">
                        اختر بين الجدولة اليدوية أو التلقائية
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduleForm.isAutoSchedule}
                      onChange={(e) => {
                        setScheduleForm(prev => ({
                          ...prev,
                          isAutoSchedule: e.target.checked
                        }));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      جدولة تلقائية
                    </span>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleName" className="text-right block font-medium">
                      اسم الجدول الزمني
                    </Label>
                    <Input
                      id="scheduleName"
                      name="scheduleName"
                      value={scheduleForm.scheduleName}
                      onChange={handleScheduleInputChange}
                      className={`text-right ${scheduleFormErrors.scheduleName ? 'border-red-500' : ''}`}
                      dir="rtl"
                      placeholder="مثال: مزامنة يومية للمبيعات"
                    />
                    {scheduleFormErrors.scheduleName && (
                      <p className="text-sm text-red-500 text-right">{scheduleFormErrors.scheduleName}</p>
                    )}
                  </div>

                  {!scheduleForm.isAutoSchedule && (
                    <div className="space-y-2">
                      <Label htmlFor="scheduleType" className="text-right block font-medium">
                        نوع الجدول الزمني
                      </Label>
                      <select
                        id="scheduleType"
                        name="scheduleType"
                        value={scheduleForm.scheduleType}
                        onChange={handleScheduleInputChange}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-right"
                        dir="rtl"
                      >
                        <option value="daily">يومي</option>
                        <option value="weekly">أسبوعي</option>
                        <option value="monthly">شهري</option>
                        <option value="custom">مخصص</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Time and Interval Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduleForm.isAutoSchedule ? (
                  <div className="space-y-2">
                    <Label htmlFor="intervalMinutes" className="text-right block font-medium">
                      الفترة الزمنية (دقائق)
                    </Label>
                    <Input
                      id="intervalMinutes"
                      name="intervalMinutes"
                      type="number"
                      min="1"
                      max="10080"
                      value={scheduleForm.intervalMinutes}
                      onChange={handleScheduleInputChange}
                      className={`text-right ${scheduleFormErrors.intervalMinutes ? 'border-red-500' : ''}`}
                      dir="rtl"
                    />
                    <p className="text-xs text-muted-foreground">
                      {getIntervalDisplay(scheduleForm.intervalMinutes)}
                    </p>
                    {scheduleFormErrors.intervalMinutes && (
                      <p className="text-sm text-red-500 text-right">{scheduleFormErrors.intervalMinutes}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="scheduleTime" className="text-right block font-medium">
                      وقت التنفيذ
                    </Label>
                    <Input
                      id="scheduleTime"
                      name="scheduleTime"
                      type="time"
                      value={scheduleForm.scheduleTime}
                      onChange={handleScheduleInputChange}
                      className={`text-right ${scheduleFormErrors.scheduleTime ? 'border-red-500' : ''}`}
                      dir="rtl"
                    />
                    {scheduleFormErrors.scheduleTime && (
                      <p className="text-sm text-red-500 text-right">{scheduleFormErrors.scheduleTime}</p>
                    )}
                  </div>
                )}

                {(scheduleForm.scheduleType === 'weekly' || scheduleForm.scheduleType === 'monthly') && (
                  <div className="space-y-2">
                    <Label className="text-right block font-medium">
                      {scheduleForm.scheduleType === 'weekly' ? 'أيام الأسبوع' : 'أيام الشهر'}
                    </Label>
                    <div className="space-y-2">
                      {scheduleForm.scheduleType === 'weekly' ? (
                        <div className="grid grid-cols-2 gap-2">
                          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => (
                            <label key={day} className="flex items-center space-x-2 space-x-reverse">
                              <input
                                type="checkbox"
                                checked={scheduleForm.scheduleDays.includes(day)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setScheduleForm(prev => ({
                                      ...prev,
                                      scheduleDays: [...prev.scheduleDays, day]
                                    }));
                                  } else {
                                    setScheduleForm(prev => ({
                                      ...prev,
                                      scheduleDays: prev.scheduleDays.filter(d => d !== day)
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{day}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <label key={day} className="flex items-center space-x-2 space-x-reverse">
                              <input
                                type="checkbox"
                                checked={scheduleForm.scheduleDays.includes(day.toString())}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setScheduleForm(prev => ({
                                      ...prev,
                                      scheduleDays: [...prev.scheduleDays, day.toString()]
                                    }));
                                  } else {
                                    setScheduleForm(prev => ({
                                      ...prev,
                                      scheduleDays: prev.scheduleDays.filter(d => d !== day.toString())
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{day}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {scheduleFormErrors.scheduleDays && (
                      <p className="text-sm text-red-500 text-right">{scheduleFormErrors.scheduleDays}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Data Types Selection */}
              <div className="space-y-2">
                <Label className="text-right block font-medium">
                  أنواع البيانات للمزامنة
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['sales', 'purchases', 'expenses', 'products', 'suppliers', 'customers', 'debts', 'installments'].map((dataType) => (
                    <label key={dataType} className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={scheduleForm.dataTypes.includes(dataType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleForm(prev => ({
                              ...prev,
                              dataTypes: [...prev.dataTypes, dataType]
                            }));
                          } else {
                            setScheduleForm(prev => ({
                              ...prev,
                              dataTypes: prev.dataTypes.filter(d => d !== dataType)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{getDataTypeArabicName(dataType)}</span>
                    </label>
                  ))}
                </div>
                {scheduleFormErrors.dataTypes && (
                  <p className="text-sm text-red-500 text-right">{scheduleFormErrors.dataTypes}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  type="submit"
                  disabled={isCreatingSchedule}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isCreatingSchedule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    editingSchedule ? 'تحديث الجدول الزمني' : 'إنشاء الجدول الزمني'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setScheduleModalOpen(false);
                    setEditingSchedule(null);
                    setScheduleForm({ 
                      scheduleName: '', 
                      scheduleType: 'daily', 
                      scheduleTime: '09:00', 
                      scheduleDays: [], 
                      dataTypes: [],
                      isAutoSchedule: false,
                      intervalMinutes: 60
                    });
                    setScheduleFormErrors({});
                  }}
                  disabled={isCreatingSchedule}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Enhanced Permissions Management Modal */}
        <Dialog open={permissionsModalOpen} onOpenChange={setPermissionsModalOpen}>
          <DialogContent className="rtl max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إدارة صلاحيات المستخدم
              </DialogTitle>
            </DialogHeader>
            
            {selectedUserForPermissions && (
              <div className="space-y-6">
                {/* Enhanced User Info */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <User className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-foreground">{selectedUserForPermissions.name}</h3>
                      <p className="text-muted-foreground text-sm">@{selectedUserForPermissions.username}</p>
                      <div className="mt-2">
                        {getRoleBadge(selectedUserForPermissions.role)}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="bg-background/80 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">إجمالي الصلاحيات</p>
                        <p className="text-2xl font-bold text-primary">
                          {userPermissions ? userPermissions.allPermissions.length : 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Permission Management Tabs */}
                <Tabs defaultValue="grant" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="grant" className="gap-2">
                      <Plus className="w-4 h-4" />
                      منح صلاحيات جديدة
                    </TabsTrigger>
                    <TabsTrigger value="current" className="gap-2">
                      <Shield className="w-4 h-4" />
                      الصلاحيات الحالية
                    </TabsTrigger>
                  </TabsList>

                  {/* Grant New Permissions Tab */}
                  <TabsContent value="grant" className="space-y-6 mt-6">
                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Label className="text-right block font-medium mb-2">البحث في الصلاحيات</Label>
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="ابحث عن صلاحية..."
                            value={permissionSearchTerm}
                            onChange={(e) => setPermissionSearchTerm(e.target.value)}
                            className="pr-10"
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-48">
                        <Label className="text-right block font-medium mb-2">تصفية حسب الفئة</Label>
                        <Select value={selectedPermissionCategory} onValueChange={setSelectedPermissionCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="جميع الفئات" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع الفئات</SelectItem>
                            {Object.keys(permissionsByCategory).map((category) => (
                              <SelectItem key={category} value={category}>
                                {getCategoryDisplayName(category)}
                                </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    </div>
                    
                    {/* Bulk Grant Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          منح صلاحيات متعددة
                        </h4>
                        {selectedPermissionsForBulk.length > 0 && (
                          <Badge variant="default" className="bg-blue-600">
                            {selectedPermissionsForBulk.length} محدد
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                          <Label className="text-right block font-medium mb-2 text-sm">
                        تاريخ انتهاء الصلاحية (اختياري)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={permissionExpiresAt}
                        onChange={(e) => setPermissionExpiresAt(e.target.value)}
                            className="text-sm"
                      />
                    </div>
                        <div className="flex items-end gap-2">
                      <Button 
                            onClick={handleBulkGrantPermissions}
                            disabled={selectedPermissionsForBulk.length === 0 || isGrantingPermission}
                            className="flex-1"
                            size="sm"
                          >
                            {isGrantingPermission ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                جاري المنح...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                منح المحدد ({selectedPermissionsForBulk.length})
                              </>
                            )}
                      </Button>
                          {selectedPermissionsForBulk.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedPermissionsForBulk([])}
                            >
                              إلغاء
                            </Button>
                          )}
                    </div>
                  </div>
                </div>

                    {/* Available Permissions */}
                <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">الصلاحيات المتاحة</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermissionViewMode(permissionViewMode === 'grid' ? 'list' : 'grid')}
                          >
                            {permissionViewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {getFilteredPermissions().length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">لا توجد صلاحيات متاحة</p>
                        </div>
                      ) : (
                        <div className={permissionViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
                          {getFilteredPermissions().map((permission) => (
                            <div
                              key={permission.permission_id}
                              className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                                selectedPermissionsForBulk.includes(permission.permission_id)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => {
                                if (selectedPermissionsForBulk.includes(permission.permission_id)) {
                                  setSelectedPermissionsForBulk(prev => 
                                    prev.filter(id => id !== permission.permission_id)
                                  );
                                } else {
                                  setSelectedPermissionsForBulk(prev => [...prev, permission.permission_id]);
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getCategoryIcon(permission.category)}
                                    <h5 className="font-medium text-sm">{permission.name}</h5>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-3">{permission.description}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {getCategoryDisplayName(permission.category)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {permission.permission_id}
                                    </Badge>
                                  </div>
                                </div>
                                <Checkbox
                                  checked={selectedPermissionsForBulk.includes(permission.permission_id)}
                                  onChange={() => {}}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Current Permissions Tab */}
                  <TabsContent value="current" className="space-y-6 mt-6">
                  {isLoadingPermissions ? (
                      <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : userPermissions ? (
                    <div className="space-y-6">
                      {/* Role Permissions */}
                        <div className="bg-muted/30 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-muted-foreground" />
                              <h5 className="font-semibold text-lg">صلاحيات الدور</h5>
                              <Badge variant="secondary">{userPermissions.rolePermissions.length}</Badge>
                            </div>
                            {canEditRolePermissions() && userPermissions.rolePermissions.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEnableRolePermissionEditing(!enableRolePermissionEditing)}
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                >
                                  {enableRolePermissionEditing ? (
                                    <>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      إلغاء التعديل
                                    </>
                                  ) : (
                                    <>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      تعديل الصلاحيات
                                    </>
                                  )}
                                </Button>
                                {enableRolePermissionEditing && selectedRolePermissionsForRevoke.length > 0 && (
                                  <>
                                    <Badge variant="destructive" className="bg-orange-600">
                                      {selectedRolePermissionsForRevoke.length} محدد للإلغاء
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedRolePermissionsForRevoke([])}
                                      disabled={selectedRolePermissionsForRevoke.length === 0}
                                    >
                                      إلغاء التحديد
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={handleConfirmBulkRevokeRole}
                                      disabled={selectedRolePermissionsForRevoke.length === 0 || isRevokingRolePermission}
                                    >
                                      {isRevokingRolePermission ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                          جاري الإلغاء...
                                        </>
                                      ) : (
                                        <>
                                          <Shield className="w-4 h-4 mr-2" />
                                          إلغاء المحدد ({selectedRolePermissionsForRevoke.length})
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {userPermissions.rolePermissions.map((permission) => (
                              <div 
                                key={permission.permission_id} 
                                className={`bg-background border rounded-lg p-4 transition-all duration-200 ${
                                  enableRolePermissionEditing ? 'cursor-pointer hover:shadow-md' : ''
                                } ${
                                  selectedRolePermissionsForRevoke.includes(permission.permission_id)
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-border hover:border-orange-300'
                                }`}
                                onClick={() => {
                                  if (enableRolePermissionEditing) {
                                    if (selectedRolePermissionsForRevoke.includes(permission.permission_id)) {
                                      setSelectedRolePermissionsForRevoke(prev => 
                                        prev.filter(id => id !== permission.permission_id)
                                      );
                                    } else {
                                      setSelectedRolePermissionsForRevoke(prev => [...prev, permission.permission_id]);
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {getCategoryIcon(permission.category)}
                                      <h6 className="font-medium text-sm">{permission.name}</h6>
                              </div>
                                    <p className="text-xs text-muted-foreground mb-2">{permission.description}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {getCategoryDisplayName(permission.category)}
                                      </Badge>
                              <Badge variant="secondary" className="text-xs">دور</Badge>
                                    </div>
                                  </div>
                                  {enableRolePermissionEditing && (
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={selectedRolePermissionsForRevoke.includes(permission.permission_id)}
                                        onChange={() => {}}
                                        className="mt-1"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmRevokeRolePermission(permission.permission_id);
                                        }}
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                      >
                                        <Shield className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                            </div>
                          ))}
                        </div>
                          {canEditRolePermissions() && !enableRolePermissionEditing && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 text-orange-800">
                                <AlertTriangle className="w-4 h-4" />
                                <p className="text-sm">
                                  يمكنك تعديل صلاحيات الدور عن طريق النقر على "تعديل الصلاحيات"
                                </p>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Custom Permissions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Key className="w-5 h-5 text-blue-600" />
                              <h5 className="font-semibold text-lg text-blue-900">الصلاحيات المخصصة</h5>
                              <Badge variant="default" className="bg-blue-600">{userPermissions.customPermissions.length}</Badge>
                            </div>
                            {userPermissions.customPermissions.length > 0 && (
                              <div className="flex items-center gap-2">
                                {selectedPermissionsForRevoke.length > 0 && (
                                  <Badge variant="destructive" className="bg-red-600">
                                    {selectedPermissionsForRevoke.length} محدد للإلغاء
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPermissionsForRevoke([])}
                                  disabled={selectedPermissionsForRevoke.length === 0}
                                >
                                  إلغاء التحديد
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleConfirmBulkRevoke}
                                  disabled={selectedPermissionsForRevoke.length === 0 || isRevokingPermission}
                                >
                                  {isRevokingPermission ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      جاري الإلغاء...
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-4 h-4 mr-2" />
                                      إلغاء المحدد ({selectedPermissionsForRevoke.length})
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        {userPermissions.customPermissions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {userPermissions.customPermissions.map((permission) => (
                                <div 
                                  key={permission.permission_id} 
                                  className={`bg-white border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                                    selectedPermissionsForRevoke.includes(permission.permission_id)
                                      ? 'border-red-500 bg-red-50'
                                      : 'border-blue-200 hover:border-blue-300'
                                  }`}
                                  onClick={() => {
                                    if (selectedPermissionsForRevoke.includes(permission.permission_id)) {
                                      setSelectedPermissionsForRevoke(prev => 
                                        prev.filter(id => id !== permission.permission_id)
                                      );
                                    } else {
                                      setSelectedPermissionsForRevoke(prev => [...prev, permission.permission_id]);
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getCategoryIcon(permission.category)}
                                        <h6 className="font-medium text-sm">{permission.name}</h6>
                                </div>
                                      <p className="text-xs text-muted-foreground mb-2">{permission.description}</p>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="outline" className="text-xs">
                                          {getCategoryDisplayName(permission.category)}
                                        </Badge>
                                  <Badge variant="default" className="text-xs bg-blue-600">مخصص</Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={selectedPermissionsForRevoke.includes(permission.permission_id)}
                                        onChange={() => {}}
                                        className="mt-1"
                                      />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmRevokePermission(permission.permission_id);
                                        }}
                                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                  >
                                        <Unlock className="h-4 w-4" />
                                  </Button>
                                    </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                            <div className="text-center py-8">
                              <Key className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                              <p className="text-blue-600">لا توجد صلاحيات مخصصة</p>
                            </div>
                        )}
                      </div>

                        {/* Permissions Summary */}
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
                          <h5 className="font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            ملخص الصلاحيات
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-primary">{userPermissions.allPermissions.length}</p>
                              <p className="text-xs text-muted-foreground">إجمالي الصلاحيات</p>
                          </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-muted-foreground">{userPermissions.rolePermissions.length}</p>
                              <p className="text-xs text-muted-foreground">صلاحيات الدور</p>
                          </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">{userPermissions.customPermissions.length}</p>
                              <p className="text-xs text-muted-foreground">الصلاحيات المخصصة</p>
                          </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-foreground">{userPermissions.role}</p>
                              <p className="text-xs text-muted-foreground">الدور الحالي</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                      <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا يمكن تحميل صلاحيات المستخدم</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Revoke Permission Confirmation Dialog */}
        <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">تأكيد إلغاء الصلاحية</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من إلغاء هذه الصلاحية؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRevoke}
                disabled={isRevokingPermission}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRevokingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    جاري الإلغاء...
                  </>
                ) : (
                  'إلغاء الصلاحية'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Revoke Permission Confirmation Dialog */}
        <AlertDialog open={showBulkRevokeConfirm} onOpenChange={setShowBulkRevokeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">تأكيد إلغاء الصلاحيات المتعددة</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من إلغاء {selectedPermissionsForRevoke.length} صلاحية؟ لا يمكن التراجع عن هذا الإجراء.
                <br />
                <span className="text-sm text-muted-foreground">
                  سيتم إلغاء الصلاحيات المحددة نهائياً من حساب المستخدم.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkRevokePermissions}
                disabled={isRevokingPermission}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRevokingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    جاري الإلغاء...
                  </>
                ) : (
                  `إلغاء ${selectedPermissionsForRevoke.length} صلاحية`
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Permission Revoke Confirmation Dialog */}
        <AlertDialog open={showRolePermissionRevokeConfirm} onOpenChange={setShowRolePermissionRevokeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">تأكيد إلغاء صلاحية الدور</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من إلغاء صلاحية الدور؟ هذا الإجراء سيؤثر على الصلاحيات الأساسية للمستخدم.
                <br />
                <span className="text-sm text-muted-foreground">
                  تحذير: إلغاء صلاحيات الدور قد يؤثر على قدرة المستخدم على الوصول للميزات الأساسية.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={rolePermissionToRevoke ? handleConfirmRevokeRole : handleBulkRevokeRolePermissions}
                disabled={isRevokingRolePermission}
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                {isRevokingRolePermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    جاري الإلغاء...
                  </>
                ) : rolePermissionToRevoke ? (
                  'إلغاء صلاحية الدور'
                ) : (
                  `إلغاء ${selectedRolePermissionsForRevoke.length} صلاحية دور`
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminProfiles;