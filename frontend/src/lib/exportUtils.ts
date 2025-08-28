// Dynamic import for xlsx to avoid build-time resolution issues

export interface ExportData {
  title: string;
  description?: string;
  dateRange?: { start: string; end: string };
  sections: ExportSection[];
}

export interface ExportSection {
  title: string;
  type: 'summary' | 'table' | 'chart';
  data: any;
}

// Function to create printable HTML with proper Arabic support
const createPrintableHTML = (data: ExportData, logoUrl?: string): string => {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar-IQ">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans Arabic', 'Arial', 'Tahoma', sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.6;
          color: #000;
          background: white;
          padding: 8mm;
          font-size: 10pt;
          margin: 0;
          width: 100%;
          max-width: none;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 5mm;
            font-size: 8pt;
            width: 100%;
            max-width: none;
          }
          .no-print {
            display: none;
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding: 10px 0;
          border-bottom: 2px solid #000;
          width: 100%;
        }
        
        .logo {
          max-width: 100px;
          max-height: 50px;
          margin-bottom: 10px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .title {
          font-size: 20pt;
          font-weight: 700;
          margin-bottom: 8px;
          color: #000;
        }
        
        .description {
          font-size: 12pt;
          color: #000;
          margin-bottom: 8px;
        }
        
        .date-info {
          font-size: 10pt;
          color: #000;
          margin-top: 8px;
        }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
          width: 100%;
        }
        
        .section-title {
          font-size: 16pt;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #000;
          color: #000;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          background: white;
          border: 1px solid #000;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: right;
          vertical-align: middle;
          font-size: 8pt;
        }
        
        th {
          background: #f0f0f0;
          color: #000;
          font-weight: 600;
          font-size: 9pt;
        }
        
        td {
          font-size: 8pt;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 12px;
          margin-bottom: 4px;
          background: #f9f9f9;
          border: 1px solid #000;
        }
        
        .summary-label {
          font-weight: 600;
          color: #000;
          flex: 1;
        }
        
        .summary-value {
          font-weight: 600;
          color: #000;
          text-align: left;
          direction: ltr;
        }
        
        .currency {
          color: #000;
          font-weight: 600;
        }
        
        .percentage {
          color: #000;
          font-weight: 600;
        }
        
        .text-center {
          text-align: center;
        }
        
        .print-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          background: #000;
          color: white;
          border: 1px solid #000;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          z-index: 1000;
        }
        
        .print-btn:hover {
          background: #333;
        }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">طباعة</button>
      
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="logo" onerror="this.style.display='none'">` : ''}
        <div class="title">${data.title.replace(/تقرير\s+تقرير/g, 'تقرير')}</div>
        <div class="description">${data.description || ''}</div>
        <div class="date-info">
          ${data.dateRange ? `الفترة: من ${convertArabicNumbersToEnglish(data.dateRange.start)} إلى ${convertArabicNumbersToEnglish(data.dateRange.end)}` : ''}
          <br>
          تاريخ الطباعة: ${convertArabicNumbersToEnglish(new Date().toLocaleDateString('ar-IQ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }))}
        </div>
      </div>
      
      ${data.sections.map((section, index) => `
        <div class="section ${index > 2 ? 'page-break' : ''} avoid-break">
          <div class="section-title">${section.title}</div>
          
          ${section.type === 'table' && section.data ? `
            <table>
              <thead>
                <tr>
                  ${Object.keys(section.data[0] || {}).map(key => `<th>${key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${section.data.map(row => `
                  <tr>
                    ${Object.values(row).map(value => {
                      const strValue = convertArabicNumbersToEnglish(String(value));
                      let className = '';
                      if (strValue.includes('IQD') || strValue.includes('ريال')) {
                        className = 'currency';
                      } else if (strValue.includes('%')) {
                        className = 'percentage';
                      }
                      return `<td class="${className}">${strValue}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : section.type === 'summary' && section.data ? `
            <div>
              ${Object.entries(section.data).map(([key, value]) => {
                const strValue = convertArabicNumbersToEnglish(String(value));
                let valueClass = 'summary-value';
                if (strValue.includes('IQD') || strValue.includes('ريال')) {
                  valueClass += ' currency';
                } else if (strValue.includes('%')) {
                  valueClass += ' percentage';
                }
                return `
                  <div class="summary-item">
                    <span class="summary-label">${key}</span>
                    <span class="${valueClass}">${strValue}</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
      
      <script>
        // Auto-print after page loads
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;
};

export const exportToPDF = async (data: ExportData, filename: string = 'report.pdf', logoUrl?: string) => {
  console.log('exportToPDF called with:', { data, filename, logoUrl });
  
  try {
    // Use window.print() with a styled HTML page for better Arabic support
    const printContent = createPrintableHTML(data, logoUrl);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
    
    return;
  } catch (error) {
    console.error('Print failed:', error);
    throw new Error('Failed to generate PDF. Please try again or use the Excel export option.');
  }
};

// Helper function to convert Arabic numbers to English numbers and format with separator
const convertArabicNumbersToEnglish = (text: string, separator: string = '.'): string => {
  const arabicToEnglishNumbers: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };

  let result = text;
  
  // Convert Arabic numbers to English
  Object.entries(arabicToEnglishNumbers).forEach(([arabic, english]) => {
    result = result.replace(new RegExp(arabic, 'g'), english);
  });

  // Format numbers with separator - more aggressive approach
  // Handle 6-digit numbers (e.g., 122400 -> 122.400)
  result = result.replace(/(\d{1,3})(\d{3})(\d{3})/g, `$1${separator}$2${separator}$3`);
  
  // Handle 5-digit numbers (e.g., 12345 -> 12.345)
  result = result.replace(/(\d{1,2})(\d{3})(\d{3})/g, `$1${separator}$2${separator}$3`);
  
  // Handle 4-digit numbers (e.g., 1234 -> 1.234)
  result = result.replace(/(\d{1})(\d{3})/g, `$1${separator}$2`);
  
  // Handle currency amounts with IQD
  result = result.replace(/(\d{1,3})(\d{3})(\d{3})(?=\s*IQD)/g, `$1${separator}$2${separator}$3`);
  result = result.replace(/(\d{1,2})(\d{3})(\d{3})(?=\s*IQD)/g, `$1${separator}$2${separator}$3`);
  result = result.replace(/(\d{1})(\d{3})(?=\s*IQD)/g, `$1${separator}$2`);

  return result;
};

// Helper function to convert Arabic text to English equivalents (kept for Excel export)
const convertArabicToEnglish = (text: string): string => {
  const translations: { [key: string]: string } = {
    // Inventory translations
    'ملخص المخزون': 'Inventory Summary',
    'تنبيهات انتهاء الصلاحية': 'Expiry Alerts',
    'تنبيهات المخزون المنخفض': 'Low Stock Alerts',
    'المنتجات الأكثر مبيعاً': 'Top Selling Products',
    'تحليل المخزون حسب المستوى': 'Inventory Level Analysis',
    'تحليل قيمة المخزون': 'Inventory Value Analysis',
    'ملخص حركة المخزون': 'Stock Movement Summary',
    'الأنشطة الأخيرة': 'Recent Activities',
    'اسم المنتج': 'Product Name',
    'الكمية': 'Quantity',
    'تاريخ الانتهاء': 'Expiry Date',
    'الأيام المتبقية': 'Days Remaining',
    'القيمة': 'Value',
    'الكمية الحالية': 'Current Quantity',
    'الحد الأدنى': 'Minimum Level',
    'التصنيف': 'Category',
    'الحالة': 'Status',
    'المخزون الحالي': 'Current Stock',
    'الكمية المباعة': 'Sold Quantity',
    'قيمة المبيعات': 'Sales Value',
    'الربح': 'Profit',
    'عدد المبيعات': 'Sales Count',
    'مستوى المخزون': 'Stock Level',
    'سعر الشراء': 'Purchase Price',
    'سعر البيع': 'Selling Price',
    'قيمة المخزون': 'Stock Value',
    'عدد المنتجات': 'Products Count',
    'إجمالي الكمية': 'Total Quantity',
    'قيمة الشراء': 'Purchase Value',
    'قيمة البيع': 'Selling Value',
    'الربح المحتمل': 'Potential Profit',
    'نوع الحركة': 'Movement Type',
    'عدد الحركات': 'Movement Count',
    'التاريخ': 'Date',
    'المرجع': 'Reference',
    'إجمالي المنتجات': 'Total Products',
    'إجمالي القيمة': 'Total Value',
    'نفذ المخزون': 'Out of Stock',
    'مخزون منخفض': 'Low Stock',
    'مخزون جيد': 'Good Stock',
    'متوسط المخزون': 'Average Stock',
    
    // Delegate report translations
    'تقرير المندوبين': 'Delegates Report',
    'ملخص المندوبين': 'Delegates Summary',
    'تفاصيل البيانات': 'Data Details',
    'اسم المندوب': 'Delegate Name',
    'الهاتف': 'Phone',
    'البريد الإلكتروني': 'Email',
    'إجمالي الإيرادات': 'Total Revenue',
    'متوسط قيمة البيع': 'Average Sale Value',
    'العملاء الفريدون': 'Unique Customers',
    'آخر عملية بيع': 'Last Sale Date',
    'عدد المنتجات المباعة': 'Products Sold Count',
    'المنتجات المباعة بواسطة': 'Products Sold By',
    'الباركود': 'Barcode',
    'متوسط السعر': 'Average Price',
    
    // Sales Analysis translations
    'تقرير تحليل المبيعات المتقدم': 'Advanced Sales Analysis Report',
    'ملخص الأداء': 'Performance Summary',
    'أفضل المنتجات مبيعاً': 'Top Selling Products',
    'أفضل العملاء': 'Top Customers',
    'المبيعات حسب الفئة': 'Sales by Category',
    'تحليل طرق الدفع': 'Payment Methods Analysis',
    'حالة الدفع': 'Payment Status',
    'مؤشرات الأداء': 'Performance Metrics',
    'متوسط قيمة الطلب': 'Average Order Value',
    'العملاء الجدد': 'New Customers',
    'العملاء المتكررون': 'Repeat Customers',
    'معدل التحويل': 'Conversion Rate',
    'إجمالي الربح': 'Total Profit',
    'هامش الربح': 'Profit Margin',
    'رمز المنتج': 'Product SKU',
    'الإيرادات': 'Revenue',
    'اسم العميل': 'Customer Name',
    'رقم الهاتف': 'Phone Number',
    'إجمالي الإنفاق': 'Total Spent',
    'متوسط الطلب': 'Average Order',
    'آخر طلب': 'Last Order',
    'الفئة': 'Category',
    'طريقة الدفع': 'Payment Method',
    'عدد المعاملات': 'Transactions Count',
    'المبلغ': 'Amount',
    'النسبة المئوية': 'Percentage',
    'نمو المبيعات': 'Sales Growth',
    'نمو العملاء': 'Customer Growth',
    'نمو متوسط الطلب': 'Average Order Growth',
    'نمو الأرباح': 'Profit Growth'
  };
  
  // If the text is in translations, return the English version
  if (translations[text]) {
    return translations[text];
  }
  
  // If it's a currency value (contains IQD), extract and format the number properly
  if (text.includes('IQD') || text.includes('ريال')) {
    // Extract the numeric part and format it properly
    const numericMatch = text.match(/[\d,]+/);
    if (numericMatch) {
      const number = numericMatch[0].replace(/,/g, '');
      return `${number} IQD`;
    }
    // If it's garbled text, try to extract any numbers
    const anyNumbers = text.match(/\d+/);
    if (anyNumbers) {
      return `${anyNumbers[0]} IQD`;
    }
    return '0 IQD';
  }
  
  // If it's a number or percentage, return as is
  if (/^[\d.,%]+$/.test(text)) {
    return text;
  }
  
  // If it's a date, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  
  // For Arabic text that's not in translations, try to clean it up
  // Remove any non-ASCII characters that might cause encoding issues
  const cleanedText = text.replace(/[^\x20-\x7E]/g, '');
  
  // If the cleaned text is empty, return a placeholder
  if (!cleanedText.trim()) {
    return '[Arabic Text]';
  }
  
  return cleanedText;
};

export const exportToExcel = async (data: ExportData, filename: string = 'report.csv') => {
  console.log('exportToExcel called with:', { data, filename });
  
  try {
    // Create CSV content instead of using xlsx
    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // Add header information
    csvContent += `"تقرير","${data.title}"\n`;
    csvContent += `"الوصف","${data.description || ''}"\n`;
    csvContent += `"الفترة","${data.dateRange ? `من ${data.dateRange.start} إلى ${data.dateRange.end}` : ''}"\n`;
    csvContent += `"تاريخ الطباعة","${new Date().toLocaleDateString('ar-IQ')}"\n`;
    csvContent += '\n';
    
    // Add each section
    data.sections.forEach((section, sectionIndex) => {
      if (section.data && Array.isArray(section.data) && section.data.length > 0) {
        // Add section title
        csvContent += `"${section.title}"\n`;
        
        // Add headers
        const headers = Object.keys(section.data[0]);
        csvContent += headers.map(header => `"${header}"`).join(',') + '\n';
        
        // Add data rows
        section.data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes
            return `"${String(value || '').replace(/"/g, '""')}"`;
          });
          csvContent += values.join(',') + '\n';
        });
        
        csvContent += '\n'; // Add empty line between sections
      }
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename.replace('.xlsx', '.csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Failed to export to CSV:', error);
    throw new Error('Failed to export to CSV. Please try again.');
  }
};

