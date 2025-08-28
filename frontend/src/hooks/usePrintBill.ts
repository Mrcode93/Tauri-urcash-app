import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { Product } from '@/features/inventory/inventoryService';
import { printBill, quickPrintBill, printBillWithPreview, type PrintBillOptions, type PrintBillResult } from '@/utils/printUtils';
import { toast } from '@/lib/toast';

export interface UsePrintBillOptions {
  showToast?: boolean;
  defaultPrinterType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm';
  defaultCopies?: number;
}

export interface UsePrintBillReturn {
  printBill: (options: Omit<PrintBillOptions, 'settings'>) => Promise<PrintBillResult>;
  quickPrint: (sale: SaleData, customer?: Customer | null) => Promise<PrintBillResult>;
  printWithPreview: (sale: SaleData, customer?: Customer | null) => Promise<PrintBillResult>;
  printMultipleCopies: (sale: SaleData, copies: number, customer?: Customer | null) => Promise<PrintBillResult>;
  isPrinting: boolean;
}

export const usePrintBill = (options: UsePrintBillOptions = {}): UsePrintBillReturn => {
  const { showToast = true, defaultPrinterType = 'a4', defaultCopies = 1 } = options;
  
  // Get settings from Redux store
  const settings = useSelector((state: RootState) => state.settings.data);
  const products = useSelector((state: RootState) => state.inventory.items);
  
  // State for tracking print status
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useCallback(async (printOptions: Omit<PrintBillOptions, 'settings'>): Promise<PrintBillResult> => {
    if (!settings) {
      const error = 'إعدادات الطباعة غير متوفرة';
      if (showToast) toast.error(error);
      return { success: false, message: error };
    }

    setIsPrinting(true);
    
    try {
      const result = await printBill({
        ...printOptions,
        settings,
        printerType: printOptions.printerType || defaultPrinterType,
        copies: printOptions.copies || defaultCopies
      });

      if (showToast) {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = 'حدث خطأ أثناء الطباعة';
      if (showToast) toast.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsPrinting(false);
    }
  }, [settings, defaultPrinterType, defaultCopies, showToast]);

  const quickPrint = useCallback(async (sale: SaleData, customer?: Customer | null): Promise<PrintBillResult> => {
    if (!settings) {
      const error = 'إعدادات الطباعة غير متوفرة';
      if (showToast) toast.error(error);
      return { success: false, message: error };
    }

    setIsPrinting(true);
    
    try {
      const result = await quickPrintBill(sale, settings, customer);
      
      if (showToast) {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = 'حدث خطأ أثناء الطباعة';
      if (showToast) toast.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsPrinting(false);
    }
  }, [settings, showToast]);

  const printWithPreview = useCallback(async (sale: SaleData, customer?: Customer | null): Promise<PrintBillResult> => {
    if (!settings) {
      const error = 'إعدادات الطباعة غير متوفرة';
      if (showToast) toast.error(error);
      return { success: false, message: error };
    }

    setIsPrinting(true);
    
    try {
      const result = await printBillWithPreview(sale, settings, customer);
      
      if (showToast) {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = 'حدث خطأ أثناء الطباعة';
      if (showToast) toast.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsPrinting(false);
    }
  }, [settings, showToast]);

  const printMultipleCopies = useCallback(async (sale: SaleData, copies: number, customer?: Customer | null): Promise<PrintBillResult> => {
    return handlePrint({
      sale,
      customer,
      products,
      copies,
      printerType: defaultPrinterType
    });
  }, [handlePrint, products, defaultPrinterType]);

  return {
    printBill: handlePrint,
    quickPrint,
    printWithPreview,
    printMultipleCopies,
    isPrinting
  };
}; 