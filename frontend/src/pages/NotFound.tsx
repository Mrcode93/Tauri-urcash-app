
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-6xl font-bold text-[#2463EB] mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-4">الصفحة غير موجودة</h2>
      <p className="text-gray-600 mb-8 text-center">
        عفواً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <Link to="/">
        <Button className="bg-[#2463EB] hover:bg-blue-600">
          العودة إلى الرئيسية
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
