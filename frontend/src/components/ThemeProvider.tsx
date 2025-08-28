import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useSelector((state: RootState) => state.settings);
  const [localSettings, setLocalSettings] = useState<any>(null);

  // Load settings from localStorage
  useEffect(() => {
    const loadLocalSettings = () => {
      try {
        const savedSettings = localStorage.getItem('urcash_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setLocalSettings(parsed);
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    };

    loadLocalSettings();

    // Listen for localStorage changes
    const handleStorageChange = () => {
      loadLocalSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom settings change events from the same tab
    const handleSettingsChange = () => {
      loadLocalSettings();
    };
    window.addEventListener('settingsChanged', handleSettingsChange);
    
    // Also listen for any localStorage changes from the same tab
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key === 'urcash_settings') {
        handleStorageChange();
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleSettingsChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  const updateTheme = () => {
    // Get colors from localStorage first (nested structure), then Redux store (flat structure), then defaults
    let primaryColor = '#3b82f6';
    let secondaryColor = '#9333ea';

    // Check localStorage first (Settings component saves here)
    if (localSettings?.ui?.primaryColor && localSettings?.ui?.secondaryColor) {
      primaryColor = localSettings.ui.primaryColor;
      secondaryColor = localSettings.ui.secondaryColor;
    }
    // Fallback to Redux store (flat structure from API)
    else if (settings?.primary_color && settings?.secondary_color) {
      primaryColor = settings.primary_color;
      secondaryColor = settings.secondary_color;
    }
    
    const root = document.documentElement;
    
    // Helper function to convert hex to HSL
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Helper function to determine foreground color based on luminance
    const getForegroundColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Return white for dark colors, dark for light colors
      return luminance > 0.5 ? '0 0% 9%' : '0 0% 98%';
    };
    
    // Convert hex colors to HSL and set CSS variables
    const primaryHsl = hexToHsl(primaryColor);
    const secondaryHsl = hexToHsl(secondaryColor);
    const primaryForeground = getForegroundColor(primaryColor);
    const secondaryForeground = getForegroundColor(secondaryColor);
    
    // Set primary color variables
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--primary-foreground', primaryForeground);
    
    // Set secondary color variables
    root.style.setProperty('--secondary', secondaryHsl);
    root.style.setProperty('--secondary-foreground', secondaryForeground);
    
    // Update other UI colors to match the theme
    root.style.setProperty('--accent', secondaryHsl);
    root.style.setProperty('--accent-foreground', secondaryForeground);
    
    // Update muted colors (lighter version of secondary)
    const mutedHsl = hexToHsl(secondaryColor).replace(/(\d+)%\)$/, (match, lightness) => {
      const newLightness = Math.min(95, parseInt(lightness) + 30);
      return `${newLightness}%)`;
    });
    root.style.setProperty('--muted', mutedHsl);
    root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
    
    // Update border and input colors
    root.style.setProperty('--border', '214.3 31.8% 91.4%');
    root.style.setProperty('--input', '214.3 31.8% 91.4%');
    root.style.setProperty('--ring', primaryHsl);
    
    // Update destructive colors (keep consistent)
    root.style.setProperty('--destructive', '0 84.2% 60.2%');
    root.style.setProperty('--destructive-foreground', '210 40% 98%');
    
    
  };

  useEffect(() => {
    // Update theme whenever settings change from any source
    updateTheme();
  }, [settings?.primary_color, settings?.secondary_color, localSettings?.ui?.primaryColor, localSettings?.ui?.secondaryColor]);

  // Apply theme immediately on component mount
  useEffect(() => {
    updateTheme();
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;