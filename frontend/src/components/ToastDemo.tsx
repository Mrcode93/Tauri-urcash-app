import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  Shield, 
  Star,
  Palette
} from 'lucide-react';

const ToastDemo = () => {
  const handleToastTest = (type: string) => {
    const messages = {
      success: 'تم حفظ البيانات بنجاح! 🎉',
      error: 'حدث خطأ أثناء حفظ البيانات ❌',
      info: 'معلومات مهمة: تم تحديث النظام 📢',
      warning: 'تحذير: المخزون منخفض ⚠️',
      premium: 'ميزة مميزة: تم تفعيل النسخة المميزة ✨',
      feature: 'ميزة جديدة: تم إضافة دعم الباركود ⚡',
      security: 'أمان: تم تسجيل الدخول من جهاز جديد 🔒',
      star: 'إنجاز: تم إكمال المهمة بنجاح ⭐',
      custom: 'رسالة مخصصة بألوان خاصة 🎨'
    };

    const message = messages[type as keyof typeof messages] || 'رسالة تجريبية';

    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      case 'premium':
        toast.premium(message);
        break;
      case 'feature':
        toast.feature(message);
        break;
      case 'security':
        toast.security(message);
        break;
      case 'star':
        toast.star(message);
        break;
      case 'custom':
        toast.custom(message, {
          primary: '#8b5cf6',
          success: '#10b981',
          error: '#ef4444',
          info: '#3b82f6',
          warning: '#f59e0b'
        });
        break;
      default:
        toast.info(message);
    }
  };

  const toastTypes = [
    { type: 'success', label: 'نجاح', icon: CheckCircle, color: 'bg-green-500' },
    { type: 'error', label: 'خطأ', icon: XCircle, color: 'bg-red-500' },
    { type: 'info', label: 'معلومات', icon: Info, color: 'bg-blue-500' },
    { type: 'warning', label: 'تحذير', icon: AlertTriangle, color: 'bg-yellow-500' },
    { type: 'premium', label: 'مميز', icon: Sparkles, color: 'bg-purple-500' },
    { type: 'feature', label: 'ميزة', icon: Zap, color: 'bg-cyan-500' },
    { type: 'security', label: 'أمان', icon: Shield, color: 'bg-orange-500' },
    { type: 'star', label: 'نجمة', icon: Star, color: 'bg-yellow-400' },
    { type: 'custom', label: 'مخصص', icon: Palette, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-6 w-6" />
            عرض تجريبي للرسائل المنبثقة
          </CardTitle>
          <CardDescription>
            اختبر أنواع مختلفة من الرسائل المنبثقة مع التصميم الجديد
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toastTypes.map(({ type, label, icon: Icon, color }) => (
              <Button
                key={type}
                variant="outline"
                className="h-20 flex flex-col gap-2 p-4"
                onClick={() => handleToastTest(type)}
              >
                <div className={`p-2 rounded-full ${color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Button>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">ميزات التصميم الجديد:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• تدرجات لونية جميلة مع تأثيرات بصرية</li>
              <li>• أيقونات مخصصة لكل نوع من الرسائل</li>
              <li>• ظلال وتأثيرات زجاجية</li>
              <li>• انيميشن سلس ومتطور</li>
              <li>• دعم الألوان المخصصة من الإعدادات</li>
              <li>• تصميم متجاوب مع جميع الأجهزة</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToastDemo; 