import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from "@/lib/toast";
import { 
  Printer, 
  Plus, 
  Minus, 
  Eye, 
  Settings as SettingsIcon,
  Package,
  Tag,
  X
} from 'lucide-react';

interface BarcodeLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ar' | 'en';
  companyName?: string;
}

interface LabelConfig {
  width: number;
  height: number;
  margin: number;
  fontSize: number;
  labelsPerRow: number;
  showProductName: boolean;
  showPrice: boolean;
  showSKU: boolean;
}

interface BarcodeLabel {
  id: string;
  barcode: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
}

const BarcodeLabelPrinter: React.FC<BarcodeLabelPrinterProps> = ({ 
  isOpen, 
  onClose, 
  language = 'ar',
  companyName = ''
}) => {
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [config, setConfig] = useState<LabelConfig>({
    width: 1.5,
    height: 80,
    margin: 5,
    fontSize: 10,
    labelsPerRow: 3,
    showProductName: true,
    showPrice: true,
    showSKU: true
  });

  const [newLabel, setNewLabel] = useState<Partial<BarcodeLabel>>({
    barcode: '',
    productName: '',
    sku: '',
    price: 0,
    quantity: 1
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Add new label
  const addLabel = () => {
    if (!newLabel.barcode?.trim() || !newLabel.productName?.trim()) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    const label: BarcodeLabel = {
      id: Date.now().toString(),
      barcode: newLabel.barcode!,
      productName: newLabel.productName!,
      sku: newLabel.sku || '',
      price: newLabel.price || 0,
      quantity: newLabel.quantity || 1
    };

    setLabels(prev => [...prev, label]);
    setNewLabel({
      barcode: '',
      productName: '',
      sku: '',
      price: 0,
      quantity: 1
    });

    toast.success(language === 'ar' ? 'تم إضافة التسمية' : 'Label added');
  };

  // Remove label
  const removeLabel = (id: string) => {
    setLabels(prev => prev.filter(label => label.id !== id));
  };

  // Generate multiple copies of labels for printing
  const generatePrintLabels = () => {
    const printLabels: BarcodeLabel[] = [];
    labels.forEach(label => {
      for (let i = 0; i < label.quantity; i++) {
        printLabels.push({ ...label, id: `${label.id}-${i}` });
      }
    });
    return printLabels;
  };

  // Print labels using Electron's native print functionality
  const handlePrint = async () => {
    if (labels.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد تسميات للطباعة' : 'No labels to print');
      return;
    }

    const printLabels = generatePrintLabels();

    const labelsHtml = printLabels.map((label, index) => `
      <div class="label" style="
        width: ${config.width * 100}px;
        height: ${config.height + 40}px;
        margin: ${config.margin}px;
        padding: 5px;
        border: 1px solid #ccc;
        display: inline-block;
        text-align: center;
        vertical-align: top;
        page-break-inside: avoid;
        box-sizing: border-box;
        background: white;
      ">
        ${config.showProductName ? `
          <div style="font-size: ${config.fontSize}px; font-weight: bold; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${label.productName}
          </div>
        ` : ''}
        
        <div style="margin: 3px 0;">
          <svg id="barcode-${index}" style="width: 100%; height: ${config.height - 20}px;"></svg>
        </div>
        
        <div style="font-size: ${config.fontSize - 2}px; font-family: monospace; margin-top: 2px;">
          ${label.barcode}
        </div>
        
        ${config.showSKU && label.sku ? `
          <div style="font-size: ${config.fontSize - 2}px; color: #666;">
            SKU: ${label.sku}
          </div>
        ` : ''}
        
        ${config.showPrice && label.price > 0 ? `
          <div style="font-size: ${config.fontSize}px; font-weight: bold; color: #007bff;">
            ${label.price} ${language === 'ar' ? 'د.ع' : 'IQD'}
          </div>
        ` : ''}
      </div>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${language === 'ar' ? 'طباعة تسميات الباركود' : 'Print Barcode Labels'}</title>
        <style>
          body {
            margin: 0;
            padding: 10px;
            font-family: Arial, sans-serif;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            align-items: flex-start;
          }
          .label {
            break-inside: avoid;
          }
          @media print {
            body { margin: 0; padding: 5px; }
            .no-print { display: none; }
            .label { break-inside: avoid; }
          }
          @page {
            size: A4;
            margin: 0.5in;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          // Generate barcodes after DOM loads
          window.onload = function() {
            ${printLabels.map((label, index) => `
              try {
                JsBarcode("#barcode-${index}", "${label.barcode}", {
                  format: "CODE128",
                  width: ${config.width},
                  height: ${config.height - 30},
                  fontSize: ${config.fontSize - 2},
                  margin: 0,
                  displayValue: false
                });
              } catch(e) {
                console.error('Barcode generation error:', e);
              }
            `).join('\n')}
          };
        </script>
      </body>
      </html>
    `;

    try {
      // Check if we're in Electron environment
      if (window.electron && window.electron.showPrintDialog) {
        // Use Electron's native print dialog with preview
        const result = await window.electron.showPrintDialog(printContent, {
          printBackground: true,
          color: true,
          margins: {
            marginType: 'printableArea'
          }
        });
        
        if (result.success) {
          toast.success(language === 'ar' ? 'تم فتح معاينة الطباعة' : 'Print preview opened');
        } else {
          throw new Error(result.error || 'Print failed');
        }
      } else {
        // Fallback to window.open for web browsers
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          throw new Error('Failed to open print window');
        }
        printWindow.document.write(printContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error(language === 'ar' ? 'خطأ في الطباعة' : 'Print error');
    }
  };

  // Generate sample data
  const generateSampleData = () => {
    const sampleLabels: BarcodeLabel[] = [
      {
        id: '1',
        barcode: '1234567890123',
        productName: 'منتج تجريبي 1',
        sku: 'PRD001',
        price: 15000,
        quantity: 2
      },
      {
        id: '2',
        barcode: '1234567890124',
        productName: 'منتج تجريبي 2',
        sku: 'PRD002',
        price: 25000,
        quantity: 1
      }
    ];
    setLabels(sampleLabels);
    toast.success(language === 'ar' ? 'تم إضافة بيانات تجريبية' : 'Sample data added');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {language === 'ar' ? 'طباعة تسميات الباركود' : 'Barcode Label Printer'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'إنشاء وطباعة تسميات الباركود للمنتجات مع معلومات مخصصة' 
              : 'Create and print barcode labels for products with custom information'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Label Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة تسمية' : 'Add Label'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الباركود *' : 'Barcode *'}</Label>
                <Input
                  value={newLabel.barcode || ''}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="1234567890123"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المنتج *' : 'Product Name *'}</Label>
                <Input
                  value={newLabel.productName || ''}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder={language === 'ar' ? 'اسم المنتج' : 'Product name'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'كود المنتج (SKU)' : 'SKU'}</Label>
                <Input
                  value={newLabel.sku || ''}
                  onChange={(e) => setNewLabel(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="PRD001"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'السعر' : 'Price'}</Label>
                  <Input
                    type="number"
                    value={newLabel.price || 0}
                    onChange={(e) => setNewLabel(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                  <Input
                    type="number"
                    value={newLabel.quantity || 1}
                    onChange={(e) => setNewLabel(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={addLabel} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
                <Button variant="outline" onClick={generateSampleData}>
                  <Package className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Labels List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {language === 'ar' ? 'قائمة التسميات' : 'Labels List'}
                <Badge variant="secondary">{labels.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {labels.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ar' ? 'لا توجد تسميات' : 'No labels added'}</p>
                  </div>
                ) : (
                  labels.map((label) => (
                    <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{label.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{label.barcode}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          {label.sku && <span>SKU: {label.sku}</span>}
                          {label.price > 0 && <span>{label.price} {language === 'ar' ? 'د.ع' : 'IQD'}</span>}
                          <span>×{label.quantity}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLabel(label.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {labels.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{language === 'ar' ? 'إجمالي التسميات:' : 'Total labels:'}</span>
                    <span>{generatePrintLabels().length}</span>
                  </div>
                  <Button onClick={handlePrint} className="w-full">
                    <Printer className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'طباعة الكل' : 'Print All'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                {language === 'ar' ? 'إعدادات الطباعة' : 'Print Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'عرض التسمية' : 'Label Width'}</Label>
                <Input
                  type="number"
                  value={config.width}
                  onChange={(e) => setConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
                  min="1"
                  max="3"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'ارتفاع التسمية' : 'Label Height'}</Label>
                <Input
                  type="number"
                  value={config.height}
                  onChange={(e) => setConfig(prev => ({ ...prev, height: Number(e.target.value) }))}
                  min="60"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'حجم الخط' : 'Font Size'}</Label>
                <Input
                  type="number"
                  value={config.fontSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  min="8"
                  max="16"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الهامش' : 'Margin'}</Label>
                <Input
                  type="number"
                  value={config.margin}
                  onChange={(e) => setConfig(prev => ({ ...prev, margin: Number(e.target.value) }))}
                  min="0"
                  max="20"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showProductName">{language === 'ar' ? 'إظهار اسم المنتج' : 'Show Product Name'}</Label>
                  <input
                    type="checkbox"
                    id="showProductName"
                    checked={config.showProductName}
                    onChange={(e) => setConfig(prev => ({ ...prev, showProductName: e.target.checked }))}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showPrice">{language === 'ar' ? 'إظهار السعر' : 'Show Price'}</Label>
                  <input
                    type="checkbox"
                    id="showPrice"
                    checked={config.showPrice}
                    onChange={(e) => setConfig(prev => ({ ...prev, showPrice: e.target.checked }))}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showSKU">{language === 'ar' ? 'إظهار كود المنتج' : 'Show SKU'}</Label>
                  <input
                    type="checkbox"
                    id="showSKU"
                    checked={config.showSKU}
                    onChange={(e) => setConfig(prev => ({ ...prev, showSKU: e.target.checked }))}
                    className="rounded"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelPrinter; 