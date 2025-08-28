import { useEffect, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store';
import {
  getInstallments,
  getGroupedInstallments,
  getInstallmentsStats,
  getOverdueInstallments,
  getUpcomingInstallments,
  getInstallment,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  recordPayment,
  createInstallmentPlan,
  refreshCache,
  selectInstallments,
  selectSelectedInstallment,
  selectInstallmentsLoading,
  selectInstallmentsError,
  selectInstallmentsPagination,
  selectPlanCreating,
  selectPlanError,
  selectInstallmentsStats,
  selectInstallmentsStatsLoading,
  selectOverdueInstallments,
  selectOverdueInstallmentsLoading,
  selectUpcomingInstallments,
  selectUpcomingInstallmentsLoading,
  selectCacheStats,
  clearSelectedInstallment,
  clearError,
  clearPlanError,
  updateCacheStats,
  clearCache
} from '@/features/installments/installmentsSlice';
import { InstallmentsFilters, CreateInstallmentData, UpdateInstallmentData, PaymentData, InstallmentPlanData } from '@/features/installments/installmentsService';

interface UseInstallmentsOptions {
  autoFetch?: boolean;
  filters?: InstallmentsFilters;
  enableCache?: boolean;
  prefetch?: boolean;
}

interface UseInstallmentsReturn {
  // Data
  installments: any[];
  selectedInstallment: any;
  stats: any;
  overdueInstallments: any[];
  upcomingInstallments: any[];
  
  // Loading states
  loading: boolean;
  statsLoading: boolean;
  overdueLoading: boolean;
  upcomingLoading: boolean;
  planCreating: boolean;
  
  // Error states
  error: string | null;
  planError: string | null;
  
  // Pagination
  pagination: any;
  
  // Cache info
  cacheStats: any;
  
  // Actions
  fetchInstallments: (filters?: InstallmentsFilters) => void;
  fetchGroupedInstallments: (filters?: InstallmentsFilters) => void;
  fetchStats: (filters?: InstallmentsFilters) => void;
  fetchOverdue: (filters?: InstallmentsFilters) => void;
  fetchUpcoming: (filters?: InstallmentsFilters) => void;
  fetchInstallment: (id: number) => void;
  createInstallmentAction: (data: CreateInstallmentData) => void;
  updateInstallmentAction: (id: number, data: UpdateInstallmentData) => void;
  deleteInstallmentAction: (id: number) => void;
  recordPaymentAction: (id: number, data: PaymentData) => void;
  createPlanAction: (data: InstallmentPlanData) => void;
  refreshCacheAction: () => void;
  clearCacheAction: () => void;
  clearSelected: () => void;
  clearErrors: () => void;
  
  // Utilities
  getInstallmentById: (id: number) => any;
  getInstallmentsByCustomer: (customerId: number) => any[];
  getInstallmentsBySale: (saleId: number) => any[];
  isOverdue: (installment: any) => boolean;
  isUpcoming: (installment: any) => boolean;
  calculateRemainingAmount: (installment: any) => number;
}

export const useInstallments = (options: UseInstallmentsOptions = {}): UseInstallmentsReturn => {
  const {
    autoFetch = true,
    filters = {},
    enableCache = true,
    prefetch = false
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const installments = useSelector(selectInstallments);
  const selectedInstallment = useSelector(selectSelectedInstallment);
  const loading = useSelector(selectInstallmentsLoading);
  const error = useSelector(selectInstallmentsError);
  const pagination = useSelector(selectInstallmentsPagination);
  const planCreating = useSelector(selectPlanCreating);
  const planError = useSelector(selectPlanError);
  const stats = useSelector(selectInstallmentsStats);
  const statsLoading = useSelector(selectInstallmentsStatsLoading);
  const overdueInstallments = useSelector(selectOverdueInstallments);
  const overdueLoading = useSelector(selectOverdueInstallmentsLoading);
  const upcomingInstallments = useSelector(selectUpcomingInstallments);
  const upcomingLoading = useSelector(selectUpcomingInstallmentsLoading);
  const cacheStats = useSelector(selectCacheStats);

  // Local state for cache management
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheHits, setCacheHits] = useState<number>(0);
  const [cacheMisses, setCacheMisses] = useState<number>(0);

  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check if data is stale
  const isDataStale = useMemo(() => {
    return Date.now() - lastFetchTime > CACHE_DURATION;
  }, [lastFetchTime]);

  // Fetch installments with caching
  const fetchInstallments = useCallback((newFilters?: InstallmentsFilters) => {
    const currentFilters = newFilters || filters;
    
    if (enableCache && !isDataStale && installments.length > 0) {
      setCacheHits(prev => prev + 1);
      return;
    }
    
    setCacheMisses(prev => prev + 1);
    setLastFetchTime(Date.now());
    dispatch(getInstallments(currentFilters));
  }, [dispatch, filters, enableCache, isDataStale, installments.length]);

  // Fetch grouped installments
  const fetchGroupedInstallments = useCallback((newFilters?: InstallmentsFilters) => {
    const currentFilters = newFilters || filters;
    dispatch(getGroupedInstallments(currentFilters));
  }, [dispatch, filters]);

  // Fetch statistics
  const fetchStats = useCallback((newFilters?: InstallmentsFilters) => {
    const currentFilters = newFilters || filters;
    dispatch(getInstallmentsStats(currentFilters));
  }, [dispatch, filters]);

  // Fetch overdue installments
  const fetchOverdue = useCallback((newFilters?: InstallmentsFilters) => {
    const currentFilters = newFilters || filters;
    dispatch(getOverdueInstallments(currentFilters));
  }, [dispatch, filters]);

  // Fetch upcoming installments
  const fetchUpcoming = useCallback((newFilters?: InstallmentsFilters) => {
    const currentFilters = newFilters || filters;
    dispatch(getUpcomingInstallments(currentFilters));
  }, [dispatch, filters]);

  // Fetch single installment
  const fetchInstallment = useCallback((id: number) => {
    dispatch(getInstallment(id));
  }, [dispatch]);

  // Create installment
  const createInstallmentAction = useCallback((data: CreateInstallmentData) => {
    dispatch(createInstallment(data));
  }, [dispatch]);

  // Update installment
  const updateInstallmentAction = useCallback((id: number, data: UpdateInstallmentData) => {
    dispatch(updateInstallment({ id, installmentData: data }));
  }, [dispatch]);

  // Delete installment
  const deleteInstallmentAction = useCallback((id: number) => {
    dispatch(deleteInstallment(id));
  }, [dispatch]);

  // Record payment
  const recordPaymentAction = useCallback((id: number, data: PaymentData) => {
    dispatch(recordPayment({ id, paymentData: data }));
  }, [dispatch]);

  // Create installment plan
  const createPlanAction = useCallback((data: InstallmentPlanData) => {
    dispatch(createInstallmentPlan(data));
  }, [dispatch]);

  // Refresh cache
  const refreshCacheAction = useCallback(() => {
    dispatch(refreshCache());
  }, [dispatch]);

  // Clear cache
  const clearCacheAction = useCallback(() => {
    dispatch(clearCache());
  }, [dispatch]);

  // Clear selected installment
  const clearSelected = useCallback(() => {
    dispatch(clearSelectedInstallment());
  }, [dispatch]);

  // Clear errors
  const clearErrors = useCallback(() => {
    dispatch(clearError());
    dispatch(clearPlanError());
  }, [dispatch]);

  // Utility functions
  const getInstallmentById = useCallback((id: number) => {
    return installments.find((item: any) => 'id' in item && item.id === id);
  }, [installments]);

  const getInstallmentsByCustomer = useCallback((customerId: number) => {
    return installments.filter((item: any) => 'customer_id' in item && item.customer_id === customerId);
  }, [installments]);

  const getInstallmentsBySale = useCallback((saleId: number) => {
    return installments.filter((item: any) => 'sale_id' in item && item.sale_id === saleId);
  }, [installments]);

  const isOverdue = useCallback((installment: any) => {
    if (!installment.due_date) return false;
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    return dueDate < today && installment.payment_status !== 'paid';
  }, []);

  const isUpcoming = useCallback((installment: any) => {
    if (!installment.due_date) return false;
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= thirtyDaysFromNow;
  }, []);

  const calculateRemainingAmount = useCallback((installment: any) => {
    const totalAmount = parseFloat(installment.amount) || 0;
    const paidAmount = parseFloat(installment.paid_amount) || 0;
    return Math.max(0, totalAmount - paidAmount);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchInstallments();
      fetchStats();
    }
  }, [autoFetch, fetchInstallments, fetchStats]);

  // Prefetch data
  useEffect(() => {
    if (prefetch) {
      // Prefetch in background
      setTimeout(() => {
        fetchOverdue();
        fetchUpcoming();
      }, 1000);
    }
  }, [prefetch, fetchOverdue, fetchUpcoming]);

  // Update cache stats
  useEffect(() => {
    dispatch(updateCacheStats({ hits: cacheHits, misses: cacheMisses }));
  }, [dispatch, cacheHits, cacheMisses]);

  return {
    // Data
    installments,
    selectedInstallment,
    stats,
    overdueInstallments,
    upcomingInstallments,
    
    // Loading states
    loading,
    statsLoading,
    overdueLoading,
    upcomingLoading,
    planCreating,
    
    // Error states
    error,
    planError,
    
    // Pagination
    pagination,
    
    // Cache info
    cacheStats,
    
    // Actions
    fetchInstallments,
    fetchGroupedInstallments,
    fetchStats,
    fetchOverdue,
    fetchUpcoming,
    fetchInstallment,
    createInstallmentAction,
    updateInstallmentAction,
    deleteInstallmentAction,
    recordPaymentAction,
    createPlanAction,
    refreshCacheAction,
    clearCacheAction,
    clearSelected,
    clearErrors,
    
    // Utilities
    getInstallmentById,
    getInstallmentsByCustomer,
    getInstallmentsBySale,
    isOverdue,
    isUpcoming,
    calculateRemainingAmount
  };
};

export default useInstallments; 