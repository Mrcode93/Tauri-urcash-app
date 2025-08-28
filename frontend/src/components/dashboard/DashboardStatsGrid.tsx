import React from 'react';
import { StatCard } from '@/components/StatCard';
import { Receipt, ShoppingCart, Users, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DashboardStatsGridProps } from '@/types/dashboard';

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ dashboardSummary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="فواتير اليوم"
        value={dashboardSummary?.today_stats?.invoices_count || 0}
        icon={Receipt}
        trend={dashboardSummary?.today_stats?.sales_comparison > 0 ? 'up' : 'down'}
        trendValue={`${(dashboardSummary?.today_stats?.sales_comparison || 0).toFixed(1)}%`}
        className="bg-[#FFBE0B] text-white"
      />
      <StatCard
        title="مبيعات اليوم"
        value={formatCurrency(dashboardSummary?.today_stats?.sales_total || 0)}
        icon={ShoppingCart}
        trend="up"
        trendValue="صافي الربح"
        className="bg-[#FB5607] text-white"
      />
      <StatCard
        title="إجمالي العملاء"
        value={dashboardSummary?.customers?.total || 0}
        icon={Users}
        trend="up"
        trendValue={`+${dashboardSummary?.customers?.new_customers || 0} جديد`}
        className="bg-[#3A86FF] text-white"
      />
      <StatCard
        title="إجمالي المنتجات"
        value={dashboardSummary?.inventory?.total_products || 0}
        icon={Package}
        trend="up"
        trendValue={`قيمة المخزون: ${formatCurrency(dashboardSummary?.inventory?.stock_value || 0)}`}
        className="bg-[#8338EC] text-white"
      />
    </div>
  );
}; 