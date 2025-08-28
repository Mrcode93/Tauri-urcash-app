import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Sparkles, Check, X } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';
import { toast } from '@/lib/toast';

interface PremiumPopupProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
}

const PremiumPopup: React.FC<PremiumPopupProps> = ({ 
  isOpen, 
  onClose, 
  featureName, 
  featureDescription 
}) => {
  const { activateWithCode, isLoading } = useLicense();
  const [activationCode, setActivationCode] = useState('');
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      toast.error('يرجى إدخال رمز التفعيل');
      return;
    }

    setIsActivating(true);
    try {
      const success = await activateWithCode(activationCode.trim());
      if (success) {
        setActivationCode('');
        setShowActivationForm(false);
        onClose();
      }
    } catch (error) {
      console.error('Activation error:', error);
    } finally {
      setIsActivating(false);
    }
  };

  const premiumFeatures = [
    'الوصول إلى جميع التقارير المتقدمة',
    'إدارة الأقساط والديون',
    'قاعدة بيانات العملاء الكاملة',
    'التحليلات والإحصائيات المتقدمة',
    'النسخ الاحتياطي التلقائي',
    'الدعم الفني المتخصص'
  ];

  return (
   <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden" dir="rtl">
    <DialogHeader className="text-center space-y-2">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500">
        <Crown className="h-5 w-5 text-white" />
      </div>
      <DialogTitle className="text-lg font-bold">
        ترقية إلى النسخة المميزة
      </DialogTitle>
      <DialogDescription className="text-sm">
        للوصول إلى ميزة "{featureName}" تحتاج إلى ترخيص مميز
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-3 px-1 py-1">
      {!showActivationForm ? (
        <>
          {/* Feature Description */}
          {featureDescription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
              <p className="text-blue-800">{featureDescription}</p>
            </div>
          )}

          {/* Premium Features List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              مميزات النسخة المميزة:
            </h4>
            <div className="space-y-1.5">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-1.5 pt-2">
            <Button
              onClick={() => setShowActivationForm(true)}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white h-8 text-xs"
            >
              <Crown className="w-3 h-3 mr-1.5" />
              تفعيل بالرمز
            </Button>
          
          </div>
        </>
      ) : (
        <>
          {/* Activation Form */}
          <div className="space-y-3">
            <div className="text-center space-y-1">
              <h4 className="font-medium text-gray-900 text-sm">تفعيل الاشتراك المميز</h4>
              <p className="text-xs text-gray-600">
                أدخل رمز التفعيل الذي حصلت عليه
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="activation-code" className="text-xs">رمز التفعيل</Label>
              <Input
                id="activation-code"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="text-center font-mono h-8 text-xs"
                dir="ltr"
              />
            </div>

            <div className="flex gap-1.5">
              <Button
                onClick={handleActivate}
                disabled={isActivating || isLoading || !activationCode.trim()}
                className="flex-1 h-8 text-xs"
              >
                {isActivating ? 'جاري التفعيل...' : 'تفعيل'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowActivationForm(false);
                  setActivationCode('');
                }}
                disabled={isActivating}
                className="h-8 w-8 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Close Button */}
      <div className="pt-1 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full text-gray-600 h-8 text-xs"
          disabled={isActivating}
        >
          إغلاق
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
  );
};

export default PremiumPopup;
