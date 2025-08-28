import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import PDFBill from '../components/PDFBill';

interface UsePDFBillProps {
  sale: any;
  customer?: any;
  receiptSettings: any;
}

export const usePDFBill = ({ sale, customer, receiptSettings }: UsePDFBillProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async (): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Create PDF document
      const pdfDoc = pdf(
        <PDFBill 
          sale={sale} 
          customer={customer} 
          receiptSettings={receiptSettings} 
        />
      );

      // Generate blob
      const blob = await pdfDoc.toBlob();
      
      setIsGenerating(false);
      return blob;
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      setIsGenerating(false);
      return null;
    }
  };

  const downloadPDF = async (filename?: string): Promise<void> => {
    const blob = await generatePDF();
    
    if (blob) {
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `bill-${sale.bill_number}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
    }
  };

  const openPDFInNewTab = async (): Promise<void> => {
    const blob = await generatePDF();
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  };

  const getPDFAsBase64 = async (): Promise<string | null> => {
    const blob = await generatePDF();
    
    if (blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(blob);
      });
    }
    
    return null;
  };

  return {
    generatePDF,
    downloadPDF,
    openPDFInNewTab,
    getPDFAsBase64,
    isGenerating,
    error,
  };
};
