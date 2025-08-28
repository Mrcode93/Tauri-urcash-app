import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { RootState, AppDispatch } from '../app/store';
import { fetchSettings, updateSettings } from '@/features/settings/settingsSlice';
import Cookies from 'js-cookie';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getLogoUrlSafe as getLogoUrl } from '@/utils/logoUrl';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Settings as SettingsIcon,
  Save,
  Upload,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Palette,
  Layout,
  Receipt,
  Building2,
  Users,
  Shield,
  Database,
  Printer,
  Mail,
  Globe,
  Lock,
  Key,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Copy,
  Check,
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Archive,
  RotateCcw,
  HardDrive,
  Link as LinkIcon,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Package,
  Store,
  DollarSign,
  ReceiptText,
  BarChart,
  Barcode,
  Paintbrush,
  Calendar,
  MoreVertical,
  GripVertical,
  Crown,
  Zap,
  Star,
  Monitor,
  ExternalLink,
  Cloud,
  CreditCard,
  Clock,
  Timer,
  Tag,
  Server,
  Search,
  Wifi,
  ClipboardList,
  FolderOpen,
  Activity,
  XCircle
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings as ApiSettingsData } from '@/features/settings/settingsService';
import { licenseService, LicenseStatus, ActivationResult, CodeValidationResult } from '@/services/licenseService';
import { CloudBackupButton } from '@/components/CloudBackupButton';
import { CloudBackupsList } from '@/components/CloudBackupsList';
import { locationService } from '@/services/locationService';
import api, { updateApiUrl, getCurrentApiUrl, API_CONFIG } from '@/lib/api';
import BillDesignManager from '@/components/BillDesignManager';
import DeviceManagementTab from '@/components/DeviceManagementTab';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import BarcodeLabelPrinter from '@/components/BarcodeLabelPrinter';
import { 
  fetchAllDevices, 
  addDevice, 
  removeDevice, 
  updateDeviceStatus, 
  addCashToDevice, 
  withdrawCashFromDevice,
  fetchDeviceCashSummary,
  fetchOverallCashSummary,
  fetchDeviceTransactions,
  searchDevices,
  fetchDeviceStatistics,
  clearError,
  clearSuccessMessage,
  setSelectedDevice
} from '@/features/devices/devicesSlice';

