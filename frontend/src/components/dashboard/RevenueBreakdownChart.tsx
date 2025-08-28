import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie,
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { RevenueBreakdownChartProps } from '@/types/dashboard';

export const RevenueBreakdownChart: React.FC<RevenueBreakdownChartProps> = ({ dashboardSummary }) => {
  const revenueData = [
    {
      name: 'المبيعات',
      value: dashboardSummary?.sales?.total || 0,
      color: '#10B981'
    },
    {
      name: 'المشتريات',
      value: dashboardSummary?.purchases?.total || 0,
      color: '#3B82F6'
    },
    {
      name: 'المصروفات',
      value: dashboardSummary?.expenses?.total || 0,
      color: '#EF4444'
    }
  ];

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">توزيع الإيرادات والمصروفات</h3>
        <DollarSign className="h-6 w-6 text-primary" />
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={revenueData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {revenueData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [formatCurrency(value as number), 'المبلغ']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}; 