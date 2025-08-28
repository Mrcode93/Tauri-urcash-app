// Database-based permission constants
// These match the permissions defined in the database

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // POS Management
  POS_MANAGE: 'pos.manage',
  POS_VIEW: 'pos.view',
  POS_ADD: 'pos.add',
  POS_EDIT: 'pos.edit',
  POS_DELETE: 'pos.delete',
  
  // Products Management
  PRODUCTS_MANAGE: 'products.manage',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_ADD: 'products.add',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  
  // Sales Management
  SALES_MANAGE: 'sales.manage',
  SALES_VIEW: 'sales.view',
  SALES_ADD: 'sales.add',
  SALES_EDIT: 'sales.edit',
  SALES_DELETE: 'sales.delete',
  
  // Customers Management
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_ADD: 'customers.add',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  
  // Purchases Management
  PURCHASES_MANAGE: 'purchases.manage',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_ADD: 'purchases.add',
  PURCHASES_EDIT: 'purchases.edit',
  PURCHASES_DELETE: 'purchases.delete',
  
  // Suppliers Management
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_ADD: 'suppliers.add',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',
  
  // Inventory Management
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADD: 'inventory.add',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',
  
  // Cash Box Management
  CASHBOX_MANAGE: 'cashbox.manage',
  CASHBOX_VIEW: 'cashbox.view',
  CASHBOX_ADD: 'cashbox.add',
  CASHBOX_EDIT: 'cashbox.edit',
  CASHBOX_DELETE: 'cashbox.delete',
  
  // Debts Management
  DEBTS_MANAGE: 'debts.manage',
  DEBTS_VIEW: 'debts.view',
  DEBTS_ADD: 'debts.add',
  DEBTS_EDIT: 'debts.edit',
  DEBTS_DELETE: 'debts.delete',
  
  // Installments Management
  INSTALLMENTS_MANAGE: 'installments.manage',
  INSTALLMENTS_VIEW: 'installments.view',
  INSTALLMENTS_ADD: 'installments.add',
  INSTALLMENTS_EDIT: 'installments.edit',
  INSTALLMENTS_DELETE: 'installments.delete',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_ADD: 'reports.add',
  REPORTS_EDIT: 'reports.edit',
  REPORTS_DELETE: 'reports.delete',
  
  // Settings Management
  SETTINGS_MANAGE: 'settings.manage',
  
  // Users Management
  USERS_MANAGE: 'users.manage',
  USERS_PERMISSIONS: 'users.permissions',
  
  // Backup Management
  BACKUP_MANAGE: 'backup.manage',
  
  // Profile Management
  PROFILE_MANAGE: 'profile.manage',

  // Devices Management
  DEVICES_MANAGE: 'devices.manage',
  DEVICES_VIEW: 'devices.view',
  DEVICES_ADD: 'devices.add',
  DEVICES_EDIT: 'devices.edit',
  DEVICES_DELETE: 'devices.delete',

} as const;

// Permission categories for grouping
export const PERMISSION_CATEGORIES = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  PRODUCTS: 'products',
  SALES: 'sales',
  CUSTOMERS: 'customers',
  PURCHASES: 'purchases',
  SUPPLIERS: 'suppliers',
  INVENTORY: 'inventory',
  CASHBOX: 'cashbox',
  DEBTS: 'debts',
  INSTALLMENTS: 'installments',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USERS: 'users',
  BACKUP: 'backup',
  PROFILE: 'profile',
  DEVICES: 'devices',
} as const;

