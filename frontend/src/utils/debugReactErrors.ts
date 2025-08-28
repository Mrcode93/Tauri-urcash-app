// Debug utility for React error #130 (Objects are not valid as React child)

export const debugReactError130 = {
  // Common patterns that cause React error #130
  commonCauses: [
    'Rendering object directly: {user} instead of {user.name}',
    'Incorrect import: import { Component } from "./Component" when it should be default import',
    'Function returning object instead of JSX',
    'Promises being rendered directly',
    'Date objects being rendered directly',
    'Array with nested objects',
    'Undefined values that resolve to objects',
  ],

  // Safe rendering helpers
  safeString: (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') {
      console.warn('⚠️ Object being converted to string for display:', value);
      return JSON.stringify(value);
    }
    return String(value);
  },

  // Safe number rendering
  safeNumber: (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  },

  // Check if value is safe to render in JSX
  isSafeToRender: (value: unknown): boolean => {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      React.isValidElement(value)
    );
  },

  // Log potential issues with data
  checkForObjectRendering: (data: unknown, context: string = '') => {
    if (typeof data === 'object' && data !== null && !React.isValidElement(data)) {
      console.warn(`🚨 Potential React error #130 in ${context}:`, data);
      console.warn('This object should not be rendered directly in JSX');
      
      if (Array.isArray(data)) {
        console.warn('Array detected - make sure each item is properly rendered');
        data.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            console.warn(`Array item ${index} is an object:`, item);
          }
        });
      }
    }
  },

  // Debug component props
  debugProps: (props: Record<string, unknown>, componentName: string = 'Component') => {
    if (process.env.NODE_ENV === 'development') {
      Object.entries(props).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
          console.warn(`🚨 ${componentName} prop "${key}" is an object:`, value);
        }
      });
    }
  },
};

// React import for isValidElement
import React from 'react';

// HOC to wrap components with error checking
export const withErrorChecking = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    if (process.env.NODE_ENV === 'development') {
      debugReactError130.debugProps(props, componentName || Component.name);
    }
    
    return <Component {...props} ref={ref} />;
  });
};

// Safe component renderer that catches object rendering
export const SafeRender: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  try {
    if (!debugReactError130.isSafeToRender(children)) {
      console.error('🚨 Unsafe children passed to SafeRender:', children);
      return <span style={{ color: 'red' }}>Error: Invalid content</span>;
    }
    return <>{children}</>;
  } catch (error) {
    console.error('🚨 SafeRender caught error:', error);
    return <span style={{ color: 'red' }}>Render Error</span>;
  }
};

export default debugReactError130; 