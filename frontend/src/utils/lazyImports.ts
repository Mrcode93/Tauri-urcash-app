import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const lazyComponents = {
  // Charts - Very heavy (423KB)
  DashboardCharts: lazy(() => import('../pages/DashboardCharts')),
  Reports: lazy(() => import('../pages/Reports')),
  
  // Settings - Very heavy (226KB)
  Settings: lazy(() => import('../pages/Settings')),
  
  // Motion - Heavy (117KB)
  MotionComponents: lazy(() => import('../components/MotionComponents')),
  
  // Specialized features - Heavy (178KB)
  BarcodeGenerator: lazy(() => import('../components/BarcodeGenerator')),
  BarcodeLabelPrinter: lazy(() => import('../components/BarcodeLabelPrinter')),
  KeyboardDemo: lazy(() => import('../pages/KeyboardDemo')),
  
  // Forms and modals
  AddProductModal: lazy(() => import('../components/AddProductModal')),
  CustomerForm: lazy(() => import('../components/CustomerForm')),
  SupplierForm: lazy(() => import('../components/SupplierForm')),
  
  // Reports and analytics
  ReportsTab: lazy(() => import('../features/reports/components/ReportsTab')),
  PremiumReportsTab: lazy(() => import('../features/reports/components/PremiumReportsTab')),
  ProfitLossTab: lazy(() => import('../features/reports/components/ProfitLossTab')),
};

// Preload strategies
export const preloadStrategies = {
  // Preload based on user navigation patterns
  preloadOnHover: (componentName: keyof typeof lazyComponents) => {
    const component = lazyComponents[componentName];
    if (component && typeof component.preload === 'function') {
      component.preload();
    }
  },
  
  // Preload based on route
  preloadByRoute: (route: string) => {
    if (route.includes('/reports') || route.includes('/dashboard-charts')) {
      lazyComponents.Reports.preload?.();
      lazyComponents.DashboardCharts.preload?.();
    }
    if (route.includes('/settings')) {
      lazyComponents.Settings.preload?.();
    }
    if (route.includes('/barcode')) {
      lazyComponents.BarcodeGenerator.preload?.();
      lazyComponents.BarcodeLabelPrinter.preload?.();
    }
  },
  
  // Preload critical components after initial load
  preloadCritical: () => {
    // Preload most commonly used components after 2 seconds
    setTimeout(() => {
      lazyComponents.AddProductModal.preload?.();
      lazyComponents.CustomerForm.preload?.();
    }, 2000);
  }
};

// Bundle size optimization helpers
export const bundleOptimization = {
  // Check if component should be lazy loaded
  shouldLazyLoad: (componentName: string): boolean => {
    const heavyComponents = [
      'DashboardCharts',
      'Reports', 
      'Settings',
      'BarcodeGenerator',
      'BarcodeLabelPrinter',
      'KeyboardDemo'
    ];
    return heavyComponents.includes(componentName);
  },
  
  // Get component loading priority
  getLoadingPriority: (componentName: string): 'high' | 'medium' | 'low' => {
    const highPriority = ['AddProductModal', 'CustomerForm', 'Settings'];
    const mediumPriority = ['Reports', 'DashboardCharts'];
    const lowPriority = ['BarcodeGenerator', 'BarcodeLabelPrinter', 'KeyboardDemo'];
    
    if (highPriority.includes(componentName)) return 'high';
    if (mediumPriority.includes(componentName)) return 'medium';
    if (lowPriority.includes(componentName)) return 'low';
    return 'medium';
  }
};

export default lazyComponents; 