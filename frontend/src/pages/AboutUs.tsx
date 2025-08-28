import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Users, 
  Award, 
  Heart,
  Star,
  Shield,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AboutUs = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Star className="h-6 w-6 text-primary" />,
      title: "جودة استثنائية",
      description: "نطور حلول رقمية متقنة باستخدام أحدث التقنيات العالمية."
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "خبرة موثوقة",
      description: "خبراتنا تشمل MERN Stack، Laravel، React Native، Flutter، والمزيد."
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-primary" />,
      title: "حلول مبتكرة",
      description: "نصمم حلول مخصصة تتوافق مع احتياجات أعمالك وتنمو معها."
    },
    {
      icon: <Heart className="h-6 w-6 text-primary" />,
      title: "دعم متواصل",
      description: "نرافق عملائنا بعد الإطلاق ونوفر دعماً فنياً حقيقياً."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">من نحن</h1>
            <p className="text-lg text-gray-600 mb-8">
              URUX شركة متخصصة بتطوير البرمجيات الذكية، نخلق تجارب رقمية ملهمة عبر تصميم وتطوير مواقع إلكترونية، تطبيقات موبايل، أنظمة نقاط بيع، ومتاجر إلكترونية حديثة.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">لماذا URUX؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">قصتنا</h2>
            <p className="text-gray-600 mb-6">
              تأسست URUX في عام 2024 بهدف توفير حلول تقنية متكاملة وعصرية تناسب احتياجات السوق المحلي والعالمي. منذ انطلاقنا، ساعدنا عشرات العملاء في تحويل أفكارهم الرقمية إلى مشاريع ناجحة.
            </p>
            <p className="text-gray-600 mb-6">
              رؤيتنا هي بناء مستقبل رقمي أفضل من خلال الابتكار، التصميم الإبداعي، والخبرة التقنية العميقة. نحن نؤمن بأن نجاح عملائنا هو جوهر رسالتنا.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">تواصل معنا</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           
            <Card>
              <CardContent className="p-6 text-center">
                <Phone className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">الهاتف</h3>
                <p className="text-gray-600" dir="ltr">+9647713926483</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">البريد الإلكتروني</h3>
                <p className="text-gray-600">ameralazawi69@gmail.com</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">ساعات العمل</h3>
                <p className="text-gray-600">السبت - الخميس: 9 صباحاً - 5 مساءً</p>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Floating Website Button */}
        <a
          href="https://urux.guru/"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed left-6 bottom-6 z-50 px-6 py-3 rounded-full bg-primary text-white font-bold text-lg shadow-lg hover:bg-primary/90 transition-all animate-bounce"
        >
          urux.guru
        </a>
      </section>
    </div>
  );
};

export default AboutUs;