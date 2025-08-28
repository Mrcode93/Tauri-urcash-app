import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { loginWithPermissions, reset } from '../features/auth/authSlice';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import Logo from '../../assets/logo.png'; // Fixed path

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const { username, password } = formData;
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Refs for input navigation
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Handle successful login
  useEffect(() => {
    if (isAuthenticated && user && user.id) {
      toast.success(`مرحباً ${user.username || user.name || 'المستخدم'}! تم تسجيل الدخول بنجاح`);
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Handle errors
  useEffect(() => {
    if (error) {
      // Map common error messages to Arabic
      let errorMessage = error;
      if (error.includes('Invalid credentials') || error.includes('incorrect')) {
        errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      } else if (error.includes('User not found')) {
        errorMessage = 'المستخدم غير موجود';
      } else if (error.includes('Network') || error.includes('connection')) {
        errorMessage = 'خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت';
      } else if (error.includes('timeout')) {
        errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى';
      } else if (error.includes('server')) {
        errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً';
      }
      
      toast.error(errorMessage);
      dispatch(reset());
    }
  }, [error, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextField: 'password' | 'submit') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField === 'password' && passwordRef.current) {
        passwordRef.current.focus();
      } else if (nextField === 'submit' && submitButtonRef.current) {
        submitButtonRef.current.click();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation with specific toast messages
    if (!username.trim()) {
      toast.warning('يرجى إدخال اسم المستخدم');
      return;
    }
    
    if (!password.trim()) {
      toast.warning('يرجى إدخال كلمة المرور');
      return;
    }
    
    if (password.length < 3) {
      toast.warning('كلمة المرور يجب أن تكون 3 أحرف على الأقل');
      return;
    }

    try {
      await dispatch(loginWithPermissions({ username: username.trim(), password })).unwrap();
    } catch (err) {
      // Error is handled by the error effect
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 bg-[#1f1f1f]">
            <img
              src={Logo}
              alt="Urcash Logo"
              className="w-52 h-32"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#1f1f1f]">تسجيل الدخول</h1>
          <p className="text-gray-600 mt-2">قم بتسجيل الدخول للوصول إلى نظام إدارة المبيعات</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              اسم المستخدم
            </label>
            <Input
              ref={usernameRef}
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 'password')}
              placeholder="أدخل اسم المستخدم"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 'submit')}
              placeholder="أدخل كلمة المرور"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
          </div>

          <Button
            ref={submitButtonRef}
            type="submit"
            className="w-full text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: '#1f1f1f',
              '--tw-bg-opacity': '1'
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1f1f1f';
            }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                جاري تسجيل الدخول...
              </div>
            ) : (
              'تسجيل الدخول'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
