import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { register, reset } from '../features/auth/authSlice';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const { name, username, password, confirmPassword } = formData;
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }

    if (isSuccess || user) {
      navigate('/');
    }

    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    dispatch(register({ name, username, password }));
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2463EB]">إنشاء حساب جديد</h1>
          <p className="text-gray-600 mt-2">قم بإنشاء حساب للوصول إلى نظام إدارة المبيعات</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                الاسم
              </label>
              <Input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={handleChange}
                required
                placeholder="أدخل اسمك الكامل"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                اسم المستخدم
              </label>
              <Input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={handleChange}
                required
                placeholder="أدخل اسم المستخدم"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                كلمة المرور
              </label>
              <Input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={handleChange}
                required
                placeholder="أدخل كلمة المرور"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                تأكيد كلمة المرور
              </label>
              <Input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                required
                placeholder="تأكيد كلمة المرور"
                className="w-full"
              />
            </div>
            
            <Button type="submit" className="w-full bg-[#2463EB] hover:bg-blue-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" /> جاري التحميل...
                </>
              ) : (
                'إنشاء حساب'
              )}
            </Button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <p>
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-[#2463EB] hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
