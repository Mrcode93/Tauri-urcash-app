import { useState, useCallback } from 'react';
import { stocksService } from '../features/stocks/stocksService';
import { toast } from '../lib/toast';

interface UseStockUpdatesReturn {
  updateStockData: (stockIds: number[]) => Promise<void>;
  updateProductData: (productId: number, stockId: number) => Promise<void>;
  isUpdating: boolean;
}

export const useStockUpdates = (): UseStockUpdatesReturn => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStockData = useCallback(async (stockIds: number[]) => {
    try {
      setIsUpdating(true);
      
      // Invalidate cache for the affected stocks
      stockIds.forEach(stockId => {
        // Clear any cached data for this stock
        localStorage.removeItem(`stock_${stockId}_products`);
        localStorage.removeItem(`stock_${stockId}_movements`);
      });
      
      // Optionally refresh stock data from server
      // This could be enhanced to use the returned data from the movement
      
    } catch (error) {
      console.error('Error updating stock data:', error);
      toast.error('فشل في تحديث بيانات المخزن');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateProductData = useCallback(async (productId: number, stockId: number) => {
    try {
      setIsUpdating(true);
      
      // Clear cached product data
      localStorage.removeItem(`product_${productId}_stock_data`);
      
      // Optionally refresh product data from server
      
    } catch (error) {
      console.error('Error updating product data:', error);
      toast.error('فشل في تحديث بيانات المنتج');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateStockData,
    updateProductData,
    isUpdating
  };
};
