import { toast as sonnerToast } from "sonner";
import { CheckCircle, XCircle, Info, AlertTriangle, Sparkles, Zap, Shield, Star } from "lucide-react";
import React from "react";

interface ToastColors {
  success: string;
  error: string;
  info: string;
  warning: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
}

// Default modern color palette
let colors: ToastColors = {
  success: "#10b981", // Emerald green
  error: "#ef4444",   // Red
  info: "#3b82f6",    // Blue
  warning: "#f59e0b", // Amber
  primary: "#3b82f6", // Blue
  secondary: "#64748b", // Slate
  background: "#ffffff", // White
  text: "#1e293b",    // Slate 800
  border: "#e2e8f0",  // Slate 200
};

export function updateToastColors(newColors: Partial<ToastColors>) {
  colors = { ...colors, ...newColors };
}

// Enhanced toast styles with modern design
const createToastStyle = (type: keyof Pick<ToastColors, 'success' | 'error' | 'info' | 'warning'>) => {
  const baseColor = colors[type];
  const isDark = type === 'error' || type === 'warning';
  
  return {
    background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
    color: '#ffffff',
    border: `1px solid ${baseColor}`,
    borderRadius: '6px',
    boxShadow: `0 10px 25px -5px ${baseColor}40, 0 8px 10px -6px ${baseColor}20`,
    backdropFilter: 'blur(10px)',
    marginBottom: '12px',
    padding: '16px 20px',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    letterSpacing: '0.025em',
    transform: 'translateY(0)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
  };
};

// Custom icons for each toast type
const getToastIcon = (type: string) => {
  const iconProps = { 
    className: "text-white", 
    size: 20,
    style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }
  };

  switch (type) {
    case 'success':
      return React.createElement(CheckCircle, iconProps);
    case 'error':
      return React.createElement(XCircle, iconProps);
    case 'info':
      return React.createElement(Info, iconProps);
    case 'warning':
      return React.createElement(AlertTriangle, iconProps);
    case 'premium':
      return React.createElement(Sparkles, iconProps);
    case 'feature':
      return React.createElement(Zap, iconProps);
    case 'security':
      return React.createElement(Shield, iconProps);
    case 'star':
      return React.createElement(Star, iconProps);
    default:
      return React.createElement(Info, iconProps);
  }
};

// Enhanced toast with custom styling and animations
export const toast = {
  success: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('success'),
      style: createToastStyle('success'),
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4000,
      id: `success-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  error: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('error'),
      style: createToastStyle('error'),
      className: "z-50 font-medium shadow-xl border-0",
      duration: 5000,
      id: `error-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  info: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('info'),
      style: createToastStyle('info'),
      className: "z-50 font-medium shadow-xl border-0",
      duration: 3500,
      id: `info-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  warning: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('warning'),
      style: createToastStyle('warning'),
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4000,
      id: `warning-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  // New premium toast types with enhanced styling
  premium: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('premium'),
      style: {
        ...createToastStyle('info'),
        background: `linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)`, // Purple gradient
        border: '1px solid #8b5cf6',
        boxShadow: `0 10px 25px -5px #8b5cf640, 0 8px 10px -6px #8b5cf620`,
      },
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4500,
      id: `premium-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  feature: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('feature'),
      style: {
        ...createToastStyle('success'),
        background: `linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)`, // Cyan gradient
        border: '1px solid #06b6d4',
        boxShadow: `0 10px 25px -5px #06b6d440, 0 8px 10px -6px #06b6d420`,
      },
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4000,
      id: `feature-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  security: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('security'),
      style: {
        ...createToastStyle('warning'),
        background: `linear-gradient(135deg, #f97316 0%, #ea580c 100%)`, // Orange gradient
        border: '1px solid #f97316',
        boxShadow: `0 10px 25px -5px #f9731640, 0 8px 10px -6px #f9731620`,
      },
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4500,
      id: `security-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  star: (message: string, options: Record<string, unknown> = {}) => {
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('star'),
      style: {
        ...createToastStyle('success'),
        background: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`, // Yellow gradient
        border: '1px solid #fbbf24',
        boxShadow: `0 10px 25px -5px #fbbf2440, 0 8px 10px -6px #fbbf2420`,
      },
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4000,
      id: `star-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },

  // Custom toast with user-defined colors
  custom: (message: string, customColors: Partial<ToastColors>, options: Record<string, unknown> = {}) => {
    const mergedColors = { ...colors, ...customColors };
    const primaryColor = mergedColors.primary || colors.primary;
    
    // Dismiss all existing toasts before showing new one
    sonnerToast.dismiss();
    return sonnerToast(message, {
      icon: getToastIcon('info'),
      style: {
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: '#ffffff',
        border: `1px solid ${primaryColor}`,
        borderRadius: '6px',
        boxShadow: `0 10px 25px -5px ${primaryColor}40, 0 8px 10px -6px ${primaryColor}20`,
        backdropFilter: 'blur(10px)',
        marginBottom: '12px',
        padding: '16px 20px',
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '0.025em',
        transform: 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative' as const,
        overflow: 'hidden',
      },
      className: "z-50 font-medium shadow-xl border-0",
      duration: 4000,
      id: `custom-${Date.now()}`,
      position: 'top-center',
      ...options,
    });
  },
};

// Function to update toast colors from settings
export function updateToastColorsFromSettings(settings: { primary_color?: string; secondary_color?: string } | null | undefined) {
  if (settings?.primary_color || settings?.secondary_color) {
    const newColors: Partial<ToastColors> = {};
    
    if (settings.primary_color) {
      newColors.primary = settings.primary_color;
      // Update info color to match primary
      newColors.info = settings.primary_color;
    }
    
    if (settings.secondary_color) {
      newColors.secondary = settings.secondary_color;
    }
    
    updateToastColors(newColors);
  }
}