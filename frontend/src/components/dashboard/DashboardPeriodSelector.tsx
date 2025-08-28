import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DashboardPeriodSelectorProps } from '@/types/dashboard';

export const DashboardPeriodSelector: React.FC<DashboardPeriodSelectorProps> = ({ 
  selectedPeriod, 
  onPeriodChange, 
  startDate, 
  endDate, 
  isDatePickerOpen, 
  setIsDatePickerOpen, 
  setStartDate, 
  setEndDate 
}) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2">
      <Button 
        variant={selectedPeriod === 'week' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onPeriodChange('week')}
      >
        الأسبوع
      </Button>
      <Button 
        variant={selectedPeriod === 'month' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onPeriodChange('month')}
      >
        الشهر
      </Button>
      <Button 
        variant={selectedPeriod === 'year' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onPeriodChange('year')}
      >
        السنة
      </Button>
      <Button 
        variant={selectedPeriod === 'custom' ? 'default' : 'outline'} 
        size="sm"
        onClick={() => onPeriodChange('custom')}
      >
        مخصص
      </Button>
    </div>
    {selectedPeriod === 'custom' && (
      <div className="flex items-center gap-2">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-40 justify-start text-right">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {startDate && endDate ? (
                `${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`
              ) : (
                "اختر التاريخ"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b">
              <p className="text-sm font-medium mb-2">اختر نطاق التاريخ</p>
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-gray-500">من تاريخ</label>
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">إلى تاريخ</label>
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-md border"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (startDate && endDate) {
                      setIsDatePickerOpen(false);
                    }
                  }}
                  disabled={!startDate || !endDate}
                >
                  تطبيق
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsDatePickerOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )}
    {selectedPeriod !== 'custom' && startDate && endDate && (
      <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
        {formatDate(startDate.toISOString())} - {formatDate(endDate.toISOString())}
      </div>
    )}
  </div>
); 