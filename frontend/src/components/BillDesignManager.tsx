import { useState, useCallback } from 'react';
import { FileText, Thermometer, FileType } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import A4BillDesignManager from './A4BillDesignManager';
import ThermalBillDesignManager from './ThermalBillDesignManager';

// Props interface
interface BillDesignManagerProps {
  onA4SettingsChange?: (settings: any) => void;
  onThermalSettingsChange?: (settings: any) => void;
  initialBillType?: 'a4' | 'thermal';
}

// Component
const BillDesignManager = ({ 
  onA4SettingsChange, 
  onThermalSettingsChange, 
  initialBillType = 'a4' 
}: BillDesignManagerProps) => {
  const [activeBillType, setActiveBillType] = useState<'a4' | 'thermal'>(initialBillType);

  const handleA4SettingsChange = useCallback((settings: any) => {
    if (onA4SettingsChange) {
      onA4SettingsChange(settings);
    }
  }, [onA4SettingsChange]);

  const handleThermalSettingsChange = useCallback((settings: any) => {
    if (onThermalSettingsChange) {
      onThermalSettingsChange(settings);
    }
  }, [onThermalSettingsChange]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-right mb-2">تصميم الفاتورة</h1>
        <p className="text-muted-foreground text-right">
          اختر نوع الفاتورة وقم بتخصيص التصميم حسب احتياجاتك
        </p>
      </div>

      <Tabs value={activeBillType} onValueChange={(value) => setActiveBillType(value as 'a4' | 'thermal')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="a4" className="flex items-center gap-2 text-lg py-3">
            <FileType className="w-5 h-5" />
            فواتير A4
          </TabsTrigger>
          <TabsTrigger value="thermal" className="flex items-center gap-2 text-lg py-3">
            <Thermometer className="w-5 h-5" />
            فواتير حرارية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="a4" className="space-y-0">
          <A4BillDesignManager 
            onSettingsChange={handleA4SettingsChange}
          />
        </TabsContent>

        <TabsContent value="thermal" className="space-y-0">
          <ThermalBillDesignManager 
            onSettingsChange={handleThermalSettingsChange}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default BillDesignManager; 