// Permission metadata for display and descriptions
export const PERMISSION_METADATA = {
  // Dashboard
  [PERMISSIONS.DASHBOARD_VIEW]: {
    name: 'عرض لوحة التحكم',
    description: 'عرض لوحة التحكم',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  
  // POS
  [PERMISSIONS.POS_MANAGE]: {
    name: 'إدارة نقطة البيع',
    description: 'عرض وإدارة نقطة البيع',
    category: PERMISSION_CATEGORIES.POS,
  },
  [PERMISSIONS.POS_VIEW]: {
    name: 'عرض نقطة البيع',
    description: 'عرض نقطة البيع',
    category: PERMISSION_CATEGORIES.POS,
  },
  [PERMISSIONS.POS_ADD]: {
    name: 'إضافة نقطة البيع',
    description: 'إضافة نقطة البيع',
    category: PERMISSION_CATEGORIES.POS,
  },
  [PERMISSIONS.POS_EDIT]: {
    name: 'تعديل نقطة البيع',
    description: 'تعديل نقطة البيع',
    category: PERMISSION_CATEGORIES.POS,
  },
  [PERMISSIONS.POS_DELETE]: {
    name: 'حذف نقطة البيع',
    description: 'حذف نقطة البيع',
    category: PERMISSION_CATEGORIES.POS,
  },
  
  // Products
  [PERMISSIONS.PRODUCTS_MANAGE]: {
    name: 'إدارة المنتجات',
    description: 'عرض وإضافة وتعديل وحذف المنتجات',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_VIEW]: {
    name: 'عرض المنتجات',
    description: 'عرض المنتجات',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_ADD]: {
    name: 'إضافة المنتجات',
    description: 'إضافة المنتجات',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_EDIT]: {
    name: 'تعديل المنتجات',
    description: 'تعديل المنتجات',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_DELETE]: {
    name: 'حذف المنتجات',
    description: 'حذف المنتجات',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  
  // Sales
  [PERMISSIONS.SALES_MANAGE]: {
    name: 'إدارة المبيعات',
    description: 'عرض وإنشاء وتعديل وحذف الفواتير والمرتجعات',
    category: PERMISSION_CATEGORIES.SALES,
  },
  [PERMISSIONS.SALES_VIEW]: {
    name: 'عرض المبيعات',
    description: 'عرض المبيعات',
    category: PERMISSION_CATEGORIES.SALES,
  },
  [PERMISSIONS.SALES_ADD]: {
    name: 'إضافة المبيعات',
    description: 'إضافة المبيعات',
    category: PERMISSION_CATEGORIES.SALES,
  },
  [PERMISSIONS.SALES_EDIT]: {
    name: 'تعديل المبيعات',
    description: 'تعديل المبيعات',
    category: PERMISSION_CATEGORIES.SALES,
  },
  [PERMISSIONS.SALES_DELETE]: {
    name: 'حذف المبيعات',
    description: 'حذف المبيعات',
    category: PERMISSION_CATEGORIES.SALES,
  },
  
  // Customers
  [PERMISSIONS.CUSTOMERS_MANAGE]: {
    name: 'إدارة العملاء',
    description: 'عرض وإضافة وتعديل وحذف العملاء',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_VIEW]: {
    name: 'عرض العملاء',
    description: 'عرض العملاء',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_ADD]: {
    name: 'إضافة العملاء',
    description: 'إضافة العملاء',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_EDIT]: {
    name: 'تعديل العملاء',
    description: 'تعديل العملاء',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_DELETE]: {
    name: 'حذف العملاء',
    description: 'حذف العملاء',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  
  // Purchases
  [PERMISSIONS.PURCHASES_MANAGE]: {
    name: 'إدارة المشتريات',
    description: 'عرض وإنشاء وتعديل وحذف المشتريات',
    category: PERMISSION_CATEGORIES.PURCHASES,
  },
  [PERMISSIONS.PURCHASES_VIEW]: {
    name: 'عرض المشتريات',
    description: 'عرض المشتريات',
    category: PERMISSION_CATEGORIES.PURCHASES,
  },
  [PERMISSIONS.PURCHASES_ADD]: {
    name: 'إضافة المشتريات',
    description: 'إضافة المشتريات',
    category: PERMISSION_CATEGORIES.PURCHASES,
  },
  [PERMISSIONS.PURCHASES_EDIT]: {
    name: 'تعديل المشتريات',
    description: 'تعديل المشتريات',
    category: PERMISSION_CATEGORIES.PURCHASES,
  },
  [PERMISSIONS.PURCHASES_DELETE]: {
    name: 'حذف المشتريات',
    description: 'حذف المشتريات',
    category: PERMISSION_CATEGORIES.PURCHASES,
  },
  
  // Suppliers
  [PERMISSIONS.SUPPLIERS_MANAGE]: {
    name: 'إدارة الموردين',
    description: 'عرض وإضافة وتعديل وحذف الموردين',
    category: PERMISSION_CATEGORIES.SUPPLIERS,
  },
  [PERMISSIONS.SUPPLIERS_VIEW]: {
    name: 'عرض الموردين',
    description: 'عرض الموردين',
    category: PERMISSION_CATEGORIES.SUPPLIERS,
  },
  [PERMISSIONS.SUPPLIERS_ADD]: {
    name: 'إضافة الموردين',
    description: 'إضافة الموردين',
    category: PERMISSION_CATEGORIES.SUPPLIERS,
  },
  [PERMISSIONS.SUPPLIERS_EDIT]: {
    name: 'تعديل الموردين',
    description: 'تعديل الموردين',
    category: PERMISSION_CATEGORIES.SUPPLIERS,
  },
  [PERMISSIONS.SUPPLIERS_DELETE]: {
    name: 'حذف الموردين',
    description: 'حذف الموردين',
    category: PERMISSION_CATEGORIES.SUPPLIERS,
  },
  
  // Inventory
  [PERMISSIONS.INVENTORY_MANAGE]: {
    name: 'إدارة المخزون',
    description: 'عرض وتحريك المخزون',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  [PERMISSIONS.INVENTORY_VIEW]: {
    name: 'عرض المخزون',
    description: 'عرض المخزون',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  [PERMISSIONS.INVENTORY_ADD]: {
    name: 'إضافة المخزون',
    description: 'إضافة المخزون',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  [PERMISSIONS.INVENTORY_EDIT]: {
    name: 'تعديل المخزون',
    description: 'تعديل المخزون',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  [PERMISSIONS.INVENTORY_DELETE]: {
    name: 'حذف المخزون',
    description: 'حذف المخزون',
    category: PERMISSION_CATEGORIES.INVENTORY,
  },
  
  // Cash Box
  [PERMISSIONS.CASHBOX_MANAGE]: {
    name: 'إدارة الصندوق',
    description: 'عرض وإدارة العمليات المالية بالصندوق',
    category: PERMISSION_CATEGORIES.CASHBOX,
  },
  [PERMISSIONS.CASHBOX_VIEW]: {
    name: 'عرض الصندوق',
    description: 'عرض الصندوق',
    category: PERMISSION_CATEGORIES.CASHBOX,
  },
  [PERMISSIONS.CASHBOX_ADD]: {
    name: 'إضافة الصندوق',
    description: 'إضافة الصندوق',
    category: PERMISSION_CATEGORIES.CASHBOX,
  },
  [PERMISSIONS.CASHBOX_EDIT]: {
    name: 'تعديل الصندوق',
    description: 'تعديل الصندوق',
    category: PERMISSION_CATEGORIES.CASHBOX,
  },
  [PERMISSIONS.CASHBOX_DELETE]: {
    name: 'حذف الصندوق',
    description: 'حذف الصندوق',
    category: PERMISSION_CATEGORIES.CASHBOX,
  },
  
  // Debts
  [PERMISSIONS.DEBTS_MANAGE]: {
    name: 'إدارة الديون',
    description: 'عرض وتسوية الديون والمدفوعات',
    category: PERMISSION_CATEGORIES.DEBTS,
  },
  [PERMISSIONS.DEBTS_VIEW]: {
    name: 'عرض الديون',
    description: 'عرض الديون',
    category: PERMISSION_CATEGORIES.DEBTS,
  },
  [PERMISSIONS.DEBTS_ADD]: {
    name: 'إضافة الديون',
    description: 'إضافة الديون',
    category: PERMISSION_CATEGORIES.DEBTS,
  },
  [PERMISSIONS.DEBTS_EDIT]: {
    name: 'تعديل الديون',
    description: 'تعديل الديون',
    category: PERMISSION_CATEGORIES.DEBTS,
  },
  
  // Installments
  [PERMISSIONS.INSTALLMENTS_MANAGE]: {
    name: 'إدارة الأقساط',
    description: 'عرض وتسوية الأقساط والمدفوعات',
    category: PERMISSION_CATEGORIES.INSTALLMENTS,
  },
  [PERMISSIONS.INSTALLMENTS_VIEW]: {
    name: 'عرض الأقساط',
    description: 'عرض الأقساط',
    category: PERMISSION_CATEGORIES.INSTALLMENTS,
  },
  [PERMISSIONS.INSTALLMENTS_ADD]: {
    name: 'إضافة الأقساط',
    description: 'إضافة الأقساط',
    category: PERMISSION_CATEGORIES.INSTALLMENTS,
  },
  [PERMISSIONS.INSTALLMENTS_EDIT]: {
    name: 'تعديل الأقساط',
    description: 'تعديل الأقساط',
    category: PERMISSION_CATEGORIES.INSTALLMENTS,
  },
  [PERMISSIONS.INSTALLMENTS_DELETE]: {
    name: 'حذف الأقساط',
    description: 'حذف الأقساط',
    category: PERMISSION_CATEGORIES.INSTALLMENTS,
  },
  
  // Reports
  [PERMISSIONS.REPORTS_VIEW]: {
    name: 'عرض التقارير',
    description: 'عرض كل أنواع التقارير',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_ADD]: {
    name: 'إضافة التقارير',
    description: 'إضافة التقارير',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_EDIT]: {
    name: 'تعديل التقارير',
    description: 'تعديل التقارير',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_DELETE]: {
    name: 'حذف التقارير',
    description: 'حذف التقارير',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  
  // Settings
  [PERMISSIONS.SETTINGS_MANAGE]: {
    name: 'إعدادات النظام',
    description: 'عرض وتعديل إعدادات النظام',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  
  // Users
  [PERMISSIONS.USERS_PERMISSIONS]: {
    name: 'إدارة صلاحيات المستخدمين',
    description: 'إدارة صلاحيات المستخدمين',
    category: PERMISSION_CATEGORIES.USERS,
  },
  
  // Backup
  [PERMISSIONS.BACKUP_MANAGE]: {
    name: 'النسخ الاحتياطي',
    description: 'إنشاء واستعادة النسخ الاحتياطية',
    category: PERMISSION_CATEGORIES.BACKUP,
  },
  
  // Profile
  [PERMISSIONS.PROFILE_MANAGE]: {
    name: 'إدارة الملف الشخصي',
    description: 'عرض وتعديل بيانات المستخدم',
    category: PERMISSION_CATEGORIES.PROFILE,
  },

  // Devices
  [PERMISSIONS.DEVICES_MANAGE]: {
    name: 'إدارة الأجهزة',
    description: 'عرض وإدارة الأجهزة المتصلة',
    category: PERMISSION_CATEGORIES.DEVICES,
  },

} as const;

// Helper functions
export const getPermissionName = (permissionId: string): string => {
  return PERMISSION_METADATA[permissionId as keyof typeof PERMISSION_METADATA]?.name || permissionId;
};

export const getPermissionDescription = (permissionId: string): string => {
  return PERMISSION_METADATA[permissionId as keyof typeof PERMISSION_METADATA]?.description || '';
};

export const getPermissionCategory = (permissionId: string): string => {
  return PERMISSION_METADATA[permissionId as keyof typeof PERMISSION_METADATA]?.category || '';
};

export const getPermissionsByCategory = (category: string): string[] => {
  return Object.entries(PERMISSION_METADATA)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([permissionId, _]) => permissionId);
};

// Helper function to get all permissions for a specific module
export const getModulePermissions = (module: string): string[] => {
  return Object.entries(PERMISSION_METADATA)
    .filter(([permissionId, _]) => permissionId.startsWith(`${module}.`))
    .map(([permissionId, _]) => permissionId);
};

// Helper function to get CRUD permissions for a module
export const getCRUDPermissions = (module: string): {
  view: string;
  add: string;
  edit: string;
  delete: string;
  manage: string;
} => {
  return {
    view: `${module}.view`,
    add: `${module}.add`,
    edit: `${module}.edit`,
    delete: `${module}.delete`,
    manage: `${module}.manage`,
  };
};

// Type definitions
export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES];

// Legacy support - keeping old permission structure for backward compatibility
export type Permission = {
  id: string;
  name: string;
  allowed: boolean;
  notes: string;
};

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

// Helper function to check if a user has a specific permission
export const hasPermission = (userPermissions: string[], permissionId: string): boolean => {
  return userPermissions.includes(permissionId);
};

// Helper function to check if a user has any permission for a module
export const hasAnyModulePermission = (userPermissions: string[], module: string): boolean => {
  return userPermissions.some(permission => permission.startsWith(`${module}.`));
};

// Helper function to check if a user has manage permission for a module
export const hasManagePermission = (userPermissions: string[], module: string): boolean => {
  return userPermissions.includes(`${module}.manage`);
};

// Helper function to get all permissions for a role (legacy)
export const getRolePermissions = (roleId: string): Permission[] => {
  // This is now handled by the database, but keeping for backward compatibility
  return [];
};

// Helper function to get allowed permissions for a role (legacy)
export const getRoleAllowedPermissions = (roleId: string): string[] => {
  // This is now handled by the database, but keeping for backward compatibility
  return [];
};

// Helper function to get denied permissions for a role (legacy)
export const getRoleDeniedPermissions = (roleId: string): string[] => {
  // This is now handled by the database, but keeping for backward compatibility
  return [];
}; 