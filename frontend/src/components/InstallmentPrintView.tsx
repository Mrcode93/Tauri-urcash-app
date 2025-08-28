import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/lib/toast';
import { RootState } from '@/app/store';
import { Settings } from '@/features/settings/settingsSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Installment {
  id: number;
  sale_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  payment_method: 'cash' | 'card' | 'bank_transfer';
  paid_at: string | null;
  notes: string;
  invoice_no: string;
}

interface InstallmentPlan {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  total_installments: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: Installment[];
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

interface InstallmentPrintViewProps {
  plan: InstallmentPlan | null;
  open: boolean;
  onClose: () => void;
}

const InstallmentPrintView: React.FC<InstallmentPrintViewProps> = ({
  plan,
  open,
  onClose
}) => {
  const settings = useSelector((state: RootState) => state.settings.data) as Settings;
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Installment_Plan_${plan?.invoice_no || 'Receipt'}`,
    onBeforeGetContent: () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      toast.success('تم الطباعة بنجاح');
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      toast.error('حدث خطأ أثناء الطباعة');
      console.error('Print error:', error);
    }
  });

  const getLogoUrl = (logoPath: string | undefined) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('blob:')) return logoPath;
    
    // Check if running in Electron
    const isElectron = window && window.process && window.process.type;
    
    if (isElectron) {
      // In Electron, always use localhost with the correct port
      const port = process.env.NODE_ENV === 'production' ? 39000 : 8000;
      return `http://localhost:${port}${logoPath}`;
    }
    
