import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { getProduct } from "@/features/inventory/inventorySlice";
import { Product } from "@/features/inventory/inventoryService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Truck, 
  ShoppingCart, 
  LineChart, 
  Package,
  DollarSign,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Edit,
  Printer,
  Download,
  RefreshCw,
  Eye,
  Package2,
  Building,
  Hash,
  Barcode,
  Tag,
  Info,
  AlertCircle,
  Star,
  Activity,
  Database,
  History,
  Settings,
  Users,
  CreditCard,
  Receipt,
  Calculator,
  Target,
  Zap,
  Shield,
  Globe,
  BookOpen,
  Archive,
  Layers,
  Grid3X3,
  PieChart,
  BarChart,
  ScatterChart,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Share2,
  MoreHorizontal,
  Plus,
  Minus,
  Equal,
  Percent,
  Hash as HashIcon,
  CalendarDays,
  Clock3,
  Timer,
  TimerOff,
  TimerReset,
  TimerStart,
  TimerPause,
  TimerResume,
  TimerSkip,
  TimerBack,
  TimerForward,
  TimerRewind,
  TimerFastForward,
  TimerSkipBack,
  TimerSkipForward,
  TimerReset2,
  TimerStart2,
  TimerPause2,
  TimerResume2,
  TimerSkip2,
  TimerBack2,
  TimerForward2,
  TimerRewind2,
  TimerFastForward2,
  TimerSkipBack2,
  TimerSkipForward2,
  Store,
  ShoppingBag,
  Users as UsersIcon,
  Building2,
  PackageCheck,
  PackageX,
  PackageSearch,
  PackagePlus,
  PackageMinus,
  PackageEdit,
  PackageSettings,
  PackageHeart,
  PackageStar,
  PackageZap,
  PackageShield,
  PackageGlobe,
  PackageBook,
  PackageArchive,
  PackageLayers,
  PackageGrid,
  PackagePieChart,
  PackageBarChart,
  PackageScatterChart,
  PackageMapPin,
  PackagePhone,
  PackageMail,
  PackageExternalLink,
  PackageCopy,
  PackageShare2,
  PackageMoreHorizontal,
  PackagePlus as PackagePlusIcon,
  PackageMinus as PackageMinusIcon,
  PackageEqual,
  PackagePercent,
  PackageHash,
  PackageCalendarDays,
  PackageClock3,
  PackageTimer,
  PackageTimerOff,
  PackageTimerReset,
  PackageTimerStart,
  PackageTimerPause,
  PackageTimerResume,
  PackageTimerSkip,
  PackageTimerBack,
  PackageTimerForward,
  PackageTimerRewind,
  PackageTimerFastForward,
  PackageTimerSkipBack,
  PackageTimerSkipForward,
  PackageTimerReset2,
  PackageTimerStart2,
  PackageTimerPause2,
  PackageTimerResume2,
  PackageTimerSkip2,
  PackageTimerBack2,
  PackageTimerForward2,
  PackageTimerRewind2,
  PackageTimerFastForward2,
  PackageTimerSkipBack2,
  PackageTimerSkipForward2
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface StockMovement {
  id: number;
  movement_date: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial';
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  notes?: string;
}

const InventoryDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedProduct, isLoading } = useSelector((state: RootState) => state.inventory);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (id) {
      dispatch(getProduct(Number(id)));
    }
  }, [dispatch, id]);

  const getStockStatus = () => {
    if (!selectedProduct) return { text: "غير متوفر", color: "bg-gray-100 text-gray-800", icon: XCircle };
    
    if (selectedProduct.current_stock <= 0) {
      return { text: "نفذت الكمية", color: "bg-red-100 text-red-800", icon: XCircle };
    } else if (selectedProduct.current_stock <= selectedProduct.min_stock) {
      return { text: "كمية منخفضة", color: "bg-amber-100 text-amber-800", icon: AlertTriangle };
    } else {
      return { text: "متوفر", color: "bg-green-100 text-green-800", icon: CheckCircle };
    }
  };

  const getExpiryStatus = () => {
    if (!selectedProduct?.expiry_date) return null;
    
    const expiryDate = new Date(selectedProduct.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { text: "منتهي الصلاحية", color: "bg-red-100 text-red-800", icon: XCircle };
    } else if (daysUntilExpiry <= 30) {
      return { text: `ينتهي خلال ${daysUntilExpiry} يوم`, color: "bg-amber-100 text-amber-800", icon: AlertTriangle };
    } else {
      return { text: `صالح حتى ${formatDate(selectedProduct.expiry_date)}`, color: "bg-green-100 text-green-800", icon: CheckCircle };
    }
  };

  const calculateProfitMargin = () => {
    if (!selectedProduct) return 0;
    const profit = selectedProduct.selling_price - selectedProduct.purchase_price;
    return ((profit / selectedProduct.purchase_price) * 100).toFixed(2);
  };

  const calculateWholesaleProfitMargin = () => {
    if (!selectedProduct) return 0;
    const profit = selectedProduct.wholesale_price - selectedProduct.purchase_price;
    return ((profit / selectedProduct.purchase_price) * 100).toFixed(2);
  };

  const calculateTotalValue = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.current_stock * selectedProduct.purchase_price;
  };

  const calculateSalesValue = () => {
    if (!selectedProduct) return 0;
    return (selectedProduct.total_sold || 0) * selectedProduct.selling_price;
  };

  const calculateWholesaleValue = () => {
    if (!selectedProduct) return 0;
    return selectedProduct.current_stock * selectedProduct.wholesale_price;
  };

  const stockStatus = getStockStatus();
  const expiryStatus = getExpiryStatus();

  return (
    <div className="rtl min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" dir="ltr">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="hover:bg-gray-100">
           
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تفاصيل المنتج</h1>
              <p className="text-sm text-gray-600">عرض جميع معلومات المنتج والحركات</p>
            </div>
          </div>

        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedProduct ? (
          <>
            {/* Product Overview Card */}
            <Card className="mb-6 shadow-lg border-0 bg-gradient-to-r from-white to-blue-50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            {selectedProduct.sku}
                          </Badge>
                          {selectedProduct.scientific_name && (
                            <span className="text-sm text-gray-600 italic">({selectedProduct.scientific_name})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${stockStatus.color} flex items-center gap-1 shadow-sm`}>
                      <stockStatus.icon className="h-3 w-3" />
                      {stockStatus.text}
                    </Badge>
                    {expiryStatus && (
                      <Badge className={`${expiryStatus.color} flex items-center gap-1 shadow-sm`}>
                        <expiryStatus.icon className="h-3 w-3" />
                        {expiryStatus.text}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Stock Information */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                      <Package2 className="h-4 w-4" />
                      المخزون الحالي
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      {selectedProduct.current_stock} {selectedProduct.unit}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      الحد الأدنى: {selectedProduct.min_stock} {selectedProduct.unit}
                    </div>
                  </div>

                  {/* Purchase Price */}
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 text-sm text-red-700 mb-2">
                      <DollarSign className="h-4 w-4" />
                      سعر التكلفة
                    </div>
                    <div className="text-2xl font-bold text-red-800">
                      {formatCurrency(selectedProduct.purchase_price)}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      لكل {selectedProduct.unit}
                    </div>
                  </div>

                  {/* Retail Selling Price */}
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      سعر البيع بالتجزئة
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(selectedProduct.selling_price)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      هامش الربح: {calculateProfitMargin()}%
                    </div>
                  </div>

                  {/* Wholesale Selling Price */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 text-sm text-purple-700 mb-2">
                      <Store className="h-4 w-4" />
                      سعر البيع بالجملة
                    </div>
                    <div className="text-2xl font-bold text-purple-800">
                      {formatCurrency(selectedProduct.wholesale_price)}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      هامش الربح: {calculateWholesaleProfitMargin()}%
                    </div>
                  </div>

                  {/* Total Value */}
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-2 text-sm text-orange-700 mb-2">
                      <Calculator className="h-4 w-4" />
                      القيمة الإجمالية
                    </div>
                    <div className="text-2xl font-bold text-orange-800">
                      {formatCurrency(calculateTotalValue())}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      في المخزون
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <Eye className="h-4 w-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <Info className="h-4 w-4" />
                  التفاصيل
                </TabsTrigger>
                <TabsTrigger value="movements" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <Activity className="h-4 w-4" />
                  الحركات
                </TabsTrigger>
                <TabsTrigger value="sales" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <TrendingUp className="h-4 w-4" />
                  المبيعات
                </TabsTrigger>
                <TabsTrigger value="purchases" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <Truck className="h-4 w-4" />
                  المشتريات
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <BarChart3 className="h-4 w-4" />
                  التحليلات
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Info className="h-5 w-5" />
                        المعلومات الأساسية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">رمز المنتج (SKU)</div>
                          <div className="font-mono text-sm bg-white p-2 rounded border">{selectedProduct.sku}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الباركود</div>
                          <div className="font-mono text-sm bg-white p-2 rounded border">
                            {selectedProduct.barcode || 'غير محدد'}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الوحدة</div>
                          <div className="font-medium">{selectedProduct.unit}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الوحدات في الصندوق</div>
                          <div className="font-medium">{selectedProduct.units_per_box}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">تاريخ الإضافة</div>
                          <div className="font-medium">{formatDate(selectedProduct.created_at)}</div>
                        </div>
                      </div>
                      
                      {selectedProduct.description && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الوصف</div>
                          <p className="text-gray-800 bg-white p-3 rounded border">{selectedProduct.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <DollarSign className="h-5 w-5" />
                        الملخص المالي
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-sm text-green-600 mb-1">إجمالي المبيعات</div>
                          <div className="text-2xl font-bold text-green-700">{selectedProduct.total_sold || 0}</div>
                          <div className="text-xs text-green-600">وحدة</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-600 mb-1">إجمالي المشتريات</div>
                          <div className="text-2xl font-bold text-blue-700">{selectedProduct.total_purchased || 0}</div>
                          <div className="text-xs text-blue-600">وحدة</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-sm text-purple-600 mb-1">قيمة المبيعات</div>
                          <div className="text-xl font-bold text-purple-700">{formatCurrency(calculateSalesValue())}</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <div className="text-sm text-orange-600 mb-1">هامش الربح</div>
                          <div className="text-xl font-bold text-orange-700">{calculateProfitMargin()}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Company & Category Info */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                      <CardTitle className="flex items-center gap-2 text-indigo-800">
                        <Building className="h-5 w-5" />
                        معلومات الشركة والفئة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">اسم الشركة</div>
                          <div className="font-medium">{selectedProduct.company_name || 'غير محدد'}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الفئة</div>
                          <div className="font-medium">{selectedProduct.category?.name || 'غير محدد'}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">المورد الرئيسي</div>
                          <div className="font-medium">{selectedProduct.supplier?.name || 'غير محدد'}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">الحالة</div>
                          <div className="flex items-center gap-2">
                            {selectedProduct.supported ? (
                              <Badge className="bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="h-3 w-3 ml-1" />
                                مفعل
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="h-3 w-3 ml-1" />
                                معطل
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dates & Timestamps */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <Calendar className="h-5 w-5" />
                        التواريخ والوقت
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">تاريخ الإضافة</div>
                          <div className="font-medium">{formatDate(selectedProduct.created_at)}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">آخر تحديث</div>
                          <div className="font-medium">{formatDate(selectedProduct.updated_at)}</div>
                        </div>
                        {selectedProduct.expiry_date && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">تاريخ انتهاء الصلاحية</div>
                            <div className="font-medium">{formatDate(selectedProduct.expiry_date)}</div>
                          </div>
                        )}
                        {selectedProduct.last_purchase_date && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">آخر شراء</div>
                            <div className="font-medium">{formatDate(selectedProduct.last_purchase_date)}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Movements Tab */}
              <TabsContent value="movements" className="mt-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                    <CardTitle className="flex items-center gap-2 text-cyan-800">
                      <Activity className="h-5 w-5" />
                      حركات المخزون
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {selectedProduct.movements && selectedProduct.movements.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-right py-3 px-4 font-medium text-gray-700">التاريخ</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-700">نوع الحركة</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-700">الكمية</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-700">قبل</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-700">بعد</th>
                              <th className="text-right py-3 px-4 font-medium text-gray-700">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProduct.movements.map((movement: StockMovement) => (
                              <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">{formatDate(movement.movement_date)}</td>
                                <td className="py-3 px-4">
                                  <Badge variant={
                                    movement.movement_type === 'purchase' ? 'default' :
                                    movement.movement_type === 'sale' ? 'secondary' :
                                    movement.movement_type === 'adjustment' ? 'outline' :
                                    'destructive'
                                  }>
                                    {movement.movement_type === 'purchase' && 'شراء'}
                                    {movement.movement_type === 'sale' && 'بيع'}
                                    {movement.movement_type === 'adjustment' && 'تعديل'}
                                    {movement.movement_type === 'return' && 'مرتجع'}
                                    {movement.movement_type === 'initial' && 'رصيد ابتدائي'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-medium">{movement.quantity}</td>
                                <td className="py-3 px-4 text-gray-600">{movement.before_quantity}</td>
                                <td className="py-3 px-4 text-gray-600">{movement.after_quantity}</td>
                                <td className="py-3 px-4 text-gray-600">{movement.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">لا توجد حركات مخزون لهذا المنتج</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                      <TrendingUp className="h-5 w-5" />
                      معلومات المبيعات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">لا توجد بيانات مبيعات متاحة</p>
                      <p className="text-sm text-gray-400 mt-2">سيتم إضافة تفاصيل المبيعات قريباً</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="mt-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <Truck className="h-5 w-5" />
                      معلومات المشتريات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">لا توجد بيانات مشتريات متاحة</p>
                      <p className="text-sm text-gray-400 mt-2">سيتم إضافة تفاصيل المشتريات قريباً</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Metrics */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
                      <CardTitle className="flex items-center gap-2 text-violet-800">
                        <BarChart3 className="h-5 w-5" />
                        مؤشرات الأداء
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-600 mb-1">معدل الدوران</div>
                          <div className="text-xl font-bold text-blue-700">
                            {selectedProduct.total_sold && selectedProduct.current_stock ? 
                              ((selectedProduct.total_sold / (selectedProduct.total_sold + selectedProduct.current_stock)) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-sm text-green-600 mb-1">أيام المخزون</div>
                          <div className="text-xl font-bold text-green-700">
                            {selectedProduct.total_sold ? Math.ceil(365 / (selectedProduct.total_sold / 30)) : 0}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stock Alerts */}
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50">
                      <CardTitle className="flex items-center gap-2 text-rose-800">
                        <AlertTriangle className="h-5 w-5" />
                        تنبيهات المخزون
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-3">
                        {selectedProduct.current_stock <= 0 && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-800">المنتج نفذ من المخزون</span>
                          </div>
                        )}
                        {selectedProduct.current_stock > 0 && selectedProduct.current_stock <= selectedProduct.min_stock && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-800">المخزون منخفض</span>
                          </div>
                        )}
                        {expiryStatus && expiryStatus.text.includes('ينتهي') && (
                          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-800">{expiryStatus.text}</span>
                          </div>
                        )}
                        {selectedProduct.current_stock > selectedProduct.min_stock && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-800">المخزون في المستوى الطبيعي</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لم يتم العثور على المنتج</h3>
                <p className="text-gray-500 mb-4">المنتج المطلوب غير موجود أو تم حذفه</p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/inventory">العودة إلى المنتجات</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InventoryDetails;