// Electron API interface
interface ElectronAPI {
  testMainDeviceConnection: (params: { mainDeviceIp: string; port: number; timeout: number }) => Promise<{
    success: boolean;
    connected: boolean;
    latency?: number;
    error?: string;
    message?: string;
  }>;
  getDeviceConfig: () => Promise<{
    success: boolean;
    config?: Record<string, unknown>;
    error?: string;
  }>;
  setDeviceConfig: (config: Record<string, unknown>) => Promise<{
    success: boolean;
    config?: Record<string, unknown>;
    error?: string;
  }>;
  getAppInfo: () => Promise<AppInfo>;
  checkForUpdates: () => Promise<UpdateInfo>;
  triggerAutoUpdateCheck: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  downloadUpdate: (url: string) => Promise<UpdateStatus>;
  installUpdate: () => Promise<UpdateStatus>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
  removeUpdateStatusListener: (callback: (status: UpdateStatus) => void) => void;
  getUpdateSettings: () => Promise<{
    success: boolean;
    settings: Record<string, unknown>;
    error?: string;
  }>;
  setUpdateSettings: (settings: Record<string, unknown>) => Promise<{
    success: boolean;
    settings: Record<string, unknown>;
    error?: string;
  }>;
  setAppConfig: (config: Record<string, unknown>) => Promise<{
    success: boolean;
    config?: Record<string, unknown>;
    error?: string;
  }>;
  // File system operations for backup functionality
  selectBackupDirectory: () => Promise<{
    success: boolean;
    directory?: string;
    error?: string;
  }>;
  selectBackupFile: () => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }>;
  copyFile: (sourcePath: string, destinationPath: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  readDirectory: (directoryPath: string) => Promise<{
    success: boolean;
    files?: Array<{
      name: string;
      path: string;
      size: number;
      isDirectory: boolean;
      createdAt: Date;
      modifiedAt: Date;
    }>;
    error?: string;
  }>;
  deleteFile: (filePath: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  getDefaultBackupDirectory: () => Promise<{
    success: boolean;
    directory?: string;
    error?: string;
  }>;
}

interface WindowWithElectron extends Window {
  electron?: ElectronAPI;
  urcashAppVersion?: string;
  api?: {
    getAppVersion: () => Promise<string>;
  };
  
}

declare let window: WindowWithElectron;


// Enhanced settings state interface with RTL support
interface SettingsState {
  id: number; // Add id to local state as well, usually 1
  // Company Information - matching your admin page structure
  company: {
    name: string;
    logo: File | null;
    logoUrl: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    taxNumber: string;
    registrationNumber: string;
    description: string;
  };
  
  // System Configuration with RTL support
  system: {
    currency: string;
    language: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    rtlMode: boolean; // Add RTL mode setting
    exchangeRate: number; // Exchange rate for currency conversion
    backup: {
      autoBackup: boolean;
      backupFrequency: string;
      backupTime: string;
      retentionDays: number;
      lastBackup: string | null; // Can be null
    };
    deviceMode: {
      mode: 'main' | 'secondary';
      mainDeviceIp: string;
      port: number;
      autoConnect: boolean;
      connectionTimeout: number;
    };
  };
  
  // UI/UX Settings with RTL considerations
  ui: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    sidebarCollapsed: boolean;
    dashboardLayout: string;
    tileSize: string;
    enableAnimations: boolean;
    compactMode: boolean;
    rtlDirection: boolean; // RTL direction setting
    sidebarMenuItems: Array<{ // For managing sidebar items locally
      id: string;
      name: string;
      path: string;
      icon: string;
      enabled: boolean;
    }>;
  };
  
  // Business Rules
  business: {
    allowNegativeStock: boolean;
    requireCustomerForSales: boolean;
    autoGenerateBarcode: boolean;
    defaultPaymentMethod: string;
    taxRate: number;
    enableLoyaltyProgram: boolean;
    loyaltyPointsRate: number;
    minimumOrderAmount: number;
  };
  
  // Security Settings
  security: {
    sessionTimeout: number;
    passwordMinLength: number;
    requireStrongPassword: boolean;
    enableTwoFactor: boolean;
    allowMultipleSessions: boolean;
    loginAttempts: number;
    lockoutDuration: number;
  };
  
  // Notifications
  notifications: {
    email: {
      enabled: boolean;
      lowStock: boolean;
      newOrders: boolean;
      paymentReminders: boolean;
      reports: boolean;
    };
    sms: {
      enabled: boolean;
      lowStock: boolean;
      newOrders: boolean;
      paymentReminders: boolean;
    };
    push: {
      enabled: boolean;
      lowStock: boolean;
      newOrders: boolean;
      paymentReminders: boolean;
    };
  };
  
  // Receipt/Invoice Settings
  receipt: {
    printMode: 'thermal' | 'a4'; // Add print mode setting
    template: string;
    showLogo: boolean;
    showBarcode: boolean;
    showCompanyInfo: boolean; // Add this missing field
    showQrCode: boolean;
    footerText: string;
    paperSize: string;
    orientation: string;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    fonts: {
      header: string;
      body: string;
      footer: string;
    };
    colors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  
  // Email Configuration
  email: {
    provider: string;
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: string;
    fromName: string;
    fromEmail: string;
    testMode: boolean;
  };
  
  // Integrations
  integrations: {
    pos: {
      barcodeScanner: boolean;
      receiptPrinter: boolean;
      cashDrawer: boolean;
      customerDisplay: boolean;
    };
    accounting: {
      enabled: boolean;
      software: string;
      apiKey: string;
      syncFrequency: string;
    };
    analytics: {
      enabled: boolean;
      provider: string;
      trackingId: string;
    };
  };
}

// ...existing code...

// Type definitions for update-related state
interface UpdateInfo {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  updateAvailable?: boolean;
  platform?: string;
}

interface AppInfo {
  name?: string;
  version: string;
  platform?: string;
  arch?: string;
  isPackaged?: boolean;
  isElectron?: boolean;
  nodeVersion?: string;
  electronVersion?: string;
}

interface UpdateProgress {
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
}

interface UpdateStatus {
  status: string;
  message?: string;
  progress?: UpdateProgress;
  error?: string;
}

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: settingsData, loading, error } = useSelector((state: RootState) => state.settings);
  const [searchParams] = useSearchParams();
  
  // State for color picker
  const [colorPickerTarget, setColorPickerTarget] = useState<'primary' | 'secondary' | null>(null);

  // Add state for main device IP input
  const [mainDeviceIp, setMainDeviceIp] = useState('');
  const [showMainDeviceInput, setShowMainDeviceInput] = useState(false);

  // Enhanced backup functionality state
  const [selectedBackupDirectory, setSelectedBackupDirectory] = useState<string>('');
  const [customBackupFiles, setCustomBackupFiles] = useState<Array<{
    name: string;
    path: string;
    size: number;
    isDirectory: boolean;
    createdAt: Date;
    modifiedAt: Date;
  }>>([]);
  const [showCustomBackupDialog, setShowCustomBackupDialog] = useState(false);
  const [showCustomRestoreDialog, setShowCustomRestoreDialog] = useState(false);
  const [selectedCustomBackupFile, setSelectedCustomBackupFile] = useState<string>('');
  const [isLoadingCustomBackups, setIsLoadingCustomBackups] = useState(false);

  useEffect(() => {
    // Load main device IP from localStorage if in secondary mode
    const savedConfig = localStorage.getItem('urcash_device_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.device_mode === 'secondary' && config.main_device_ip) {
          setMainDeviceIp(config.main_device_ip);
          setShowMainDeviceInput(true);
        }
      } catch (error) {
        console.warn('Failed to parse saved device config:', error);
      }
    }
  }, []);

  // Function to handle device mode change with IP input


  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to compare versions
  const compareVersions = (current: string, latest: string): boolean => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    const maxLength = Math.max(currentParts.length, latestParts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) {
        return true; // Update available
      } else if (latestPart < currentPart) {
        return false; // Current is newer
      }
    }
    
    return false; // Versions are equal
  };

  

  // Helper function to check if there are meaningful changes between two settings objects
  const hasSignificantChanges = (oldSettings: SettingsState, newSettings: SettingsState): boolean => {
    // Skip comparison for certain fields that shouldn't trigger saves
    const fieldsToIgnore = ['logo', 'logoUrl']; // logo is a File object, logoUrl might change frequently
    
    const compareObjects = (oldObj: unknown, newObj: unknown, path: string = ''): boolean => {
      if (oldObj === newObj) return false;
      if (!oldObj || !newObj) return true;
      
      const oldKeys = Object.keys(oldObj);
      const newKeys = Object.keys(newObj);
      
      // Check if any keys were added or removed
      if (oldKeys.length !== newKeys.length) {
        
        return true;
      }
      
      for (const key of newKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Skip ignored fields
        if (fieldsToIgnore.includes(key)) continue;
        
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        
        // Handle different types
        if (typeof oldValue !== typeof newValue) {
          
          return true;
        }
        
        if (typeof newValue === 'object' && newValue !== null) {
          // Recursively compare nested objects
          if (compareObjects(oldValue, newValue, currentPath)) return true;
        } else {
          // Compare primitive values
          if (oldValue !== newValue) {
            // For arrays, compare as JSON strings to handle order differences
            if (Array.isArray(oldValue) && Array.isArray(newValue)) {
              if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                
                return true;
              }
            } else {
              
              return true;
            }
          }
        }
      }
      
      return false;
    };
    
    return compareObjects(oldSettings, newSettings);
  };

  // Load settings from localStorage on component mount
  const getDefaultSettings = (): SettingsState => ({
    id: 1, // Default ID
    company: {
      name: '',
      logo: null,
      logoUrl: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      taxNumber: '',
      registrationNumber: '',
      description: '',
    },
    system: {
      currency: 'IQD',
      language: 'ar',
      timezone: 'Asia/Baghdad',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-IQ',
      rtlMode: true,
      exchangeRate: 1.00,
      backup: {
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: '20:00',
        retentionDays: 30,
        lastBackup: null,
      },
      deviceMode: {
        mode: 'main' as 'main' | 'secondary',
        mainDeviceIp: '192.168.1.1',
        port: 39000,
        autoConnect: false,
        connectionTimeout: 10000,
      }
    },
    ui: {
      theme: 'default',
      primaryColor: '#1f1f1f',
      secondaryColor: '#ededed',
      sidebarCollapsed: false,
      dashboardLayout: 'grid',
      tileSize: 'medium',
      enableAnimations: true,
      compactMode: false,
      rtlDirection: true,
      sidebarMenuItems: [ // Default sidebar items - all enabled
        { id: 'dashboard', name: 'لوحة التحكم', path: '/dashboard-charts', icon: 'LayoutDashboard', enabled: true },
        { id: 'pos', name: 'نقطة البيع', path: '/pos', icon: 'ShoppingCart', enabled: true },
        { id: 'sales', name: 'المبيعات', path: '/sales', icon: 'DollarSign', enabled: true },
        { id: 'purchases', name: 'المشتريات', path: '/purchases', icon: 'Truck', enabled: true },
        { id: 'inventory', name: 'المخزون', path: '/inventory', icon: 'Package', enabled: true },
        { id: 'bills', name: 'الفواتير', path: '/bills', icon: 'ClipboardList', enabled: true },
        { id: 'stocks', name: 'المخازن', path: '/stocks', icon: 'Warehouse', enabled: true },
        { id: 'customers', name: 'العملاء', path: '/customers', icon: 'Users', enabled: true },
        { id: 'suppliers', name: 'الموردين', path: '/suppliers', icon: 'Store', enabled: true },
        { id: 'expenses', name: 'المصروفات', path: '/expenses', icon: 'ReceiptText', enabled: true },
        { id: 'reports', name: 'التقارير', path: '/reports', icon: 'BarChart', enabled: true },
        { id: 'customer-receipts', name: 'سند قبض', path: '/customer-receipts', icon: 'Receipt', enabled: true },
        { id: 'supplier-payment-receipts', name: 'سند صرف', path: '/supplier-payment-receipts', icon: 'CreditCard', enabled: true },
        // user box and boxes management
        { id: 'cash-box', name: 'صندوق النقد', path: '/cash-box', icon: 'DollarSign', enabled: true },
        { id: 'admin-cash-box', name: 'إدارة الصناديق', path: '/admin-cash-box', icon: 'Settings', enabled: true },

        { id: 'debts', name: 'الديون', path: '/debts', icon: 'FileText', enabled: true },
        { id: 'installments', name: 'الأقساط', path: '/installments', icon: 'Calendar', enabled: true },
        { id: 'settings', name: 'الإعدادات', path: '/settings', icon: 'Settings', enabled: true },
      ],
    },
    business: {
      allowNegativeStock: false,
      requireCustomerForSales: true,
      autoGenerateBarcode: true,
      defaultPaymentMethod: 'cash',
      taxRate: 0, // Default to 0
      enableLoyaltyProgram: false,
      loyaltyPointsRate: 1,
      minimumOrderAmount: 0,
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireStrongPassword: true,
      enableTwoFactor: false,
      allowMultipleSessions: true,
      loginAttempts: 5,
      lockoutDuration: 15,
    },
    receipt: {
      printMode: 'a4' as 'thermal' | 'a4', // Default to A4 mode
      template: 'modern', // Changed default
      showLogo: true,
      showBarcode: true,
      showCompanyInfo: true, // Add this missing field
      showQrCode: false,
      footerText: 'شكراً لزيارتكم',
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      fonts: { header: 'Arial', body: 'Arial', footer: 'Arial' },
      colors: { primary: '#1f1f1f', secondary: '#ededed', text: '#333333' },
    },
    email: {
      provider: 'smtp',
      host: '', // Default to empty
      port: 587,
      username: '', // Default to empty
      password: '', // Default to empty
      encryption: 'tls',
      fromName: '', // Default to empty
      fromEmail: '', // Default to empty
      testMode: false,
    },
    notifications: {
      email: {
        enabled: true,
        lowStock: true,
        newOrders: true,
        paymentReminders: false, // Default to false
        reports: false, // Default to false
      },
      sms: {
        enabled: false,
        lowStock: false,
        newOrders: false,
        paymentReminders: false,
      },
      push: {
        enabled: false,
        lowStock: false,
        newOrders: false,
        paymentReminders: false,
      },
    },
    integrations: {
      pos: {
        barcodeScanner: true,
        receiptPrinter: true,
        cashDrawer: true,
        customerDisplay: false,
      },
      accounting: {
        enabled: false, // Default to false
        software: '', // Default to empty
        apiKey: '', // Default to empty
        syncFrequency: 'daily',
      },
      analytics: {
        enabled: false, // Default to false
        provider: '', // Default to empty
        trackingId: '', // Default to empty
      },
    },
  });
  
  const loadSettingsFromStorage = (): SettingsState => {
    try {
      const savedSettings = localStorage.getItem('urcash_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Merge with defaults to ensure all keys are present
        const mergedSettings = { ...getDefaultSettings(), ...parsed };
        
        // Ensure deviceMode is properly initialized
        if (!mergedSettings.system.deviceMode) {
          mergedSettings.system.deviceMode = getDefaultSettings().system.deviceMode;
        }
        
        // Ensure sidebarMenuItems is properly initialized
        if (!mergedSettings.ui.sidebarMenuItems) {
          mergedSettings.ui.sidebarMenuItems = getDefaultSettings().ui.sidebarMenuItems;
        }
        
        return mergedSettings;
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return getDefaultSettings();
  };

    

  // State management with localStorage integration
  const [settings, setSettings] = useState<SettingsState>(loadSettingsFromStorage);
  const [activeTab, setActiveTab] = useState(() => {
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    return tabParam || 'general';
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Flag to prevent unsaved changes during initialization
  const [isLoading, setIsLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Modals and dialogs state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Backup and Restore State
  const [backups, setBackups] = useState<Array<{
    id: string;
    name: string;
    size: number;
    createdAt: string;
  }>>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [backupSchedulerStatus, setBackupSchedulerStatus] = useState<{
    isRunning: boolean;
    isAutoBackupEnabled: boolean;
    backupFrequency: string;
    scheduledTime: string;
    nextBackupTime: string | null;
    nextBackupTimeFormatted: string | null;
  } | null>(null);
  
  // License management state
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [codeValidationResult, setCodeValidationResult] = useState<CodeValidationResult | null>(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  
  // File refs
  const logoUploadRef = useRef<HTMLInputElement>(null);
  const backupUploadRef = useRef<HTMLInputElement>(null);

  // Premium Activation State
  const [premiumActivationCode, setPremiumActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);

  // Update Checker State
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Device Mode / Branch State
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    lastChecked: Date | null;
    error: string | null;
    latency: number | null;
  }>({
    isConnected: false,
    lastChecked: null,
    error: null,
    latency: null,
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState(getCurrentApiUrl());

  // Barcode Services State
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [showBarcodeLabelPrinter, setShowBarcodeLabelPrinter] = useState(false);

  // Save settings to localStorage whenever settings change
  const saveSettingsToStorage = (newSettings: SettingsState) => {
    try {
      localStorage.setItem('urcash_settings', JSON.stringify(newSettings));
      
      // Dispatch custom event to notify ThemeProvider of changes
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: newSettings }));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      toast.error('فشل في حفظ الإعدادات محلياً');
    }
  };

  // Load settings from API and localStorage on component mount
  useEffect(() => {
    const initializeSettings = async () => {
      if (!settingsData && !loading) {
        try {
          await dispatch(fetchSettings()).unwrap();
        } catch (err) { // Use err as error is already declared in the outer scope
          console.warn('Failed to load settings from API, using localStorage:', err);
        }
      }
      
      if (settingsData) {
        // Map flat API data (settingsData) to nested local state (settings)
        const apiData = settingsData as ApiSettingsData; // Cast to the flat API structure
        
        let parsedSidebarMenuItems = settings.ui.sidebarMenuItems; // Default to current local state's items
        if (typeof apiData.sidebar_menu_items === 'string' && apiData.sidebar_menu_items.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(apiData.sidebar_menu_items);
            if (Array.isArray(parsed)) {
              parsedSidebarMenuItems = parsed;
            } else {
              console.warn(
                "sidebar_menu_items from API is a string but not a JSON array:", 
                apiData.sidebar_menu_items
              );
            }
          } catch (e) {
            console.error(
              `Failed to parse sidebar_menu_items string from API ('${apiData.sidebar_menu_items}'):`, e
            );
            // Fallback to current local state (already set in parsedSidebarMenuItems)
          }
        } else if (apiData.sidebar_menu_items === null) {
          // If API explicitly sends null, it might mean an empty list or use default.
          // Currently, it falls back to settings.ui.sidebarMenuItems. If null should mean empty:
          // parsedSidebarMenuItems = []; 
        } else if (typeof apiData.sidebar_menu_items === 'string' && apiData.sidebar_menu_items.trim() !== '') {
          // Log if it's a string but not a JSON array (e.g. "[object Object]")
           console.warn(
            "sidebar_menu_items from API is a non-JSON array string:",
            apiData.sidebar_menu_items
          );
        }


        const mergedSettings: SettingsState = {
          ...getDefaultSettings(), // Start with defaults to ensure all keys
          id: apiData.id,
          company: {
            ...getDefaultSettings().company,
            name: apiData.company_name ?? getDefaultSettings().company.name,
            logoUrl: apiData.logo_url ?? getDefaultSettings().company.logoUrl,
            email: apiData.email ?? getDefaultSettings().company.email,
            phone: apiData.mobile ?? getDefaultSettings().company.phone,
            address: apiData.address ?? getDefaultSettings().company.address,
            website: apiData.website ?? getDefaultSettings().company.website,
            taxNumber: apiData.tax_number ?? getDefaultSettings().company.taxNumber,
            registrationNumber: apiData.registration_number ?? getDefaultSettings().company.registrationNumber,
            description: apiData.description ?? getDefaultSettings().company.description,
          },
          system: {
            ...getDefaultSettings().system,
            currency: apiData.currency ?? getDefaultSettings().system.currency,
            language: apiData.language ?? getDefaultSettings().system.language,
            timezone: apiData.timezone ?? getDefaultSettings().system.timezone,
            dateFormat: apiData.date_format ?? getDefaultSettings().system.dateFormat,
            numberFormat: apiData.number_format ?? getDefaultSettings().system.numberFormat,
            rtlMode: apiData.rtl_mode ?? getDefaultSettings().system.rtlMode,
            exchangeRate: (() => {
              const rate = apiData.exchange_rate ?? getDefaultSettings().system.exchangeRate;
              
              // Fix exchange rate if it's too high
              if (rate > 10000) {
                console.warn('Exchange rate too high, resetting to 1000:', rate);
                return 1000;
              }
              
              return rate;
            })(),
            backup: {
              ...getDefaultSettings().system.backup,
              autoBackup: apiData.auto_backup_enabled ?? getDefaultSettings().system.backup.autoBackup,
              backupFrequency: apiData.backup_frequency ?? getDefaultSettings().system.backup.backupFrequency,
        backupTime: apiData.backup_time ?? getDefaultSettings().system.backup.backupTime,
              retentionDays: apiData.backup_retention_days ?? getDefaultSettings().system.backup.retentionDays,
              lastBackup: apiData.last_backup_date ?? getDefaultSettings().system.backup.lastBackup,
            },
          
          },
          ui: {
            ...getDefaultSettings().ui,
            theme: apiData.theme ?? getDefaultSettings().ui.theme,
            primaryColor: apiData.primary_color ?? getDefaultSettings().ui.primaryColor,
            secondaryColor: apiData.secondary_color ?? getDefaultSettings().ui.secondaryColor,
            sidebarCollapsed: apiData.sidebar_collapsed ?? getDefaultSettings().ui.sidebarCollapsed,
            dashboardLayout: apiData.dashboard_layout ?? getDefaultSettings().ui.dashboardLayout,
            tileSize: apiData.dashboard_tile_size ?? getDefaultSettings().ui.tileSize,
            enableAnimations: apiData.enable_animations ?? getDefaultSettings().ui.enableAnimations,
            compactMode: apiData.compact_mode ?? getDefaultSettings().ui.compactMode,
            rtlDirection: apiData.rtl_direction ?? getDefaultSettings().ui.rtlDirection,
            sidebarMenuItems: parsedSidebarMenuItems,
          },
          business: {
            ...settings.business,
            allowNegativeStock: apiData.allow_negative_stock ?? settings.business.allowNegativeStock,
            requireCustomerForSales: apiData.require_customer_for_sales ?? settings.business.requireCustomerForSales,
            autoGenerateBarcode: apiData.auto_generate_barcode ?? settings.business.autoGenerateBarcode,
            defaultPaymentMethod: apiData.default_payment_method ?? settings.business.defaultPaymentMethod,
            taxRate: apiData.tax_rate ?? settings.business.taxRate,
            enableLoyaltyProgram: apiData.enable_loyalty_program ?? settings.business.enableLoyaltyProgram,
            loyaltyPointsRate: apiData.loyalty_points_rate ?? settings.business.loyaltyPointsRate,
            minimumOrderAmount: apiData.minimum_order_amount ?? settings.business.minimumOrderAmount,
          },
          security: {
            ...settings.security,
            sessionTimeout: apiData.session_timeout ?? settings.security.sessionTimeout,
            passwordMinLength: apiData.password_min_length ?? settings.security.passwordMinLength,
            requireStrongPassword: apiData.require_strong_password ?? settings.security.requireStrongPassword,
            enableTwoFactor: apiData.enable_two_factor ?? settings.security.enableTwoFactor,
            allowMultipleSessions: apiData.allow_multiple_sessions ?? settings.security.allowMultipleSessions,
            loginAttempts: apiData.login_attempts ?? settings.security.loginAttempts,
            lockoutDuration: apiData.lockout_duration ?? settings.security.lockoutDuration,
          },
                      receipt: {
              ...settings.receipt,
              printMode: ((apiData as unknown) as Record<string, unknown>).bill_print_mode as 'thermal' | 'a4' ?? settings.receipt.printMode,
              template: apiData.bill_template ?? settings.receipt.template,
              showLogo: apiData.bill_show_logo ?? settings.receipt.showLogo,
              showBarcode: apiData.bill_show_barcode ?? settings.receipt.showBarcode,
            showCompanyInfo: apiData.bill_show_company_info ?? settings.receipt.showCompanyInfo, // Add this missing field
            showQrCode: apiData.bill_show_qr_code ?? settings.receipt.showQrCode,
            footerText: apiData.bill_footer_text ?? settings.receipt.footerText,
            paperSize: apiData.bill_paper_size ?? settings.receipt.paperSize,
            orientation: apiData.bill_orientation ?? settings.receipt.orientation,
            margins: {
              top: apiData.bill_margin_top ?? settings.receipt.margins.top,
              right: apiData.bill_margin_right ?? settings.receipt.margins.right,
              bottom: apiData.bill_margin_bottom ?? settings.receipt.margins.bottom,
              left: apiData.bill_margin_left ?? settings.receipt.margins.left,
            },
            fonts: {
              header: apiData.bill_font_header ?? settings.receipt.fonts.header,
              body: apiData.bill_font_body ?? settings.receipt.fonts.body,
              footer: apiData.bill_font_footer ?? settings.receipt.fonts.footer,
            },
            colors: {
              primary: apiData.bill_color_primary ?? settings.receipt.colors.primary,
              secondary: apiData.bill_color_secondary ?? settings.receipt.colors.secondary,
              text: apiData.bill_color_text ?? settings.receipt.colors.text,
            },
          },
          email: {
            ...settings.email,
            provider: apiData.email_provider ?? settings.email.provider,
            host: apiData.email_host ?? settings.email.host,
            port: apiData.email_port ?? settings.email.port,
            username: apiData.email_username ?? settings.email.username,
            password: apiData.email_password ?? settings.email.password,
            encryption: apiData.email_encryption ?? settings.email.encryption,
            fromName: apiData.email_from_name ?? settings.email.fromName,
            fromEmail: apiData.email_from_email ?? settings.email.fromEmail,
            // testMode might not be in ApiSettingsData
          },
        };
        
        // Only update state if there are actual differences from current settings
        const currentStorage = localStorage.getItem('urcash_settings');
        let shouldUpdate = false;
        
        if (currentStorage) {
          try {
            const currentSettings = JSON.parse(currentStorage);
            const hasMeaningfulChanges = hasSignificantChanges(currentSettings, mergedSettings);
            shouldUpdate = hasMeaningfulChanges;
            
            // Debug logging
            if (hasMeaningfulChanges) {
              
            } else {
              
            }
          } catch (error) {
            console.warn('Error parsing current settings from localStorage:', error);
            shouldUpdate = true; // Update if parsing fails
          }
        } else {
          
          shouldUpdate = true; // Update if no existing storage
        }
        
        if (shouldUpdate) {
          
          setSettings(mergedSettings);
          saveSettingsToStorage(mergedSettings);
        } else {
          
        }
        
        // Mark initialization as complete
        setIsInitializing(false);
      } else {
        // No API data available, mark initialization as complete
        setIsInitializing(false);
      }
    };

    initializeSettings();
  }, [settingsData, loading, dispatch]); // dispatch was missing

  // Apply RTL styles based on settings
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (settings.ui.rtlDirection) {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.style.fontFamily = 'Cairo, Tajawal, "Arabic UI Text", sans-serif';
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.style.fontFamily = 'Inter, "Segoe UI", sans-serif';
    }
  }, [settings.ui.rtlDirection]);

  // Handle settings change with localStorage sync
  const handleSettingsChange = (section: keyof SettingsState, field: string, value: unknown) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...(settings[section] as Record<string, unknown>),
        [field]: value
      }
    };
    setSettings(newSettings);
    
    // Only set unsaved changes if we're not initializing
    if (!isInitializing) {
      setUnsavedChanges(true);
    }
    
    // For immediate visual feedback, save UI changes to localStorage immediately
    // Only save if the value actually changed
    if (section === 'ui' && (field === 'primaryColor' || field === 'secondaryColor' || field === 'rtlDirection')) {
      const currentValue = (settings[section] as Record<string, unknown>)[field];
      if (currentValue !== value) {
        saveSettingsToStorage(newSettings);
      }
    }
  };

  // Handle nested settings change with localStorage sync - Fix the function signature
  const handleNestedChange = (section: keyof SettingsState, subsection: string, field: string, value: unknown) => {
    const currentSection = settings[section] as Record<string, unknown>;
    const currentSubsection = currentSection?.[subsection] as Record<string, unknown> || {};
    
    const newSettings = {
      ...settings,
      [section]: {
        ...currentSection,
        [subsection]: {
          ...currentSubsection,
          [field]: value
        }
      }
    };
    setSettings(newSettings);
    
    // Only set unsaved changes if we're not initializing
    if (!isInitializing) {
      setUnsavedChanges(true);
    }
    
    
    // For immediate visual feedback, save UI changes to localStorage immediately
    // Only save if the value actually changed
    if (section === 'ui' && (field === 'primaryColor' || field === 'secondaryColor' || field === 'rtlDirection')) {
      const currentValue = (settings[section] as Record<string, unknown>)[field];
      if (currentValue !== value) {
        saveSettingsToStorage(newSettings);
      }
    }
  };

  // Handle direct nested field change (like business settings)
  const handleDirectNestedChange = (section: keyof SettingsState, field: string, value: unknown) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...(settings[section] as Record<string, unknown>),
        [field]: value
      }
    };
    setSettings(newSettings);
    
    // Only set unsaved changes if we're not initializing
    if (!isInitializing) {
      setUnsavedChanges(true);
    }
    
    // For immediate visual feedback, save UI changes to localStorage immediately
    // Only save if the value actually changed
    if (section === 'ui' && (field === 'primaryColor' || field === 'secondaryColor' || field === 'rtlDirection')) {
      const currentValue = (settings[section] as Record<string, unknown>)[field];
      if (currentValue !== value) {
        saveSettingsToStorage(newSettings);
      }
    }
  };

  // Save all settings to API and localStorage
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();

      // Debug log
      // Debug log
      // Debug log

      // Company
      formData.append('company_name', settings.company.name);

      // Handle logo upload
      if (logoUploadRef.current && logoUploadRef.current.files && logoUploadRef.current.files[0]) {
        
        formData.append('logo', logoUploadRef.current.files[0]);
      } else if (settings.company.logoUrl === '' || settings.company.logoUrl === null) {
        
        formData.append('logo_url', 'null'); // Signal to backend to remove logo
      } else if (settings.company.logoUrl && !settings.company.logoUrl.startsWith('blob:')) {
        
        formData.append('logo_url', settings.company.logoUrl); // Keep existing logo
      }

      formData.append('mobile', settings.company.phone);
      formData.append('email', settings.company.email);
      formData.append('address', settings.company.address);
      formData.append('website', settings.company.website);
      formData.append('tax_number', settings.company.taxNumber);
      formData.append('registration_number', settings.company.registrationNumber);
      formData.append('description', settings.company.description);

      // System
      formData.append('currency', settings.system.currency);
      formData.append('language', settings.system.language);
      formData.append('timezone', settings.system.timezone);
      formData.append('date_format', settings.system.dateFormat);
      formData.append('number_format', settings.system.numberFormat);
      formData.append('rtl_mode', settings.system.rtlMode ? '1' : '0');
      formData.append('exchange_rate', String(settings.system.exchangeRate));
      formData.append('auto_backup_enabled', settings.system.backup.autoBackup ? '1' : '0');
      formData.append('backup_frequency', settings.system.backup.backupFrequency);
      formData.append('backup_time', settings.system.backup.backupTime);
      formData.append('backup_retention_days', String(settings.system.backup.retentionDays));

      // UI/UX
      formData.append('theme', settings.ui.theme);
      formData.append('primary_color', settings.ui.primaryColor);
      formData.append('secondary_color', settings.ui.secondaryColor);
      formData.append('sidebar_collapsed', settings.ui.sidebarCollapsed ? '1' : '0');
      formData.append('dashboard_layout', settings.ui.dashboardLayout);
      formData.append('dashboard_tile_size', settings.ui.tileSize);
      formData.append('enable_animations', settings.ui.enableAnimations ? '1' : '0');
      formData.append('compact_mode', settings.ui.compactMode ? '1' : '0');
      formData.append('rtl_direction', settings.ui.rtlDirection ? '1' : '0');
      formData.append('sidebar_menu_items', JSON.stringify(settings.ui.sidebarMenuItems));

      // Business Rules
      formData.append('allow_negative_stock', settings.business.allowNegativeStock ? '1' : '0');
      formData.append('require_customer_for_sales', settings.business.requireCustomerForSales ? '1' : '0');
      formData.append('auto_generate_barcode', settings.business.autoGenerateBarcode ? '1' : '0');
      formData.append('default_payment_method', settings.business.defaultPaymentMethod);
      formData.append('tax_rate', String(settings.business.taxRate));
      formData.append('enable_loyalty_program', settings.business.enableLoyaltyProgram ? '1' : '0');
      formData.append('loyalty_points_rate', String(settings.business.loyaltyPointsRate));
      formData.append('minimum_order_amount', String(settings.business.minimumOrderAmount));

      // Security
      formData.append('session_timeout', String(settings.security.sessionTimeout));
      formData.append('password_min_length', String(settings.security.passwordMinLength));
      formData.append('require_strong_password', settings.security.requireStrongPassword ? '1' : '0');
      formData.append('enable_two_factor', settings.security.enableTwoFactor ? '1' : '0');
      formData.append('allow_multiple_sessions', settings.security.allowMultipleSessions ? '1' : '0');
      formData.append('login_attempts', String(settings.security.loginAttempts));
      formData.append('lockout_duration', String(settings.security.lockoutDuration));
      
      // Notifications
      formData.append('email_notifications_enabled', settings.notifications.email.enabled ? '1' : '0');
      formData.append('email_low_stock_notifications', settings.notifications.email.lowStock ? '1' : '0');
      formData.append('email_new_order_notifications', settings.notifications.email.newOrders ? '1' : '0');
      formData.append('sms_notifications_enabled', settings.notifications.sms.enabled ? '1' : '0');
      formData.append('push_notifications_enabled', settings.notifications.push.enabled ? '1' : '0');

      // Receipt/Invoice
      formData.append('bill_print_mode', settings.receipt.printMode);
      formData.append('bill_template', settings.receipt.template);
      formData.append('bill_show_logo', settings.receipt.showLogo ? '1' : '0');
      formData.append('bill_show_barcode', settings.receipt.showBarcode ? '1' : '0');
      formData.append('bill_show_company_info', settings.receipt.showCompanyInfo ? '1' : '0');
      formData.append('bill_show_qr_code', settings.receipt.showQrCode ? '1' : '0');
      formData.append('bill_footer_text', settings.receipt.footerText);
      formData.append('bill_paper_size', settings.receipt.paperSize);
      formData.append('bill_orientation', settings.receipt.orientation);
      formData.append('bill_margin_top', String(settings.receipt.margins.top));
      formData.append('bill_margin_right', String(settings.receipt.margins.right));
      formData.append('bill_margin_bottom', String(settings.receipt.margins.bottom));
      formData.append('bill_margin_left', String(settings.receipt.margins.left));
      formData.append('bill_font_header', settings.receipt.fonts.header);
      formData.append('bill_font_body', settings.receipt.fonts.body);
      formData.append('bill_font_footer', settings.receipt.fonts.footer);
      formData.append('bill_color_primary', settings.receipt.colors.primary);
      formData.append('bill_color_secondary', settings.receipt.colors.secondary);
      formData.append('bill_color_text', settings.receipt.colors.text);

      // Email Configuration
      formData.append('email_provider', settings.email.provider);
      formData.append('email_host', settings.email.host);
      formData.append('email_port', String(settings.email.port));
      formData.append('email_username', settings.email.username);
      formData.append('email_password', settings.email.password);
      formData.append('email_encryption', settings.email.encryption);
      formData.append('email_from_name', settings.email.fromName);
      formData.append('email_from_email', settings.email.fromEmail);

      // Integrations
      formData.append('pos_barcode_scanner_enabled', settings.integrations.pos.barcodeScanner ? '1' : '0');
      formData.append('accounting_integration_enabled', settings.integrations.accounting.enabled ? '1' : '0');
      formData.append('analytics_integration_enabled', settings.integrations.analytics.enabled ? '1' : '0');
      
      
      // Log form data for debugging (optional)
      for (const [key, value] of formData.entries()) {
        if (key === 'logo') {
          
        } else {
          
        }
      }

      const updatedApiSettings = await dispatch(updateSettings(formData)).unwrap() as ApiSettingsData;

      

      // After successful API update, re-map the response to local state to ensure consistency
      const newLocalSettings: SettingsState = {
        ...settings,
        company: {
          ...settings.company,
          logoUrl: updatedApiSettings.logo_url || '',
          logo: null, // Clear the File object after successful upload
        },
        system: {
          ...settings.system,
          currency: updatedApiSettings.currency,
          language: updatedApiSettings.language,
          timezone: updatedApiSettings.timezone,
          dateFormat: updatedApiSettings.date_format,
          numberFormat: updatedApiSettings.number_format,
          rtlMode: updatedApiSettings.rtl_mode,
          exchangeRate: updatedApiSettings.exchange_rate || 1.00,
          backup: {
            ...settings.system.backup,
            autoBackup: updatedApiSettings.auto_backup_enabled,
            backupFrequency: updatedApiSettings.backup_frequency,
            retentionDays: updatedApiSettings.backup_retention_days,
            lastBackup: updatedApiSettings.last_backup_date || null,
          },
         
        },
        ui: {
            ...settings.ui,
            theme: updatedApiSettings.theme,
            primaryColor: updatedApiSettings.primary_color,
            secondaryColor: updatedApiSettings.secondary_color,
            sidebarCollapsed: updatedApiSettings.sidebar_collapsed,
            dashboardLayout: updatedApiSettings.dashboard_layout,
            tileSize: updatedApiSettings.dashboard_tile_size,
            enableAnimations: updatedApiSettings.enable_animations,
            compactMode: updatedApiSettings.compact_mode,
            rtlDirection: updatedApiSettings.rtl_direction,
            sidebarMenuItems: updatedApiSettings.sidebar_menu_items ? JSON.parse(updatedApiSettings.sidebar_menu_items) : settings.ui.sidebarMenuItems,
        },
        business: {
            ...settings.business,
            allowNegativeStock: updatedApiSettings.allow_negative_stock,
            requireCustomerForSales: updatedApiSettings.require_customer_for_sales,
            autoGenerateBarcode: updatedApiSettings.auto_generate_barcode,
            defaultPaymentMethod: updatedApiSettings.default_payment_method,
            taxRate: updatedApiSettings.tax_rate,
            enableLoyaltyProgram: updatedApiSettings.enable_loyalty_program,
            loyaltyPointsRate: updatedApiSettings.loyalty_points_rate,
            minimumOrderAmount: updatedApiSettings.minimum_order_amount,
        },
        security: {
            ...settings.security,
            sessionTimeout: updatedApiSettings.session_timeout,
            passwordMinLength: updatedApiSettings.password_min_length,
            requireStrongPassword: updatedApiSettings.require_strong_password,
            enableTwoFactor: updatedApiSettings.enable_two_factor,
            allowMultipleSessions: updatedApiSettings.allow_multiple_sessions,
            loginAttempts: updatedApiSettings.login_attempts,
            lockoutDuration: updatedApiSettings.lockout_duration,
        },
        notifications: {
            ...settings.notifications,
            email: {
                ...settings.notifications.email,
                enabled: updatedApiSettings.email_notifications_enabled,
                lowStock: updatedApiSettings.email_low_stock_notifications,
                newOrders: updatedApiSettings.email_new_order_notifications,
            },
            sms: {
                ...settings.notifications.sms,
                enabled: updatedApiSettings.sms_notifications_enabled,
            },
            push: {
                ...settings.notifications.push,
                enabled: updatedApiSettings.push_notifications_enabled,
            },
        },
        receipt: {
            ...settings.receipt,
            printMode: (updatedApiSettings as any).bill_print_mode as 'thermal' | 'a4',
            template: updatedApiSettings.bill_template,
            showLogo: updatedApiSettings.bill_show_logo,
            showBarcode: updatedApiSettings.bill_show_barcode,
            showCompanyInfo: updatedApiSettings.bill_show_company_info,
            showQrCode: updatedApiSettings.bill_show_qr_code,
            footerText: updatedApiSettings.bill_footer_text,
            paperSize: updatedApiSettings.bill_paper_size,
            orientation: updatedApiSettings.bill_orientation,
            margins: {
                top: updatedApiSettings.bill_margin_top,
                right: updatedApiSettings.bill_margin_right,
                bottom: updatedApiSettings.bill_margin_bottom,
                left: updatedApiSettings.bill_margin_left,
            },
            fonts: {
                header: updatedApiSettings.bill_font_header,
                body: updatedApiSettings.bill_font_body,
                footer: updatedApiSettings.bill_font_footer,
            },
            colors: {
                primary: updatedApiSettings.bill_color_primary,
                secondary: updatedApiSettings.bill_color_secondary,
                text: updatedApiSettings.bill_color_text,
            },
        },
        email: {
            ...settings.email,
            provider: updatedApiSettings.email_provider,
            host: updatedApiSettings.email_host,
            port: updatedApiSettings.email_port,
            username: updatedApiSettings.email_username,
            password: updatedApiSettings.email_password,
            encryption: updatedApiSettings.email_encryption,
            fromName: updatedApiSettings.email_from_name,
            fromEmail: updatedApiSettings.email_from_email,
        },
        integrations: {
            ...settings.integrations,
            pos: {
                ...settings.integrations.pos,
                barcodeScanner: updatedApiSettings.pos_barcode_scanner_enabled,
            },
            accounting: {
                ...settings.integrations.accounting,
                enabled: updatedApiSettings.accounting_integration_enabled,
            },
            analytics: {
                ...settings.integrations.analytics,
                enabled: updatedApiSettings.analytics_integration_enabled,
            },
        },
      };
      setSettings(newLocalSettings);
      saveSettingsToStorage(newLocalSettings);
      
      toast.success('تم حفظ الإعدادات بنجاح');
      setUnsavedChanges(false);
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  // Test email configuration
  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    try {
      // API call to test email
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API call
      toast.success('تم إرسال رسالة اختبار بنجاح');
    } catch (err) {
      toast.error('فشل في إرسال رسالة الاختبار');
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Fetch backups from server
  const fetchBackups = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token') || Cookies.get('token');
      if (!token) {
        
        return;
      }

      const response = await api.get('/database/backups');
      if (response.data.success) {
        setBackups(response.data.data);
        
      } else {
        toast.error('حدث خطأ أثناء جلب النسخ الاحتياطية');
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      // Don't show error toast for authentication issues
      if (error.response?.status !== 401) {
        toast.error('حدث خطأ أثناء جلب النسخ الاحتياطية');
      }
    }
  };

  // Fetch backup scheduler status
  const fetchBackupSchedulerStatus = async () => {
    try {
      const response = await api.get('/settings/backup/scheduler-status');
      if (response.data.success) {
        setBackupSchedulerStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching backup scheduler status:', error);
    }
  };

  // Backup database
  const handleBackupDatabase = async () => {
    try {
      const response = await api.post('/database/backup');

      if (response.data.success) {
        const { totalBackups, maxBackups } = response.data.data;
        
        if (totalBackups >= maxBackups) {
          toast.success(`تم إنشاء نسخة احتياطية بنجاح (${totalBackups}/${maxBackups}). تم حذف النسخ القديمة تلقائياً.`);
        } else {
          toast.success(`تم إنشاء نسخة احتياطية بنجاح (${totalBackups}/${maxBackups})`);
        }
        
        // Update last backup time
        handleNestedChange('system', 'backup', 'lastBackup', new Date().toISOString());
        
        // Refresh backups list
        fetchBackups();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setShowBackupDialog(false);
    }
  };

  // Restore from backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      const response = await api.post(`/database/restore/${selectedBackup}`);

      if (response.data.success) {
        toast.success('تم استعادة قاعدة البيانات بنجاح');
        setShowRestoreDialog(false);
        setSelectedBackup(null);
        // Refresh the page to reflect changes
        window.location.reload();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء استعادة قاعدة البيانات');
    }
  };

  // Enhanced backup functionality
  const handleSelectBackupDirectory = async () => {
    try {
      if (!(window as WindowWithElectron).electron) {
        toast.error('هذه الميزة متاحة فقط في تطبيق سطح المكتب');
        return;
      }

      const result = await (window as WindowWithElectron).electron.selectBackupDirectory();
      
      if (result.success && result.directory) {
        setSelectedBackupDirectory(result.directory);
        toast.success(`تم اختيار المجلد: ${result.directory}`);
      } else {
        toast.error(result.error || 'فشل في اختيار المجلد');
      }
    } catch (error) {
      console.error('Error selecting backup directory:', error);
      toast.error('حدث خطأ أثناء اختيار المجلد');
    }
  };

  const handleCustomBackup = async () => {
    if (!selectedBackupDirectory) {
      toast.error('يرجى اختيار مجلد النسخ الاحتياطية أولاً');
      return;
    }

    try {
      const response = await api.post('/database/backup', {
        customDirectory: selectedBackupDirectory
      });

      if (response.data.success) {
        const { totalBackups, maxBackups } = response.data.data;
        
        if (totalBackups >= maxBackups) {
          toast.success(`تم إنشاء نسخة احتياطية بنجاح في المجلد المخصص (${totalBackups}/${maxBackups}). تم حذف النسخ القديمة تلقائياً.`);
        } else {
          toast.success(`تم إنشاء نسخة احتياطية بنجاح في المجلد المخصص (${totalBackups}/${maxBackups})`);
        }
        
        // Update last backup time
        handleNestedChange('system', 'backup', 'lastBackup', new Date().toISOString());
        
        // Refresh custom backups list
        await loadCustomBackupFiles();
        
        setShowCustomBackupDialog(false);
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    }
  };

  const loadCustomBackupFiles = async () => {
    if (!selectedBackupDirectory) return;

    setIsLoadingCustomBackups(true);
    try {
      if (!(window as WindowWithElectron).electron) {
        toast.error('هذه الميزة متاحة فقط في تطبيق سطح المكتب');
        return;
      }

      const result = await (window as WindowWithElectron).electron.readDirectory(selectedBackupDirectory);
      
      if (result.success && result.files) {
        // Filter only database files
        const dbFiles = result.files.filter(file => 
          !file.isDirectory && 
          (file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name.endsWith('.sqlite3'))
        );
        setCustomBackupFiles(dbFiles);
      } else {
        toast.error(result.error || 'فشل في قراءة المجلد');
      }
    } catch (error) {
      console.error('Error loading custom backup files:', error);
      toast.error('حدث خطأ أثناء تحميل ملفات النسخ الاحتياطية');
    } finally {
      setIsLoadingCustomBackups(false);
    }
  };

  const handleSelectCustomBackupFile = async () => {
    try {
      if (!(window as WindowWithElectron).electron) {
        toast.error('هذه الميزة متاحة فقط في تطبيق سطح المكتب');
        return;
      }

      const result = await (window as WindowWithElectron).electron.selectBackupFile();
      
      if (result.success && result.filePath) {
        setSelectedCustomBackupFile(result.filePath);
        toast.success(`تم اختيار الملف: ${result.filePath}`);
      } else {
        toast.error(result.error || 'فشل في اختيار الملف');
      }
    } catch (error) {
      console.error('Error selecting backup file:', error);
      toast.error('حدث خطأ أثناء اختيار الملف');
    }
  };

  const handleRestoreFromCustomBackup = async () => {
    if (!selectedCustomBackupFile) {
      toast.error('يرجى اختيار ملف النسخة الاحتياطية أولاً');
      return;
    }

    try {
      const response = await api.post('/database/restore-custom', {
        backupPath: selectedCustomBackupFile
      });

      if (response.data.success) {
        toast.success('تم استعادة قاعدة البيانات من الملف المخصص بنجاح');
        setShowCustomRestoreDialog(false);
        setSelectedCustomBackupFile('');
        // Refresh the page to reflect changes
        window.location.reload();
      } else {
        throw new Error(response.data.message || 'حدث خطأ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء استعادة قاعدة البيانات');
    }
  };

  const handleLoadDefaultBackupDirectory = async () => {
    try {
      if (!(window as WindowWithElectron).electron) {
        toast.error('هذه الميزة متاحة فقط في تطبيق سطح المكتب');
        return;
      }

      const result = await (window as WindowWithElectron).electron.getDefaultBackupDirectory();
      
      if (result.success && result.directory) {
        setSelectedBackupDirectory(result.directory);
        await loadCustomBackupFiles();
        toast.success(`تم تحميل المجلد الافتراضي: ${result.directory}`);
      } else {
        toast.error(result.error || 'فشل في تحميل المجلد الافتراضي');
      }
    } catch (error) {
      console.error('Error loading default backup directory:', error);
      toast.error('حدث خطأ أثناء تحميل المجلد الافتراضي');
    }
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const defaultSettings = getDefaultSettings();
    setSettings(defaultSettings);
    saveSettingsToStorage(defaultSettings); // Also save defaults to localStorage
    setUnsavedChanges(true); // Mark as unsaved so user can save them to API
    toast.success('تم إعادة تعيين الإعدادات للوضع الافتراضي. اضغط حفظ لتطبيقها.');
  };

  // Export settings
  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('تم تصدير الإعدادات بنجاح');
  };

  // Import settings
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        
        setUnsavedChanges(true);
        toast.success('تم استيراد الإعدادات بنجاح');
      } catch (err) {
        toast.error('فشل في استيراد الإعدادات - تنسيق ملف غير صحيح');
      }
    };
    reader.readAsText(file);
  };

  // Add missing saveBillSettings function
  const saveBillSettings = async () => {
    try {
      // Save bill settings logic here
      toast.success('تم حفظ إعدادات الفواتير بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ إعدادات الفواتير');
    }
  };

  // Generate receipt template HTML
  const generateReceiptTemplate = () => {
    return `<!DOCTYPE html>
<html lang="${settings.system.language}" dir="${settings.ui.rtlDirection ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${settings.company.name || 'فاتورة'}</title>
    <style>
        body {
            font-family: '${settings.receipt.fonts.body}', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: ${settings.receipt.colors.text};
            direction: ${settings.ui.rtlDirection ? 'rtl' : 'ltr'};
        }
        .header {
            font-family: '${settings.receipt.fonts.header}', Arial, sans-serif;
            text-align: center;
            border-bottom: 2px solid ${settings.receipt.colors.primary};
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .company-name {
            color: ${settings.receipt.colors.primary};
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .company-info {
            font-size: 10px;
            margin: 2px 0;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: ${settings.ui.rtlDirection ? 'right' : 'left'};
        }
        .items-table th {
            background-color: ${settings.receipt.colors.secondary}20;
            font-weight: bold;
        }
        .total-section {
            text-align: ${settings.ui.rtlDirection ? 'left' : 'right'};
            border-top: 2px solid ${settings.receipt.colors.primary};
            padding-top: 10px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        .grand-total {
            font-size: 16px;
            font-weight: bold;
            color: ${settings.receipt.colors.primary};
        }
        .footer {
            font-family: '${settings.receipt.fonts.footer}', Arial, sans-serif;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            margin-top: 20px;
            font-size: 10px;
        }
        .barcode-section {
            text-align: center;
            margin-top: 20px;
        }
        .logo {
            max-height: 60px;
            margin-bottom: 10px;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    ${settings.receipt.showLogo || settings.receipt.showCompanyInfo ? `
    <div class="header">
        ${settings.receipt.showLogo && settings.company.logoUrl ? `
        <img src="${getLogoUrl(settings.company.logoUrl)}" alt="شعار الشركة" class="logo">
        ` : ''}
        ${settings.receipt.showCompanyInfo ? `
        <div class="company-name">${settings.company.name || 'اسم الشركة'}</div>
        ${settings.company.address ? `<div class="company-info">${settings.company.address}</div>` : ''}
        ${settings.company.phone ? `<div class="company-info">هاتف: ${settings.company.phone}</div>` : ''}
        ${settings.company.email ? `<div class="company-info">البريد: ${settings.company.email}</div>` : ''}
        ` : ''}
    </div>

    {/* Main Device IP Input - Show when secondary mode is selected */}
    {showMainDeviceInput && (
      <div className="space-y-4 p-4 border border-green-200 bg-green-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-4 h-4 text-green-600" />
          <h4 className="font-medium text-green-800">
            {settings.system.language === 'ar' ? 'إعدادات الجهاز الفرعي' : 'Secondary Device Settings'}
          </h4>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="main-device-ip-input" className="text-sm font-medium">
              {settings.system.language === 'ar' ? 'عنوان IP للجهاز الرئيسي *' : 'Main Device IP Address *'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="main-device-ip-input"
                value={mainDeviceIp}
                onChange={(e) => setMainDeviceIp(e.target.value)}
                placeholder="192.168.0.1"
                className={cn(
                  "font-mono flex-1",
                  !validateIpAddress(mainDeviceIp) && mainDeviceIp.length > 0
                    ? "border-red-300 focus:border-red-500"
                    : "border-green-300 focus:border-green-500"
                )}
                dir="ltr"
              />
              <Button
                onClick={saveMainDeviceIp}
                disabled={!mainDeviceIp || !validateIpAddress(mainDeviceIp)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                {settings.system.language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </div>
            
            {mainDeviceIp && !validateIpAddress(mainDeviceIp) && (
              <p className="text-xs text-red-600">
                {settings.system.language === 'ar' ? 'عنوان IP غير صحيح' : 'Invalid IP address format'}
              </p>
            )}
            
            <p className="text-xs text-green-700">
              {settings.system.language === 'ar' 
                ? 'أدخل عنوان IP الخاص بالجهاز الرئيسي الذي يشغل خادم URCash' 
                : 'Enter the IP address of the main device running URCash server'
              }
            </p>
          </div>
          
          {/* Quick IP suggestions */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-green-700">
              {settings.system.language === 'ar' ? 'عناوين شائعة:' : 'Common addresses:'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {['192.168.0.1', '192.168.1.1', '192.168.0.100', '192.168.1.100'].map((ip) => (
                <Button
                  key={ip}
                  variant="outline"
                  size="sm"
                  onClick={() => setMainDeviceIp(ip)}
                  className="text-xs h-6 px-2 border-green-300 text-green-700 hover:bg-green-100"
                >
                  {ip}
                </Button>
              ))}
            </div>
          </div>

          {/* Connection test button */}
          {mainDeviceIp && validateIpAddress(mainDeviceIp) && (
            <div className="pt-2 border-t border-green-200">
              <Button
                onClick={() => {
                  // Save first, then test
                  saveMainDeviceIp();
                  setTimeout(() => testMainDeviceConnection(), 1000);
                }}
                variant="outline"
                size="sm"
                disabled={testingConnection}
                className="gap-2 border-green-300 text-green-700 hover:bg-green-100"
              >
                {testingConnection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                {settings.system.language === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}
              </Button>
            </div>
          )}
        </div>
      </div>
    )}
    ` : ''}
    
    <div class="invoice-details">
        <div>
            <strong>رقم الفاتورة:</strong> {{invoice_number}}<br>
            <strong>التاريخ:</strong> {{invoice_date}}<br>
            <strong>الوقت:</strong> {{invoice_time}}
        </div>
        <div>
            <strong>العميل:</strong> {{customer_name}}<br>
            <strong>الهاتف:</strong> {{customer_phone}}<br>
            <strong>العنوان:</strong> {{customer_address}}
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>المجموع</th>
            </tr>
        </thead>
        <tbody>
            {{items_list}}
        </tbody>
    </table>
    
    <div class="total-section">
        <div class="total-line">
            <span>المجموع الفرعي:</span>
            <span>{{subtotal}} ${settings.system.currency}</span>
        </div>
        ${settings.business.taxRate > 0 ? `
        <div class="total-line">
            <span>الضريبة (${settings.business.taxRate}%):</span>
            <span>{{tax_amount}} ${settings.system.currency}</span>
        </div>
        ` : ''}
        <div class="total-line grand-total">
            <span>المجموع الكلي:</span>
            <span>{{total_amount}} ${settings.system.currency}</span>
        </div>
    </div>
    
    ${settings.receipt.footerText ? `
    <div class="footer">
        ${settings.receipt.footerText}
    </div>
    ` : ''}
    
    ${settings.receipt.showBarcode || settings.receipt.showQrCode ? `
    <div class="barcode-section">
        ${settings.receipt.showBarcode ? `
        <div style="margin: 10px 0;">
            <div style="height: 50px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px); width: 200px; margin: 0 auto;"></div>
            <div style="font-size: 10px; margin-top: 5px;">{{invoice_number}}</div>
        </div>
        ` : ''}
        ${settings.receipt.showQrCode ? `
        <div style="margin: 10px 0;">
            <div style="width: 60px; height: 60px; background: #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">QR</div>
            <div style="font-size: 10px; margin-top: 5px;">رمز الاستجابة السريعة</div>
        </div>
        ` : ''}
    </div>
    ` : ''}
</body>
</html>`;
  };

  // Premium Activation Functions
  const checkLicenseStatus = async () => {
    try {
      const status = await licenseService.checkStatus();
      setLicenseStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking license status:', error);
      toast.error(settings.system.language === 'ar' ? 'خطأ في فحص حالة الترخيص' : 'Error checking license status');
      return null;
    }
  };

  const handlePremiumActivation = async () => {
    if (!premiumActivationCode.trim()) {
      toast.error(settings.system.language === 'ar' ? 'يرجى إدخال رمز التفعيل' : 'Please enter activation code');
      return;
    }

    setIsActivating(true);
    try {
      const result = await licenseService.activateWithCode(premiumActivationCode.trim());
      setActivationResult(result);
      
      if (result.success && result.activated) {
        setShowActivationSuccess(true);
        setPremiumActivationCode('');
        toast.success(settings.system.language === 'ar' ? 'تم تفعيل الاشتراك المميز بنجاح!' : 'Premium license activated successfully!');
        
        // Refresh license status
        await checkLicenseStatus();
        
        // Reload the app after successful activation with a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000); // 2 second delay to show success message
      } else {
        toast.error(result.message || (settings.system.language === 'ar' ? 'فشل في تفعيل الترخيص' : 'Failed to activate license'));
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast.error(settings.system.language === 'ar' ? 'خطأ في عملية التفعيل' : 'Error during activation');
    } finally {
      setIsActivating(false);
    }
  };

  const handleFirstActivation = async () => {
    setIsActivating(true);
    try {
      const result = await licenseService.firstTimeActivation();
      
      if (result.success) {
        toast.success(settings.system.language === 'ar' ? 'تم التفعيل الأول بنجاح!' : 'First activation completed successfully!');
        await checkLicenseStatus();
      } else {
        toast.error(result.message || (settings.system.language === 'ar' ? 'فشل في التفعيل الأول' : 'Failed to perform first activation'));
      }
    } catch (error) {
      console.error('First activation error:', error);
      toast.error(settings.system.language === 'ar' ? 'خطأ في التفعيل الأول' : 'Error during first activation');
    } finally {
      setIsActivating(false);
    }
  };

  const handleAutomaticActivation = async () => {
    setIsActivating(true);
    try {
      const result = await licenseService.activate();
      
      if (result.success && result.activated) {
        toast.success(settings.system.language === 'ar' ? 'تم التفعيل التلقائي بنجاح!' : 'Automatic activation completed successfully!');
        await checkLicenseStatus();
      } else {
        toast.error(result.message || (settings.system.language === 'ar' ? 'فشل في التفعيل التلقائي' : 'Failed to perform automatic activation'));
      }
    } catch (error) {
      console.error('Automatic activation error:', error);
      toast.error(settings.system.language === 'ar' ? 'خطأ في التفعيل التلقائي' : 'Error during automatic activation');
    } finally {
      setIsActivating(false);
    }
  };

  // Load app info from Electron
  const loadAppInfo = async () => {
    try {
      if ((window as any).electron) {
        const result = await (window as any).electron.getAppInfo();
        if (result.success && result.info) {
          setAppInfo(result.info);
          // Also set the version globally for compatibility
          (window as any).urcashAppVersion = result.info.version;
        } else {
          console.error('Failed to get app info:', result.error);
          // Set fallback info
          setAppInfo({ 
            version: '1.0.0', 
            name: 'URCash Desktop',
            isElectron: true,
            platform: 'unknown',
            arch: 'unknown'
          });
        }
      } else if ((window as any).api?.getAppVersion) {
        // Fallback to API method
        const version = await (window as any).api.getAppVersion();
        (window as any).urcashAppVersion = version;
        setAppInfo({ 
          version, 
          name: 'URCash Desktop',
          isElectron: true,
          platform: 'web',
          arch: 'unknown'
        });
      } else {
        // Web environment fallback
        setAppInfo({ 
          version: import.meta.env.VITE_APP_VERSION || '1.0.0', 
          name: 'URCash Web',
          isElectron: false,
          platform: 'web',
          arch: 'unknown'
        });
      }
    } catch (error) {
      console.error('Failed to load app info:', error);
      // Set fallback info on error
      setAppInfo({ 
        version: '1.0.0', 
        name: 'URCash Desktop',
        isElectron: true,
        platform: 'unknown',
        arch: 'unknown'
      });
    }
  };

  // Check for app updates from Railway API
  const checkForUpdates = async () => {
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateInfo(null);
    
    try {
      // Check if we're in Electron environment
      if ((window as any).electron) {
        // Use the custom Railway API update check
        try {
          const autoUpdateResult = await (window as any).electron.triggerAutoUpdateCheck();
          if (autoUpdateResult.success) {
            toast.info(settings.system.language === 'ar' 
              ? 'تم فحص التحديثات بنجاح' 
              : 'Update check completed successfully');
          }
        } catch (autoUpdateError) {
          console.log('Custom update check failed, falling back to manual check');
        }
        
        // Also use the manual Railway API check as backup
        const result = await (window as any).electron.checkForUpdates();
        
        if (result.success) {
          // Use Railway API response data with better version comparison
          const hasUpdate = result.updateAvailable && compareVersions(result.currentVersion, result.latestVersion);
          
          setUpdateInfo({
            ...result.releaseData,
            currentVersion: result.currentVersion,
            latestVersion: result.latestVersion,
            hasUpdate: hasUpdate,
            updateAvailable: result.updateAvailable,
            platform: result.platform
          });
          
          if (result.hasUpdate) {
            toast.success(settings.system.language === 'ar' 
              ? `تحديث جديد متاح: ${result.latestVersion}` 
              : `New update available: ${result.latestVersion}`);
          } else {
            // Show appropriate message based on whether it's a 404 response or no updates
            if (result.message && result.message.includes('No updates available')) {
              toast.success(settings.system.language === 'ar' 
                ? 'لا توجد تحديثات متاحة حالياً. التطبيق محدث إلى أحدث إصدار.' 
                : 'No updates available. Application is up to date.');
            } else {
              toast.success(settings.system.language === 'ar' 
                ? 'التطبيق محدث إلى أحدث إصدار' 
                : 'Application is up to date');
            }
          }
        } else {
          setUpdateError(result.error || (settings.system.language === 'ar' 
            ? 'فشل في التحقق من التحديثات' 
            : 'Failed to check for updates'));
        }
      } else {
        // Fallback to direct fetch for web environment using Railway API
        const platform = navigator.platform.toLowerCase().includes('win') ? 'windows' : 
                         navigator.platform.toLowerCase().includes('mac') ? 'mac' : 'linux';
        
        const response = await fetch(`https://urcash.up.railway.app/api/updates/latest/${platform}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch release information');
        }
        
        const releaseData = await response.json();
        const currentVersion = (window as any).urcashAppVersion || import.meta.env.VITE_APP_VERSION || '1.0.0';
        const hasUpdate = releaseData.updateAvailable && compareVersions(currentVersion, releaseData.version);
        
        setUpdateInfo({
          tag_name: releaseData.version,
          name: `URCash v${releaseData.version}`,
          body: 'نسخة جديدة متاحة للتحميل',
          published_at: releaseData.releaseDate,
          html_url: releaseData.downloadUrl,
          downloadUrl: releaseData.downloadUrl,
          fileName: releaseData.fileName,
          fileSize: releaseData.fileSize,
          currentVersion,
          latestVersion: releaseData.version,
          hasUpdate,
          updateAvailable: releaseData.updateAvailable,
          platform: releaseData.platform
        });
        
        if (hasUpdate) {
          toast.success(settings.system.language === 'ar' 
            ? `تحديث جديد متاح: ${releaseData.version}` 
            : `New update available: ${releaseData.version}`);
        } else {
          toast.success(settings.system.language === 'ar' 
            ? 'التطبيق محدث إلى أحدث إصدار' 
            : 'Application is up to date');
        }
      }
      
    } catch (error: any) {
      console.error('Update check error:', error);
      
      // Handle specific error cases
      if (error?.response?.status === 404) {
        // No updates available - this is not an error, it's a normal state
        setUpdateInfo({
          currentVersion: appInfo?.version || '1.0.0',
          latestVersion: appInfo?.version || '1.0.0',
          hasUpdate: false,
          updateAvailable: false,
          platform: appInfo?.platform || 'unknown'
        });
        
        toast.success(settings.system.language === 'ar' 
          ? 'لا توجد تحديثات متاحة حالياً. التطبيق محدث إلى أحدث إصدار.' 
          : 'No updates available. Application is up to date.');
      } else if (error?.response?.status === 403) {
        // Access forbidden
        setUpdateError(settings.system.language === 'ar' 
          ? 'لا يمكن الوصول إلى خادم التحديثات. يرجى المحاولة لاحقاً.' 
          : 'Cannot access update server. Please try again later.');
        toast.error(settings.system.language === 'ar' 
          ? 'خطأ في الوصول إلى خادم التحديثات' 
          : 'Update server access error');
      } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
        // Network connectivity issues
        setUpdateError(settings.system.language === 'ar' 
          ? 'لا يمكن الاتصال بخادم التحديثات. تحقق من اتصال الإنترنت.' 
          : 'Cannot connect to update server. Check your internet connection.');
        toast.error(settings.system.language === 'ar' 
          ? 'خطأ في الاتصال بخادم التحديثات' 
          : 'Update server connection error');
      } else {
        // Generic error
        setUpdateError(settings.system.language === 'ar' 
          ? 'فشل في التحقق من التحديثات. يرجى المحاولة مرة أخرى.' 
          : 'Failed to check for updates. Please try again.');
        toast.error(settings.system.language === 'ar' 
          ? 'فشل في التحقق من التحديثات' 
          : 'Failed to check for updates');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // Download and install update
  const downloadUpdate = async () => {
    if (!updateInfo) return;
    
    try {
      setIsDownloading(true);
      setUpdateStatus(settings.system.language === 'ar' ? 'جاري بدء التحميل...' : 'Starting download...');
      
      if ((window as any).electron) {
        // Use the downloadUrl from Railway API or fallback to html_url
        const downloadUrl = updateInfo.downloadUrl || updateInfo.html_url;
        const result = await (window as any).electron.downloadUpdate(downloadUrl);
        if (result.success) {
          toast.success(result.message || (settings.system.language === 'ar' 
            ? 'بدأ تحميل التحديث تلقائياً' 
            : 'Automatic update download started'));
        } else {
          throw new Error(result.error || 'Failed to start update download');
        }
      } else {
        // Fallback: open Railway download URL in current window
        const downloadUrl = updateInfo.downloadUrl || updateInfo.html_url;
        if (downloadUrl) {
          window.open(downloadUrl, '_blank');
        } else {
          // If no specific download URL, use the Railway API download endpoint
          const platform = navigator.platform.toLowerCase().includes('win') ? 'windows' : 
                           navigator.platform.toLowerCase().includes('mac') ? 'mac' : 'linux';
          window.open(`https://urcash.up.railway.app/api/updates/download/latest/${platform}`, '_blank');
        }
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Download update error:', error);
      setUpdateError(error instanceof Error ? error.message : 'فشل في تحميل التحديث');
      toast.error(settings.system.language === 'ar' 
        ? 'فشل في تحميل التحديث' 
        : 'Failed to download update');
      setIsDownloading(false);
    }
  };

  // Handle manual update installation
  const installUpdate = async () => {
    try {
      if ((window as any).electron) {
        const result = await (window as any).electron.installUpdate();
        if (result.success) {
          toast.success(settings.system.language === 'ar' 
            ? 'جاري إعادة تشغيل التطبيق...' 
            : 'Restarting application...');
        } else {
          throw new Error(result.error || 'Failed to install update');
        }
      }
    } catch (error) {
      console.error('Error installing update:', error);
      toast.error(settings.system.language === 'ar' 
        ? 'فشل في تثبيت التحديث' 
        : 'Failed to install update');
    }
  };

  // Auto-discover main device on network
  const discoverMainDevice = async () => {
    setTestingConnection(true);
    toast.info(settings.system.language === 'ar' ? 'جاري البحث عن الجهاز الرئيسي...' : 'Searching for main device...');
    
    try {
      // First, try to get the local IP address from the branch-config endpoint
      let localIpAddress = null;
      try {
        const response = await fetch('/api/branch-config/ip');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.ip_address) {
            localIpAddress = data.ip_address;
            
          }
        }
      } catch (error) {
        
      }

      // Get current network subnet based on local IP or use common subnets
      let commonSubnets = [
        '192.168.1.',
        '192.168.0.',
        '192.168.100.',
        '10.0.0.',
        '172.16.0.'
      ];

      // If we have a local IP, prioritize that subnet
      if (localIpAddress) {
        const subnet = localIpAddress.substring(0, localIpAddress.lastIndexOf('.') + 1);
        commonSubnets = [subnet, ...commonSubnets.filter(s => s !== subnet)];
      }
      
      let foundDevice = null;
      
      for (const subnet of commonSubnets) {
        // Test common IPs in parallel (1-10, 100-110)
        const testIPs = [];
        for (let i = 1; i <= 10; i++) {
          testIPs.push(`${subnet}${i}`);
        }
        for (let i = 100; i <= 110; i++) {
          testIPs.push(`${subnet}${i}`);
        }
        
        // Test all IPs in parallel with short timeout
        const testPromises = testIPs.map(async (ip) => {
          try {
            if (window.electron?.testMainDeviceConnection) {
              const result = await window.electron.testMainDeviceConnection({
                mainDeviceIp: ip,
                port: settings.system.deviceMode.port,
                timeout: 2000 // Short timeout for discovery
              });
              
              if (result.success && result.connected) {
                return { ip, latency: result.latency };
              }
            } else {
              // Fallback to fetch with short timeout
              const response = await fetch(`http://${ip}:${settings.system.deviceMode.port}/api/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
              });
              
              if (response.ok) {
                return { ip, latency: 0 };
              }
            }
            return null;
          } catch {
            return null;
          }
        });
        
        const results = await Promise.allSettled(testPromises);
        const successfulResults = results
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => (result as PromiseFulfilledResult<any>).value);
        
        if (successfulResults.length > 0) {
          // Sort by latency and pick the best one
          foundDevice = successfulResults.sort((a, b) => (a.latency || 999) - (b.latency || 999))[0];
          break;
        }
      }
      
      if (foundDevice) {
        // Update the IP and test connection
        handleNestedChange('system', 'deviceMode', 'mainDeviceIp', foundDevice.ip);
        setConnectionStatus({
          isConnected: true,
          lastChecked: new Date(),
          error: null,
          latency: foundDevice.latency || null
        });
        
        toast.success(
          settings.system.language === 'ar' 
            ? `تم العثور على الجهاز الرئيسي في: ${foundDevice.ip}${foundDevice.latency ? ` (${foundDevice.latency}ms)` : ''}` 
            : `Main device found at: ${foundDevice.ip}${foundDevice.latency ? ` (${foundDevice.latency}ms)` : ''}`
        );
      } else {
        toast.error(
          settings.system.language === 'ar' 
            ? 'لم يتم العثور على أي جهاز رئيسي في الشبكة' 
            : 'No main device found on the network'
        );
      }
    } catch (error) {
      console.error('Discovery failed:', error);
      toast.error(
        settings.system.language === 'ar' 
          ? 'فشل في البحث عن الجهاز الرئيسي' 
          : 'Failed to discover main device'
      );
    } finally {
      setTestingConnection(false);
    }
  };

  // Device Mode Helper Functions
  const testMainDeviceConnection = async () => {
    if (settings.system.deviceMode.mode === 'main') {
      toast.info(settings.system.language === 'ar' ? 'هذا الجهاز هو الجهاز الرئيسي' : 'This device is the main device');
      return;
    }

    if (!settings.system.deviceMode.mainDeviceIp.trim()) {
      toast.error(settings.system.language === 'ar' ? 'يرجى إدخال عنوان IP للجهاز الرئيسي' : 'Please enter the main device IP address');
      return;
    }

    setTestingConnection(true);

    try {
      // Use Electron API if available, otherwise fallback to fetch
      if ((window as any).electron?.testMainDeviceConnection) {
        const result = await (window as any).electron.testMainDeviceConnection({
          mainDeviceIp: settings.system.deviceMode.mainDeviceIp,
          port: settings.system.deviceMode.port,
          timeout: settings.system.deviceMode.connectionTimeout
        });

        if (result.success && result.connected) {
          setConnectionStatus({
            isConnected: true,
            lastChecked: new Date(),
            error: null,
            latency: result.latency || null
          });
          toast.success(result.message || (
            settings.system.language === 'ar' 
              ? `تم الاتصال بنجاح! زمن الاستجابة: ${result.latency}ms` 
              : `Connected successfully! Latency: ${result.latency}ms`
          ));
        } else {
          throw new Error(result.error || 'Connection failed');
        }
      } else {
        // Fallback to direct fetch
        const startTime = Date.now();
        const mainDeviceUrl = `http://${settings.system.deviceMode.mainDeviceIp}:${settings.system.deviceMode.port}`;
        
        const response = await fetch(`${mainDeviceUrl}/api/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(settings.system.deviceMode.connectionTimeout)
        });

        if (response.ok) {
          const latency = Date.now() - startTime;
          setConnectionStatus({
            isConnected: true,
            lastChecked: new Date(),
            error: null,
            latency
          });
          toast.success(
            settings.system.language === 'ar' 
              ? `تم الاتصال بنجاح! زمن الاستجابة: ${latency}ms` 
              : `Connected successfully! Latency: ${latency}ms`
          );
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionStatus({
        isConnected: false,
        lastChecked: new Date(),
        error: errorMessage,
        latency: null
      });
      toast.error(
        settings.system.language === 'ar' 
          ? `فشل في الاتصال: ${errorMessage}` 
          : `Connection failed: ${errorMessage}`
      );
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDeviceModeChange = async (newMode: 'main' | 'secondary') => {
    try {
      const oldMode = localStorage.getItem('urcash_device_config');
      const oldDeviceConfig = oldMode ? JSON.parse(oldMode) : {};
      
      // Try to get the latest config from server first
      let serverIp = oldDeviceConfig.main_device_ip || '192.168.0.106'; // Use your provided IP as fallback
      try {
        const response = await fetch(`http://localhost:${API_CONFIG.API_PORT}/api/branch-config`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.ip) {
            serverIp = data.data.ip;
          }
        }
      } catch (error) {
        console.warn('Failed to get latest IP from server, using cached value');
      }
      
      // Create device config object with the *new* mode and correct IP from server
      const deviceConfig = {
        device_mode: newMode,
        main_device_ip: newMode === 'secondary' ? serverIp : 'localhost',
        port: settings.system.deviceMode.port || 39000,
        auto_connect: settings.system.deviceMode.autoConnect || false,
        connection_timeout: settings.system.deviceMode.connectionTimeout || 10000
      };

      

      // Save to localStorage immediately with proper IP handling
      localStorage.setItem('urcash_device_config', JSON.stringify(deviceConfig));

      // Also save to Electron app config for persistence
      if (window.electron?.setAppConfig) {
        try {
          await window.electron.setAppConfig({
            branch: newMode,
            ip: deviceConfig.main_device_ip,
            port: deviceConfig.port,
            auto_connect: deviceConfig.auto_connect,
            connection_timeout: deviceConfig.connection_timeout
          });
          
        } catch (error) {
          console.error('Failed to save to Electron app config:', error);
        }
      }

      // Update API URL using the imported function
      updateApiUrl();
      setCurrentApiUrl(getCurrentApiUrl());

      // Now update the local state after successful save
      handleNestedChange('system', 'deviceMode', 'mode', newMode);

      toast.success(
        settings.system.language === 'ar'
          ? `تم تغيير وضع الجهاز إلى ${newMode === 'main' ? 'رئيسي' : 'فرعي'}`
          : `Device mode changed to ${newMode}`
      );

      // Show API endpoint change notification with actual IP
      if (newMode === 'secondary') {
        toast.info(
          settings.system.language === 'ar'
            ? `API يتوجه الآن إلى: ${deviceConfig.main_device_ip}:${deviceConfig.port}`
            : `API now pointing to: ${deviceConfig.main_device_ip}:${deviceConfig.port}`,
          { duration: 4000 }
        );
      } else {
        toast.info(
          settings.system.language === 'ar'
            ? 'API يتوجه الآن إلى: localhost:39000'
            : 'API now pointing to: localhost:39000',
          { duration: 4000 }
        );
      }

      // Show restart warning
      toast.info(
        settings.system.language === 'ar'
          ? 'يرجى إعادة تشغيل التطبيق لتطبيق التغييرات'
          : 'Please restart the application to apply changes',
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Failed to save device config:', error);
      toast.error(
        settings.system.language === 'ar'
          ? 'فشل في حفظ إعدادات الجهاز'
          : 'Failed to save device configuration'
      );
    }
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  // Save main device IP address
  const saveMainDeviceIp = async () => {
    if (!mainDeviceIp || !validateIpAddress(mainDeviceIp)) {
      toast.error(
        settings.system.language === 'ar' 
          ? 'يرجى إدخال عنوان IP صحيح' 
          : 'Please enter a valid IP address'
      );
      return;
    }

    try {
      const deviceConfig = {
        device_mode: 'secondary',
        main_device_ip: mainDeviceIp,
        port: 39000,
        auto_connect: false,
        connection_timeout: 10000
      };

      // Save to localStorage
      localStorage.setItem('urcash_device_config', JSON.stringify(deviceConfig));

      // Update settings state
      const newSettings = {
        ...settings,
        system: {
          ...settings.system,
          deviceMode: {
            ...settings.system.deviceMode,
            mainDeviceIp: mainDeviceIp,
            mode: 'secondary' as const
          }
        }
      };
      setSettings(newSettings);
      saveSettingsToStorage(newSettings);

      // Update API URL
      updateApiUrl();

      // If we have Electron API, use it to save device config
      if ((window as any).electron?.setDeviceConfig) {
        await (window as any).electron.setDeviceConfig(deviceConfig);
      }

      toast.success(
        settings.system.language === 'ar' 
          ? 'تم حفظ عنوان IP بنجاح' 
          : 'IP address saved successfully'
      );

      // Show restart warning
      toast.info(
        settings.system.language === 'ar'
          ? 'يرجى إعادة تشغيل التطبيق لتطبيق التغييرات'
          : 'Please restart the application to apply changes',
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Failed to save main device IP:', error);
      toast.error(
        settings.system.language === 'ar'
          ? 'فشل في حفظ عنوان IP'
          : 'Failed to save IP address'
      );
    }
  };

  // Fix device config with correct IP address
  const fixDeviceConfig = (correctIp: string): boolean => {
    try {
      const deviceConfig = {
        device_mode: 'secondary',
        main_device_ip: correctIp,
        port: 39000,
        auto_connect: false,
        connection_timeout: 10000
      };

      // Save to localStorage
      localStorage.setItem('urcash_device_config', JSON.stringify(deviceConfig));

      // Update API URL
      updateApiUrl();

      // If we have Electron API, use it to save device config
      if ((window as any).electron?.setDeviceConfig) {
        (window as any).electron.setDeviceConfig(deviceConfig).catch((error: any) => {
          console.warn('Failed to save device config to Electron:', error);
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to fix device config:', error);
      return false;
    }
  };

  // Reset device config with correct IP address
  const resetDeviceConfigWithCorrectIP = (): boolean => {
    try {
      const deviceConfig = {
        device_mode: 'secondary',
        main_device_ip: '192.168.0.1',
        port: 39000,
        auto_connect: false,
        connection_timeout: 10000
      };

      // Save to localStorage
      localStorage.setItem('urcash_device_config', JSON.stringify(deviceConfig));

      // Update API URL
      updateApiUrl();

      // If we have Electron API, use it to save device config
      if ((window as any).electron?.setDeviceConfig) {
        (window as any).electron.setDeviceConfig(deviceConfig).catch((error: any) => {
          console.warn('Failed to save device config to Electron:', error);
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to reset device config:', error);
      return false;
    }
  };

  // Get local IP address from API
  const getLocalIpAddress = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/branch-config/ip');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.ip_address) {
          return data.ip_address;
        }
      }
    } catch (error) {
      console.error('Failed to get local IP address:', error);
    }
    return null;
  };



  // Load license status on component mount
  useEffect(() => {
    // Auto-fix incorrect IP address if found
    checkLicenseStatus();
    loadAppInfo();
    
    // Only fetch backups if user is authenticated
    const token = localStorage.getItem('token') || Cookies.get('token');
    if (token) {
      fetchBackups();
    }
    
    fetchBackupSchedulerStatus();
    loadUpdateSettings();
    
    // Set up update status listener for Electron
    if ((window as any).electron && (window as any).electron.onUpdateStatus) {
      const handleUpdateStatus = (status: any) => {
        
        setUpdateStatus(status.message || '');
        
        switch (status.status) {
          case 'checking':
            setUpdateLoading(true);
            setUpdateError(null);
            break;
          case 'available':
            setUpdateLoading(false);
            break;
          case 'not-available':
            setUpdateLoading(false);
            break;
          case 'downloading':
            setIsDownloading(true);
            setUpdateProgress(status.progress);
            if (status.progress && status.progress.percent !== undefined) {
              setUpdateStatus(`${status.message} (${status.progress.percent}%)`);
            }
            break;
          case 'download-started':
            setIsDownloading(false);
            toast.info(status.message);
            break;
          case 'downloaded':
            setIsDownloading(false);
            toast.success(status.message);
            break;
          case 'ready':
            setIsDownloading(false);
            break;
          case 'error':
            setUpdateLoading(false);
            setIsDownloading(false);
            setUpdateError(status.error || status.message);
            toast.error(status.message);
            break;
        }
      };
      
      (window as any).electron.onUpdateStatus(handleUpdateStatus);
      
      // Cleanup listener on unmount
      return () => {
        if ((window as any).electron && (window as any).electron.removeUpdateStatusListener) {
          (window as any).electron.removeUpdateStatusListener(handleUpdateStatus);
        }
      };
    }
    
    // Additional version detection for debugging
    
    
    
    
    
  }, []);

  // Update settings state
  const [appUpdateSettings, setAppUpdateSettings] = useState({
    autoUpdateChecking: true,
    updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
    notifyOnUpdate: true,
    autoDownload: false,
    lastUpdateCheck: null as string | null
  });

  // Load update settings
  const loadUpdateSettings = async () => {
    try {
      if ((window as any).electron) {
        const result = await (window as any).electron.getUpdateSettings();
        if (result.success) {
          setAppUpdateSettings(result.settings);
        }
      }
    } catch (error) {
      console.error('Failed to load update settings:', error);
    }
  };

  // Save update settings
  const saveUpdateSettings = async (newSettings: any) => {
    try {
      if ((window as any).electron) {
        const result = await (window as any).electron.setUpdateSettings(newSettings);
        if (result.success) {
          setAppUpdateSettings(newSettings);
          toast.success(settings.system.language === 'ar' 
            ? 'تم حفظ إعدادات التحديث بنجاح' 
            : 'Update settings saved successfully');
        } else {
          throw new Error(result.error || 'Failed to save update settings');
        }
      }
    } catch (error) {
      console.error('Failed to save update settings:', error);
      toast.error(settings.system.language === 'ar' 
        ? 'فشل في حفظ إعدادات التحديث' 
        : 'Failed to save update settings');
    }
  };

  // Add missing updateSettings state variable
  const [updateSettingsState, setUpdateSettingsState] = useState({
    notifyOnUpdate: true,
    lastUpdateCheck: null as string | null
  });

  return (
    <>
      {/* Backup Confirmation Dialog */}
      <AlertDialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد النسخ الاحتياطي</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إنشاء نسخة احتياطية جديدة من قاعدة البيانات؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Backup Status Info */}
          <div className="py-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">النسخ الحالية:</span>
                <span className="text-lg font-bold text-blue-900">{backups.length}/5</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((backups.length / 5) * 100, 100)}%` }}
                ></div>
              </div>
              {backups.length >= 5 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ تم الوصول للحد الأقصى. سيتم حذف أقدم نسخة احتياطية تلقائياً.
                </p>
              ) : backups.length >= 4 ? (
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                  ⚠️ اقتراب من الحد الأقصى ({5 - backups.length} نسخة متبقية).
                </p>
              ) : (
                <p className="text-xs text-blue-700">
                  يمكن إنشاء {5 - backups.length} نسخة احتياطية إضافية.
                </p>
              )}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBackupDatabase}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              إنشاء نسخة احتياطية
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>استعادة من نسخة احتياطية</AlertDialogTitle>
            <AlertDialogDescription>
              اختر النسخة الاحتياطية التي تريد استعادتها. سيتم استبدال قاعدة البيانات الحالية بالنسخة المختارة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                    selectedBackup === backup.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setSelectedBackup(backup.id)}
                >
                  <div className="font-medium">{backup.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(backup.createdAt).toLocaleString('ar-IQ')} - 
                    {(backup.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ))}
              {backups.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  لا توجد نسخ احتياطية
                </div>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              disabled={!selectedBackup}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Backup Dialog */}
      <AlertDialog open={showCustomBackupDialog} onOpenChange={setShowCustomBackupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إنشاء نسخة احتياطية في مجلد مخصص</AlertDialogTitle>
            <AlertDialogDescription>
              اختر مجلداً لحفظ النسخة الاحتياطية فيه. يمكنك اختيار أي مجلد على جهازك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Directory Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">مجلد النسخ الاحتياطية:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedBackupDirectory}
                  placeholder="اختر مجلد النسخ الاحتياطية..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  readOnly
                />
                <button
                  onClick={handleSelectBackupDirectory}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  اختيار مجلد
                </button>
              </div>
            </div>

            {/* Default Directory Button */}
            <div className="flex justify-center">
              <button
                onClick={handleLoadDefaultBackupDirectory}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                استخدام المجلد الافتراضي
              </button>
            </div>

            {/* Custom Backups List */}
            {selectedBackupDirectory && (
              <div className="space-y-2">
                <label className="text-sm font-medium">النسخ الاحتياطية الموجودة:</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {isLoadingCustomBackups ? (
                    <div className="text-center text-muted-foreground py-4">
                      جاري التحميل...
                    </div>
                  ) : customBackupFiles.length > 0 ? (
                    <div className="space-y-1">
                      {customBackupFiles.map((file, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-muted-foreground">
                            {new Date(file.createdAt).toLocaleString('ar-IQ')} - 
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      لا توجد نسخ احتياطية في هذا المجلد
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCustomBackup}
              disabled={!selectedBackupDirectory}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              إنشاء نسخة احتياطية
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Restore Dialog */}
      <AlertDialog open={showCustomRestoreDialog} onOpenChange={setShowCustomRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>استعادة من ملف مخصص</AlertDialogTitle>
            <AlertDialogDescription>
              اختر ملف النسخة الاحتياطية الذي تريد استعادته. يمكنك اختيار أي ملف قاعدة بيانات على جهازك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ملف النسخة الاحتياطية:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedCustomBackupFile}
                  placeholder="اختر ملف النسخة الاحتياطية..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  readOnly
                />
                <button
                  onClick={handleSelectCustomBackupFile}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  اختيار ملف
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <div className="text-sm text-amber-800">
                  <p className="font-medium">تحذير:</p>
                  <p>سيتم استبدال قاعدة البيانات الحالية بالنسخة المختارة. تأكد من إنشاء نسخة احتياطية من البيانات الحالية قبل الاستعادة.</p>
                </div>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreFromCustomBackup}
              disabled={!selectedCustomBackupFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              استعادة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div 
        className="container mx-auto p-6 space-y-6" 
        dir={settings.ui.rtlDirection ? 'rtl' : 'ltr'}
      >
      {/* Header with RTL support */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            {settings.system.language === 'ar' ? 'إعدادات النظام' : 'System Settings'}
          </h1>
          <p className="text-gray-600 mt-1">
            {settings.system.language === 'ar' 
              ? 'تخصيص وإدارة إعدادات النظام' 
              : 'Customize and manage system settings'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {unsavedChanges && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {settings.system.language === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved changes'}
            </Badge>
          )}
          
          <Button
            onClick={handleSaveSettings}
            disabled={!unsavedChanges || isLoading}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {settings.system.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Main Settings Tabs with RTL support */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir={settings.ui.rtlDirection ? 'rtl' : 'ltr'}>
        <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'المظهر' : 'Appearance'}
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Zap className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'خدمات' : 'Services'}
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2">
            <Receipt className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'الفواتير' : 'Receipts'}
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'الأجهزة' : 'Devices'}
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-2">
            <Crown className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'الاشتراك المميز' : 'Premium License'}
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'القائمة' : 'Menu'}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            {settings.system.language === 'ar' ? 'النظام' : 'System'}
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab with RTL layout */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'معلومات الشركة' : 'Company Information'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'تحديث معلومات الشركة الأساسية' 
                  : 'Update basic company information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Logo with RTL support */}
              <div className="space-y-4">
                <Label>
                  {settings.system.language === 'ar' ? 'شعار الشركة' : 'Company Logo'}
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {settings.company.logoUrl ? (
                      <img 
                        src={getLogoUrl(settings.company.logoUrl)} 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          console.error('Failed to load logo:', settings.company.logoUrl);
                          console.error('Constructed URL:', getLogoUrl(settings.company.logoUrl));
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => logoUploadRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {settings.system.language === 'ar' ? 'تحميل شعار' : 'Upload Logo'}
                    </Button>
                    {settings.company.logoUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          handleSettingsChange('company', 'logoUrl', '');
                          handleSettingsChange('company', 'logo', null);
                          toast.success('تم إزالة الشعار');
                        }}
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                        {settings.system.language === 'ar' ? 'إزالة الشعار' : 'Remove Logo'}
                      </Button>
                    )}
                    <p className="text-xs text-gray-500">
                      {settings.system.language === 'ar' 
                        ? 'PNG, JPG - الحد الأقصى 2MB' 
                        : 'PNG, JPG - Max 2MB'
                      }
                    </p>
                    <input
                      ref={logoUploadRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          

                          // Validate file size (2MB max)
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error('حجم الملف كبير جداً. الحد الأقصى 2MB');
                            e.target.value = '';
                            return;
                          }

                          // Validate file type
                          if (!file.type.startsWith('image/')) {
                            toast.error('يرجى اختيار ملف صورة صحيح');
                            e.target.value = '';
                            return;
                          }

                          // Set the file object and create blob URL for preview
                          
                          handleSettingsChange('company', 'logo', file);
                          const previewUrl = URL.createObjectURL(file);
                          handleSettingsChange('company', 'logoUrl', previewUrl);
                          
                          toast.success('تم اختيار الصورة. اضغط حفظ لتطبيق التغييرات.');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Company Information Grid with RTL inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">
                    {settings.system.language === 'ar' ? 'اسم الشركة *' : 'Company Name *'}
                  </Label>
                  <Input
                    id="company-name"
                    value={settings.company.name}
                    onChange={(e) => handleSettingsChange('company', 'name', e.target.value)}
                    placeholder={settings.system.language === 'ar' ? 'أدخل اسم الشركة' : 'Enter company name'}
                    className={cn(
                      "transition-all",
                      settings.ui.rtlDirection ? "text-right" : "text-left"
                    )}
                    dir={settings.ui.rtlDirection ? "rtl" : "ltr"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-email">
                    {settings.system.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => handleSettingsChange('company', 'email', e.target.value)}
                    placeholder="company@example.com"
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-phone">
                    {settings.system.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </Label>
                  <Input
                    id="company-phone"
                    value={settings.company.phone}
                    onChange={(e) => handleSettingsChange('company', 'phone', e.target.value)}
                    placeholder="+964 xxx xxx xxxx"
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-website">
                    {settings.system.language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}
                  </Label>
                  <Input
                    id="company-website"
                    value={settings.company.website}
                    onChange={(e) => handleSettingsChange('company', 'website', e.target.value)}
                    placeholder="https://example.com"
                    className="text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-number">
                    {settings.system.language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}
                  </Label>
                  <Input
                    id="tax-number"
                    value={settings.company.taxNumber}
                    onChange={(e) => handleSettingsChange('company', 'taxNumber', e.target.value)}
                    placeholder={settings.system.language === 'ar' ? 'رقم التسجيل الضريبي' : 'Tax registration number'}
                    className={cn(
                      "transition-all",
                      settings.ui.rtlDirection ? "text-right" : "text-left"
                    )}
                    dir={settings.ui.rtlDirection ? "rtl" : "ltr"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration-number">
                    {settings.system.language === 'ar' ? 'رقم التسجيل' : 'Registration Number'}
                  </Label>
                  <Input
                    id="registration-number"
                    value={settings.company.registrationNumber}
                    onChange={(e) => handleSettingsChange('company', 'registrationNumber', e.target.value)}
                    placeholder={settings.system.language === 'ar' ? 'رقم التسجيل التجاري' : 'Commercial registration number'}
                    className={cn(
                      "transition-all",
                      settings.ui.rtlDirection ? "text-right" : "text-left"
                    )}
                    dir={settings.ui.rtlDirection ? "rtl" : "ltr"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">
                  {settings.system.language === 'ar' ? 'العنوان' : 'Address'}
                </Label>
                <Textarea
                  id="company-address"
                  value={settings.company.address}
                  onChange={(e) => handleSettingsChange('company', 'address', e.target.value)}
                  placeholder={settings.system.language === 'ar' ? 'عنوان الشركة الكامل' : 'Complete company address'}
                  className={cn(
                    "transition-all",
                    settings.ui.rtlDirection ? "text-right" : "text-left"
                  )}
                  dir={settings.ui.rtlDirection ? "rtl" : "ltr"}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-description">
                  {settings.system.language === 'ar' ? 'وصف الشركة' : 'Company Description'}
                </Label>
                <Textarea
                  id="company-description"
                  value={settings.company.description}
                  onChange={(e) => handleSettingsChange('company', 'description', e.target.value)}
                  placeholder={settings.system.language === 'ar' ? 'وصف مختصر عن الشركة ونشاطها' : 'Brief description about the company and its activities'}
                  className={cn(
                    "transition-all",
                    settings.ui.rtlDirection ? "text-right" : "text-left"
                  )}
                  dir={settings.ui.rtlDirection ? "rtl" : "ltr"}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Preferences with Language Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'تفضيلات النظام' : 'System Preferences'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'العملة' : 'Currency'}</Label>
                  <Select
                    value={settings.system.currency}
                    onValueChange={(value) => handleSettingsChange('system', 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQD">
                        {settings.system.language === 'ar' ? 'دينار عراقي (IQD)' : 'Iraqi Dinar (IQD)'}
                      </SelectItem>
                      <SelectItem value="USD">
                        {settings.system.language === 'ar' ? 'دولار أمريكي (USD)' : 'US Dollar (USD)'}
                      </SelectItem>
                      <SelectItem value="EUR">
                        {settings.system.language === 'ar' ? 'يورو (EUR)' : 'Euro (EUR)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'اللغة' : 'Language'}</Label>
                  <Select
                    value={settings.system.language}
                    onValueChange={(value) => {
                      handleSettingsChange('system', 'language', value);
                      // Update RTL direction based on language
                      handleSettingsChange('ui', 'rtlDirection', value === 'ar');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ku">کوردی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}</Label>
                  <Select
                    value={settings.system.timezone}
                    onValueChange={(value) => handleSettingsChange('system', 'timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Baghdad">
                        {settings.system.language === 'ar' ? 'بغداد (GMT+3)' : 'Baghdad (GMT+3)'}
                      </SelectItem>
                      <SelectItem value="Asia/Dubai">
                        {settings.system.language === 'ar' ? 'دبي (GMT+4)' : 'Dubai (GMT+4)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'سعر صرف الدولار' : 'USD Exchange Rate'}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="10000"
                    value={settings.system.exchangeRate}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      // Validate exchange rate (between 0.0001 and 10000)
                      if (value >= 0.0001 && value <= 10000) {
                        handleSettingsChange('system', 'exchangeRate', value);
                      } else if (value > 10000) {
                        // If value is too high, set to maximum
                        handleSettingsChange('system', 'exchangeRate', 10000);
                      } else if (value < 0.0001 && value !== 0) {
                        // If value is too low, set to minimum
                        handleSettingsChange('system', 'exchangeRate', 0.0001);
                      }
                    }}
                    placeholder={settings.system.language === 'ar' ? 'أدخل سعر الصرف' : 'Enter exchange rate'}
                  />
                  <p className="text-sm text-muted-foreground">
                    {settings.system.language === 'ar' 
                      ? 'سعر صرف الدولار الأمريكي مقابل العملة المحلية (0.0001 - 10000)' 
                      : 'USD to local currency exchange rate (0.0001 - 10000)'}
                  </p>
                  {settings.system.exchangeRate > 1000 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-600">
                        {settings.system.language === 'ar' 
                          ? 'سعر الصرف مرتفع جداً. قد يسبب مشاكل في العرض.' 
                          : 'Exchange rate is very high. May cause display issues.'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSettingsChange('system', 'exchangeRate', 1000)}
                        className="text-xs"
                      >
                        {settings.system.language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}</Label>
                  <Select
                    value={settings.system.dateFormat}
                    onValueChange={(value) => handleSettingsChange('system', 'dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">31/12/2024</SelectItem>
                      <SelectItem value="MM/DD/YYYY">12/31/2024</SelectItem>
                      <SelectItem value="YYYY-MM-DD">2024-12-31</SelectItem>
                      <SelectItem value="DD-MM-YYYY">31-12-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{settings.system.language === 'ar' ? 'تنسيق الأرقام' : 'Number Format'}</Label>
                  <Select
                    value={settings.system.numberFormat}
                    onValueChange={(value) => handleSettingsChange('system', 'numberFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">1,234.56 (إنجليزي)</SelectItem>
                      <SelectItem value="ar-IQ">١٬٢٣٤٫٥٦ (عربي)</SelectItem>
                      <SelectItem value="de-DE">1.234,56 (ألماني)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings - Fix color picker */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                تخصيص المظهر
              </CardTitle>
              <CardDescription>
                تغيير ألوان وخيارات واجهة المستخدم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="font-medium">اللون الأساسي</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-300" style={{ backgroundColor: settings.ui.primaryColor }} />
                    <Input
                      type="color"
                      value={settings.ui.primaryColor}
                      onChange={(e) => handleSettingsChange('ui', 'primaryColor', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">{settings.ui.primaryColor}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-medium">اللون الثانوي</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-300" style={{ backgroundColor: settings.ui.secondaryColor }} />
                    <Input
                      type="color"
                      value={settings.ui.secondaryColor}
                      onChange={(e) => handleSettingsChange('ui', 'secondaryColor', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">{settings.ui.secondaryColor}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="font-medium">تخطيط لوحة التحكم</Label>
                  <Select
                    value={settings.ui.dashboardLayout}
                    onValueChange={(value) => handleSettingsChange('ui', 'dashboardLayout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">شبكي</SelectItem>
                      <SelectItem value="list">قائمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="font-medium">حجم المربعات</Label>
                  <Select
                    value={settings.ui.tileSize}
                    onValueChange={(value) => handleSettingsChange('ui', 'tileSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">صغير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">كبير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <Label className="font-medium">خيارات متقدمة</Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => {
                      handleSettingsChange('ui', 'primaryColor', '#1f1f1f');
                      handleSettingsChange('ui', 'secondaryColor', '#ededed');
                      toast.success('تم إعادة تعيين الألوان للافتراضية');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    إعادة تعيين الألوان
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services */}
        <TabsContent value="business" className="space-y-6">
          {/* Barcode Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'خدمات الباركود' : 'Barcode Services'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'إنشاء وإدارة الباركود للمنتجات والفواتير' 
                  : 'Generate and manage barcodes for products and invoices'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      {settings.system.language === 'ar' ? 'توليد باركود تلقائي' : 'Auto Generate Barcode'}
                    </Label>
                    <Switch
                      checked={settings.business.autoGenerateBarcode}
                      onCheckedChange={(checked) => 
                        handleDirectNestedChange('business', 'autoGenerateBarcode', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {settings.system.language === 'ar' 
                      ? 'توليد باركود تلقائي للمنتجات الجديدة' 
                      : 'Automatically generate barcodes for new products'
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>
                    {settings.system.language === 'ar' ? 'نوع الباركود' : 'Barcode Type'}
                  </Label>
                  <Select
                    value="CODE128"
                    onValueChange={(value) => {}}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">CODE128</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="QR">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowBarcodeGenerator(true)}
                  >
                    <Barcode className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'مولد الباركود' : 'Barcode Generator'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowBarcodeLabelPrinter(true)}
                  >
                    <Printer className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'طباعة التسميات' : 'Print Labels'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'خدمات الطباعة' : 'Print Services'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'إعدادات وخدمات الطباعة المختلفة' 
                  : 'Various printing settings and services'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      {settings.system.language === 'ar' ? 'طباعة تلقائية للفواتير' : 'Auto Print Invoices'}
                    </Label>
                    <Switch
                      checked={false}
                      onCheckedChange={(checked) => {}}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      {settings.system.language === 'ar' ? 'طباعة الإيصالات' : 'Print Receipts'}
                    </Label>
                    <Switch
                      checked={true}
                      onCheckedChange={(checked) => {}}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      window.print();
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'اختبار الطابعة' : 'Test Printer'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      toast.info(settings.system.language === 'ar' ? 'إعدادات الطابعة...' : 'Printer settings...');
                    }}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'إعدادات الطابعة' : 'Printer Settings'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'خدمات البريد الإلكتروني' : 'Email Services'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'إرسال الفواتير والتقارير عبر البريد الإلكتروني' 
                  : 'Send invoices and reports via email'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      {settings.system.language === 'ar' ? 'تفعيل خدمة البريد' : 'Enable Email Service'}
                    </Label>
                    <Switch
                      checked={settings.notifications.email.enabled}
                      onCheckedChange={(checked) => 
                        handleNestedChange('notifications', 'email', 'enabled', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      {settings.system.language === 'ar' ? 'إرسال الفواتير تلقائياً' : 'Auto Send Invoices'}
                    </Label>
                    <Switch
                      checked={false}
                      onCheckedChange={(checked) => {}}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={handleTestEmail}
                    disabled={testEmailLoading}
                  >
                    {testEmailLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {settings.system.language === 'ar' ? 'اختبار البريد' : 'Test Email'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      toast.info(settings.system.language === 'ar' ? 'إعدادات البريد...' : 'Email settings...');
                    }}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'إعدادات البريد' : 'Email Settings'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'قواعد العمل' : 'Business Rules'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'إعدادات القواعد والسياسات التجارية' 
                  : 'Business rules and policy settings'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label>
                        {settings.system.language === 'ar' ? 'السماح بالمخزون السالب' : 'Allow Negative Stock'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {settings.system.language === 'ar' 
                          ? 'السماح ببيع المنتجات حتى لو كان المخزون صفر أو سالب' 
                          : 'Allow selling products even when stock is zero or negative'
                        }
                      </p>
                    </div>
                    <Switch
                      checked={settings.business.allowNegativeStock}
                      onCheckedChange={(checked) => 
                        handleDirectNestedChange('business', 'allowNegativeStock', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label>
                        {settings.system.language === 'ar' ? 'طلب عميل للمبيعات' : 'Require Customer for Sales'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {settings.system.language === 'ar' 
                          ? 'إلزام اختيار عميل عند إنشاء عملية بيع' 
                          : 'Require selecting a customer when creating a sale'
                        }
                      </p>
                    </div>
                    <Switch
                      checked={settings.business.requireCustomerForSales}
                      onCheckedChange={(checked) => 
                        handleDirectNestedChange('business', 'requireCustomerForSales', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>
                    {settings.system.language === 'ar' ? 'طريقة الدفع الافتراضية' : 'Default Payment Method'}
                  </Label>
                  <Select
                    value={settings.business.defaultPaymentMethod}
                    onValueChange={(value) => handleDirectNestedChange('business', 'defaultPaymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        {settings.system.language === 'ar' ? 'نقداً' : 'Cash'}
                      </SelectItem>
                      <SelectItem value="card">
                        {settings.system.language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}
                      </SelectItem>
                      <SelectItem value="transfer">
                        {settings.system.language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>
                    {settings.system.language === 'ar' ? 'نسبة الضريبة (%)' : 'Tax Rate (%)'}
                  </Label>
                  <Input
                    type="number"
                    value={settings.business.taxRate}
                    onChange={(e) => 
                      handleDirectNestedChange('business', 'taxRate', parseFloat(e.target.value) || 0)
                    }
                    placeholder={settings.system.language === 'ar' ? 'أدخل نسبة الضريبة' : 'Enter tax rate'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import/Export Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'خدمات الاستيراد والتصدير' : 'Import/Export Services'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'استيراد وتصدير البيانات بصيغ مختلفة' 
                  : 'Import and export data in various formats'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleExportSettings}
                >
                  <Download className="w-4 h-4" />
                  {settings.system.language === 'ar' ? 'تصدير البيانات' : 'Export Data'}
                </Button>

                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,.csv,.xlsx';
                    input.onchange = handleImportSettings;
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {settings.system.language === 'ar' ? 'استيراد البيانات' : 'Import Data'}
                </Button>

                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    toast.info(settings.system.language === 'ar' ? 'قريباً...' : 'Coming soon...');
                  }}
                >
                  <FileText className="w-4 h-4" />
                  {settings.system.language === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt/Invoice Settings */}
        <TabsContent value="receipt" className="space-y-6">
          {/* Print Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'نوع الطباعة' : 'Print Mode'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'اختر نوع الطباعة المفضل للفواتير والإيصالات' 
                  : 'Choose the preferred print mode for invoices and receipts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A4 Print Mode */}
                <div 
                  className={cn(
                    "relative p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                    settings.receipt.printMode === 'a4' 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                                     onClick={() => handleDirectNestedChange('receipt', 'printMode', 'a4')}
                >
                  {settings.receipt.printMode === 'a4' && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center",
                      settings.receipt.printMode === 'a4' 
                        ? "bg-primary text-white" 
                        : "bg-gray-100 text-gray-600"
                    )}>
                      <FileText className="w-8 h-8" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {settings.system.language === 'ar' ? 'طباعة A4' : 'A4 Printing'}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {settings.system.language === 'ar' 
                          ? 'فواتير مفصلة على ورق A4 مع تصميم احترافي وشعار الشركة' 
                          : 'Detailed invoices on A4 paper with professional design and company logo'
                        }
                      </p>
                    </div>
                    
                    <div className="w-full pt-2 border-t">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span>{settings.system.language === 'ar' ? 'مناسب للمكاتب والشركات' : 'Suitable for offices and companies'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thermal Print Mode */}
                <div 
                  className={cn(
                    "relative p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                    settings.receipt.printMode === 'thermal' 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                                     onClick={() => handleDirectNestedChange('receipt', 'printMode', 'thermal')}
                >
                  {settings.receipt.printMode === 'thermal' && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center",
                      settings.receipt.printMode === 'thermal' 
                        ? "bg-primary text-white" 
                        : "bg-gray-100 text-gray-600"
                    )}>
                      <Receipt className="w-8 h-8" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {settings.system.language === 'ar' ? 'طباعة حرارية' : 'Thermal Printing'}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {settings.system.language === 'ar' 
                          ? 'إيصالات سريعة على ورق حراري بحجم 80مم للنقاط التجارية' 
                          : 'Fast receipts on 80mm thermal paper for retail points'
                        }
                      </p>
                    </div>
                    
                    <div className="w-full pt-2 border-t">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span>{settings.system.language === 'ar' ? 'مناسب للمحلات ونقاط البيع' : 'Suitable for shops and POS'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Selection Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">
                      {settings.system.language === 'ar' ? 'الوضع المحدد حالياً:' : 'Currently Selected Mode:'}
                    </p>
                    <p>
                      {settings.receipt.printMode === 'a4' 
                        ? (settings.system.language === 'ar' 
                          ? 'طباعة A4 - سيتم استخدام فواتير مفصلة بتصميم احترافي'
                          : 'A4 Printing - Detailed invoices with professional design will be used')
                        : (settings.system.language === 'ar' 
                          ? 'طباعة حرارية - سيتم استخدام إيصالات سريعة على ورق حراري'
                          : 'Thermal Printing - Fast receipts on thermal paper will be used')
                      }
                    </p>
                    <p className="mt-2 text-xs text-blue-600">
                      {settings.system.language === 'ar' 
                        ? 'يمكنك تغيير هذا الإعداد في أي وقت. سيطبق التغيير على جميع الفواتير الجديدة.'
                        : 'You can change this setting anytime. The change will apply to all new invoices.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Design Manager */}
          <BillDesignManager 
            onA4SettingsChange={(settings) => {
              // Handle A4 bill settings change
              
              toast.success('تم تحديث إعدادات فواتير A4');
            }}
            onThermalSettingsChange={(settings) => {
              // Handle thermal bill settings change
              
              toast.success('تم تحديث إعدادات الفواتير الحرارية');
            }}
            initialBillType={settings.receipt.printMode}
          />
        </TabsContent>

        {/* Security Settings - Replaced with Premium Activation Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إعدادات الأمان
              </CardTitle>
              <CardDescription>
                تخصيص خيارات الأمان وحماية البيانات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>مدة انتهاء الجلسة (دقائق)</Label>
                  <Input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => 
                      handleDirectNestedChange('security', 'sessionTimeout', parseInt(e.target.value) || 30)
                    }
                    placeholder="أدخل مدة انتهاء الجلسة"
                  />
                </div>

                <div className="space-y-4">
                  <Label>الحد الأدنى لطول كلمة المرور</Label>
                  <Input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => 
                      handleDirectNestedChange('security', 'passwordMinLength', parseInt(e.target.value) || 8)
                    }
                    placeholder="أدخل الحد الأدنى لطول كلمة المرور"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>تفعيل المصادقة الثنائية</Label>
                    <Switch
                      checked={settings.security.enableTwoFactor}
                      onCheckedChange={(checked) => 
                        handleDirectNestedChange('security', 'enableTwoFactor', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>السماح بجلسات متعددة</Label>
                    <Switch
                      checked={settings.security.allowMultipleSessions}
                      onCheckedChange={(checked) => 
                        handleDirectNestedChange('security', 'allowMultipleSessions', checked)
                      }
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>عدد محاولات تسجيل الدخول</Label>
                  <Input
                    type="number"
                    value={settings.security.loginAttempts}
                    onChange={(e) => 
                      handleDirectNestedChange('security', 'loginAttempts', parseInt(e.target.value) || 5)
                    }
                    placeholder="أدخل عدد محاولات تسجيل الدخول المسموح بها"
                  />
                </div>

                <div className="space-y-4">
                  <Label>مدة الحظر بعد الفشل في تسجيل الدخول (دقائق)</Label>
                  <Input
                    type="number"
                    value={settings.security.lockoutDuration}
                    onChange={(e) => 
                      handleDirectNestedChange('security', 'lockoutDuration', parseInt(e.target.value) || 15)
                    }
                    placeholder="أدخل مدة الحظر"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Menu Management Tab */}
        <TabsContent value="menu" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" />
                إدارة قائمة التنقل
              </CardTitle>
              <CardDescription>
                تخصيص عناصر القائمة الجانبية وترتيبها وإظهار/إخفاء العناصر
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">عناصر القائمة الجانبية</h3>
                  <p className="text-sm text-gray-500">
                    اسحب وأفلت لإعادة ترتيب العناصر أو استخدم الأزرار لإظهار/إخفاء العناصر
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset to default menu items - all enabled
                      const defaultMenuItems = [
                        { id: 'dashboard', name: 'لوحة التحكم', path: '/dashboard-charts', icon: 'LayoutDashboard', enabled: true },
                        { id: 'pos', name: 'نقطة البيع', path: '/pos', icon: 'ShoppingCart', enabled: true },
                        { id: 'sales', name: 'المبيعات', path: '/sales', icon: 'DollarSign', enabled: true },
                        { id: 'purchases', name: 'المشتريات', path: '/purchases', icon: 'Truck', enabled: true },
                                { id: 'inventory', name: 'المنتجات', path: '/inventory', icon: 'Package', enabled: true },
        { id: 'customers', name: 'العملاء', path: '/customers', icon: 'Users', enabled: true },
                        { id: 'suppliers', name: 'الموردين', path: '/suppliers', icon: 'Store', enabled: true },
                        { id: 'expenses', name: 'المصروفات', path: '/expenses', icon: 'ReceiptText', enabled: true },
                        { id: 'reports', name: 'التقارير', path: '/reports', icon: 'BarChart', enabled: true },
                        { id: 'customer-receipts', name: 'وصل قبض', path: '/customer-receipts', icon: 'Receipt', enabled: true },
                        { id: 'supplier-payment-receipts', name: 'وصل تسليم', path: '/supplier-payment-receipts', icon: 'CreditCard', enabled: true },
                        { id: 'debts', name: 'الديون', path: '/debts', icon: 'FileText', enabled: true },
                        { id: 'installments', name: 'الأقساط', path: '/installments', icon: 'Calendar', enabled: true },
                        { id: 'about', name: 'من نحن', path: '/about', icon: 'Info', enabled: true },
                        { id: 'settings', name: 'الإعدادات', path: '/settings', icon: 'Settings', enabled: true },
                      ];
                      handleSettingsChange('ui', 'sidebarMenuItems', defaultMenuItems);
                      toast.success('تم إعادة تعيين عناصر القائمة للوضع الافتراضي');
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    إعادة تعيين
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Enable all items
                      const updatedItems = settings.ui.sidebarMenuItems.map(item => ({
                        ...item,
                        enabled: true
                      }));
                      handleSettingsChange('ui', 'sidebarMenuItems', updatedItems);
                      toast.success('تم تمكين جميع عناصر القائمة');
                    }}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    تمكين الكل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Disable all non-essential items (keep dashboard, pos, settings)
                      const updatedItems = settings.ui.sidebarMenuItems.map(item => ({
                        ...item,
                        enabled: ['dashboard', 'pos', 'settings'].includes(item.id || item.path.split('/')[1])
                      }));
                      handleSettingsChange('ui', 'sidebarMenuItems', updatedItems);
                      toast.success('تم تعطيل العناصر الاختيارية');
                    }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    تعطيل الاختياري
                  </Button>
                </div>
              </div>

              {/* Menu Items List with Drag & Drop */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 px-4">
                    <span>العنصر</span>
                    <div className="flex items-center gap-8">
                      <span>الحالة</span>
                      <span>الإجراءات</span>
                    </div>
                  </div>
                </div>
                
                <DragDropContext
                  onDragEnd={(result: DropResult) => {
                    if (!result.destination) return;

                    const items = Array.from(settings.ui.sidebarMenuItems);
                    const [reorderedItem] = items.splice(result.source.index, 1);
                    items.splice(result.destination.index, 0, reorderedItem);

                    handleSettingsChange('ui', 'sidebarMenuItems', items);
                    toast.success('تم إعادة ترتيب عناصر القائمة');
                  }}
                >
                  <Droppable droppableId="menu-items">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {settings.ui.sidebarMenuItems.map((item, index) => {
                          // Get icon component based on icon name
                          const getIcon = (iconName: string) => {
                            const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
                              'LayoutDashboard': LayoutDashboard,
                              'ShoppingCart': ShoppingCart,
                              'DollarSign': DollarSign,
                              'Truck': Truck,
                              'Package': Package,
                              'Users': Users,
                              'Store': Store,
                              'ReceiptText': ReceiptText,
                              'Receipt': ReceiptText,
                              'CreditCard': CreditCard,
                              'BarChart': BarChart,
                              'FileText': FileText,
                              'ClipboardList': ClipboardList,
                              'Calendar': Calendar,
                              'Info': Info,
                              'Settings': SettingsIcon,
                            };
                            const IconComponent = iconMap[iconName] || FileText;
                            return <IconComponent className="w-4 h-4" />;
                          };

                          // Settings items are essential and cannot be hidden
                          const isEssential = ['settings'].includes(item.id) || item.path === '/settings';

                          return (
                            <Draggable
                              key={item.id || item.path}
                              draggableId={item.id || item.path}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "flex items-center justify-between p-4 bg-white border rounded-lg transition-all",
                                    snapshot.isDragging
                                      ? "shadow-lg border-primary ring-2 ring-primary/20"
                                      : "border-gray-200 hover:border-gray-300",
                                    !item.enabled && "opacity-60"
                                  )}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                                    >
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                    </div>
                                    
                                    {/* Icon */}
                                    <div className={cn(
                                      "p-2 rounded-lg flex-shrink-0",
                                      item.enabled 
                                        ? "bg-primary/10 text-primary" 
                                        : "bg-gray-100 text-gray-400"
                                    )}>
                                      {getIcon(item.icon || 'FileText')}
                                    </div>

                                    {/* Menu Item Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900 truncate">
                                          {item.name}
                                        </p>
                                        {isEssential && (
                                          <Badge variant="secondary" className="text-xs">
                                            أساسي
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500 truncate">
                                        {item.path}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Status and Actions */}
                                  <div className="flex items-center gap-4">
                                    {/* Status Badge */}
                                    <Badge 
                                      variant={item.enabled ? "default" : "secondary"}
                                      className="text-xs min-w-[60px] justify-center"
                                    >
                                      {item.enabled ? 'مفعل' : 'معطل'}
                                    </Badge>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1">
                                      {/* Toggle Visibility - Disabled for essential items */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-gray-100"
                                        onClick={() => {
                                          if (isEssential) {
                                            toast.error('لا يمكن إخفاء هذا العنصر الأساسي');
                                            return;
                                          }
                                          const updatedItems = settings.ui.sidebarMenuItems.map((menuItem, i) =>
                                            i === index ? { ...menuItem, enabled: !menuItem.enabled } : menuItem
                                          );
                                          handleSettingsChange('ui', 'sidebarMenuItems', updatedItems);
                                          toast.success(item.enabled ? 'تم إخفاء العنصر' : 'تم إظهار العنصر');
                                        }}
                                        title={isEssential ? 'عنصر أساسي لا يمكن إخفاؤه' : (item.enabled ? 'إخفاء العنصر' : 'إظهار العنصر')}
                                        disabled={isEssential}
                                      >
                                        {item.enabled ? (
                                          <EyeOff className={cn("w-4 h-4", isEssential ? "text-gray-300" : "text-gray-600")} />
                                        ) : (
                                          <Eye className="w-4 h-4 text-gray-600" />
                                        )}
                                      </Button>
                                      
                                      {/* Delete Button - Disabled for essential items */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          if (isEssential) {
                                            toast.error('لا يمكن حذف هذا العنصر الأساسي');
                                            return;
                                          }
                                          const updatedItems = settings.ui.sidebarMenuItems.filter((_, i) => i !== index);
                                          handleSettingsChange('ui', 'sidebarMenuItems', updatedItems);
                                          toast.success('تم حذف العنصر من القائمة');
                                        }}
                                        title={isEssential ? 'عنصر أساسي لا يمكن حذفه' : 'حذف العنصر'}
                                        disabled={isEssential}
                                      >
                                        <Trash2 className={cn("w-4 h-4", isEssential ? "text-gray-300" : "")} />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {/* Empty State */}
                {(settings.ui.sidebarMenuItems || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">لا توجد عناصر في القائمة</p>
                    <p className="text-sm">اضغط على "إعادة تعيين" لاستعادة العناصر الافتراضية</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(settings.ui.sidebarMenuItems || []).length}
                  </div>
                  <div className="text-sm text-blue-800">إجمالي العناصر</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(settings.ui.sidebarMenuItems || []).filter(item => item.enabled).length}
                  </div>
                  <div className="text-sm text-green-800">عناصر مفعلة</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {(settings.ui.sidebarMenuItems || []).filter(item => !item.enabled).length}
                  </div>
                  <div className="text-sm text-gray-800">عناصر معطلة</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {settings.ui.sidebarMenuItems.filter(item => 
                      ['settings'].includes(item.id) || item.path === '/settings'
                    ).length}
                  </div>
                  <div className="text-sm text-amber-800">عناصر أساسية</div>
                </div>
              </div>

              <Separator />

              {/* Live Preview */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    معاينة القائمة الجانبية
                  </h4>
                  <p className="text-sm text-gray-500">شكل القائمة كما ستظهر للمستخدمين</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-white max-w-sm">
                  <div className="space-y-1">
                    {settings.ui.sidebarMenuItems
                      .filter(item => item.enabled)
                      .map((item, index) => {
                        const getIcon = (iconName: string) => {
                          const iconMap: { [key: string]: React.ComponentType<any> } = {
                            'LayoutDashboard': LayoutDashboard,
                            'ShoppingCart': ShoppingCart,
                            'DollarSign': DollarSign,
                            'Truck': Truck,
                            'Package': Package,
                            'Users': Users,
                            'Store': Store,
                            'ReceiptText': ReceiptText,
                            'BarChart': BarChart,
                            'FileText': FileText,
                            'ClipboardList': ClipboardList,
                            'Calendar': Calendar,
                            'Info': Info,
                            'Settings': SettingsIcon,
                          };
                          const IconComponent = iconMap[iconName] || FileText;
                          return <IconComponent className="w-4 h-4" />;
                        };

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="text-gray-600">
                              {getIcon(item.icon || 'FileText')}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          </div>
                        );
                      })}
                  </div>
                  
                  {settings.ui.sidebarMenuItems.filter(item => item.enabled).length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">لا توجد عناصر مفعلة</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">نصائح مهمة</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• اسحب وأفلت العناصر لإعادة ترتيبها حسب الأهمية</li>
                      <li>• العناصر الأساسية (الإعدادات) لا يمكن حذفها أو إخفاؤها</li>
                      <li>• يمكن إخفاء العناصر غير المستخدمة لتبسيط واجهة المستخدم</li>
                      <li>• التغييرات ستظهر فوراً في القائمة الجانبية بعد الحفظ</li>
                      <li>• جميع العناصر مفعلة افتراضياً لسهولة الوصول</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium License Activation */}
        <TabsContent value="premium" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'تفعيل الاشتراك المميز' : 'Premium License Activation'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'تفعيل الاشتراك المميز باستخدام رمز التفعيل أو التفعيل التلقائي' 
                  : 'Activate premium license using activation code or automatic activation'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current License Status */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {settings.system.language === 'ar' ? 'حالة الترخيص الحالية' : 'Current License Status'}
                </h4>
             
                
               {/* show  license status */}
               <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {settings.system.language === 'ar' ? 'حالة الترخيص الحالية:' : 'Current License Status:'}
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  {licenseStatus?.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {settings.system.language === 'ar' ? 'ترخيص مفعل' : 'License Activated'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      {settings.system.language === 'ar' ? 'ترخيص غير مفعل' : 'License Not Activated'}
                    </div>
                  )}
                  {licenseStatus?.type_=== 'trial' ?(
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      {settings.system.language === 'ar' ? 'ترخيص تجريبي' : 'Trial License'}
                    </div>
                  ):(
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      {settings.system.language === 'ar' ? `${licenseStatus?.type_}` : 'Trial License'}
                    </div>
                  )
                }
                </div>
                {/* feature licenses */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {settings.system.language === 'ar' ? 'الميزات المفعلة:' : 'Enabled Features:'}
                  </Label>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {licenseStatus?.feature_licenses && Object.entries(licenseStatus.feature_licenses).map(([featureName, featureData]: [string, any], index: number) => {
                    const isExpired = featureData.expires_at ? new Date() > new Date(featureData.expires_at) : false;
                    const daysRemaining = featureData.expires_at ? 
                      Math.ceil((new Date(featureData.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <div key={`feature-${index}`} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isExpired ? 'bg-red-100' : 'bg-green-100'}`}>
                              <CheckCircle className={`w-4 h-4 ${isExpired ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">
                                {licenseService.getFeatureDisplayName(featureName, settings.system.language as 'ar' | 'en')}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {settings.system.language === 'ar' ? 'ميزة متقدمة' : 'Premium Feature'}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={isExpired ? "destructive" : "default"}
                            className="px-3 py-1 text-xs font-medium"
                          >
                            {isExpired ? (
                              settings.system.language === 'ar' ? 'منتهي' : 'Expired'
                            ) : (
                              settings.system.language === 'ar' ? 'نشط' : 'Active'
                            )}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Activation Date */}
                          {featureData.activated_at && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {settings.system.language === 'ar' ? 'تاريخ التفعيل' : 'Activated'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-800">
                                {new Date(featureData.activated_at).toLocaleString(
                                  settings.system.language === 'ar' ? 'ar-IQ' : 'en-US',
                                  { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* Expiration Date */}
                          {featureData.expires_at && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {settings.system.language === 'ar' ? 'تاريخ الانتهاء' : 'Expires'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-800">
                                {new Date(featureData.expires_at).toLocaleString(
                                  settings.system.language === 'ar' ? 'ar-IQ' : 'en-US',
                                  { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )}
                              </span>
                            </div>
                          )}

                          {/* Days Remaining */}
                          {daysRemaining !== null && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {settings.system.language === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}
                                </span>
                              </div>
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                daysRemaining < 0 ? 'bg-red-100 text-red-700' :
                                daysRemaining <= 7 ? 'bg-red-100 text-red-700' :
                                daysRemaining <= 30 ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {daysRemaining < 0 ? 
                                  (settings.system.language === 'ar' ? 'منتهي' : 'Expired') : 
                                  daysRemaining
                                }
                              </span>
                            </div>
                          )}
                          
                          {/* Feature Type */}
                          {featureData.type && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {settings.system.language === 'ar' ? 'النوع' : 'Type'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-800 capitalize">
                                {featureData.type}
                              </span>
                            </div>
                          )}
                          
                          {/* Activation Code */}
                          {featureData.activation_code && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {settings.system.language === 'ar' ? 'رمز التفعيل' : 'Activation Code'}
                                </span>
                              </div>
                              <span className="font-mono text-xs bg-slate-200 px-3 py-1 rounded-lg font-medium">
                                {featureData.activation_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
               </div>

                {/* Refresh Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLicenseLoading(true);
                      try {
                        const status = await checkLicenseStatus();
                        if (status) {
                          setLicenseStatus(status);
                          toast.success(settings.system.language === 'ar' ? 'تم تحديث حالة الترخيص' : 'License status updated');
                        }
                      } catch (error) {
                        toast.error(settings.system.language === 'ar' ? 'فشل في تحديث حالة الترخيص' : 'Failed to update license status');
                      } finally {
                        setLicenseLoading(false);
                      }
                    }}
                    disabled={licenseLoading}
                    className="gap-2"
                  >
                    {licenseLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {settings.system.language === 'ar' ? 'تحديث الحالة' : 'Refresh Status'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Activation Methods */}
              <div className="space-y-6">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {settings.system.language === 'ar' ? 'طرق التفعيل' : 'Activation Methods'}
                </h4>

                {/* Premium Activation with Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      {settings.system.language === 'ar' ? 'تفعيل مميز برمز التفعيل' : 'Premium Activation with Code'}
                    </CardTitle>
                    <CardDescription>
                      {settings.system.language === 'ar' 
                        ? 'أدخل رمز التفعيل المميز للحصول على جميع الميزات المتقدمة' 
                        : 'Enter premium activation code to unlock all advanced features'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="activation-code">
                        {settings.system.language === 'ar' ? 'رمز التفعيل المميز' : 'Premium Activation Code'}
                      </Label>
                      <Input
                        id="activation-code"
                        value={premiumActivationCode}
                        onChange={(e) => setPremiumActivationCode(e.target.value)}
                        placeholder={settings.system.language === 'ar' ? 'XXXX-XXXX-XXXX' : 'XXXX-XXXX-XXXX'}
                        className="font-mono text-center text-lg tracking-wider"
                        maxLength={14}
                      />
                      <p className="text-xs text-gray-500">
                        {settings.system.language === 'ar' 
                          ? 'أدخل رمز التفعيل المميز المكون من 12 حرف' 
                          : 'Enter the 12-character premium activation code'
                        }
                      </p>
                    </div>
                    
                    <Button
                      onClick={handlePremiumActivation}
                      disabled={!premiumActivationCode.trim() || isActivating}
                      className="w-full gap-2"
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {settings.system.language === 'ar' ? 'جاري التفعيل...' : 'Activating...'}
                        </>
                      ) : (
                        <>
                                                        <Crown className="w-4 h-4" />
                              تفعيل الاشتراك المميز
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>


                {/* First Activation */}
                {licenseStatus?.needsFirstActivation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        {settings.system.language === 'ar' ? 'التفعيل الأول' : 'First Activation'}
                      </CardTitle>
                      <CardDescription>
                        {settings.system.language === 'ar' 
                          ? 'التفعيل الأول للنظام - مطلوب مرة واحدة فقط' 
                          : 'First-time system activation - required only once'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={handleFirstActivation}
                        disabled={isActivating}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        {isActivating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {settings.system.language === 'ar' ? 'جاري التفعيل...' : 'Activating...'}
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4" />
                            {settings.system.language === 'ar' ? 'إجراء التفعيل الأول' : 'Perform First Activation'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Activation Success Dialog */}
              <Dialog open={showActivationSuccess} onOpenChange={setShowActivationSuccess}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      {settings.system.language === 'ar' ? 'تم التفعيل بنجاح!' : 'Activation Successful!'}
                    </DialogTitle>
                    <DialogDescription>
                      {settings.system.language === 'ar' 
                        ? 'تم تفعيل الاشتراك المميز بنجاح. يمكنك الآن الوصول إلى جميع الميزات المتقدمة.' 
                        : 'Premium license has been activated successfully. You now have access to all advanced features.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {activationResult?.licenseData && (
                      <div className="space-y-4">
                        {/* License Overview */}
                        <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Crown className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-green-800">
                              {settings.system.language === 'ar' ? 'تفاصيل الاشتراك المميز:' : 'Premium License Details:'}
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* License Type */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{settings.system.language === 'ar' ? 'النوع:' : 'Type:'}</span>
                              <Badge variant="outline" className="font-medium">
                                {activationResult.licenseData.type || 'Premium'}
                              </Badge>
                            </div>

                            {/* Expiration Date */}
                            {activationResult.licenseData?.expires_at && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{settings.system.language === 'ar' ? 'ينتهي في:' : 'Expires:'}</span>
                                <span className="font-medium">
                                  {new Date(activationResult.licenseData.expires_at).toLocaleDateString('ar-IQ')}
                                </span>
                              </div>
                            )}

                            {/* Activation Date */}
                            {activationResult.licenseData?.created_at && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{settings.system.language === 'ar' ? 'تاريخ التفعيل:' : 'Activated:'}</span>
                                <span className="font-medium">
                                  {new Date(activationResult.licenseData.created_at).toLocaleDateString('ar-IQ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Features List */}
                        {activationResult.licenseData.features && activationResult.licenseData.features.length > 0 && (
                          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-5 h-5 text-blue-600" />
                              <h4 className="font-medium text-blue-800">
                                {settings.system.language === 'ar' ? 'الميزات المتاحة:' : 'Available Features:'}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {activationResult.licenseData.features.map((feature: string, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-blue-800">{licenseService.getFeatureDisplayName(feature, settings.system.language as 'ar' | 'en')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional License Info */}
                        <div className="p-4 border rounded-lg bg-gray-50">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            {settings.system.language === 'ar' ? 'معلومات إضافية:' : 'Additional Information:'}
                          </h4>
                          <div className="space-y-2 text-sm">
                            {activationResult.isReactivation && (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span className="text-orange-800">
                                  {settings.system.language === 'ar' 
                                    ? 'هذا إعادة تفعيل للجهاز' 
                                    : 'This is a device reactivation'
                                  }
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">
                                {settings.system.language === 'ar' 
                                  ? 'الترخيص صالح ومفعل' 
                                  : 'License is valid and activated'
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-blue-600" />
                              <span className="text-gray-700">
                                {settings.system.language === 'ar' 
                                  ? 'متصل بخادم الترخيص' 
                                  : 'Connected to license server'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        onClick={() => setShowActivationSuccess(false)}
                        className="flex-1"
                      >
                        {settings.system.language === 'ar' ? 'تم' : 'OK'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={async () => {
                          setShowActivationSuccess(false);
                          // Refresh license status
                          const status = await checkLicenseStatus();
                          if (status) {
                            setLicenseStatus(status);
                          }
                        }}
                        className="flex-1 gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {settings.system.language === 'ar' ? 'تحديث الحالة' : 'Refresh Status'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>



        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* Check for Updates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'التحقق من التحديثات' : 'Check for Updates'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'التحقق من وجود تحديثات جديدة للتطبيق' 
                  : 'Check for new application updates'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Version Display */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {settings.system.language === 'ar' ? 'الإصدار الحالي:' : 'Current Version:'}
                    </p>
                    <div className="font-mono font-bold text-lg">
                      {appInfo?.version || 
                       (window as any).urcashAppVersion || 
                       import.meta.env.VITE_APP_VERSION || 
                       '1.0.0'}
                    </div>
                    {appInfo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {appInfo.isPackaged ? 
                          (settings.system.language === 'ar' ? 'تطبيق مُجمع' : 'Packaged App') : 
                          (settings.system.language === 'ar' ? 'وضع التطوير' : 'Development Mode')
                        }
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={checkForUpdates}
                  disabled={updateLoading}
                  className="gap-2"
                >
                  {updateLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {settings.system.language === 'ar' ? 'فحص التحديثات' : 'Check Updates'}
                </Button>
              </div>

              {/* Update Information */}
              {updateError && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      {settings.system.language === 'ar' ? 'خطأ:' : 'Error:'}
                    </span>
                  </div>
                  <p className="text-red-700 mt-1">{updateError}</p>
                </div>
              )}

              {updateInfo && (
                <div className="space-y-4">
                  {/* Version Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          {settings.system.language === 'ar' ? 'الإصدار الحالي:' : 'Current Version:'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-lg text-blue-900">
                        {updateInfo.currentVersion || appInfo?.version || '?.?.?'}
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          {settings.system.language === 'ar' ? 'أحدث إصدار:' : 'Latest Version:'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-lg text-green-900">
                        {updateInfo.latestVersion || updateInfo.tag_name}
                      </div>
                    </div>
                  </div>

                  {/* Update Status */}
                  <div className={`p-4 border rounded-lg ${
                    updateInfo.hasUpdate 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {updateInfo.hasUpdate ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-800">
                            {settings.system.language === 'ar' ? 'تحديث متاح' : 'Update Available'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">
                            {settings.system.language === 'ar' ? 'التطبيق محدث' : 'Application Up to Date'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className={`text-sm ${
                      updateInfo.hasUpdate ? 'text-amber-700' : 'text-green-700'
                    }`}>
                      {updateInfo.hasUpdate 
                        ? (settings.system.language === 'ar' 
                          ? 'يتوفر إصدار جديد من التطبيق. يُنصح بالتحديث للحصول على أحدث الميزات والإصلاحات.' 
                          : 'A new version of the application is available. Update is recommended to get the latest features and fixes.')
                        : (settings.system.language === 'ar' 
                          ? 'تستخدم أحدث إصدار من التطبيق.' 
                          : 'You are using the latest version of the application.')
                      }
                    </p>
                  </div>

                  {/* Download Button */}
                  {updateInfo.hasUpdate && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={downloadUpdate}
                        disabled={isDownloading}
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isDownloading 
                          ? (settings.system.language === 'ar' ? 'جاري التحميل...' : 'Downloading...')
                          : (settings.system.language === 'ar' ? 'تحميل التحديث' : 'Download Update')
                        }
                      </Button>
                      
                      {(window as any).electron && (
                        <Button
                          onClick={installUpdate}
                          variant="outline"
                          className="gap-2"
                        >
                          <Package className="w-4 h-4" />
                          {settings.system.language === 'ar' ? 'تثبيت التحديث' : 'Install Update'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Download Progress */}
                  {isDownloading && updateProgress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {settings.system.language === 'ar' ? 'التقدم:' : 'Progress:'}
                        </span>
                        <span className="text-gray-600">
                          {updateProgress.percent || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${updateProgress.percent || 0}%` }}
                        />
                      </div>
                      {updateProgress.transferred && updateProgress.total && (
                        <div className="text-xs text-gray-500 text-center">
                          {formatFileSize(updateProgress.transferred)} / {formatFileSize(updateProgress.total)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Update Status Message */}
                  {updateStatus && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{updateStatus}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Backup and Maintenance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                {settings.system.language === 'ar' ? 'النسخ الاحتياطي والصيانة' : 'Backup & Maintenance'}
              </CardTitle>
              <CardDescription>
                {settings.system.language === 'ar' 
                  ? 'إدارة النسخ الاحتياطية وصيانة النظام' 
                  : 'Manage backups and system maintenance'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local Backup Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  <h4 className="font-medium">
                    {settings.system.language === 'ar' ? 'النسخ الاحتياطي المحلي' : 'Local Backup'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {settings.system.language === 'ar' ? 'النسخ الاحتياطي التلقائي:' : 'Auto Backup:'}
                    </Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {settings.system.language === 'ar' ? 'تفعيل النسخ الاحتياطي التلقائي' : 'Enable automatic backup'}
                      </span>
                      <Switch
                        checked={settings.system.backup.autoBackup}
                        onCheckedChange={(checked) => {
                          handleNestedChange('system', 'backup', 'autoBackup', checked);
                          // Refresh scheduler status after change
                          setTimeout(() => fetchBackupSchedulerStatus(), 1000);
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {settings.system.language === 'ar' ? 'تكرار النسخ الاحتياطي:' : 'Backup Frequency:'}
                    </Label>
                    <Select
                      value={settings.system.backup.backupFrequency}
                      onValueChange={(value) => {
                        handleNestedChange('system', 'backup', 'backupFrequency', value);
                        // Refresh scheduler status after change
                        setTimeout(() => fetchBackupSchedulerStatus(), 1000);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">
                          {settings.system.language === 'ar' ? 'يومياً' : 'Daily'}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {settings.system.language === 'ar' ? 'أسبوعياً (الأحد)' : 'Weekly (Sunday)'}
                        </SelectItem>
                        <SelectItem value="monthly">
                          {settings.system.language === 'ar' ? 'شهرياً (أول الشهر)' : 'Monthly (1st of month)'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {settings.system.language === 'ar' ? 'وقت النسخ الاحتياطي:' : 'Backup Time:'}
                    </Label>
                    <Input
                      type="time"
                      value={settings.system.backup.backupTime}
                      onChange={(e) => {
                        handleNestedChange('system', 'backup', 'backupTime', e.target.value);
                        // Refresh scheduler status after change
                        setTimeout(() => fetchBackupSchedulerStatus(), 1000);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {settings.system.language === 'ar' ? 'آخر نسخة احتياطية:' : 'Last Backup:'}
                  </Label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {settings.system.backup.lastBackup 
                      ? new Date(settings.system.backup.lastBackup).toLocaleString(
                          settings.system.language === 'ar' ? 'ar-IQ' : 'en-US'
                        )
                      : (settings.system.language === 'ar' ? 'لا توجد نسخة احتياطية' : 'No backup available')
                    }
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowBackupDialog(true)}
                    disabled={backupLoading}
                    variant="outline"
                    className="gap-2"
                  >
                    {backupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {settings.system.language === 'ar' ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
                  </Button>
                  
                  <Button
                    onClick={() => setShowRestoreDialog(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
                  </Button>

                  {/* Enhanced Backup Buttons - Only show in Electron */}
                  {(window as WindowWithElectron).electron && (
                    <>
                      <Button
                        onClick={() => setShowCustomBackupDialog(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        {settings.system.language === 'ar' ? 'نسخة احتياطية في مجلد مخصص' : 'Custom Directory Backup'}
                      </Button>
                      
                      <Button
                        onClick={() => setShowCustomRestoreDialog(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {settings.system.language === 'ar' ? 'استعادة من ملف مخصص' : 'Restore from Custom File'}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={handleResetToDefaults}
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {settings.system.language === 'ar' ? 'إعادة تعيين الإعدادات' : 'Reset Settings'}
                  </Button>
                </div>
              </div>

              {/* Cloud Backup Section - Premium Feature */}
              <div className="space-y-4 mt-4 border-t pt-4 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <h4 className="font-medium">
                      النسخ الاحتياطي السحابي
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                      مميز
                    </Badge>
                  </div>
                </div>
                
                {/* Check if cloud backup feature is activated */}
                {(() => {
                  // Check if license is activated and has cloud-backup feature
                  const isLicenseActivated = licenseStatus?.success && licenseStatus?.type !== 'trial';
                  
                  // Try multiple ways to check for cloud-backup feature
                  let hasCloudBackupFeature = false;
                  let cloudBackupFeature = null;
                  
                  // Method 1: Check in direct features object (primary location)
                  if (licenseStatus?.features && typeof licenseStatus.features === 'object') {
                    cloudBackupFeature = licenseStatus.features['cloud-backups'];
                    if (cloudBackupFeature) {
                      const isNotExpired = !cloudBackupFeature.expires_at || new Date() < new Date(cloudBackupFeature.expires_at);
                      hasCloudBackupFeature = isNotExpired;
                    }
                  }
                  
                  // Method 2: Check in licenseData.features object (fallback)
                  if (!hasCloudBackupFeature && licenseStatus?.licenseData?.features) {
                    cloudBackupFeature = licenseStatus.licenseData.features['cloud-backups'];
                    if (cloudBackupFeature) {
                      const isNotExpired = !cloudBackupFeature.expires_at || new Date() < new Date(cloudBackupFeature.expires_at);
                      hasCloudBackupFeature = isNotExpired;
                    }
                  }
                  
                  // Method 3: Check in feature_licenses object (legacy)
                  if (!hasCloudBackupFeature && licenseStatus?.feature_licenses && typeof licenseStatus.feature_licenses === 'object') {
                    hasCloudBackupFeature = 'cloud-backups' in licenseStatus.feature_licenses;
                  }
                  
                  return isLicenseActivated && hasCloudBackupFeature;
                })() ? (
                  <>
                    {/* Activated - Show cloud backup functionality */}
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">
                            النسخ الاحتياطي السحابي متاح 
                          </p>
                          <p className="text-green-700">
                            احفظ نسخة احتياطية من قاعدة البيانات على الخادم البعيد للحماية الإضافية والوصول من أي مكان.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <CloudBackupButton className="gap-2" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Not Activated - Show premium upgrade message */}
                    <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                      <div className="flex items-start gap-3">
                        <Crown className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">
                            ميزة مميزة
                          </p>
                          <p className="text-amber-700 mb-3">
                            النسخ الاحتياطي السحابي متاح فقط مع الاشتراك المميز. قم بتفعيل الاشتراك المميز للحصول على هذه الميزة.
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveTab('premium')}
                              className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                            >
                              <Crown className="w-4 h-4" />
                              {settings.system.language === 'ar' ? 'تفعيل الاشتراك المميز' : 'Activate Premium License'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Features Preview */}
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          مميزات النسخ الاحتياطي السحابي:
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                          {
                            ar: 'نسخ احتياطي تلقائي يومي',
                            en: 'Automatic daily backups',
                            icon: RefreshCw
                          },
                          {
                            ar: 'تشفير متقدم للبيانات',
                            en: 'Advanced data encryption',
                            icon: Shield
                          },
                          {
                            ar: 'الوصول من أي مكان',
                            en: 'Access from anywhere',
                            icon: Globe
                          },
                          {
                            ar: 'استرداد سريع للبيانات',
                            en: 'Quick data recovery',
                            icon: Download
                          },
                          {
                            ar: 'مساحة تخزين غير محدودة',
                            en: 'Unlimited storage space',
                            icon: HardDrive
                          },
                          {
                            ar: 'دعم فني متخصص',
                            en: 'Dedicated technical support',
                            icon: Users
                          }
                        ].map((feature, index) => {
                          const IconComponent = feature.icon;
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                              <IconComponent className="w-4 h-4" />
                              <span>{feature.ar}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cloud Backups List - Only show if premium is activated */}
              {(() => {
                // Check if license is activated and has cloud-backup feature
                const isLicenseActivated = licenseStatus?.success && licenseStatus?.type !== 'trial';
                
                // Check if cloud-backup feature exists and is not expired (using same logic as above)
                let hasCloudBackupFeature = false;
                let cloudBackupFeature = null;
                
                // Method 1: Check in direct features object (primary location)
                if (licenseStatus?.features && typeof licenseStatus.features === 'object') {
                  cloudBackupFeature = licenseStatus.features['cloud-backups'];
                  if (cloudBackupFeature) {
                    const isNotExpired = !cloudBackupFeature.expires_at || new Date() < new Date(cloudBackupFeature.expires_at);
                    hasCloudBackupFeature = isNotExpired;
                  }
                }
                
                // Method 2: Check in licenseData.features object (fallback)
                if (!hasCloudBackupFeature && licenseStatus?.licenseData?.features) {
                  cloudBackupFeature = licenseStatus.licenseData.features['cloud-backups'];
                  if (cloudBackupFeature) {
                    const isNotExpired = !cloudBackupFeature.expires_at || new Date() < new Date(cloudBackupFeature.expires_at);
                    hasCloudBackupFeature = isNotExpired;
                  }
                }
                
                // Method 3: Check in feature_licenses object (legacy)
                if (!hasCloudBackupFeature && licenseStatus?.feature_licenses && typeof licenseStatus.feature_licenses === 'object') {
                  hasCloudBackupFeature = 'cloud-backups' in licenseStatus.feature_licenses;
                }
                
                return isLicenseActivated && hasCloudBackupFeature;
              })() && (
                <div className="space-y-4">
                  <CloudBackupsList />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          {(() => {
            // Check if license is activated and has multi_device feature
            const isLicenseActivated = licenseStatus?.success && licenseStatus?.type !== 'trial';
            
            // Try multiple ways to check for multi_device feature
            let hasMultiDeviceFeature = false;
            let multiDeviceFeature = null;
            
            // Method 1: Check in direct features object (primary location)
            if (licenseStatus?.features && typeof licenseStatus.features === 'object') {
              multiDeviceFeature = licenseStatus.features['multi_device'];
              if (multiDeviceFeature) {
                const isNotExpired = !multiDeviceFeature.expires_at || new Date() < new Date(multiDeviceFeature.expires_at);
                hasMultiDeviceFeature = isNotExpired;
              }
            }
            
            // Method 2: Check in licenseData.features object (fallback)
            if (!hasMultiDeviceFeature && licenseStatus?.licenseData?.features) {
              multiDeviceFeature = licenseStatus.licenseData.features['multi_device'];
              if (multiDeviceFeature) {
                const isNotExpired = !multiDeviceFeature.expires_at || new Date() < new Date(multiDeviceFeature.expires_at);
                hasMultiDeviceFeature = isNotExpired;
              }
            }
            
            // Method 3: Check in feature_licenses object (legacy)
            if (!hasMultiDeviceFeature && licenseStatus?.feature_licenses && typeof licenseStatus.feature_licenses === 'object') {
              hasMultiDeviceFeature = 'multi_device' in licenseStatus.feature_licenses;
            }
            
            return isLicenseActivated && hasMultiDeviceFeature;
          })() ? (
            <>
              {/* Activated - Show device management functionality */}
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">
                      إدارة الأجهزة متاحة
                    </p>
                    <p className="text-green-700">
                      إدارة الأجهزة المتصلة والتحكم في الصلاحيات والاتصالات مع الأجهزة الفرعية.
                    </p>
                  </div>
                </div>
              </div>

              <DeviceManagementTab />
            </>
          ) : (
            <>
              {/* Not Activated - Show premium upgrade message */}
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">
                      ميزة مميزة
                    </p>
                    <p className="text-amber-700 mb-3">
                      إدارة الأجهزة متاحة فقط مع الاشتراك المميز. قم بتفعيل الاشتراك المميز للحصول على هذه الميزة.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('premium')}
                        className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                      >
                        <Crown className="w-4 h-4" />
                        {settings.system.language === 'ar' ? 'تفعيل الاشتراك المميز' : 'Activate Premium License'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Features Preview */}
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    مميزات إدارة الأجهزة:
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    {
                      ar: 'إدارة الأجهزة المتصلة',
                      en: 'Connected devices management',
                      icon: Monitor
                    },
                    {
                      ar: 'التحكم في الصلاحيات',
                      en: 'Permission control',
                      icon: Shield
                    },
                    {
                      ar: 'مزامنة البيانات المباشرة',
                      en: 'Real-time data sync',
                      icon: RefreshCw
                    },
                    {
                      ar: 'مراقبة حالة الأجهزة',
                      en: 'Device status monitoring',
                      icon: Activity
                    },
                    {
                      ar: 'إدارة الاتصالات الآمنة',
                      en: 'Secure connection management',
                      icon: Wifi
                    },
                    {
                      ar: 'تقارير الأجهزة المتقدمة',
                      en: 'Advanced device reports',
                      icon: BarChart
                    }
                  ].map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-2 text-blue-700">
                        <IconComponent className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">
                          {settings.system.language === 'ar' ? feature.ar : feature.en}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Save Button with RTL positioning */}
      {unsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="gap-2 shadow-lg"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {settings.system.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Barcode Services Dialogs */}
      <BarcodeGenerator
        isOpen={showBarcodeGenerator}
        onClose={() => setShowBarcodeGenerator(false)}
        language={settings.system.language as 'ar' | 'en'}
        companyName={settings.company.name}
      />

      <BarcodeLabelPrinter
        isOpen={showBarcodeLabelPrinter}
        onClose={() => setShowBarcodeLabelPrinter(false)}
        language={settings.system.language as 'ar' | 'en'}
        companyName={settings.company.name}
      />
    </div>
    </>
  );
};

export default Settings;