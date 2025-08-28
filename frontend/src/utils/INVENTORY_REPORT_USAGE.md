# Inventory Report Utilities Usage Guide

## Overview

The `printInventoryUtils` provides comprehensive printing and export functionality for inventory reports (تقرير المخزون الشامل). It follows the same pattern as the bills and reports print utilities and supports multiple formats including print preview, PDF export, and Excel export.

## Features

### ✅ **Supported Report Types**
- **Comprehensive Reports**: Complete inventory overview with all metrics
- **Stock Levels Reports**: Focus on inventory levels and status
- **Movements Reports**: Inventory movement analysis
- **Low Stock Reports**: Products with low inventory levels
- **Expiry Reports**: Products nearing expiration
- **Custom Reports**: Flexible format for any custom data structure

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
import printInventoryUtils from '@/utils/printInventoryUtils';
import { getInventoryReport } from '@/features/inventory/inventoryService';
```

### 2. Basic Usage

```typescript
// Load inventory report data
const inventoryData = await getInventoryReport(
  '2024-01-01',
  '2024-01-31',
  'comprehensive'
);

// Print with preview
await printInventoryUtils.printInventoryWithPreview(
  'comprehensive',
  inventoryData,
  settings,
  dateRange,
  'a4',
  'تقرير المخزون الشامل',
  'الفترة من 01/01/2024 إلى 31/01/2024'
);

// Save as PDF
await printInventoryUtils.saveInventoryAsPDF(
  'comprehensive',
  inventoryData,
  settings,
  dateRange,
  'تقرير المخزون الشامل'
);

// Export to Excel
printInventoryUtils.exportInventoryToExcel(
  'comprehensive',
  inventoryData,
  dateRange,
  'تقرير المخزون الشامل'
);
```

## Integration in Reports Page

### 1. Updated Reports.tsx

Add the inventory report tab to the main reports page:

```typescript
import { InventoryReportTab } from "@/features/reports/components/InventoryReportTab";

// In the Tabs component
<TabsContent value="inventory" className="p-6" dir="rtl">
  <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-4 mb-6 border border-blue-300">
    <div className="flex items-center gap-3">
      <div className="p-3 bg-blue-600 rounded-lg shadow-sm">
        <Warehouse className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-blue-900">تقرير المخزون الشامل</h2>
        <p className="text-blue-800 font-medium">تحليل شامل لحالة المخزون والمنتجات</p>
      </div>
    </div>
  </div>
  <InventoryReportTab
    dateRange={dateRange}
    handleDateRangeChange={handleDateRangeChange}
  />
