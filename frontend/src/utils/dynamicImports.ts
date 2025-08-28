import { lazy } from 'react';

// Dynamic imports for heavy components
export const lazyLoad = {
  // Charts - Load only when needed
  DashboardCharts: lazy(() => import('../pages/DashboardCharts')),
  Reports: lazy(() => import('../pages/Reports')),
  
  // Heavy UI components
  Settings: lazy(() => import('../pages/Settings')),
  Inventory: lazy(() => import('../pages/Inventory')),
  Purchases: lazy(() => import('../pages/Purchases')),
  
  // Specialized features
  BarcodeGenerator: lazy(() => import('../components/BarcodeGenerator')),
  BarcodeLabelPrinter: lazy(() => import('../components/BarcodeLabelPrinter')),
  
  // Forms and modals
  AddProductModal: lazy(() => import('../components/AddProductModal')),
  CustomerForm: lazy(() => import('../components/CustomerForm')),
  
  // Reports and analytics
  ReportsTab: lazy(() => import('../features/reports/components/ReportsTab')),
  PremiumReportsTab: lazy(() => import('../features/reports/components/PremiumReportsTab')),
};

// Preload utilities
export const preloadComponent = (componentName: keyof typeof lazyLoad) => {
  const component = lazyLoad[componentName];
  if (component && typeof component.preload === 'function') {
    component.preload();
  }
};

// Bundle size optimization helpers
export const bundleOptimization = {
  // Check if component should be lazy loaded based on route
  shouldLazyLoad: (route: string): boolean => {
    const heavyRoutes = [
      '/reports',
      '/settings', 
      '/inventory',
      '/purchases',
      '/barcode',
      '/analytics'
    ];
    return heavyRoutes.some(heavyRoute => route.includes(heavyRoute));
  },
  
  // Preload components based on user behavior
  preloadBasedOnRoute: (currentRoute: string) => {
    if (currentRoute.includes('/reports')) {
      preloadComponent('Reports');
      preloadComponent('ReportsTab');
    }
    if (currentRoute.includes('/settings')) {
      preloadComponent('Settings');
    }
    if (currentRoute.includes('/inventory')) {
      preloadComponent('Inventory');
      preloadComponent('AddProductModal');
    }
  }
};

export default lazyLoad; 