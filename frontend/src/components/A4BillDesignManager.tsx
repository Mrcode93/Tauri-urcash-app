import { useState, useCallback } from 'react';
import { FileText, Layout, Settings2, Printer, Save, Edit2, FileType, Palette } from 'lucide-react';
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

// A4 Bill Settings Interface
interface A4BillSettings {
  // Basic Display Options
  showLogo: boolean;
  showQR: boolean;
  showFooter: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showWatermark: boolean;
  showCompanyDetails: boolean;
  showBankDetails: boolean;
  
  // Text Content
  headerText: string;
  footerText: string;
  taxLabel: string;
  discountLabel: string;
  currency: string;
  watermarkText: string;
  
  // Page Layout
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'letter' | 'legal';
  layoutStyle: 'single' | 'two-column' | 'modern' | 'invoice';
  
  // Typography
  fontFamily: 'cairo' | 'noto' | 'amiri' | 'tajawal';
  headerFontSize: number;
  bodyFontSize: number;
  footerFontSize: number;
  lineHeight: number;
  
  // Colors & Theme
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  accentColor: string;
  
  // Logo Settings
  logoPosition: 'top-left' | 'top-center' | 'top-right';
  logoSize: 'small' | 'medium' | 'large' | 'custom';
  logoCustomWidth: number;
  logoCustomHeight: number;
  
  // Margins & Spacing
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentPadding: number;
  sectionSpacing: number;
  
  // Border & Background
  showBorder: boolean;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: number;
  
  // Company Details Layout
  companyDetailsPosition: 'header' | 'sidebar' | 'footer';
  companyDetailsAlignment: 'left' | 'center' | 'right';
  
  // Table Styling
  tableHeaderBg: string;
  tableBorderColor: string;
  alternateRowColor: string;
  showTableBorders: boolean;
  
  // Watermark Settings
  watermarkOpacity: number;
  watermarkRotation: number;
  watermarkSize: number;
  
  // Advanced Options
  customCSS: string;
  language: 'ar' | 'en';
  rtlSupport: boolean;
}

// Default A4 Settings
const DEFAULT_A4_SETTINGS: A4BillSettings = {
  showLogo: true,
  showQR: true,
  showFooter: true,
  showTax: true,
  showDiscount: true,
  showWatermark: false,
  showCompanyDetails: true,
  showBankDetails: false,
  
  headerText: 'شكراً لتعاملكم معنا',
  footerText: 'نتمنى لكم تجربة تسوق ممتعة',
  taxLabel: 'الضريبة المضافة',
  discountLabel: 'خصم',
  currency: 'د.ع',
  watermarkText: 'مدفوع',
  
  pageOrientation: 'portrait',
  pageSize: 'a4',
  layoutStyle: 'single',
  
  fontFamily: 'cairo',
  headerFontSize: 24,
  bodyFontSize: 14,
  footerFontSize: 12,
  lineHeight: 1.5,
  
  primaryColor: '#1f1f1f',
  secondaryColor: '#64748b',
  textColor: '#1e293b',
  backgroundColor: '#ffffff',
  accentColor: '#06b6d4',
  
  logoPosition: 'top-center',
  logoSize: 'medium',
  logoCustomWidth: 150,
  logoCustomHeight: 80,
  
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 20,
  marginRight: 20,
  contentPadding: 16,
  sectionSpacing: 24,
  
  showBorder: false,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderStyle: 'solid',
  borderRadius: 8,
  
  companyDetailsPosition: 'header',
  companyDetailsAlignment: 'center',
  
  tableHeaderBg: '#f8fafc',
  tableBorderColor: '#e2e8f0',
  alternateRowColor: '#f9fafb',
  showTableBorders: true,
  
  watermarkOpacity: 10,
  watermarkRotation: -45,
  watermarkSize: 48,
  
  customCSS: '',
  language: 'ar',
  rtlSupport: true,
};

// A4 Bill Templates
const A4_TEMPLATES = [
  {
    id: 'professional',
    name: 'تصميم مهني',
    description: 'تصميم احترافي مناسب للشركات الكبيرة',
    settings: { ...DEFAULT_A4_SETTINGS, layoutStyle: 'single' as const, primaryColor: '#1f1f1f' },
  },
  {
    id: 'modern',
    name: 'تصميم عصري',
    description: 'تصميم حديث مع ألوان زاهية',
    settings: { ...DEFAULT_A4_SETTINGS, layoutStyle: 'modern' as const, primaryColor: '#1f1f1f' },
  },
  {
    id: 'classic',
    name: 'تصميم كلاسيكي',
    description: 'تصميم تقليدي أنيق',
    settings: { ...DEFAULT_A4_SETTINGS, layoutStyle: 'invoice' as const, primaryColor: '#1f1f1f' },
  },
  {
    id: 'minimal',
    name: 'تصميم مبسط',
    description: 'تصميم بسيط ونظيف',
    settings: { ...DEFAULT_A4_SETTINGS, layoutStyle: 'single' as const, showBorder: false, primaryColor: '#1f1f1f' },
  },
];