    return `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${logoPath}`;
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'unpaid': return 'غير مدفوع';
      case 'partial': return 'مدفوع جزئياً';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'unpaid': return 'text-red-600 bg-red-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة ائتمان';
      case 'bank_transfer': return 'تحويل بنكي';
      default: return method;
    }
  };

  // Helper function to safely format currency
  const safeFormatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined || amount === '') {
      return '0 IQD';
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(numAmount)) {
      console.warn('Invalid amount value:', amount, 'type:', typeof amount);
      return '0 IQD';
    }
    
    return formatCurrency(numAmount);
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined, formatString: string) => {
    if (!dateString) return 'غير محدد';
    
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'تاريخ غير صحيح';
      }
      return format(date, formatString, { locale: ar });
    } catch (error) {
      console.error('Date formatting error:', error, 'Date string:', dateString);
      return 'تاريخ غير صحيح';
    }
  };

  // Calculate totals from installments if plan totals are missing
  const calculatedTotals = React.useMemo(() => {
    if (!plan?.installments) return { totalAmount: 0, paidAmount: 0, remainingAmount: 0 };
    
    const totalAmount = plan.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const paidAmount = plan.installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);
    const remainingAmount = totalAmount - paidAmount;
    
    return { totalAmount, paidAmount, remainingAmount };
  }, [plan?.installments]);

  // Use calculated totals if plan totals are undefined
  const displayTotalAmount = plan?.total_amount !== undefined ? plan.total_amount : calculatedTotals.totalAmount;
  const displayPaidAmount = plan?.paid_amount !== undefined ? plan.paid_amount : calculatedTotals.paidAmount;
  const displayRemainingAmount = plan?.remaining_amount !== undefined ? plan.remaining_amount : calculatedTotals.remainingAmount;



  if (!open || !plan) return null;

  // Validate plan data
  if (!plan.invoice_no || !plan.customer_name || !plan.installments) {
    console.error('Invalid plan data:', plan);
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              خطأ في البيانات
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-red-600">بيانات خطة الأقساط غير صحيحة أو غير مكتملة</p>
            <Button onClick={onClose} className="mt-4">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Validate installments array
  if (!Array.isArray(plan.installments) || plan.installments.length === 0) {
    console.error('Invalid installments data:', plan.installments);
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              خطأ في البيانات
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-red-600">لا توجد أقساط متاحة للطباعة</p>
            <Button onClick={onClose} className="mt-4">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            طباعة خطة الأقساط - {plan.invoice_no}
          </DialogTitle>
        </DialogHeader>

        {/* Print Actions */}
        <div className="flex justify-end gap-2 mb-4 no-print">
          <Button variant="outline" onClick={() => {
            // TODO: Implement PDF download
            toast.info('تحميل PDF سيتم إضافته قريباً');
          }}>
            <Download className="w-4 h-4 mr-2" />
            تحميل PDF
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            <Printer className="w-4 h-4 mr-2" />
            {isPrinting ? 'جاري الطباعة...' : 'طباعة'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

                 {/* Print Styles */}
         <style>{`
           @media print {
             .no-print {
               display: none !important;
             }
             body {
               margin: 0;
               padding: 20px;
               font-family: Arial, sans-serif;
               direction: rtl;
             }
             .print-content {
               max-width: none !important;
               margin: 0 !important;
               padding: 0 !important;
             }
             table {
               page-break-inside: avoid;
               border-collapse: collapse;
               width: 100%;
             }
             th, td {
               border: 1px solid #000;
               padding: 8px;
               text-align: center;
             }
             th {
               background-color: #f3f4f6 !important;
               font-weight: bold;
             }
             tr {
               page-break-inside: avoid;
             }
             .installment-row {
               page-break-inside: avoid;
             }
             .bg-blue-50 {
               background-color: #eff6ff !important;
             }
             .bg-gray-50 {
               background-color: #f9fafb !important;
             }
             .text-green-600 {
               color: #059669 !important;
             }
             .text-red-600 {
               color: #dc2626 !important;
             }
             .text-orange-600 {
               color: #ea580c !important;
             }
             .text-blue-600 {
               color: #2563eb !important;
             }
           }
         `}</style>

        {/* Installment Plan Content */}
        <div ref={printRef} className="bg-white p-6 border rounded-lg print-content">
          {/* Header */}
          <div className="text-center mb-6">
            {settings?.company_logo && (
              <img 
                src={getLogoUrl(settings.company_logo)} 
                alt="Company Logo" 
                className="h-16 mx-auto mb-4"
              />
            )}
            <h1 className="text-2xl font-bold mb-2">{settings?.company_name || 'اسم الشركة'}</h1>
            <p className="text-gray-600 mb-1">{settings?.company_address || 'عنوان الشركة'}</p>
            <p className="text-gray-600 mb-1">هاتف: {settings?.company_phone || 'رقم الهاتف'}</p>
            <p className="text-gray-600">البريد الإلكتروني: {settings?.company_email || 'البريد الإلكتروني'}</p>
          </div>

          {/* Title */}
          <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
            <h2 className="text-xl font-bold text-blue-600">خطة الأقساط</h2>
            <p className="text-lg text-gray-700">رقم الفاتورة: {plan.invoice_no}</p>
            <p className="text-sm text-gray-500">تاريخ الإنشاء: {safeFormatDate(plan.created_at, 'dd MMM yyyy')}</p>
          </div>

          {/* Customer Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">معلومات العميل</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">اسم العميل:</span>
                <span className="mr-2">{plan.customer_name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">رقم الهاتف:</span>
                <span className="mr-2">{plan.customer_phone}</span>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">ملخص الخطة</h3>
            
            
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{plan.total_installments}</div>
                <div className="text-sm text-gray-600">عدد الأقساط</div>
              </div>
                             <div className="text-center">
                 <div className="text-2xl font-bold text-green-600">{safeFormatCurrency(displayTotalAmount)}</div>
                 <div className="text-sm text-gray-600">إجمالي المبلغ</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-orange-600">{safeFormatCurrency(displayPaidAmount)}</div>
                 <div className="text-sm text-gray-600">المبلغ المدفوع</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-red-600">{safeFormatCurrency(displayRemainingAmount)}</div>
                 <div className="text-sm text-gray-600">المبلغ المتبقي</div>
               </div>
            </div>
            <div className="mt-3 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getPaymentStatusColor(plan.payment_status)}`}>
                الحالة: {getPaymentStatusText(plan.payment_status)}
              </span>
            </div>
          </div>

          {/* Installments Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">تفاصيل الأقساط</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-right">رقم القسط</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">تاريخ الاستحقاق</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">المبلغ</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">المدفوع</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">المتبقي</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">الحالة</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">طريقة الدفع</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">تاريخ الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.installments && plan.installments.length > 0 ? (
                    plan.installments.map((installment, index) => (
                      <tr key={installment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {safeFormatDate(installment.due_date, 'dd MMM yyyy')}
                        </td>
                                                 <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                           {safeFormatCurrency(installment.amount)}
                         </td>
                         <td className="border border-gray-300 px-3 py-2 text-center text-green-600">
                           {safeFormatCurrency(installment.paid_amount || 0)}
                         </td>
                         <td className="border border-gray-300 px-3 py-2 text-center text-red-600">
                           {safeFormatCurrency(installment.amount - (installment.paid_amount || 0))}
                         </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPaymentStatusColor(installment.payment_status)}`}>
                            {getPaymentStatusText(installment.payment_status)}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {getPaymentMethodText(installment.payment_method)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {installment.paid_at 
                            ? safeFormatDate(installment.paid_at, 'dd MMM yyyy')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-500">
                        لا توجد أقساط متاحة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">تقدم الدفع</h3>
                         <div className="bg-gray-200 rounded-full h-4 mb-2">
               <div 
                 className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                 style={{ 
                   width: `${displayTotalAmount > 0 ? (displayPaidAmount / displayTotalAmount) * 100 : 0}%` 
                 }}
               ></div>
             </div>
             <div className="text-center text-sm text-gray-600">
               {displayTotalAmount > 0 ? Math.round((displayPaidAmount / displayTotalAmount) * 100) : 0}% مكتمل
             </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">ملاحظات:</p>
                <p className="text-gray-600 mt-1">
                  • يجب دفع كل قسط في تاريخ الاستحقاق المحدد
                  <br />
                  • يمكن دفع الأقساط مسبقاً
                  <br />
                  • في حالة التأخير في الدفع، قد يتم تطبيق رسوم إضافية
                </p>
              </div>
              <div className="text-left">
                <p className="font-medium">شروط الدفع:</p>
                <p className="text-gray-600 mt-1">
                  • الدفع نقداً أو ببطاقة الائتمان
                  <br />
                  • إيصال دفع لكل قسط
                  <br />
                  • تحديث الحالة تلقائياً
                </p>
              </div>
            </div>
          </div>

          {/* Print Date */}
          <div className="mt-6 text-center text-sm text-gray-500">
            تم الطباعة في: {safeFormatDate(new Date().toISOString(), 'dd MMM yyyy HH:mm')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallmentPrintView; 