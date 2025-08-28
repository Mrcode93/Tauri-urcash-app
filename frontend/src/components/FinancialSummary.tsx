import { Card } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FinancialSummaryProps {
  data: {
    total_sales: number;
    net_profit: number;
    cost_of_goods: number;
    revenue: number;
    profit_margin: number;
  };
}

const FinancialSummary = ({ data }: FinancialSummaryProps) => {
  return (
    <Card className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">الملخص المالي</h3>
        <BarChart className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">إجمالي المبيعات:</span>
          <span className="font-bold text-primary">{formatCurrency(data.total_sales)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">صافي الربح:</span>
          <span className="font-bold text-primary">{formatCurrency(data.net_profit)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">تكلفة البضاعة:</span>
          <span className="font-bold text-primary">{formatCurrency(data.cost_of_goods)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">الإيرادات:</span>
              <span className="font-bold text-primary">{formatCurrency(data.revenue)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">هامش الربح:</span>
          <span className="font-bold text-primary">{data.profit_margin.toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
};

export default FinancialSummary; 