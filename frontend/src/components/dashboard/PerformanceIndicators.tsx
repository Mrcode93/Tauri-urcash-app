import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, BarChart as BarChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PerformanceIndicatorsProps } from '@/types/dashboard';

export const PerformanceIndicators: React.FC<PerformanceIndicatorsProps> = ({ dashboardSummary }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">معدل النمو</h3>
          <p className="text-3xl font-bold text-green-600">
            {(dashboardSummary?.today_stats?.sales_comparison || 0).toFixed(1)}%
          </p>
          <p className="text-gray-500 text-sm">مقارنة بالأمس</p>
        </div>
      </Card>

      <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">متوسط الطلب</h3>
          <p className="text-3xl font-bold text-blue-600">
            {(dashboardSummary?.sales?.count || 0) > 0 ? 
              formatCurrency((dashboardSummary?.sales?.total || 0) / (dashboardSummary?.sales?.count || 1)) : 
              formatCurrency(0)
            }
          </p>
          <p className="text-gray-500 text-sm">لكل فاتورة</p>
        </div>
      </Card>

      <Card className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <div className="text-center">
          <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <BarChartIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">كفاءة التحصيل</h3>
          <p className="text-3xl font-bold text-purple-600">
            {(dashboardSummary?.sales?.total || 0) > 0 ? 
              (((dashboardSummary?.sales?.paid_amount || 0) / (dashboardSummary?.sales?.total || 1)) * 100).toFixed(1) : 
              0
            }%
          </p>
          <p className="text-gray-500 text-sm">نسبة التحصيل</p>
        </div>
      </Card>
    </div>
  );
}; 