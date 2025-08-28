import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Loader2, Shield, CheckCircle, AlertCircle, Smartphone, Server, Key, Wifi, Crown, Zap, Globe, Lock, Sparkles, TrendingUp, Users, Award, RefreshCw, MapPin, CheckCircle2, Copy } from 'lucide-react';
import { licenseService, type ActivationResult, type LicenseStatus as ServiceLicenseStatus } from '../services/licenseService';
import { locationService, type LocationData } from '../services/locationService';
import { API_CONFIG } from '../lib/api';
import LocationPermissionPopup from '../components/LocationPermissionPopup';
import { useLicense } from '../contexts/LicenseContext';
import '../styles/activation.css';

interface LicenseStatus {
  success: boolean;
  activated: boolean;
  message: string;
  licenseData?: any;
  needsFirstActivation?: boolean;
}

// Helper function to get icon components
const getIconComponent = (iconName: string) => {
  const icons = {
    Sparkles,
    Zap,
    Lock,
    RefreshCw,
    Users,
    Award,
    Globe,
    TrendingUp
  };
  return icons[iconName as keyof typeof icons] || Sparkles;
};

const ActivationPage: React.FC = () => {
  const navigate = useNavigate();
  const { forceRefreshLicense, clearLicenseCache } = useLicense();
  const [isActivating, setIsActivating] = useState(false);
  const [activationStatus, setActivationStatus] = useState<ServiceLicenseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInternetAlert, setShowInternetAlert] = useState(true);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [firstActivationCode, setFirstActivationCode] = useState('');
  const [activationError, setActivationError] = useState<ActivationResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [copiedError, setCopiedError] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [locationPopupError, setLocationPopupError] = useState<any>(null);

  // Color scheme from settings
  const colors = {
    primary: 'from-[#24252d] to-[#1a1b23]',
    primaryHover: 'from-[#1a1b23] to-[#1a1b23]',
    primaryText: 'text-[#24252d]',
    background: 'from-gray-50 to-gray-100',
    card: 'bg-white',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200'
  };

  const texts = {
    title: 'تفعيل التطبيق',
    subtitle: 'يجب تفعيل التطبيق قبل البدء في استخدامه',
    activateButton: 'تفعيل الآن',
    premiumButton: 'تفعيل بريميوم',
    firstActivationButton: 'التفعيل الأول',
    firstActivationCodePlaceholder: 'أدخل كود التفعيل الأول *',
    activating: 'جاري التفعيل...',
    checkStatus: 'فحص الحالة',
    activated: 'تم التفعيل بنجاح',
    activatedDesc: 'التطبيق جاهز للاستخدام',
    redirecting: 'جاري تحويلك إلى التطبيق...',
    activationCodePlaceholder: 'أدخل كود التفعيل',
    activateWithCode: 'تفعيل بالكود',
    cancel: 'إلغاء',
    internetAlert: {
      title: 'تنبيه: اتصال الإنترنت والموقع مطلوبان',
      description: 'للتفعيل، يجب أن تكون متصلاً بالإنترنت والسماح بالوصول لموقعك. تأكد من اتصالك بالشبكة والموافقة على طلب الموقع قبل المتابعة.',
      understood: 'فهمت، متابعة'
    },
    features: {
      title: 'المميزات الرئيسية',
      subtitle: 'نظام أوركاش مصمم ليدير مبيعاتك ومخزونك بكفاءة عالية',
      items: [
        {
          title: 'واجهة سهلة وبسيطة',
          description: 'تصميم عصري يدعم العربية لتجربة استخدام سلسة',
          icon: 'Sparkles'
        },
        {
          title: 'سرعة وأداء عالي',
          description: 'إتمام العمليات والفواتير بسرعة واستقرار',
          icon: 'Zap'
        },
        {
          title: 'إدارة المخزون',
          description: 'تتبع الكميات وتنبيهات عند انخفاض المخزون',
          icon: 'Package'
        },
        {
          title: 'تقارير دقيقة',
          description: 'إحصائيات يومية وشهرية لمتابعة الأرباح والمبيعات',
          icon: 'BarChart3'
        },
        {
          title: 'حماية متقدمة',
          description: 'تشفير وحفظ آمن لبيانات عملك الحساسة',
          icon: 'Lock'
        },
        {
          title: 'دعم فني دائم',
          description: 'مساندة من فريق مختص متاح عند الحاجة',
          icon: 'Users'
        }
      ]
    }
    ,
    deviceInfo: 'معلومات النظام'
  };

  const checkLocalLicenseStatus = async () => {
    try {
      const status = await licenseService.checkLocalLicense();
      setActivationStatus(status);
      
      // If license is activated, redirect immediately
      if (status?.success && !status?.needsFirstActivation) {
        navigate('/', { replace: true });
        return status;
      }
      
      return status;
    } catch (error: any) {

      setError(error.message || 'Failed to check license status');
      return null;
    }
  };

  const getLocationData = async (): Promise<LocationData | null> => {
    try {
      setLocationError(null);
      setLocationPopupError(null);
      
      // Try to get location with fallback
      const location = await locationService.getLocationWithFallback();
      
      if (location) {
        // If location has an error flag, show a warning but don't block activation
        if (location.error) {
          setLocationError(`Location obtained with reduced accuracy: ${location.error}`);
        }
      }
   
      return location;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get location';
      setLocationError(errorMessage);

      
      // Show popup for permission errors
      if (err?.code === 1 || err?.systemPermission) {
        setLocationPopupError({
          code: err.code || 1,
          message: err.message || 'Location access denied',
          suggestion: err.suggestion || 'Please enable location permissions',
          systemPermission: err.systemPermission || true
        });
        setShowLocationPopup(true);
      }
      
      // Return null to indicate location is not available
      return null;
    }
  };

  const copyErrorDetails = async () => {
    if (!activationError) return;
    
    const errorText = `
Error Details:
Message: ${activationError.message}
Error Code: ${activationError.errorCode || 'N/A'}
Details: ${typeof activationError.details === 'string' 
  ? activationError.details 
  : JSON.stringify(activationError.details, null, 2)
}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(errorText);
      setCopiedError(true);
      setTimeout(() => setCopiedError(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const handleActivation = async () => {
    setIsActivating(true);
    setError(null);
    setActivationError(null);
    
    try {
      // Get location data first
      const location = await getLocationData();
      
             // Check if we need first activation
       const status = await checkLocalLicenseStatus();
      
      // Always validate first activation code if provided
      if (firstActivationCode.trim()) {
        // Perform first activation with code
        const data = await licenseService.firstTimeActivation(location || undefined, firstActivationCode);
        if (data.success) {
          setActivationStatus({
            success: true,
            activated: true,
            message: data.message
          });
          
          // Clear cache and refresh license context to reflect the new activation status
          clearLicenseCache();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for files to be written
          await forceRefreshLicense();
          
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          setError(data.message || 'First activation failed');
          setActivationError(data);
        }
      } else if (status?.needsFirstActivation) {
        // First activation without code (should not happen since code is required)
        setError('يرجى إدخال كود التفعيل الأول');
        setIsActivating(false);
        return;
      } else {
        // Regular activation
        const data = await licenseService.activate(location || undefined);
        setActivationStatus(data);
        
        if (data.activated) {
          // Clear cache and refresh license context to reflect the new activation status
          clearLicenseCache();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for files to be written
          await forceRefreshLicense();
          
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          setError(data.message || 'Activation failed');
          setActivationError(data);
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.data?.message || 'Failed to activate license';
      setError(errorMessage);
      setActivationError({
        success: false,
        activated: false,
        message: errorMessage,
        details: err?.response?.data || err?.toString(),
        errorCode: err?.code || 'UNKNOWN_ERROR'
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handlePremiumActivation = async () => {
    if (!activationCode.trim()) {
      setError('يرجى إدخال كود التفعيل');
      return;
    }
    
    setIsActivating(true);
    setError(null);
    setActivationError(null);
    
    try {
      // Get location data first
      const location = await getLocationData();
      
      // Call premium activation API with the code and location
      const data = await licenseService.activateWithCode(activationCode, location || undefined);
      
      if (data.success && data.activated) {
        setActivationStatus({
          success: true,
          activated: true,
          message: data.message
        });
        
        // Clear cache and refresh license context to reflect the new activation status
        clearLicenseCache();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for files to be written
        await forceRefreshLicense();
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        // Handle detailed error response
        setActivationError(data);
        setError(data.message || 'Premium activation failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.data?.message || 'Failed to activate with code';
      setError(errorMessage);
      setActivationError({
        success: false,
        activated: false,
        message: errorMessage,
        details: err?.response?.data || err?.toString(),
        errorCode: err?.code || 'UNKNOWN_ERROR'
      });
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (activationStatus?.activated) {
      const timer = setTimeout(async () => {
        // Clear cache and refresh license context to ensure it's up to date
        clearLicenseCache();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for files to be written
        await forceRefreshLicense();
        navigate('/', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activationStatus, forceRefreshLicense, navigate, clearLicenseCache]);

  useEffect(() => {
    // Check if license is already activated when component mounts
    const checkIfAlreadyActivated = async () => {
      try {
        // Simple check without clearing cache or forcing refresh
        const status = await checkLocalLicenseStatus();
        
        // If license is activated (success=true and not needs first activation), redirect immediately
        if (status?.success && status?.activated !== false && !status?.needsFirstActivation) {
          
          navigate('/', { replace: true });
          return;
        }
        
        // Additional check - if status shows license exists but needs verification
        if (status?.success && !status?.needsFirstActivation) {
          
          navigate('/', { replace: true });
          return;
        }
        

        
      } catch (error) {
        return;
  
      }
    };
    
    checkIfAlreadyActivated();
    
    // Set up periodic license check every 10 seconds while on activation page (reduced frequency)
    const intervalId = setInterval(async () => {
      try {
        const status = await checkLocalLicenseStatus();
        if (status?.success && !status?.needsFirstActivation) {
          
          navigate('/', { replace: true });
        }
      } catch (error) {
        // Silently handle errors in periodic check
      }
    }, 10000); // Increased to 10 seconds to reduce rate limiting
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [navigate]); // Removed dependencies that cause infinite loops

  if (activationStatus?.activated) {
    return (
      <div dir="rtl" className={`min-h-screen bg-gradient-to-br ${colors.background} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md mx-auto">
          <div className={`${colors.card} shadow-2xl rounded-2xl p-8 text-center`}>
            <div className="mb-6">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
            </div>
            <h1 className={`text-3xl font-bold ${colors.text} mb-2`}>{texts.activated}</h1>
            <p className={`${colors.textSecondary} mb-6`}>{texts.activatedDesc}</p>
            <p className={`${colors.textSecondary}`}>{texts.redirecting}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show internet connection alert first
  if (showInternetAlert) {
    return (
<div dir="rtl" className="min-h-screen min-w-full bg-gradient-to-br from-gray-50/80 to-[#24252d]/10 flex items-center justify-center p-4 rtl backdrop-blur-sm">
  <Card className="w-full max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden">
    <CardHeader className="text-center space-y-5 px-6 pt-8 pb-4">
      <div className="mx-auto w-20 h-10 bg-gradient-to-br from-[#24252d] to-black rounded-md flex items-center justify-center shadow-lg">
        <Wifi className="w-10 h-10 text-white" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <CardTitle className="text-2xl font-bold text-gray-800 tracking-tight">
          {texts.internetAlert.title}
        </CardTitle>
        <CardDescription className="text-gray-600 text-base leading-relaxed">
          {texts.internetAlert.description}
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent className="px-6 pb-8">
             <Button 
         onClick={async () => {
           setShowInternetAlert(false);
           // Request location permission and check license status
            const location = await getLocationData();
            const status = await checkLocalLicenseStatus();
            
            // If license is activated, redirect immediately
            if (status?.success && !status?.needsFirstActivation) {
              navigate('/', { replace: true });
              return;
            }
           
           // If location failed, show popup
           if (!location && locationPopupError) {
             setShowLocationPopup(true);
           }
         }}
         size="lg"
         className="w-full bg-gradient-to-r from-[#24252d] to-black hover:from-[#1a1b23] hover:to-black text-white shadow-lg hover:shadow-[#24252d]/30 transition-all duration-300 transform hover:-translate-y-0.5"
       >
         {texts.internetAlert.understood}
       </Button>
    </CardContent>
  </Card>
</div>
    );
  }

  return (
    <div dir="rtl" className={`min-h-screen bg-gradient-to-br ${colors.background} flex items-center justify-center p-6`} style={{ direction: 'rtl' }}>
             <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-stretch">
        {/* Features Card */}
        <Card className={`h-full ${colors.card} border-0 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm bg-white/95`}>
          <CardHeader className="space-y-4 px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50/50 to-[#24252d]/5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${colors.primary} rounded-xl flex items-center justify-center shadow-lg`}>
                <Sparkles className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${colors.text} tracking-tight`}>
                  {texts.features.title}
                </CardTitle>
                <p className={`text-sm ${colors.textSecondary} font-medium mt-1`}>
                  {texts.features.subtitle}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid gap-6">
              {texts.features.items.map((feature, index) => {
                const IconComponent = getIconComponent(feature.icon);
                return (
                  <div key={index} className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gradient-to-r hover:from-gray-50/30 hover:to-[#24252d]/10 transition-all duration-300 hover:shadow-sm border border-gray-100/50">
                      <div className={`w-10 h-10 bg-gradient-to-br ${colors.primary} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 shrink-0`}>
                        <IconComponent className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className={`font-bold ${colors.text} text-base leading-tight group-hover:${colors.primaryText} transition-colors duration-300`}>
                          {feature.title}
                        </h4>
                        <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activation Card */}
         <Card className={`h-full ${colors.card} border-0 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm bg-white/95`}>
          <CardHeader className="space-y-6 px-8 pt-8 pb-6">
            <div className="flex justify-between items-start">
              <div className={`w-16 h-16 bg-gradient-to-br ${colors.primary} rounded-2xl flex items-center justify-center shadow-lg`}>
                <Shield className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border border-emerald-200/50">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 text-xs font-medium">نظام آمن</span>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className={`text-2xl font-bold ${colors.text} tracking-tight`}>
                {texts.title}
              </CardTitle>
              <CardDescription className={`${colors.textSecondary} text-base leading-relaxed`}>
                {texts.subtitle}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8 pb-8">
            {/* Show only one alert - prioritize activation errors over status */}
            {error ? (
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  {/* Error Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Error Content */}
                  <div className="flex-1 space-y-4">
                    {/* Main Title */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">❌</span>
                      <h3 className="text-xl font-bold text-red-800">فشل في التفعيل</h3>
                    </div>
                    
                    {/* Error Message */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200">
                      <p className="text-red-700 text-base leading-relaxed font-medium">
                        {activationError?.details?.message || activationError?.details?.error || error}
                      </p>
                    </div>
                    
                    {/* Action Steps */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-red-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔧</span>
                        <h4 className="font-semibold text-red-800">خطوات الحل:</h4>
                      </div>
                      <ol className="space-y-2 text-sm text-red-700">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>تأكد من إدخال كود التفعيل الصحيح</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>تأكد من اتصالك بالإنترنت</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>جرب إعادة تشغيل التطبيق</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                          <span>تواصل مع الدعم الفني إذا استمرت المشكلة</span>
                        </li>
                      </ol>
                    </div>
                    
                    {/* Technical Details */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="group">
                        <summary className="cursor-pointer flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors">
                          <span className="text-lg">🔧</span>
                          <span className="font-medium">تفاصيل تقنية (للمطورين)</span>
                          <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="space-y-2 text-xs">
                            <div><strong className="text-gray-700">Error Code:</strong> <span className="text-gray-600">{activationError?.errorCode || 'N/A'}</span></div>
                            <div><strong className="text-gray-700">Server Message:</strong> <span className="text-gray-600">{activationError?.details?.message || activationError?.details?.error || 'N/A'}</span></div>
                            <div><strong className="text-gray-700">Full Response:</strong></div>
                            <pre className="bg-gray-100 p-3 rounded-lg text-xs font-mono break-all whitespace-pre-wrap border">{JSON.stringify(activationError?.details, null, 2)}</pre>
                        </div>
                      </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ) : activationStatus && !activationStatus.activated ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  {/* Warning Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Warning Content */}
                  <div className="flex-1 space-y-4">
                    {/* Main Title */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {activationStatus.needsFirstActivation ? '🔧' : '⚠️'}
                      </span>
                      <h3 className="text-xl font-bold text-amber-800">
                        {activationStatus.needsFirstActivation 
                          ? 'التطبيق يحتاج إلى التفعيل الأول'
                          : 'التطبيق غير مفعل'
                        }
                      </h3>
                    </div>
                    
                    {/* Status Message */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200">
                      <p className="text-amber-700 text-base leading-relaxed font-medium">
                        {activationStatus?.details?.message || activationStatus?.details?.error || 
                          (activationStatus.needsFirstActivation 
                            ? 'هذا هو أول تشغيل للتطبيق. يرجى إدخال كود التفعيل المقدم لك لتفعيل التطبيق.'
                            : 'يرجى إدخال كود التفعيل الصحيح لتفعيل التطبيق.'
                          )
                        }
                      </p>
                    </div>
                    
                    {/* Action Steps */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📋</span>
                        <h4 className="font-semibold text-amber-800">خطوات التفعيل:</h4>
                      </div>
                      <ol className="space-y-2 text-sm text-amber-700">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>تأكد من إدخال كود التفعيل الصحيح</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>تأكد من اتصالك بالإنترنت</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>اضغط على زر "التفعيل الأول" أدناه</span>
                        </li>
                      </ol>
                    </div>
                    
                    {/* Technical Details */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="group">
                        <summary className="cursor-pointer flex items-center gap-2 text-sm text-amber-600 hover:text-amber-800 transition-colors">
                          <span className="text-lg">🔧</span>
                          <span className="font-medium">تفاصيل تقنية (للمطورين)</span>
                          <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="space-y-2 text-xs">
                            <div><strong className="text-gray-700">Error Code:</strong> <span className="text-gray-600">{activationStatus?.errorCode || 'N/A'}</span></div>
                            <div><strong className="text-gray-700">Server Message:</strong> <span className="text-gray-600">{activationStatus?.details?.message || activationStatus?.details?.error || 'N/A'}</span></div>
                            <div><strong className="text-gray-700">Full Response:</strong></div>
                            <pre className="bg-gray-100 p-3 rounded-lg text-xs font-mono break-all whitespace-pre-wrap border">{JSON.stringify(activationStatus?.details, null, 2)}</pre>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className={`rounded-xl p-4 border ${colors.border} bg-gradient-to-r from-gray-50/50 to-slate-50/50 text-sm ${colors.textSecondary}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-700">{texts.deviceInfo}</span>
              </div>
              <div className="space-y-2 pr-2 text-slate-600">
                <div className="flex justify-between">
                  <span>البيئة:</span>
                  <span className="font-medium">{API_CONFIG.isDev ? 'التطوير' : 'الإنتاج'}</span>
                </div>
                <div className="flex justify-between">
                  <span>المنصة:</span>
                  <span className="font-medium">{API_CONFIG.isElectron ? 'سطح المكتب' : 'المتصفح'}</span>
                </div>
              
                {activationStatus?.needsFirstActivation && (
                  <div className="flex justify-between">
                    <span>الحالة:</span>
                    <span className="font-medium text-amber-600">يحتاج التفعيل الأول</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
             
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    كود التفعيل الأول <span className="text-red-500">*</span>
                  </div>
                                     <Input
                     type="text"
                     placeholder={texts.firstActivationCodePlaceholder}
                     value={firstActivationCode}
                     onChange={(e) => setFirstActivationCode(e.target.value)}
                     className={`text-center border-2 rounded-xl py-3 ${
                       !firstActivationCode.trim() 
                         ? 'border-red-300 focus:border-red-500' 
                         : 'border-gray-200 focus:border-[#24252d]'
                     }`}
                     required
                   />
                   {!firstActivationCode.trim() && (
                     <div className="text-red-500 text-sm text-center">
                       كود التفعيل الأول مطلوب
                     </div>
                   )}
                </div>
              
              
                <Button 
                  onClick={handleActivation} 
                 disabled={isActivating || !firstActivationCode.trim()}
                  size="lg"
                 className={`w-full bg-gradient-to-r ${colors.primary} hover:${colors.primaryHover} text-white shadow-lg hover:shadow-[#24252d]/30 transition-all duration-300 transform hover:-translate-y-0.5 rounded-xl py-6 text-base font-semibold ${
                   !firstActivationCode.trim() 
                     ? 'opacity-50 cursor-not-allowed' 
                     : ''
                 }`}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      {texts.activating}
                    </>
                  ) : (
                    <>
                      <Shield className="ml-2 h-5 w-5" />
                       {texts.firstActivationButton}
                    </>
                  )}
                </Button>
                
                
              </div>
                         <div className="text-center pt-2 space-y-2">
                                             <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={checkLocalLicenseStatus}
                  disabled={isActivating}
                  className={`${colors.textSecondary} hover:${colors.primaryText} transition-colors duration-300 font-medium`}
                >
                 <RefreshCw className="w-4 h-4 ml-2" />
                 {texts.checkStatus}
               </Button>
               

               

            </div>
          </CardContent>
                 </Card>
       </div>



       {/* Location Permission Popup */}
       <LocationPermissionPopup
         isOpen={showLocationPopup}
         onClose={() => setShowLocationPopup(false)}
         onGrantPermission={async () => {
           setShowLocationPopup(false);
           // Try to get location again
           await getLocationData();
         }}
         onSkip={() => {
           setShowLocationPopup(false);
           // Continue without location
         }}
         error={locationPopupError}
       />
     </div>
   );
 };

export default ActivationPage;