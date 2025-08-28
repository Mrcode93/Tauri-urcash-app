import { useState, useCallback } from 'react';
import type { SaleData } from '@/features/sales/salesService';
import type { Customer } from '@/features/customers/customersService';
import type { BillReceiptSale } from '@/types/bill';

interface BillModalState {
  isOpen: boolean;
  sale: SaleData | BillReceiptSale | null;
  customer: Customer | null;
  mode: 'view' | 'print' | 'preview';
}

interface UseBillModalReturn {
  modalState: BillModalState;
  showBillModal: (sale: SaleData | BillReceiptSale, customer?: Customer | null, mode?: 'view' | 'print' | 'preview') => void;
  closeBillModal: () => void;
  isModalOpen: boolean;
}

export const useBillModal = (): UseBillModalReturn => {
  const [modalState, setModalState] = useState<BillModalState>({
    isOpen: false,
    sale: null,
    customer: null,
    mode: 'view'
  });

  const showBillModal = useCallback((
    sale: SaleData | BillReceiptSale, 
    customer: Customer | null = null, 
    mode: 'view' | 'print' | 'preview' = 'view'
  ) => {
    setModalState({
      isOpen: true,
      sale,
      customer,
      mode
    });
  }, []);

  const closeBillModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
    
    // Clear state after modal close animation
    setTimeout(() => {
      setModalState({
        isOpen: false,
        sale: null,
        customer: null,
        mode: 'view'
      });
    }, 300);
  }, []);

  return {
    modalState,
    showBillModal,
    closeBillModal,
    isModalOpen: modalState.isOpen
  };
};
