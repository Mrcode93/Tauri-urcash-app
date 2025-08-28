import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';
import { fetchCashBoxSummary } from '@/features/cashBox/cashBoxSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';

export const useCashBoxValidation = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { cashBoxSummary, loading } = useSelector((state: RootState) => state.cashBox);
  const [isValidating, setIsValidating] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const refreshCashBox = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isValidating) {
      return;
    }

    // Only refresh if we don't have data or if it's been more than 5 minutes
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (cashBoxSummary && (now - lastRefreshTime) < fiveMinutes) {
      return;
    }

    try {
      setIsValidating(true);
      await dispatch(fetchCashBoxSummary()).unwrap();
      setLastRefreshTime(now);
    } catch (error) {
      console.error('Error fetching cash box summary:', error);
    } finally {
      setIsValidating(false);
    }
  }, [dispatch, cashBoxSummary, lastRefreshTime, isValidating]);

  // Only load on mount if we don't have data
  useEffect(() => {
    if (!cashBoxSummary && !loading) {
      refreshCashBox();
    }
  }, [refreshCashBox, cashBoxSummary, loading]);

  // Set up interval to refresh cash box status every 5 minutes for better performance
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have data and it's been more than 5 minutes
      if (cashBoxSummary) {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if ((now - lastRefreshTime) >= fiveMinutes) {
          refreshCashBox();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [refreshCashBox, cashBoxSummary, lastRefreshTime]);

  const hasOpenCashBox = cashBoxSummary?.hasOpenCashBox || false;
  const currentAmount = cashBoxSummary?.currentAmount || 0;
  const cashBoxId = cashBoxSummary?.cashBoxId;

  const validateFinancialOperation = (operationType: string, amount?: number) => {
    if (!hasOpenCashBox) {
      return {
        isValid: false,
        message: 'يجب فتح الصندوق قبل إجراء أي عملية مالية',
        requiresCashBox: true
      };
    }

    // Check if this is an incoming payment operation (doesn't require funds check)
    const incomingPaymentOperations = [
      'دفع قسط',
      'تسجيل دفع قسط', 
      'دفع دين',
      'تسجيل دفع دين',
      'بيع منتج',
      'تسجيل بيع',
      'إيراد',
      'قبض',
      'استلام'
    ];
    
    const isIncomingPayment = incomingPaymentOperations.some(op => 
      operationType.includes(op) || op.includes(operationType)
    );

    // For outgoing payments, check if we have sufficient funds
    if (!isIncomingPayment && amount && amount > currentAmount) {
      return {
        isValid: false,
        message: `المبلغ المطلوب (${amount}) أكبر من الرصيد الحالي في الصندوق (${currentAmount})`,
        requiresCashBox: false,
        insufficientFunds: true
      };
    }

    return {
      isValid: true,
      message: '',
      requiresCashBox: false
    };
  };

  return {
    hasOpenCashBox,
    currentAmount,
    cashBoxId,
    loading: loading || isValidating,
    validateFinancialOperation,
    cashBoxSummary,
    refreshCashBox
  };
}; 