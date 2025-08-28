import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart as BarChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { SalesOverviewChartProps } from '@/types/dashboard';

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({ dashboardSummary }) => {
  // Create data for multi-bar chart
  const salesBarData = [
    {
      name: 'المبيعات',
      مدفوعة: dashboardSummary?.sales?.paid_amount || 0,
      جزئية: dashboardSummary?.sales?.partial_amount || 0,
      غير_مدفوعة: dashboardSummary?.sales?.unpaid_amount || 0,
    }
  ];

  return (
    <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">تحليل المبيعات</h3>
        <BarChartIcon className="h-6 w-6 text-blue-500" />
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={salesBarData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
            <Tooltip 
              formatter={(value, name) => [
                formatCurrency(value as number), 
                name === 'مدفوعة' ? 'المبيعات المدفوعة' : 
                name === 'جزئية' ? 'المبيعات الجزئية' : 
                name === 'غير_مدفوعة' ? 'المبيعات غير المدفوعة' : name
              ]}
              labelFormatter={(label) => label}
            />
            <Legend 
              formatter={(value) => 
                value === 'مدفوعة' ? 'المبيعات المدفوعة' : 
                value === 'جزئية' ? 'المبيعات الجزئية' : 
                value === 'غير_مدفوعة' ? 'المبيعات غير المدفوعة' : value
              }
            />
            <Bar dataKey="مدفوعة" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="جزئية" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="غير_مدفوعة" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}; 