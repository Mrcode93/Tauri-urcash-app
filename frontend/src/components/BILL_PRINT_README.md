# Enhanced Bill Print Functionality

This document describes the enhanced bill printing functionality that has been added to the URCash application.

## Features

### 1. Enhanced BillReceipt Component
- **Print Preview**: View the bill before printing
- **Multiple Print Options**: Choose between thermal (80mm) and A4 printing
- **Multiple Copies**: Print 1-5 copies at once
- **Print Settings**: Configurable printer type and copy count
- **Error Handling**: Better error handling with user feedback
- **Loading States**: Visual feedback during printing

### 2. Print Utility Functions (`utils/printUtils.ts`)
- **`printBill()`**: Main print function with full options
- **`quickPrintBill()`**: Quick print without preview
- **`printBillWithPreview()`**: Print with preview window
- **Multiple copies support**
- **Professional bill formatting**

### 3. Print Hook (`hooks/usePrintBill.ts`)
- **Easy integration**: Simple hook for any component
- **Automatic settings**: Uses Redux store settings
- **Toast notifications**: Built-in success/error messages
- **Loading state**: Track printing status

## Usage Examples

### Using the Print Hook

```tsx
import { usePrintBill } from '@/hooks/usePrintBill';

const MyComponent = () => {
  const { quickPrint, printWithPreview, printMultipleCopies, isPrinting } = usePrintBill({
    showToast: true,
    defaultPrinterType: 'a4'
  });

  const handleQuickPrint = async (sale) => {
    const result = await quickPrint(sale, customer);
    if (result.success) {
      
    }
  };

  const handlePrintWithPreview = async (sale) => {
    await printWithPreview(sale, customer);
  };

  const handlePrintMultipleCopies = async (sale) => {
    await printMultipleCopies(sale, 3, customer);
  };

  return (
    <Button disabled={isPrinting} onClick={() => handleQuickPrint(sale)}>
      {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
    </Button>
  );
};
```

### Using Print Utility Functions Directly

```tsx
import { printBill, quickPrintBill } from '@/utils/printUtils';

const handlePrint = async (sale, settings, customer) => {
  const result = await printBill({
    sale,
    customer,
    settings,
    printerType: 'thermal',
    copies: 2,
    showPreview: true
  });

  if (result.success) {
    
  } else {
    console.error(result.error);
  }
};
```

### Enhanced BillReceipt Component

The `BillReceipt` component now includes:

1. **Print Settings Panel**:
   - Printer type selection (Thermal/A4)
   - Copy count selection (1-5)
   - Print preview button

2. **Print Options Dropdown**:
   - Quick print
   - Print with preview
   - Multiple copies options

3. **Print Preview Modal**:
   - Full preview of the bill
   - Print directly from preview
   - Close preview option

## Print Settings

### Printer Types
- **Thermal (80mm)**: For thermal receipt printers
- **A4**: For standard A4 printers

### Copy Options
- Single copy (default)
- Multiple copies (2-5)
- Automatic page breaks between copies

### Bill Templates
- **Modern**: Clean, professional design
- **Classic**: Traditional layout
- **Minimal**: Simple, minimal design

## Configuration

### Settings Integration
The print functionality automatically uses settings from the Redux store:
- Company information
- Logo
- Font settings
- Margins
- Colors
- Footer text

### Customization
You can customize the print behavior by passing options to the print functions:

```tsx
const printOptions = {
  sale: saleData,
  customer: customerData,
  settings: appSettings,
  printerType: 'thermal', // or 'a4'
  copies: 2,
  showPreview: true,
  products: productList,
  cartItems: cartItems
};
```

## Error Handling

The print functionality includes comprehensive error handling:

1. **Network Errors**: Connection issues
2. **Printer Errors**: Hardware problems
3. **Data Errors**: Invalid sale data
4. **Settings Errors**: Missing configuration

All errors are displayed to the user via toast notifications and returned in the result object.

## Browser Compatibility

The print functionality works with:
- Chrome/Chromium browsers
- Firefox
- Safari
- Edge

## Performance Considerations

- Print preview uses a separate window to avoid layout issues
- Multiple copies are printed with delays to prevent printer buffer overflow
- Large bills are optimized for printing performance

## Future Enhancements

Planned improvements:
1. PDF export functionality
2. Email integration
3. Cloud printing support
4. Advanced printer settings
5. Print history tracking
6. Batch printing for multiple sales

## Troubleshooting

### Common Issues

1. **Print not working**: Check browser print settings and permissions
2. **Wrong paper size**: Verify printer type setting (thermal vs A4)
3. **Missing fonts**: Ensure Arabic fonts are installed
4. **Layout issues**: Check RTL/LTR direction settings

### Debug Mode

Enable debug logging by setting:
```tsx
const { printBill } = usePrintBill({ showToast: true });
```

This will show detailed error messages in the console and toast notifications. 