</TabsContent>
```

### 2. InventoryReportTab Component

The InventoryReportTab includes comprehensive functionality:

```typescript
// Export functions
const handleExportInventory = async (type: 'pdf' | 'excel' | 'print') => {
  if (!inventoryData) {
    toast.error('لا توجد بيانات متاحة للتصدير');
    return;
  }

  setIsExporting(true);
  try {
    if (type === 'print') {
      await printInventoryUtils.printInventoryWithPreview(
        reportType,
        inventoryData,
        settings,
        dateRange,
        'a4',
        'تقرير المخزون الشامل',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم فتح معاينة الطباعة');
    } else if (type === 'pdf') {
      await printInventoryUtils.saveInventoryAsPDF(
        reportType,
        inventoryData,
        settings,
        dateRange,
        'تقرير المخزون الشامل',
        `الفترة من ${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: ar })} إلى ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: ar })}`
      );
      toast.success('تم حفظ التقرير كـ PDF');
    } else if (type === 'excel') {
      printInventoryUtils.exportInventoryToExcel(
        reportType,
        inventoryData,
        dateRange,
        'تقرير المخزون الشامل'
      );
      toast.success('تم تصدير التقرير إلى Excel');
    }
  } catch (error) {
    console.error('Error exporting inventory report:', error);
    toast.error('حدث خطأ أثناء التصدير');
  } finally {
    setIsExporting(false);
  }
};
```

## API Reference

### Functions

#### `printInventoryWithPreview()`
Opens a new window with print preview and PDF save options.

```typescript
printInventoryWithPreview(
  reportType: string,
  reportData: InventoryReportData,
  settings: any,
  dateRange: { start: string; end: string },
  printerType?: 'thermal' | 'a4' | 'thermal-80mm' | 'thermal-58mm',
  title?: string,
  subtitle?: string
): Promise<void>
```

#### `saveInventoryAsPDF()`
Directly saves the inventory report as a PDF file.

```typescript
saveInventoryAsPDF(
  reportType: string,
  reportData: InventoryReportData,
  settings: any,
  dateRange: { start: string; end: string },
  title?: string,
  subtitle?: string
): Promise<void>
```

#### `exportInventoryToExcel()`
Exports the inventory report data to CSV format.

```typescript
exportInventoryToExcel(
  reportType: string,
  reportData: InventoryReportData,
  dateRange: { start: string; end: string },
  title?: string
): void
```

### Parameters

#### `reportType`
- `'comprehensive'`: Complete inventory overview
- `'stock-levels'`: Focus on inventory levels
- `'movements'`: Inventory movement analysis
- `'low-stock'`: Low inventory products
- `'expiry'`: Expiring products
- `'custom'`: Custom report format

#### `reportData`
The inventory report data object containing:
- Summary statistics
- Current inventory list
- Movement history
- Period information

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

## Report Content Generation

### Comprehensive Inventory Report Content
- Company header with logo and information
- Inventory summary with totals and trends
- Stock levels overview
- Product details table
- Movement summary
- Professional footer

### Stock Levels Report Content
- Stock level categories (normal, low, out of stock)
- Low stock products table
- Color-coded status indicators
- Action recommendations

### Custom Report Content
- Flexible data display
- Customizable layout
- Professional formatting

## Styling & Layout

### Professional Design
- **Company Branding**: Logo, name, and contact information
- **Arabic RTL Support**: Proper right-to-left text direction
- **Responsive Layout**: Adapts to different printer types
- **Professional Typography**: Cairo font family
- **Color Coding**: Green for normal, amber for low, red for out of stock

### Print Optimization
- **Page Breaks**: Automatic page break handling
- **Margins**: Optimized for different paper sizes
- **Font Sizing**: Adjusts based on printer type
- **Image Handling**: Logo display with fallbacks

## Error Handling

The utilities include comprehensive error handling:

```typescript
try {
  await printInventoryUtils.printInventoryWithPreview(
    'comprehensive',
    inventoryData,
    settings,
    dateRange
  );
  toast.success('تم فتح معاينة الطباعة');
} catch (error) {
  console.error('Error printing inventory report:', error);
  toast.error('حدث خطأ أثناء الطباعة');
}
```

## Best Practices

### 1. **Data Validation**
Always validate inventory data before printing:

```typescript
const inventoryData = await getInventoryReport(startDate, endDate, reportType);
if (!inventoryData) {
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
   - Ensure inventory data is valid

3. **Styling Issues**
   - Verify CSS is properly loaded
   - Check font availability (Cairo)
   - Ensure RTL direction is set correctly

4. **Data Not Displaying**
   - Validate inventory data structure
   - Check for null/undefined values
   - Verify date formatting

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
console.log('Inventory Data:', inventoryData);
console.log('Settings:', settings);
console.log('Date Range:', dateRange);
```

## Future Enhancements

### Planned Features
1. **Batch Export**: Export multiple inventory reports at once
2. **Scheduled Reports**: Automatic inventory report generation
3. **Email Integration**: Send inventory reports via email
4. **Cloud Storage**: Save reports to cloud services
5. **Advanced Templates**: Customizable inventory report templates
6. **Multi-language Support**: Additional language support
7. **Interactive Charts**: Clickable charts in PDFs
8. **Digital Signatures**: Add digital signatures to reports

### Performance Optimizations
1. **Lazy Loading**: Load inventory data on demand
2. **Caching**: Cache generated reports
3. **Compression**: Optimize PDF file sizes
4. **Background Processing**: Process large reports in background

## Conclusion

The inventory report utilities provide a comprehensive solution for exporting and printing inventory reports. With support for multiple formats, professional layouts, and robust error handling, it offers a complete printing solution that follows the same high-quality standards as the bills and reports print utilities.

The integration is seamless and provides users with multiple export options while maintaining professional appearance and functionality across all supported formats. The inventory reports are particularly useful for:

- **Inventory Management**: Track stock levels and movements
- **Financial Analysis**: Monitor inventory value and costs
- **Operational Planning**: Identify low stock items and trends
- **Compliance**: Generate reports for regulatory requirements
- **Decision Making**: Provide data-driven insights for business decisions

The system is designed to be scalable and can easily accommodate new report types and export formats as business needs evolve.
