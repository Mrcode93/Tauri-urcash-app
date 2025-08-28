# Reports Print Utilities Usage Guide

## Overview

The `printReportsUtils` provides comprehensive printing and export functionality for reports in the التقارير والتحليلات (Reports and Analytics) page. It follows the same pattern as the bills print utilities and supports multiple formats including print preview, PDF export, and Excel export.

## Features

### ✅ **Supported Report Types**
- **Dashboard Reports**: Comprehensive business overview with sales, profit, and performance metrics
- **Profit-Loss Reports**: Detailed financial analysis with revenue and expense breakdowns
- **Custom Reports**: Flexible format for any custom data structure
- **Sales Reports**: Sales performance and analysis
- **Inventory Reports**: Stock and inventory analysis
- **Customer Reports**: Customer behavior and analysis

### ✅ **Export Formats**
1. **Print Preview**: Professional print layout with preview
2. **PDF Export**: High-quality PDF documents
3. **Excel Export**: CSV format for data analysis
4. **Quick Print**: Direct printing without preview

### ✅ **Printer Support**
- **A4 Format**: Standard paper size for reports
- **Thermal Printers**: 80mm and 58mm thermal printers
- **Professional Layouts**: Company branding and styling

## Installation & Setup

### 1. Import the Utilities

```typescript
import printReportsUtils from '@/utils/printReportsUtils';
```

### 2. Basic Usage

```typescript
// Print with preview
await printReportsUtils.printReportWithPreview(
  'dashboard',
  reportData,
  settings,
  dateRange,
  'a4',
  'تقرير لوحة التحكم الشامل',
  'الفترة من 01/01/2024 إلى 31/01/2024'
);

// Save as PDF
await printReportsUtils.saveReportAsPDF(
  'dashboard',
  reportData,
  settings,
  dateRange,
  'تقرير لوحة التحكم الشامل'
);

// Export to Excel
printReportsUtils.exportReportToExcel(
  'dashboard',
  reportData,
  dateRange,
  'تقرير لوحة التحكم الشامل'
);
```

## Integration in Reports Page

### 1. Updated Reports.tsx

The main Reports page has been updated with new export functions:

```typescript
// Dashboard export functions
const handleExport = async (type: 'pdf' | 'excel' | 'print') => {
  setIsExporting(true);
  try {
    const reportSummary = getReportSummary();
    
    if (type === 'print') {
      await printReportsUtils.printReportWithPreview(
        'dashboard',
        reportSummary,
        settings,
        dateRange,
        'a4',
        'تقرير لوحة التحكم الشامل',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم فتح معاينة الطباعة');
    } else if (type === 'pdf') {
      await printReportsUtils.saveReportAsPDF(
        'dashboard',
        reportSummary,
        settings,
        dateRange,
        'تقرير لوحة التحكم الشامل',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم حفظ التقرير كـ PDF');
    } else if (type === 'excel') {
      printReportsUtils.exportReportToExcel(
        'dashboard',
        reportSummary,
        dateRange,
        'تقرير لوحة التحكم الشامل'
      );
      toast.success('تم تصدير التقرير إلى Excel');
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    toast.error('حدث خطأ أثناء التصدير');
  } finally {
    setIsExporting(false);
  }
};

// Profit-Loss export functions
const handleExportProfitLoss = async (type: 'pdf' | 'excel' | 'print') => {
  setIsExporting(true);
  try {
    if (type === 'print') {
      await printReportsUtils.printReportWithPreview(
        'profit-loss',
        profitLoss,
        settings,
        dateRange,
        'a4',
        'تقرير الأرباح والخسائر',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم فتح معاينة الطباعة');
    } else if (type === 'pdf') {
      await printReportsUtils.saveReportAsPDF(
        'profit-loss',
        profitLoss,
        settings,
        dateRange,
        'تقرير الأرباح والخسائر',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم حفظ التقرير كـ PDF');
    } else if (type === 'excel') {
      printReportsUtils.exportReportToExcel(
        'profit-loss',
        profitLoss,
        dateRange,
        'تقرير الأرباح والخسائر'
      );
      toast.success('تم تصدير التقرير إلى Excel');
    }
  } catch (error) {
    console.error('Error exporting profit-loss report:', error);
    toast.error('حدث خطأ أثناء التصدير');
  } finally {
    setIsExporting(false);
  }
};
```

### 2. Updated DashboardTab Component

The DashboardTab now includes export controls:

```typescript
// Export Controls Component
const ExportControls = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Download className="h-5 w-5" />
        تصدير التقارير
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleExportPDF}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          تصدير PDF
        </Button>
        
        <Button
          variant="outline"
          onClick={handleExportExcel}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          تصدير Excel
        </Button>
        
        <Button
          variant="outline"
          onClick={handleExportPrint}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          طباعة
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

### 3. Updated ProfitLossTab Component

The ProfitLossTab includes enhanced export buttons:

```typescript
<div className="flex items-center gap-3">
  <Button
    variant="outline"
    onClick={handleExportPDF}
    className="gap-2"
  >
    <Download className="h-4 w-4" />
    تصدير PDF
  </Button>
  
  <Button
    variant="outline"
    onClick={handleExportExcel}
    className="gap-2"
  >
    <Download className="h-4 w-4" />
    تصدير Excel
  </Button>
  
  <Button
    variant="outline"
    onClick={handleExportReport}
    className="gap-2"
  >
    <Download className="h-4 w-4" />
    طباعة
  </Button>
