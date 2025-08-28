import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
// Using simple QR code generation without external library
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from "@/lib/toast";
import { 
  Barcode as BarcodeIcon, 
  Printer, 
  Download, 
  Copy, 
  RefreshCw,
  QrCode,
  Settings as SettingsIcon,
  Eye,
  Save
} from 'lucide-react';

interface BarcodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ar' | 'en';
  companyName?: string;
}

interface BarcodeConfig {
  type: 'CODE128' | 'EAN13' | 'QR';
  value: string;
  width: number;
  height: number;
  fontSize: number;
  margin: number;
  displayValue: boolean;
  format: 'CODE128' | 'EAN13';
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ 
  isOpen, 
  onClose, 
  language = 'ar',
  companyName = ''
}) => {
  const [config, setConfig] = useState<BarcodeConfig>({
    type: 'CODE128',
    value: '',
    width: 2,
    height: 100,
    fontSize: 14,
    margin: 10,
    displayValue: true,
    format: 'CODE128'
  });

  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [generatedBarcode, setGeneratedBarcode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copies, setCopies] = useState<number>(1);
  const printRef = useRef<HTMLDivElement>(null);

  // Generate random barcode value
  const generateRandomBarcode = () => {
    let randomValue = '';
    
    switch (config.type) {
      case 'CODE128': {
        // Generate 12-digit numeric barcode
        randomValue = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        randomValue = randomValue.slice(-12);
        break;
      }
      case 'EAN13': {
        // Generate 13-digit EAN code
        const countryCode = '123'; // Example country code
        const manufacturerCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const productCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const checkDigit = '0'; // Simplified - normally calculated
        randomValue = countryCode + manufacturerCode + productCode + checkDigit;
        break;
      }
      case 'QR': {
        // Generate QR code data
        randomValue = `URCash-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        break;
      }
    }
    
    setConfig(prev => ({ ...prev, value: randomValue }));
    setGeneratedBarcode(randomValue);
  };

  // Generate simple QR code placeholder
  const generateQRCode = async (text: string) => {
    try {
      // Create a simple QR code placeholder using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = 200;
      canvas.height = 200;
      
      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 200, 200);
      
      // Create simple pattern (placeholder for actual QR code)
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if ((i + j) % 3 === 0) {
            ctx.fillRect(i * 10, j * 10, 8, 8);
          }
        }
      }
      
      // Add text
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', 100, 190);
      
      const url = canvas.toDataURL();
      setQrCodeDataURL(url);
    } catch (error) {
      console.error('QR Code generation error:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء رمز QR' : 'Failed to generate QR code');
    }
  };

  // Handle barcode generation
  const handleGenerate = async () => {
    if (!config.value.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال القيمة' : 'Please enter a value');
      return;
    }

    setIsGenerating(true);
    
    try {
      if (config.type === 'QR') {
        await generateQRCode(config.value);
      }
      setGeneratedBarcode(config.value);
      toast.success(language === 'ar' ? 'تم إنشاء الباركود بنجاح' : 'Barcode generated successfully');
    } catch (error) {
      console.error('Barcode generation error:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء الباركود' : 'Failed to generate barcode');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy barcode value to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(config.value);
      toast.success(language === 'ar' ? 'تم نسخ القيمة' : 'Value copied to clipboard');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل في النسخ' : 'Failed to copy');
    }
  };

  // Print barcode
  const handlePrint = () => {
    if (!generatedBarcode) {
      toast.error(language === 'ar' ? 'لا يوجد باركود للطباعة' : 'No barcode to print');
      return;
    }

    if (copies <= 0) {
      toast.error(language === 'ar' ? 'يرجى إدخال عدد صحيح من النسخ' : 'Please enter a valid number of copies');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate multiple barcode containers
    const generateBarcodeContainers = () => {
      let containers = '';
      
      for (let i = 0; i < copies; i++) {
        let barcodeContent = '';
        
        if (config.type === 'QR' && qrCodeDataURL) {
          // For QR codes, use the generated image
          barcodeContent = `<img src="${qrCodeDataURL}" alt="QR Code" style="max-width: 150px; height: auto;" />`;
        } else {
          // For regular barcodes, use JSBarcode to generate SVG
          barcodeContent = `<svg id="barcode-${i}" class="barcode-svg" style="width: 100%; max-width: 300px; height: auto;"></svg>`;
        }

        containers += `
          <div class="barcode-container">
            ${companyName ? `<div class="company-name">${companyName}</div>` : ''}
            <div class="barcode-title">${language === 'ar' ? 'باركود المنتج' : 'Product Barcode'}</div>
            <div class="barcode-content">
              ${barcodeContent}
            </div>
            <div class="barcode-value">${config.value}</div>
            <div class="barcode-type">${config.type}</div>
            ${copies > 1 ? `<div class="copy-number">${language === 'ar' ? 'نسخة' : 'Copy'} ${i + 1} ${language === 'ar' ? 'من' : 'of'} ${copies}</div>` : ''}
          </div>
        `;
      }
      
      return containers;
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${language === 'ar' ? 'طباعة الباركود' : 'Print Barcode'} - ${copies} ${language === 'ar' ? 'نسخة' : 'copies'}</title>
        <style>
          body {
            margin: 0;
            padding: 15px;
            font-family: Arial, sans-serif;
          }
          .print-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 20px;
          }
          .barcode-container {
            text-align: center;
            padding: 15px;
            border: 2px solid #000;
            background: white;
            width: ${copies > 2 ? '250px' : copies > 1 ? '350px' : '400px'};
            height: auto;
            break-inside: avoid;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .company-name {
            font-size: ${copies > 4 ? '12px' : '14px'};
            font-weight: bold;
            margin-bottom: 8px;
            color: #000;
            text-align: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .barcode-title {
            font-size: ${copies > 4 ? '12px' : '14px'};
            font-weight: bold;
            margin-bottom: 8px;
            color: #666;
          }
          .barcode-content {
            margin: 15px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-value {
            font-family: 'Courier New', monospace;
            font-size: ${copies > 4 ? '10px' : '12px'};
            margin-top: 10px;
            font-weight: bold;
            color: #000;
            word-break: break-all;
          }
          .barcode-type {
            font-size: ${copies > 4 ? '8px' : '10px'};
            color: #666;
            margin-top: 8px;
          }
          .copy-number {
            font-size: ${copies > 4 ? '8px' : '9px'};
            color: #999;
            margin-top: 5px;
            font-style: italic;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 10px;
            }
            .no-print { 
              display: none; 
            }
            .barcode-container {
              border: 1px solid #000;
              box-shadow: none;
            }
            .print-container {
              gap: 15px;
            }
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        </style>
        ${config.type !== 'QR' ? '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>' : ''}
      </head>
      <body>
        <div class="print-container">
          ${generateBarcodeContainers()}
        </div>
        
        ${config.type !== 'QR' ? `
        <script>
          window.onload = function() {
            try {
              // Generate barcodes for all copies
              for (let i = 0; i < ${copies}; i++) {
                JsBarcode("#barcode-" + i, "${config.value}", {
                  format: "${config.format}",
                  width: ${config.width * (copies > 4 ? 0.8 : copies > 2 ? 0.9 : 1)},
                  height: ${config.height * (copies > 4 ? 0.8 : copies > 2 ? 0.9 : 1)},
                  fontSize: ${config.fontSize * (copies > 4 ? 0.8 : copies > 2 ? 0.9 : 1)},
                  margin: ${config.margin},
                  displayValue: ${config.displayValue},
                  background: "#ffffff",
                  lineColor: "#000000"
                });
              }
              
              // Removed auto-print functionality
            } catch (error) {
              console.error('Barcode generation error:', error);
              // Show error message for all barcode containers
              for (let i = 0; i < ${copies}; i++) {
                const element = document.getElementById('barcode-' + i);
                if (element) {
                  element.innerHTML = '<div style="padding: 15px; border: 1px solid #ccc; font-size: 12px;">Error generating barcode</div>';
                }
              }
              // Removed auto-print functionality
            }
          };
        </script>
        ` : `
        <script>
          window.onload = function() {
            // Removed auto-print functionality
          };
        </script>
        `}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  };

  // Download barcode as image
  const downloadBarcode = () => {
    if (!generatedBarcode) {
      toast.error(language === 'ar' ? 'لا يوجد باركود للتحميل' : 'No barcode to download');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create a temporary container for the barcode
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = printRef.current?.innerHTML || '';
    
    // For simplicity, we'll download the QR code if it's a QR type
    if (config.type === 'QR' && qrCodeDataURL) {
      const link = document.createElement('a');
      link.download = `qrcode-${config.value}.png`;
      link.href = qrCodeDataURL;
      link.click();
    } else {
      toast.info(language === 'ar' ? 'استخدم خيار الطباعة لحفظ الباركود' : 'Use print option to save barcode');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5" />
            {language === 'ar' ? 'مولد الباركود' : 'Barcode Generator'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'إنشاء وتخصيص رموز الباركود ورموز QR للمنتجات والفواتير' 
              : 'Generate and customize barcodes and QR codes for products and invoices'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                {language === 'ar' ? 'إعدادات الباركود' : 'Barcode Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barcode Type */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نوع الباركود' : 'Barcode Type'}</Label>
                <Select 
                  value={config.type} 
                  onValueChange={(value: 'CODE128' | 'EAN13' | 'QR') => 
                    setConfig(prev => ({ 
                      ...prev, 
                      type: value, 
                      format: value === 'QR' ? 'CODE128' : value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODE128">
                      <div className="flex items-center gap-2">
                        <BarcodeIcon className="w-4 h-4" />
                        CODE128
                      </div>
                    </SelectItem>
                    <SelectItem value="EAN13">
                      <div className="flex items-center gap-2">
                        <BarcodeIcon className="w-4 h-4" />
                        EAN-13
                      </div>
                    </SelectItem>
                    <SelectItem value="QR">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        QR Code
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Barcode Value */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'قيمة الباركود' : 'Barcode Value'}</Label>
                <div className="flex gap-2">
                  <Input
                    value={config.value}
                    onChange={(e) => setConfig(prev => ({ ...prev, value: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل القيمة...' : 'Enter value...'}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={generateRandomBarcode}
                    title={language === 'ar' ? 'إنشاء قيمة عشوائية' : 'Generate random value'}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Size Settings */}
              {config.type !== 'QR' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'العرض' : 'Width'}</Label>
                      <Input
                        type="number"
                        value={config.width}
                        onChange={(e) => setConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
                        min="1"
                        max="5"
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الارتفاع' : 'Height'}</Label>
                      <Input
                        type="number"
                        value={config.height}
                        onChange={(e) => setConfig(prev => ({ ...prev, height: Number(e.target.value) }))}
                        min="50"
                        max="200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'حجم الخط' : 'Font Size'}</Label>
                      <Input
                        type="number"
                        value={config.fontSize}
                        onChange={(e) => setConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                        min="8"
                        max="24"
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
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="displayValue"
                      checked={config.displayValue}
                      onChange={(e) => setConfig(prev => ({ ...prev, displayValue: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="displayValue">
                      {language === 'ar' ? 'إظهار القيمة' : 'Display Value'}
                    </Label>
                  </div>
                </>
              )}

                             {/* Print Settings */}
               <Separator />
               <div className="space-y-4">
                 <Label className="text-sm font-medium">
                   {language === 'ar' ? 'إعدادات الطباعة' : 'Print Settings'}
                 </Label>
                 
                 <div className="space-y-2">
                   <Label htmlFor="copies">{language === 'ar' ? 'عدد النسخ' : 'Number of Copies'}</Label>
                   <Input
                     id="copies"
                     type="number"
                     value={copies}
                     onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                     min="1"
                     max="50"
                     placeholder="1"
                     className="w-full"
                   />
                   <p className="text-xs text-gray-500">
                     {language === 'ar' 
                       ? `سيتم طباعة ${copies} نسخة من الباركود` 
                       : `Will print ${copies} ${copies === 1 ? 'copy' : 'copies'} of the barcode`
                     }
                   </p>
                 </div>
               </div>

               {/* Action Buttons */}
               <Separator />
               <div className="flex gap-2">
                 <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
                   {isGenerating ? (
                     <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                     <BarcodeIcon className="w-4 h-4 mr-2" />
                   )}
                   {language === 'ar' ? 'إنشاء' : 'Generate'}
                 </Button>
                 
                 <Button variant="outline" onClick={copyToClipboard} disabled={!config.value}>
                   <Copy className="w-4 h-4" />
                 </Button>
               </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {language === 'ar' ? 'معاينة الباركود' : 'Barcode Preview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4">
                {generatedBarcode ? (
                  <div ref={printRef} className="flex flex-col items-center space-y-4">
                    {config.type === 'QR' ? (
                      qrCodeDataURL ? (
                        <div className="text-center">
                          <img src={qrCodeDataURL} alt="QR Code" className="mx-auto" />
                          <p className="text-sm font-mono mt-2 break-all">{config.value}</p>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          {language === 'ar' ? 'اضغط إنشاء لإنتاج رمز QR' : 'Click Generate to create QR code'}
                        </div>
                      )
                    ) : (
                      <Barcode
                        value={generatedBarcode}
                        format={config.format}
                        width={config.width}
                        height={config.height}
                        fontSize={config.fontSize}
                        margin={config.margin}
                        displayValue={config.displayValue}
                        background="#ffffff"
                        lineColor="#000000"
                      />
                    )}
                    
                    {/* Barcode Info */}
                    <div className="text-center space-y-2">
                      <Badge variant="secondary">
                        {config.type}
                      </Badge>
                      <p className="text-xs text-gray-600 font-mono break-all">
                        {config.value}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <BarcodeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ar' ? 'أدخل القيمة واضغط إنشاء' : 'Enter value and click Generate'}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {generatedBarcode && (
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={handlePrint} className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    {language === 'ar' ? `طباعة${copies > 1 ? ` (${copies} نسخ)` : ''}` : `Print${copies > 1 ? ` (${copies} copies)` : ''}`}
                  </Button>
                  <Button variant="outline" onClick={downloadBarcode} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'تحميل' : 'Download'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeGenerator; 