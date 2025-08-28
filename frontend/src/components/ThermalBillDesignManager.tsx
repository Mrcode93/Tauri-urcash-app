import { useState, useCallback } from 'react';
import { FileText, Layout, Settings2, Printer, Save, Edit2, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

// Thermal Bill Settings Interface
interface ThermalBillSettings {
  // Basic Display Options
  showLogo: boolean;
  showQR: boolean;
  showFooter: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showCompanyDetails: boolean;
  
  // Text Content
  headerText: string;
  footerText: string;
  taxLabel: string;
  discountLabel: string;
  currency: string;
  
  // Printer Settings
  printerWidth: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
  lineSpacing: 'compact' | 'normal' | 'loose';
  
  // Typography
  fontFamily: 'default' | 'bold' | 'condensed';
  headerFontSize: number;
  bodyFontSize: number;
  
  // Layout
  alignment: 'left' | 'center' | 'right';
  showDividers: boolean;
  dividerStyle: 'line' | 'dashed' | 'dotted';
  
  // Content Layout
  showItemNumbers: boolean;
  showItemCodes: boolean;
  showUnitPrice: boolean;
  compactMode: boolean;
  
  // Footer Options
  showTotalInWords: boolean;
  showDateTime: boolean;
  showCashier: boolean;
  
  // Language & RTL
  language: 'ar' | 'en';
  rtlSupport: boolean;
  
  // Cut Settings
  autoCut: boolean;
  cutAfterLines: number;
  feedLines: number;
}

// Default Thermal Settings
const DEFAULT_THERMAL_SETTINGS: ThermalBillSettings = {
  showLogo: true,
  showQR: true,
  showFooter: true,
  showTax: true,
  showDiscount: true,
  showCompanyDetails: true,
  
  headerText: 'شكراً لتعاملكم معنا',
  footerText: 'نتمنى لكم تجربة تسوق ممتعة',
  taxLabel: 'ض.ق.م',
  discountLabel: 'خصم',
  currency: 'ر.س',
  
  printerWidth: '80mm',
  fontSize: 'medium',
  lineSpacing: 'normal',
  
  fontFamily: 'default',
  headerFontSize: 18,
  bodyFontSize: 12,
  
  alignment: 'center',
  showDividers: true,
  dividerStyle: 'line',
  
  showItemNumbers: true,
  showItemCodes: false,
  showUnitPrice: true,
  compactMode: false,
  
  showTotalInWords: false,
  showDateTime: true,
  showCashier: false,
  
  language: 'ar',
  rtlSupport: true,
  
  autoCut: true,
  cutAfterLines: 5,
  feedLines: 3,
};

// Thermal Bill Templates
const THERMAL_TEMPLATES = [
  {
    id: 'standard',
    name: 'قياسي',
    description: 'تصميم قياسي للطابعات الحرارية',
    settings: { ...DEFAULT_THERMAL_SETTINGS },
  },
  {
    id: 'compact',
    name: 'مضغوط',
    description: 'تصميم مضغوط لتوفير الورق',
    settings: { ...DEFAULT_THERMAL_SETTINGS, compactMode: true, lineSpacing: 'compact' as const, fontSize: 'small' as const },
  },
  {
    id: 'detailed',
    name: 'مفصل',
    description: 'تصميم مفصل مع جميع المعلومات',
    settings: { ...DEFAULT_THERMAL_SETTINGS, showItemCodes: true, showTotalInWords: true, showCashier: true },
  },
  {
    id: 'minimal',
    name: 'بسيط',
    description: 'تصميم بسيط مع الحد الأدنى من المعلومات',
    settings: { ...DEFAULT_THERMAL_SETTINGS, showLogo: false, showQR: false, showFooter: false, compactMode: true },
  },
];

interface ThermalBillDesignManagerProps {
  onSettingsChange?: (settings: ThermalBillSettings) => void;
  initialSettings?: Partial<ThermalBillSettings>;
}

const ThermalBillDesignManager = ({ onSettingsChange, initialSettings }: ThermalBillDesignManagerProps) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [settings, setSettings] = useState<ThermalBillSettings>(() => {
    const savedSettings = localStorage.getItem('thermalBillSettings');
    const baseSettings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_THERMAL_SETTINGS;
    return { ...baseSettings, ...initialSettings };
  });

  const saveSettings = useCallback(() => {
    localStorage.setItem('thermalBillSettings', JSON.stringify(settings));
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const handleSettingsChange = useCallback((newSettings: Partial<ThermalBillSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    setTimeout(() => saveSettings(), 0);
  }, [settings, saveSettings]);

  const handleTemplateSelect = useCallback((template: typeof THERMAL_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setSettings(template.settings);
    setTimeout(saveSettings, 0);
  }, [saveSettings]);

  const handlePrint = useCallback(() => {
    const printContent = document.getElementById('thermal-bill-preview');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>معاينة الفاتورة الحرارية</title>
              <style>
                body { 
                  font-family: monospace;
                  margin: 0;
                  padding: 2mm;
                  background: white;
                  color: #000;
                  font-size: ${settings.bodyFontSize}px;
                  line-height: ${settings.lineSpacing === 'compact' ? '1.2' : settings.lineSpacing === 'loose' ? '1.8' : '1.5'};
                }
                @media print {
                  body { 
                    margin: 0;
                    width: ${settings.printerWidth};
                  }
                  @page { 
                    size: ${settings.printerWidth} auto;
                    margin: 0;
                  }
                }
              </style>
            </head>
            <body>${printContent.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }, [settings]);

  return (
    <Card className="p-6" dir="rtl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-right">تصميم الفواتير الحرارية</h2>
        <p className="text-muted-foreground text-right">خيارات محسنة للطابعات الحرارية</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            القوالب
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            الطابعة
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="format" className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            التنسيق
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THERMAL_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className={cn(
                  'p-4 rounded-lg border transition-all cursor-pointer',
                  selectedTemplate === template.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                )}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-right">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                </div>
                <div className="aspect-[2/3] bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <Thermometer className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Printer Settings Tab */}
        <TabsContent value="printer" className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">إعدادات الطابعة</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">عرض الطابعة</Label>
                  <Select
                    value={settings.printerWidth}
                    onValueChange={(value) => handleSettingsChange({ printerWidth: value as '58mm' | '80mm' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm (صغير)</SelectItem>
                      <SelectItem value="80mm">80mm (قياسي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-right">حجم الخط</Label>
                  <Select
                    value={settings.fontSize}
                    onValueChange={(value) => handleSettingsChange({ fontSize: value as 'small' | 'medium' | 'large' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">صغير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">كبير</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-right">تباعد الأسطر</Label>
                  <Select
                    value={settings.lineSpacing}
                    onValueChange={(value) => handleSettingsChange({ lineSpacing: value as 'compact' | 'normal' | 'loose' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">مضغوط</SelectItem>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="loose">متباعد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">إعدادات القص</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-right">قص تلقائي</Label>
                  <Switch
                    checked={settings.autoCut}
                    onCheckedChange={(checked) => handleSettingsChange({ autoCut: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-right">عدد الأسطر بعد القص: {settings.cutAfterLines}</Label>
                  <Slider
                    value={[settings.cutAfterLines]}
                    onValueChange={(value) => handleSettingsChange({ cutAfterLines: value[0] })}
                    max={10}
                    min={1}
                    step={1}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-right">عدد الأسطر الفارغة: {settings.feedLines}</Label>
                  <Slider
                    value={[settings.feedLines]}
                    onValueChange={(value) => handleSettingsChange({ feedLines: value[0] })}
                    max={10}
                    min={0}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid  gap-6" dir="rtl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">العناصر المرئية</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض الشعار</Label>
                  <Switch
                    checked={settings.showLogo}
                    onCheckedChange={(checked) => handleSettingsChange({ showLogo: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض تفاصيل الشركة</Label>
                  <Switch
                    checked={settings.showCompanyDetails}
                    onCheckedChange={(checked) => handleSettingsChange({ showCompanyDetails: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض باركود QR</Label>
                  <Switch
                    checked={settings.showQR}
                    onCheckedChange={(checked) => handleSettingsChange({ showQR: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض الضريبة</Label>
                  <Switch
                    checked={settings.showTax}
                    onCheckedChange={(checked) => handleSettingsChange({ showTax: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض الخصم</Label>
                  <Switch
                    checked={settings.showDiscount}
                    onCheckedChange={(checked) => handleSettingsChange({ showDiscount: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">تفاصيل الأصناف</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض أرقام الأصناف</Label>
                  <Switch
                    checked={settings.showItemNumbers}
                    onCheckedChange={(checked) => handleSettingsChange({ showItemNumbers: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض أكواد الأصناف</Label>
                  <Switch
                    checked={settings.showItemCodes}
                    onCheckedChange={(checked) => handleSettingsChange({ showItemCodes: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض سعر الوحدة</Label>
                  <Switch
                    checked={settings.showUnitPrice}
                    onCheckedChange={(checked) => handleSettingsChange({ showUnitPrice: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">الوضع المضغوط</Label>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(checked) => handleSettingsChange({ compactMode: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">النصوص</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">نص الترويسة</Label>
                  <Input
                    value={settings.headerText}
                    onChange={(e) => handleSettingsChange({ headerText: e.target.value })}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">نص التذييل</Label>
                  <Textarea
                    value={settings.footerText}
                    onChange={(e) => handleSettingsChange({ footerText: e.target.value })}
                    className="text-right"
                    dir="rtl"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">عنوان الضريبة</Label>
                  <Input
                    value={settings.taxLabel}
                    onChange={(e) => handleSettingsChange({ taxLabel: e.target.value })}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">عنوان الخصم</Label>
                  <Input
                    value={settings.discountLabel}
                    onChange={(e) => handleSettingsChange({ discountLabel: e.target.value })}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Format Tab */}
        <TabsContent value="format" className="space-y-6">
          <div className="grid gap-6" dir="rtl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">التنسيق</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">محاذاة النص</Label>
                  <Select
                    value={settings.alignment}
                    onValueChange={(value) => handleSettingsChange({ alignment: value as 'left' | 'center' | 'right' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">يمين</SelectItem>
                      <SelectItem value="center">وسط</SelectItem>
                      <SelectItem value="left">يسار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض الفواصل</Label>
                  <Switch
                    checked={settings.showDividers}
                    onCheckedChange={(checked) => handleSettingsChange({ showDividers: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-right">نمط الفاصل</Label>
                  <Select
                    value={settings.dividerStyle}
                    onValueChange={(value) => handleSettingsChange({ dividerStyle: value as 'line' | 'dashed' | 'dotted' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">خط مستقيم</SelectItem>
                      <SelectItem value="dashed">خط متقطع</SelectItem>
                      <SelectItem value="dotted">نقاط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">إعدادات إضافية</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-right">المجموع بالأحرف</Label>
                  <Switch
                    checked={settings.showTotalInWords}
                    onCheckedChange={(checked) => handleSettingsChange({ showTotalInWords: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض التاريخ والوقت</Label>
                  <Switch
                    checked={settings.showDateTime}
                    onCheckedChange={(checked) => handleSettingsChange({ showDateTime: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض اسم الكاشير</Label>
                  <Switch
                    checked={settings.showCashier}
                    onCheckedChange={(checked) => handleSettingsChange({ showCashier: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <div className="mt-6 p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              طباعة تجريبية
            </Button>
            <Button variant="outline" size="sm" onClick={saveSettings}>
              <Save className="w-4 h-4 mr-2" />
              حفظ الإعدادات
            </Button>
          </div>
          <h3 className="text-lg font-semibold text-right">معاينة الفاتورة الحرارية</h3>
        </div>
        
        <div className="flex justify-center">
          <div 
            id="thermal-bill-preview" 
            className="bg-white rounded-lg border shadow-lg p-4 font-mono"
            style={{
              width: settings.printerWidth === '80mm' ? '80mm' : '58mm',
              maxWidth: '100%',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: `${settings.bodyFontSize}px`,
              lineHeight: settings.lineSpacing === 'compact' ? '1.2' : settings.lineSpacing === 'loose' ? '1.8' : '1.5',
              textAlign: settings.alignment,
              fontFamily: 'monospace',
            }}
            dir={settings.rtlSupport ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            {settings.showCompanyDetails && (
              <div className="text-center mb-4">
                {settings.showLogo && (
                  <div className="mb-2 flex justify-center">
                    <div className="bg-gray-200 rounded" style={{ width: '40px', height: '20px' }} />
                  </div>
                )}
                <div style={{ fontSize: `${settings.headerFontSize}px`, fontWeight: 'bold' }}>
                  اسم الشركة
                </div>
                <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.9)}px` }}>
                  الهاتف: 123456789
                </div>
              </div>
            )}

            {/* Divider */}
            {settings.showDividers && (
              <div className="text-center mb-2">
                {settings.dividerStyle === 'line' && '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'}
                {settings.dividerStyle === 'dashed' && '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌'}
                {settings.dividerStyle === 'dotted' && '∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙'}
              </div>
            )}

            {/* Bill Info */}
            <div className="mb-4 text-center">
              <div>فاتورة رقم: #12345</div>
              {settings.showDateTime && (
                <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.8)}px` }}>
                  2024/03/20 - 14:30
                </div>
              )}
              {settings.showCashier && (
                <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.8)}px` }}>
                  الكاشير: أحمد
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-4">
              {settings.showDividers && (
                <div className="text-center mb-2">
                  {settings.dividerStyle === 'line' && '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'}
                  {settings.dividerStyle === 'dashed' && '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌'}
                  {settings.dividerStyle === 'dotted' && '∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙'}
                </div>
              )}
              
              {/* Item 1 */}
              <div className="mb-2">
                <div className="flex justify-between">
                  <span>{settings.showItemNumbers ? '1. ' : ''}منتج تجريبي 1</span>
                  <span>100 {settings.currency}</span>
                </div>
                {settings.showItemCodes && (
                  <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.8)}px` }}>
                    كود: P001
                  </div>
                )}
                {settings.showUnitPrice && !settings.compactMode && (
                  <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.9)}px` }}>
                    2 × 50 {settings.currency}
                  </div>
                )}
              </div>
              
              {/* Item 2 */}
              <div className="mb-2">
                <div className="flex justify-between">
                  <span>{settings.showItemNumbers ? '2. ' : ''}منتج تجريبي 2</span>
                  <span>200 {settings.currency}</span>
                </div>
                {settings.showItemCodes && (
                  <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.8)}px` }}>
                    كود: P002
                  </div>
                )}
                {settings.showUnitPrice && !settings.compactMode && (
                  <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.9)}px` }}>
                    1 × 200 {settings.currency}
                  </div>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="mb-4">
              {settings.showDividers && (
                <div className="text-center mb-2">
                  {settings.dividerStyle === 'line' && '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'}
                  {settings.dividerStyle === 'dashed' && '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌'}
                  {settings.dividerStyle === 'dotted' && '∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙'}
                </div>
              )}
              
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>300 {settings.currency}</span>
              </div>
              
              {settings.showDiscount && (
                <div className="flex justify-between">
                  <span>{settings.discountLabel}:</span>
                  <span>-15 {settings.currency}</span>
                </div>
              )}
              
              {settings.showTax && (
                <div className="flex justify-between">
                  <span>{settings.taxLabel}:</span>
                  <span>42.75 {settings.currency}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold">
                <span>المجموع النهائي:</span>
                <span>327.75 {settings.currency}</span>
              </div>
              
              {settings.showTotalInWords && (
                <div className="text-center mt-2" style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.8)}px` }}>
                  ثلاثمائة وسبعة وعشرون ريال وخمسة وسبعون هللة
                </div>
              )}
            </div>

            {/* Footer */}
            {settings.showFooter && (
              <div className="text-center">
                {settings.showDividers && (
                  <div className="mb-2">
                    {settings.dividerStyle === 'line' && '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'}
                    {settings.dividerStyle === 'dashed' && '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌'}
                    {settings.dividerStyle === 'dotted' && '∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙'}
                  </div>
                )}
                <div style={{ fontSize: `${Math.round(settings.bodyFontSize * 0.9)}px` }}>
                  {settings.footerText}
                </div>
              </div>
            )}

            {/* QR Code */}
            {settings.showQR && (
              <div className="text-center mt-4">
                <div className="bg-gray-200 rounded mx-auto" style={{ width: '60px', height: '60px' }} />
              </div>
            )}

            {/* Feed lines */}
            {Array.from({ length: settings.feedLines }).map((_, i) => (
              <div key={i} style={{ height: '1em' }} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ThermalBillDesignManager; 