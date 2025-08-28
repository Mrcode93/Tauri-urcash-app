import React, { memo, useCallback } from 'react';
import { Search, Keyboard, Barcode, History, AlertTriangle, List, Grid, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onKeyboardShortcuts: () => void;
  onBarcodeScan: () => void;
  onRecentSales: () => void;
  onStockAlerts: () => void;
  onNumbersKeyboard: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  productsCount: number;
  isScanning: boolean;
  barcodeScannerEnabled?: boolean;
  colors?: {
    primary: {
      DEFAULT: string;
      dark: string;
      light: string;
      medium: string;
      gradient: string;
      glass: string;
      rgb: { r: number; g: number; b: number };
    };
    secondary: {
      DEFAULT: string;
      light: string;
      medium: string;
      rgb: { r: number; g: number; b: number };
    };
    background: {
      light: string;
      DEFAULT: string;
      dark: string;
      glass: string;
      glassDark: string;
      primary: string;
      secondary: string;
      pos: string;
      cart: string;
      products: string;
      header: string;
    };
    text: {
      primary: string;
      secondary: string;
      inverted: string;
      muted: string;
      accent: string;
    };
    accent: {
      success: string;
      warning: string;
      danger: string;
      info: string;
      primary: string;
      secondary: string;
    };
    border: {
      light: string;
      DEFAULT: string;
      dark: string;
      primary: string;
      secondary: string;
    };
    pos: {
      card: string;
      cardHover: string;
      cardBorder: string;
      cardBorderHover: string;
      button: string;
      buttonHover: string;
      buttonText: string;
      total: string;
      totalText: string;
      cartItem: string;
      cartItemHover: string;
      productCard: string;
      productCardHover: string;
      productCardBorder: string;
      productCardBorderHover: string;
      searchBar: string;
      searchBarBorder: string;
      searchBarFocus: string;
    };
  };
}

const POSHeader = memo(({
  searchQuery,
  onSearchChange,
  onKeyboardShortcuts,
  onBarcodeScan,
  onRecentSales,
  onStockAlerts,
  onNumbersKeyboard,
  viewMode,
  onViewModeChange,
  productsCount,
  isScanning,
  barcodeScannerEnabled = true,
  colors
}: POSHeaderProps) => {
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleViewModeToggle = useCallback(() => {
    onViewModeChange(viewMode === 'grid' ? 'list' : 'grid');
  }, [viewMode, onViewModeChange]);

  return (
    <>
      {/* Quick Actions */}
      <div 
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 px-4 lg:px-0"
        style={{ backgroundColor: colors?.background.header || '#ffffff' }}
      >
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onKeyboardShortcuts}
                  style={{
                    borderColor: colors?.pos.cardBorder || '#e2e8f0',
                    color: colors?.text.primary || '#1e293b'
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>اختصارات لوحة المفاتيح</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onNumbersKeyboard}
                  style={{
                    borderColor: colors?.pos.cardBorder || '#e2e8f0',
                    color: colors?.text.primary || '#1e293b'
                  }}
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>لوحة الأرقام</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onBarcodeScan}
                  disabled={!barcodeScannerEnabled}
                  className={!barcodeScannerEnabled ? "opacity-50" : ""}
                  style={{
                    borderColor: colors?.pos.cardBorder || '#e2e8f0',
                    color: colors?.text.primary || '#1e293b'
                  }}
                >
                  <Barcode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!barcodeScannerEnabled 
                  ? "مسح الباركود معطل في الإعدادات" 
                  : "مسح الباركود (Ctrl+B)"
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onRecentSales}
                  style={{
                    borderColor: colors?.pos.cardBorder || '#e2e8f0',
                    color: colors?.text.primary || '#1e293b'
                  }}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>المبيعات الأخيرة</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onStockAlerts}
                  style={{
                    borderColor: colors?.pos.cardBorder || '#e2e8f0',
                    color: colors?.text.primary || '#1e293b'
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>تنبيهات المخزون</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5" 
              style={{ color: colors?.text.muted || '#94a3b8' }}
            />
            <Input
              type="text"
              placeholder="ابحث عن اسم، باركود، رمز... أو امسح الباركود مباشرة"
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="text-right pr-10"
              dir="rtl"
              style={{
                backgroundColor: colors?.pos.searchBar || '#ffffff',
                borderColor: colors?.pos.searchBarBorder || '#e2e8f0',
                color: colors?.text.primary || '#1e293b'
              }}
            />
            <div 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs"
              style={{ color: colors?.text.muted || '#94a3b8' }}
            >
              Ctrl+B
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div 
            className="text-sm"
            style={{ color: colors?.text.muted || '#94a3b8' }}
          >
            {productsCount} منتج محمل
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleViewModeToggle}
            className="h-10 w-10"
            style={{
              borderColor: colors?.pos.cardBorder || '#e2e8f0',
              color: colors?.text.primary || '#1e293b'
            }}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Header */}
      <div 
        className="px-4 py-2 flex justify-between items-center border-b"
        style={{ borderColor: colors?.border.light || '#e2e8f0' }}
      >
        <h1 
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: colors?.text.primary || '#1e293b' }}
        >
          <Search 
            className="h-6 w-6" 
            style={{ color: colors?.primary.DEFAULT || '#3B82F6' }}
          />
          الكاشير
          {isScanning && (
            <span 
              className="ml-2 px-2 py-1 text-xs rounded-full flex items-center gap-1"
              style={{ 
                backgroundColor: colors?.primary.light || '#dbeafe',
                color: colors?.primary.DEFAULT || '#3B82F6'
              }}
            >
              <Barcode className="h-3 w-3" />
              جاري المسح
            </span>
          )}
        </h1>
      </div>
    </>
  );
});

POSHeader.displayName = 'POSHeader';

export default POSHeader; 