</div>
```

## API Reference

### Functions

#### `printReportWithPreview()`
Opens a new window with print preview and PDF save options.

```typescript
printReportWithPreview(
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm',
  title?: string,
  subtitle?: string
): Promise<void>
```

#### `saveReportAsPDF()`
Directly saves the report as a PDF file.

```typescript
saveReportAsPDF(
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  title?: string,
  subtitle?: string
): Promise<void>
```

#### `exportReportToExcel()`
Exports the report data to CSV format.

```typescript
exportReportToExcel(
  reportType: string,
  reportData: any,
  dateRange: { start: string; end: string },
  title?: string
): void
```

#### `quickPrintReport()`
Prints directly without preview.

```typescript
quickPrintReport(
  reportType: string,
  reportData: any,
  settings: any,
  dateRange: { start: string; end: string },
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm',
  title?: string,
  subtitle?: string
): Promise<void>
```

### Parameters

#### `reportType`
- `'dashboard'`: Dashboard overview report
- `'profit-loss'`: Profit and loss analysis
- `'sales'`: Sales performance report
- `'inventory'`: Inventory analysis
- `'customers'`: Customer analysis
- `'custom'`: Custom report format

#### `reportData`
The actual report data object containing:
- Sales information
- Financial metrics
- Performance indicators
- Best selling products
- Any other relevant data

#### `settings`
Company settings object containing:
- Company name and logo
- Address and contact information
- Currency settings
- Font preferences
- Footer text

#### `dateRange`
Object with start and end dates:
```typescript
{
  start: '2024-01-01',
  end: '2024-01-31'
}
```

#### `printerType`
- `'a4'`: Standard A4 paper (default)
- `'thermal'` or `'thermal-80mm'`: 80mm thermal printer
- `'thermal-58mm'`: 58mm thermal printer

## Report Content Generation

### Dashboard Report Content
- Company header with logo and information
- Sales summary with totals and trends
- Financial performance metrics
- Best selling products table
- Performance indicators
- Professional footer

### Profit-Loss Report Content
- Revenue and expense breakdown
- Net profit calculations
- Profit margin analysis
- Financial ratios
- Period comparison

### Custom Report Content
- Flexible JSON data display
- Customizable layout
- Professional formatting

## Styling & Layout

### Professional Design
- **Company Branding**: Logo, name, and contact information
- **Arabic RTL Support**: Proper right-to-left text direction
- **Responsive Layout**: Adapts to different printer types
- **Professional Typography**: Cairo font family
- **Color Coding**: Green for profits, red for losses, blue for neutral

### Print Optimization
- **Page Breaks**: Automatic page break handling
- **Margins**: Optimized for different paper sizes
- **Font Sizing**: Adjusts based on printer type
- **Image Handling**: Logo display with fallbacks

## Error Handling

The utilities include comprehensive error handling:

```typescript
try {
  await printReportsUtils.printReportWithPreview(
    'dashboard',
    reportData,
    settings,
    dateRange
  );
  toast.success('تم فتح معاينة الطباعة');
} catch (error) {
  console.error('Error printing report:', error);
  toast.error('حدث خطأ أثناء الطباعة');
}
```

## Best Practices

### 1. **Data Validation**
Always validate report data before printing:

```typescript
const reportSummary = getReportSummary();
if (!reportSummary) {
  toast.error('لا توجد بيانات متاحة للطباعة');
  return;
}
```

### 2. **Loading States**
Show loading indicators during export operations:

```typescript
const [isExporting, setIsExporting] = useState(false);

const handleExport = async (type: 'pdf' | 'excel' | 'print') => {
  setIsExporting(true);
  try {
    // Export logic
  } finally {
    setIsExporting(false);
  }
};
```

### 3. **User Feedback**
Provide clear feedback for all operations:

```typescript
toast.success('تم حفظ التقرير كـ PDF');
toast.error('حدث خطأ أثناء التصدير');
```

### 4. **Settings Integration**
Ensure company settings are properly loaded:

```typescript
const settings = useSelector((state: RootState) => state.settings.data);
if (!settings) {
  toast.error('يرجى تحميل إعدادات الشركة');
  return;
}
```

## Troubleshooting

### Common Issues

1. **PDF Not Saving**
   - Check if html2pdf library is loaded
   - Verify browser permissions for file downloads
   - Ensure sufficient memory for large reports

2. **Print Preview Not Opening**
   - Check browser popup blockers
   - Verify window.open permissions
   - Ensure report data is valid

3. **Styling Issues**
   - Verify CSS is properly loaded
   - Check font availability (Cairo)
   - Ensure RTL direction is set correctly

4. **Data Not Displaying**
   - Validate report data structure
   - Check for null/undefined values
   - Verify date formatting

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
console.log('Report Data:', reportData);
console.log('Settings:', settings);
console.log('Date Range:', dateRange);
```

## Future Enhancements

### Planned Features
1. **Batch Export**: Export multiple reports at once
2. **Scheduled Reports**: Automatic report generation
3. **Email Integration**: Send reports via email
4. **Cloud Storage**: Save reports to cloud services
5. **Advanced Templates**: Customizable report templates
6. **Multi-language Support**: Additional language support
7. **Interactive Charts**: Clickable charts in PDFs
8. **Digital Signatures**: Add digital signatures to reports

### Performance Optimizations
1. **Lazy Loading**: Load report data on demand
2. **Caching**: Cache generated reports
3. **Compression**: Optimize PDF file sizes
4. **Background Processing**: Process large reports in background

## Conclusion

The reports print utilities provide a comprehensive solution for exporting and printing reports in the التقارير والتحليلات page. With support for multiple formats, professional layouts, and robust error handling, it offers a complete printing solution that follows the same high-quality standards as the bills print utilities.

The integration is seamless and provides users with multiple export options while maintaining professional appearance and functionality across all supported formats.
