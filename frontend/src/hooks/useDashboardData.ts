import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { getDashboardSummary } from '../features/reports/reportsSlice';
import { getMostSoldProducts } from '../features/inventory/inventorySlice';
import { DashboardPeriod } from '@/types/dashboard';

interface UseDashboardDataProps {
  selectedPeriod: DashboardPeriod;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export const useDashboardData = ({ selectedPeriod, startDate, endDate }: UseDashboardDataProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { dashboardSummary, isLoading } = useSelector((state: RootState) => state.reports);
  const { mostSoldProducts, mostSoldProductsLoading } = useSelector((state: RootState) => state.inventory);
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Fetch dashboard summary
    if (selectedPeriod === 'custom' && startDate && endDate) {
      dispatch(getDashboardSummary({ 
        start: startDate.toISOString().split('T')[0], 
        end: endDate.toISOString().split('T')[0] 
      }));
    } else if (selectedPeriod !== 'custom') {
      dispatch(getDashboardSummary({ period: selectedPeriod }));
    }

    // Fetch most sold products (only for non-custom periods)
    if (selectedPeriod !== 'custom') {
      dispatch(getMostSoldProducts({ limit: 5, period: selectedPeriod }));
    }

    setIsInitialized(true);
  }, [dispatch, selectedPeriod, startDate, endDate]);

  return {
    dashboardSummary,
    mostSoldProducts,
    isLoading: isLoading || mostSoldProductsLoading,
    isInitialized
  };
}; 