// Helper function to convert report data to export format
export const convertReportDataToExportFormat = (
  reportData: any,
  sections: any[],
  reportConfig: any
): ExportData => {
  const exportSections: ExportSection[] = [];
  
  sections.forEach(section => {
    if (!section.enabled) return;
    
    switch (section.type) {
      case 'summary':
        if (reportData.summary) {
          exportSections.push({
            title: section.title,
            type: 'summary',
            data: reportData.summary
          });
        }
        break;
        
      case 'expiry_alerts':
        if (reportData.expiry_alerts && reportData.expiry_alerts.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.expiry_alerts.map((alert: any) => ({
              'اسم المنتج': alert.product_name,
              'الكمية': alert.current_stock,
              'تاريخ الانتهاء': alert.expiry_date,
              'الأيام المتبقية': alert.days_until_expiry,
              'القيمة': alert.stock_value
            }))
          });
        }
        break;
        
      case 'low_stock':
        if (reportData.low_stock_alerts && reportData.low_stock_alerts.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.low_stock_alerts.map((alert: any) => ({
              'اسم المنتج': alert.product_name,
              'الكمية الحالية': alert.current_stock,
              'الحد الأدنى': alert.min_stock_level,
              'التصنيف': alert.category_name,
              'الحالة': alert.stock_status_text,
              'القيمة الحالية': alert.current_value
            }))
          });
        }
        break;
        
      case 'top_selling':
        if (reportData.top_selling_products && reportData.top_selling_products.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.top_selling_products.map((product: any) => ({
              'اسم المنتج': product.product_name,
              'المخزون الحالي': product.current_stock,
              'الكمية المباعة': product.total_sold_quantity,
              'قيمة المبيعات': product.total_sold_value,
              'الربح': product.total_profit,
              'عدد المبيعات': product.sales_count
            }))
          });
        }
        break;
        
      case 'inventory_aging':
        if (reportData.inventory_aging && reportData.inventory_aging.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.inventory_aging.map((item: any) => ({
              'اسم المنتج': item.product_name,
              'الكمية': item.current_stock,
              'التصنيف': item.category_name,
              'مستوى المخزون': item.stock_level_text,
              'سعر الشراء': item.purchase_price,
              'سعر البيع': item.selling_price,
              'قيمة المخزون': item.stock_value
            }))
          });
        }
        break;
        
      case 'value_analysis':
        if (reportData.stock_value_analysis && reportData.stock_value_analysis.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.stock_value_analysis.map((item: any) => ({
              'التصنيف': item.category_name,
              'عدد المنتجات': item.products_count,
              'إجمالي الكمية': item.total_quantity,
              'قيمة الشراء': item.total_purchase_value,
              'قيمة البيع': item.total_selling_value,
              'الربح المحتمل': item.potential_profit
            }))
          });
        }
        break;
        
      case 'movement_summary':
        if (reportData.stock_movement_summary && reportData.stock_movement_summary.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.stock_movement_summary.map((item: any) => ({
              'نوع الحركة': item.movement_type_text,
              'عدد الحركات': item.movement_count,
              'إجمالي الكمية': item.total_quantity
            }))
          });
        }
        break;
        
      case 'recent_activities':
        if (reportData.recent_activities && reportData.recent_activities.length > 0) {
          exportSections.push({
            title: section.title,
            type: 'table',
            data: reportData.recent_activities.map((activity: any) => ({
              'التاريخ': activity.created_at,
              'المنتج': activity.product_name,
              'نوع الحركة': activity.movement_type_text,
              'الكمية': activity.quantity,
              'التصنيف': activity.category_name,
              'المرجع': activity.reference_number
            }))
          });
        }
        break;
    }
  });
  
  return {
    title: reportConfig.name,
    description: reportConfig.description,
    dateRange: reportConfig.dateRange,
    sections: exportSections
  };
};
