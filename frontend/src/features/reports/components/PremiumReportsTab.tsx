import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { StocksReportTab } from './StocksReportTab';
import { SalesAnalysisTab } from './SalesAnalysisTab';
import { CustomReportBuilder } from './CustomReportBuilder';

interface PremiumReportsTabProps {
  dateRange?: { start: string; end: string };
}

export const PremiumReportsTab: React.FC<PremiumReportsTabProps> = ({ dateRange }) => {
  const [activeTab, setActiveTab] = useState('stocks');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">التقارير والتحليلات</h1>
              <p className="text-lg text-gray-600">
                تحليلات متقدمة ورؤى حصرية لتنمية أعمالك واتخاذ قرارات مدروسة
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">آخر تحديث: {new Date().toLocaleDateString('ar-IQ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Enhanced Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-8">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 h-16 bg-transparent">
              <TabsTrigger 
                value="stocks" 
                className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200 rounded-lg transition-all duration-200"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold">تقرير المخزون</div>
                  <div className="text-xs text-gray-500">إدارة المخزون والتحليل</div>
                </div>
              </TabsTrigger>
              
              <TabsTrigger 
                value="sales-analysis" 
                className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 rounded-lg transition-all duration-200"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold">تحليل المبيعات</div>
                  <div className="text-xs text-gray-500">تحليل الأداء والاتجاهات</div>
                </div>
              </TabsTrigger>
              
              <TabsTrigger 
                value="custom-report" 
                className="flex items-center gap-3 px-6 py-4 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200 rounded-lg transition-all duration-200"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="font-semibold">تقرير مخصص</div>
                  <div className="text-xs text-gray-500">إنشاء تقارير مخصصة</div>
                </div>
              </TabsTrigger>
              
              <TabsTrigger 
                value="coming-soon-3" 
                disabled 
                className="flex items-center gap-3 px-6 py-4 opacity-50 cursor-not-allowed"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-right">
                  <div className="font-semibold">التنبيهات الذكية</div>
                  <div className="text-xs text-gray-400">قريباً</div>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

        {/* Stocks Report Tab */}
        <TabsContent value="stocks" className="space-y-6" dir="rtl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">تقرير المخزون الشامل</h2>
                  <p className="text-blue-700">تحليل شامل للمخزون والمنتجات</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <StocksReportTab dateRange={dateRange} />
            </div>
          </div>
        </TabsContent>

        {/* Sales Analysis Tab */}
        <TabsContent value="sales-analysis" className="space-y-6" dir="rtl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-900">تحليل المبيعات المتقدم</h2>
                  <p className="text-green-700">تحليل شامل لأداء المبيعات والاتجاهات</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <SalesAnalysisTab dateRange={dateRange} />
            </div>
          </div>
        </TabsContent>

        {/* Custom Report Tab */}
        <TabsContent value="custom-report" className="space-y-6" dir="rtl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-purple-900">منشئ التقارير المخصصة</h2>
                  <p className="text-purple-700">إنشاء تقارير مخصصة حسب احتياجاتك</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <CustomReportBuilder />
            </div>
          </div>
        </TabsContent>

        {/* Coming Soon Tab */}
        <TabsContent value="coming-soon-3" className="space-y-6" dir="rtl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-orange-900">التنبيهات الذكية</h2>
                  <p className="text-orange-700">نظام تنبيهات ذكي للمخزون والمبيعات والعملاء</p>
                </div>
              </div>
            </div>
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="inline-block p-6 bg-orange-50 rounded-full mb-6">
                  <AlertTriangle className="w-16 h-16 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">قريباً</h3>
                <p className="text-lg text-gray-600 mb-6">
                  نظام تنبيهات ذكي سيساعدك في مراقبة المخزون والمبيعات والعملاء
                </p>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-700 font-medium">
                    ترقبوا التحديثات القادمة!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
};
