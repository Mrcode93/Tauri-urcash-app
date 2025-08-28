import React from 'react';
import { Card } from '@/components/ui/card';
import { Calculator, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ProfitAnalysisSectionProps } from '@/types/dashboard';

export const ProfitAnalysisSection: React.FC<ProfitAnalysisSectionProps> = ({ dashboardSummary }) => {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-6">تحليل الأرباح</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Calculation */}
        <Card className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">حساب الأرباح</h3>
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">إجمالي المبيعات:</span>
              <span className="font-bold text-blue-600">{formatCurrency(dashboardSummary?.sales?.total || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">المرتجعات:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.sales?.returns?.total_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">صافي المبيعات:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency((dashboardSummary?.sales?.total || 0) - (dashboardSummary?.sales?.returns?.total_amount || 0))}
              </span>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">تكلفة البضاعة المباعة:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.sales?.profit?.cost || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">الربح الإجمالي:</span>
              <span className="font-bold text-green-600">{formatCurrency(dashboardSummary?.sales?.profit?.gross_profit || 0)}</span>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">المصروفات:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.expenses?.total || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">إجمالي التكاليف:</span>
              <span className="font-bold text-red-600">
                {formatCurrency((dashboardSummary?.purchases?.total || 0) + (dashboardSummary?.expenses?.total || 0))}
              </span>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">هامش الربح:</span>
              <span className="font-bold text-green-600">
                {(dashboardSummary?.financial_summary?.profit_margin || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-800 font-semibold">صافي الربح:</span>
              <span className={`font-bold text-xl ${
                (dashboardSummary?.financial_summary?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Profit Breakdown */}
        <Card className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">تفصيل الأرباح</h3>
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">إجمالي المبيعات:</span>
              <span className="font-bold text-blue-600">{formatCurrency(dashboardSummary?.sales?.total || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">تكلفة البضاعة المباعة:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.sales?.profit?.cost || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">الربح الإجمالي:</span>
              <span className="font-bold text-green-600">{formatCurrency(dashboardSummary?.sales?.profit?.gross_profit || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">المصروفات:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.expenses?.total || 0)}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-semibold">صافي الربح:</span>
                <span className={`font-bold text-xl ${
                  (dashboardSummary?.financial_summary?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(dashboardSummary?.financial_summary?.net_profit || 0)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cost Analysis */}
        <Card className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">تحليل التكاليف</h3>
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">تكلفة المشتريات:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.purchases?.total || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">تكلفة البضاعة المباعة:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.sales?.profit?.cost || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">المصروفات:</span>
              <span className="font-bold text-red-600">{formatCurrency(dashboardSummary?.expenses?.total || 0)}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-semibold">إجمالي التكاليف:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency((dashboardSummary?.purchases?.total || 0) + (dashboardSummary?.expenses?.total || 0))}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}; 