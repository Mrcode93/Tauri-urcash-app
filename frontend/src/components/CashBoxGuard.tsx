import React from 'react';
import { useCashBoxValidation } from '@/hooks/useCashBoxValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

interface CashBoxGuardProps {
  children: React.ReactNode;
  operationType?: string;
  amount?: number;
  showWarning?: boolean;
}

export const CashBoxGuard: React.FC<CashBoxGuardProps> = ({ 
  children, 
  operationType = 'عملية مالية',
  amount,
  showWarning = true 
}) => {
  const { hasOpenCashBox, currentAmount, loading, validateFinancialOperation, refreshCashBox, cashBoxSummary } = useCashBoxValidation();
  const navigate = useNavigate();

  // Only refresh cash box status when component mounts, not on every prop change
  React.useEffect(() => {
    // Only refresh if we don't have cash box data yet
    if (!cashBoxSummary) {
      refreshCashBox();
    }
  }, [refreshCashBox, cashBoxSummary]);

  // Listen for manual refresh events
  React.useEffect(() => {
    const handleRefresh = () => {
      refreshCashBox();
    };
    
    window.addEventListener('refreshCashBox', handleRefresh);
    return () => window.removeEventListener('refreshCashBox', handleRefresh);
  }, [refreshCashBox]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const validation = validateFinancialOperation(operationType, amount);

  if (!validation.isValid && showWarning) {
    return (
      <div className="space-y-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800 text-lg">
              <Lock className="h-5 w-5" />
              الصندوق مغلق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-orange-800 font-medium">
                  لا يمكن إجراء {operationType} لأن الصندوق مغلق
                </p>
                <p className="text-orange-700 text-sm">
                  {validation.message}
                </p>
                {validation.insufficientFunds && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700">الرصيد الحالي:</span>
                      <span className="font-semibold text-orange-800">{formatCurrency(currentAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => navigate('/cash-box')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <DollarSign className="h-4 w-4 ml-2" />
                فتح الصندوق
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin-cash-box')}
              >
                إدارة الصناديق
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Show disabled children with overlay */}
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 bg-gray-100/50 flex items-center justify-center">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">المحتوى معطل حتى يتم فتح الصندوق</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}; 