interface A4BillDesignManagerProps {
  onSettingsChange?: (settings: A4BillSettings) => void;
  initialSettings?: Partial<A4BillSettings>;
}

const A4BillDesignManager = ({ onSettingsChange, initialSettings }: A4BillDesignManagerProps) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [settings, setSettings] = useState<A4BillSettings>(() => {
    const savedSettings = localStorage.getItem('a4BillSettings');
    const baseSettings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_A4_SETTINGS;
    return { ...baseSettings, ...initialSettings };
  });

  const saveSettings = useCallback(() => {
    localStorage.setItem('a4BillSettings', JSON.stringify(settings));
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const handleSettingsChange = useCallback((newSettings: Partial<A4BillSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettings();
  }, [settings, saveSettings]);

  const handleTemplateSelect = useCallback((template: typeof A4_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setSettings(template.settings);
    setTimeout(saveSettings, 0);
  }, [saveSettings]);

  const handlePrint = useCallback(() => {
    const printContent = document.getElementById('a4-bill-preview');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>معاينة الفاتورة A4</title>
              <style>
                body { 
                  font-family: '${settings.fontFamily}', Arial, sans-serif;
                  margin: 0;
                  padding: 20mm;
                  background: white;
                  color: ${settings.textColor || '#000'};
                }
                @media print {
                  body { margin: 0; }
                  @page { size: ${settings.pageSize} ${settings.pageOrientation}; margin: 0; }
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
        <h2 className="text-2xl font-bold text-right">تصميم فواتير A4</h2>
        <p className="text-muted-foreground text-right">خيارات متقدمة لتصميم الفواتير بحجم A4</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            القوالب
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <FileType className="w-4 h-4" />
            التخطيط
          </TabsTrigger>
          <TabsTrigger value="styling" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            التصميم
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            متقدم
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {A4_TEMPLATES.map((template) => (
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
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">إعدادات الصفحة</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">اتجاه الصفحة</Label>
                  <Select
                    value={settings.pageOrientation}
                    onValueChange={(value) => handleSettingsChange({ pageOrientation: value as 'portrait' | 'landscape' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">عمودي</SelectItem>
                      <SelectItem value="landscape">أفقي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-right">نمط التخطيط</Label>
                  <Select
                    value={settings.layoutStyle}
                    onValueChange={(value) => handleSettingsChange({ layoutStyle: value as 'single' | 'two-column' | 'modern' | 'invoice' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">عمود واحد</SelectItem>
                      <SelectItem value="two-column">عمودين</SelectItem>
                      <SelectItem value="modern">عصري</SelectItem>
                      <SelectItem value="invoice">فاتورة تقليدية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">الهوامش والمسافات</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-right">الهامش العلوي: {settings.marginTop}mm</Label>
                  <Slider
                    value={[settings.marginTop]}
                    onValueChange={(value) => handleSettingsChange({ marginTop: value[0] })}
                    max={50}
                    min={0}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">الهامش السفلي: {settings.marginBottom}mm</Label>
                  <Slider
                    value={[settings.marginBottom]}
                    onValueChange={(value) => handleSettingsChange({ marginBottom: value[0] })}
                    max={50}
                    min={0}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">الهامش الأيمن: {settings.marginRight}mm</Label>
                  <Slider
                    value={[settings.marginRight]}
                    onValueChange={(value) => handleSettingsChange({ marginRight: value[0] })}
                    max={50}
                    min={0}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">الهامش الأيسر: {settings.marginLeft}mm</Label>
                  <Slider
                    value={[settings.marginLeft]}
                    onValueChange={(value) => handleSettingsChange({ marginLeft: value[0] })}
                    max={50}
                    min={0}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Styling Tab */}
        <TabsContent value="styling" className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">الألوان</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-right">اللون الأساسي</Label>
                  <Input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleSettingsChange({ primaryColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">اللون الثانوي</Label>
                  <Input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => handleSettingsChange({ secondaryColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">لون النص</Label>
                  <Input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => handleSettingsChange({ textColor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-right">لون الخلفية</Label>
                  <Input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => handleSettingsChange({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">الخطوط</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">نوع الخط</Label>
                  <Select
                    value={settings.fontFamily}
                    onValueChange={(value) => handleSettingsChange({ fontFamily: value as 'cairo' | 'noto' | 'amiri' | 'tajawal' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cairo">Cairo</SelectItem>
                      <SelectItem value="noto">Noto Sans Arabic</SelectItem>
                      <SelectItem value="amiri">Amiri</SelectItem>
                      <SelectItem value="tajawal">Tajawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">خط العنوان: {settings.headerFontSize}px</Label>
                    <Slider
                      value={[settings.headerFontSize]}
                      onValueChange={(value) => handleSettingsChange({ headerFontSize: value[0] })}
                      max={48}
                      min={12}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">خط المحتوى: {settings.bodyFontSize}px</Label>
                    <Slider
                      value={[settings.bodyFontSize]}
                      onValueChange={(value) => handleSettingsChange({ bodyFontSize: value[0] })}
                      max={24}
                      min={8}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">خط التذييل: {settings.footerFontSize}px</Label>
                    <Slider
                      value={[settings.footerFontSize]}
                      onValueChange={(value) => handleSettingsChange({ footerFontSize: value[0] })}
                      max={18}
                      min={8}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6"dir="rtl">
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
                <div className="flex items-center justify-between">
                  <Label className="text-right">عرض العلامة المائية</Label>
                  <Switch
                    checked={settings.showWatermark}
                    onCheckedChange={(checked) => handleSettingsChange({ showWatermark: checked })}
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

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid gap-6" dir="rtl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">إعدادات الشعار</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-right">موضع الشعار</Label>
                  <Select
                    value={settings.logoPosition}
                    onValueChange={(value) => handleSettingsChange({ logoPosition: value as 'top-left' | 'top-center' | 'top-right' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">أعلى يسار</SelectItem>
                      <SelectItem value="top-center">أعلى وسط</SelectItem>
                      <SelectItem value="top-right">أعلى يمين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-right">حجم الشعار</Label>
                  <Select
                    value={settings.logoSize}
                    onValueChange={(value) => handleSettingsChange({ logoSize: value as 'small' | 'medium' | 'large' | 'custom' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">صغير</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="large">كبير</SelectItem>
                      <SelectItem value="custom">مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-right">CSS مخصص</h3>
              <div className="space-y-2">
                <Label className="text-right">أضف أنماط CSS مخصصة</Label>
                <Textarea
                  value={settings.customCSS}
                  onChange={(e) => handleSettingsChange({ customCSS: e.target.value })}
                  placeholder="/* أضف أنماط CSS هنا */"
                  className="font-mono text-left"
                  rows={6}
                />
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
          <h3 className="text-lg font-semibold text-right">معاينة فاتورة A4</h3>
        </div>
        
        <div className="overflow-auto">
          <div 
            id="a4-bill-preview" 
            className="bg-white rounded-lg border shadow-lg mx-auto relative"
            style={{
              width: settings.pageOrientation === 'portrait' ? '210mm' : '297mm',
              height: settings.pageOrientation === 'portrait' ? '297mm' : '210mm',
              maxWidth: '100%',
              backgroundColor: settings.backgroundColor,
              color: settings.textColor,
              fontFamily: settings.fontFamily,
              padding: `${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm`,
              transform: 'scale(0.3)',
              transformOrigin: 'top center',
              border: settings.showBorder ? `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}` : 'none',
              borderRadius: `${settings.borderRadius}px`,
            }}
            dir={settings.rtlSupport ? 'rtl' : 'ltr'}
          >
            {/* Header Section */}
            <div className="flex items-start justify-between" style={{ marginBottom: `${settings.sectionSpacing}px` }}>
              {settings.showLogo && settings.logoPosition === 'top-left' && (
                <div style={{ 
                  width: settings.logoSize === 'custom' ? `${settings.logoCustomWidth}px` : 'auto',
                  height: settings.logoSize === 'custom' ? `${settings.logoCustomHeight}px` : 'auto'
                }}>
                  <div className="bg-gray-200 rounded" style={{ width: '120px', height: '60px' }} />
                </div>
              )}
              
              {settings.showCompanyDetails && (
                <div className="text-center flex-1">
                  {settings.showLogo && settings.logoPosition === 'top-center' && (
                    <div className="mb-4 flex justify-center">
                      <div className="bg-gray-200 rounded" style={{ width: '120px', height: '60px' }} />
                    </div>
                  )}
                  <h1 style={{ 
                    fontSize: `${settings.headerFontSize}px`,
                    color: settings.primaryColor,
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    اسم الشركة
                  </h1>
                  <p style={{ fontSize: `${settings.bodyFontSize}px`, color: settings.secondaryColor }}>
                    العنوان • الهاتف • البريد الإلكتروني
                  </p>
                </div>
              )}
              
              {settings.showLogo && settings.logoPosition === 'top-right' && (
                <div>
                  <div className="bg-gray-200 rounded" style={{ width: '120px', height: '60px' }} />
                </div>
              )}
            </div>

            {/* Bill Info */}
            <div style={{ 
              borderTop: `2px solid ${settings.primaryColor}`,
              borderBottom: `1px solid ${settings.tableBorderColor}`,
              padding: `${settings.contentPadding}px 0`,
              marginBottom: `${settings.sectionSpacing}px`
            }}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 style={{ 
                    fontSize: `${Math.round(settings.headerFontSize * 0.8)}px`,
                    color: settings.primaryColor,
                    fontWeight: 'bold'
                  }}>
                    فاتورة رقم: #12345
                  </h2>
                  <p style={{ fontSize: `${settings.bodyFontSize}px`, color: settings.secondaryColor }}>
                    التاريخ: 2024/03/20
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: `${settings.bodyFontSize}px` }}>العميل: عميل تجريبي</p>
                  <p style={{ fontSize: `${settings.bodyFontSize}px`, color: settings.secondaryColor }}>
                    الهاتف: 123456789
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: settings.tableHeaderBg }}>
                    <th style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'right'
                    }}>الصنف</th>
                    <th style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>الكمية</th>
                    <th style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>السعر</th>
                    <th style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'left'
                    }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none'
                    }}>منتج تجريبي 1</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>2</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>50 {settings.currency}</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'left'
                    }}>100 {settings.currency}</td>
                  </tr>
                  <tr style={{ backgroundColor: settings.alternateRowColor }}>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none'
                    }}>منتج تجريبي 2</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>1</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'center'
                    }}>200 {settings.currency}</td>
                    <td style={{ 
                      padding: '12px',
                      fontSize: `${settings.bodyFontSize}px`,
                      borderBottom: settings.showTableBorders ? `1px solid ${settings.tableBorderColor}` : 'none',
                      textAlign: 'left'
                    }}>200 {settings.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div style={{ minWidth: '250px' }}>
                <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: `${settings.bodyFontSize}px` }}>المجموع الفرعي:</span>
                  <span style={{ fontSize: `${settings.bodyFontSize}px` }}>300 {settings.currency}</span>
                </div>
                {settings.showDiscount && (
                  <div className="flex justify-between items-center" style={{ 
                    padding: '8px 0',
                    color: settings.accentColor
                  }}>
                    <span style={{ fontSize: `${settings.bodyFontSize}px` }}>{settings.discountLabel}:</span>
                    <span style={{ fontSize: `${settings.bodyFontSize}px` }}>-15 {settings.currency}</span>
                  </div>
                )}
                {settings.showTax && (
                  <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
                    <span style={{ fontSize: `${settings.bodyFontSize}px` }}>{settings.taxLabel}:</span>
                    <span style={{ fontSize: `${settings.bodyFontSize}px` }}>42.75 {settings.currency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center" style={{ 
                  padding: '12px 0',
                  borderTop: `2px solid ${settings.primaryColor}`,
                  fontWeight: 'bold'
                }}>
                  <span style={{ 
                    fontSize: `${Math.round(settings.bodyFontSize * 1.2)}px`,
                    color: settings.primaryColor
                  }}>المجموع النهائي:</span>
                  <span style={{ 
                    fontSize: `${Math.round(settings.bodyFontSize * 1.2)}px`,
                    color: settings.primaryColor
                  }}>327.75 {settings.currency}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            {settings.showFooter && (
              <div style={{ 
                marginTop: `${settings.sectionSpacing}px`,
                borderTop: `1px solid ${settings.tableBorderColor}`,
                paddingTop: `${settings.contentPadding}px`,
                textAlign: 'center'
              }}>
                <p style={{ 
                  fontSize: `${settings.footerFontSize}px`,
                  color: settings.secondaryColor
                }}>
                  {settings.footerText}
                </p>
              </div>
            )}

            {/* QR Code */}
            {settings.showQR && (
              <div className="flex justify-center" style={{ marginTop: `${settings.sectionSpacing}px` }}>
                <div className="bg-gray-200 rounded" style={{ width: '80px', height: '80px' }} />
              </div>
            )}

            {/* Watermark */}
            {settings.showWatermark && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  opacity: settings.watermarkOpacity / 100,
                  transform: `rotate(${settings.watermarkRotation}deg)`,
                  fontSize: `${settings.watermarkSize}px`,
                  color: settings.primaryColor,
                  fontWeight: 'bold',
                  zIndex: 1
                }}
              >
                {settings.watermarkText}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default A4BillDesignManager; 