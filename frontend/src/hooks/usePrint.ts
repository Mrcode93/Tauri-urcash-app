import { useCallback } from 'react';
import { toast } from '@/lib/toast';

interface PrintOptions {
  printBackground?: boolean;
  color?: boolean;
  margins?: {
    marginType?: 'default' | 'none' | 'printableArea' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  landscape?: boolean;
  pagesPerSheet?: number;
  collate?: boolean;
  copies?: number;
  silent?: boolean;
}

interface UsePrintOptions {
  language?: 'ar' | 'en';
}

export const usePrint = ({ language = 'en' }: UsePrintOptions = {}) => {
  const printWithDialog = useCallback(async (html: string, options: PrintOptions = {}) => {
    try {
      // Check if we're in Electron environment
      if (window.electron && window.electron.showPrintDialog) {
        const result = await window.electron.showPrintDialog(html, {
          printBackground: true,
          color: true,
          margins: {
            marginType: 'printableArea'
          },
          ...options
        });
        
        if (result.success) {
          toast.success(language === 'ar' ? 'تم فتح معاينة الطباعة' : 'Print preview opened');
          return { success: true };
        } else {
          throw new Error(result.error || 'Print failed');
        }
      } else {
        // Fallback to window.open for web browsers
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          throw new Error('Failed to open print window');
        }
        printWindow.document.write(html);
        printWindow.document.close();
        return { success: true };
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error(language === 'ar' ? 'خطأ في الطباعة' : 'Print error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [language]);

  const printDirect = useCallback(async (html: string, options: PrintOptions = {}) => {
    try {
      // Check if we're in Electron environment
      if (window.electron && window.electron.printDirect) {
        const result = await window.electron.printDirect(html, {
          printBackground: true,
          color: true,
          margins: {
            marginType: 'printableArea'
          },
          ...options
        });
        
        if (result.success) {
          toast.success(language === 'ar' ? 'تم الإرسال للطابعة' : 'Sent to printer');
          return { success: true };
        } else {
          throw new Error(result.error || 'Print failed');
        }
      } else {
        // Fallback: Use print dialog for web browsers
        return printWithDialog(html, options);
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error(language === 'ar' ? 'خطأ في الطباعة' : 'Print error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [language, printWithDialog]);

  const printToPDF = useCallback(async (html: string, options: PrintOptions = {}) => {
    try {
      // Check if we're in Electron environment
      if (window.electron && window.electron.printToPDF) {
        const result = await window.electron.printToPDF(html, {
          printBackground: true,
          color: true,
          margin: {
            marginType: 'printableArea'
          },
          ...options
        });
        
        if (result.success && result.data) {
          // Convert base64 to blob and download
          const byteCharacters = atob(result.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `print-${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success(language === 'ar' ? 'تم حفظ ملف PDF' : 'PDF saved');
          return { success: true };
        } else {
          throw new Error(result.error || 'PDF generation failed');
        }
      } else {
        // Not available in web browsers
        toast.error(language === 'ar' ? 'حفظ PDF غير متاح في المتصفح' : 'PDF save not available in browser');
        return { success: false, error: 'PDF generation not available in browser' };
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(language === 'ar' ? 'خطأ في إنشاء PDF' : 'PDF generation error');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [language]);

  const isElectronEnvironment = useCallback(() => {
    return !!(window.electron && window.electron.showPrintDialog);
  }, []);

  return {
    printWithDialog,
    printDirect,
    printToPDF,
    isElectronEnvironment
  };
};

export default usePrint;
