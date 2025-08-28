import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMoneyBoxes } from "@/features/moneyBoxes/moneyBoxesSlice";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Plus, Search, MoreVertical } from "lucide-react";
import { toast } from "@/lib/toast";
import { AppDispatch, RootState } from "@/app/store";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/features/expenses/expensesSlice";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Expense } from "@/features/expenses/expensesService";
import { CashBoxGuard } from "@/components/CashBoxGuard";

const Expenses = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses = [], isLoading } = useSelector((state: RootState) => state.expenses);
  const { moneyBoxes = [] } = useSelector((state: RootState) => state.moneyBoxes);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    moneyBoxId: "", // New field for money box selection
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    amount: "",
    description: "",
    category: "",
    date: "",
    moneyBoxId: "",
  });

  // Validation function
  const validateForm = () => {
    const errors = {
      amount: "",
      description: "",
      category: "",
      date: "",
      moneyBoxId: "",
    };

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = "المبلغ يجب أن يكون أكبر من صفر";
    }

    if (!formData.description || formData.description.trim() === "") {
      errors.description = "وصف المصروف مطلوب";
    }

    if (!formData.category || formData.category.trim() === "") {
      errors.category = "فئة المصروف مطلوبة";
    }

    if (!formData.date) {
      errors.date = "تاريخ المصروف مطلوب";
    }

    if (!formData.moneyBoxId) {
      errors.moneyBoxId = "يجب اختيار صندوق المال";
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  useEffect(() => {
    dispatch(getExpenses());
    dispatch(fetchAllMoneyBoxes());
  }, [dispatch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }
    
    // Check balance before creating expense
    if (formData.moneyBoxId && formData.moneyBoxId !== 'cash_box') {
      const selectedMoneyBox = moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId);
      if (selectedMoneyBox && selectedMoneyBox.amount < parseFloat(formData.amount)) {
        toast.error(
          `الرصيد غير كافٍ في ${selectedMoneyBox.name}. المطلوب: ${formData.amount}، المتوفر: ${selectedMoneyBox.amount}`,
          { duration: 5000 }
        );
        return;
      }
    }
    
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (selectedExpense) {
        await dispatch(
          updateExpense({
            id: selectedExpense.id,
            data: expenseData,
          })
        ).unwrap();
        toast.success("تم تحديث المصروف بنجاح");
      } else {
        await dispatch(createExpense(expenseData)).unwrap();
        toast.success("تم إضافة المصروف بنجاح");
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setFormData({
        amount: "",
        description: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        moneyBoxId: "",
      });
      setFormErrors({
        amount: "",
        description: "",
        category: "",
        date: "",
        moneyBoxId: "",
      });
    } catch (error: any) {
      console.error('Error saving expense:', error);
      
      // Handle insufficient balance error
      if (error?.response?.data?.error === 'INSUFFICIENT_BALANCE') {
        const data = error.response.data;
        toast.error(
          `الرصيد غير كافٍ في ${data.moneyBoxName}. المطلوب: ${data.requiredAmount}، المتوفر: ${data.availableBalance}`,
          { duration: 5000 }
        );
        return;
      }
      
      // Handle validation errors
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        
        // Show field-specific errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء حفظ المصروف');
      }
    }
  };

  const handleEditClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description,
      category: expense.category,
      date: expense.date,
      moneyBoxId: expense.money_box_id || "cash_box",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("يرجى تصحيح الأخطاء في النموذج");
      return;
    }
    
    try {
      if (!selectedExpense) return;

      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        moneyBoxId: formData.moneyBoxId,
      };

      await dispatch(
        updateExpense({
          id: selectedExpense.id,
          data: expenseData,
        })
      ).unwrap();

      // Refresh money boxes data to update balances and transactions
      await dispatch(fetchAllMoneyBoxes()).unwrap();

      setIsEditModalOpen(false);
      setSelectedExpense(null);
      toast.success("تم تحديث المصروف بنجاح");
      setFormErrors({
        amount: "",
        description: "",
        category: "",
        date: "",
        moneyBoxId: "",
      });
    } catch (error: any) {
      console.error('Error updating expense:', error);
      
      // Handle validation errors
      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const fieldErrors: any = {};
        
        validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        
        // Show field-specific errors
        Object.entries(fieldErrors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء تحديث المصروف');
      }
    }
  };

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (!selectedExpense) return;

      await dispatch(deleteExpense(selectedExpense.id)).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedExpense(null);
      toast.success("تم حذف المصروف بنجاح");
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('حدث خطأ أثناء حذف المصروف');
      }
    }
  };

  const filteredExpenses = Array.isArray(expenses) 
    ? expenses.filter((expense) =>
        Object.values(expense).some((value) =>
          value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2463EB]"></div>
      </div>
    );
  }

  return (
    <CashBoxGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">المصروفات</h1>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مصروف جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="rtl">
              <DialogHeader>
                <DialogTitle>إضافة مصروف جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount">المبلغ</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={formErrors.amount ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.amount && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.amount}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={formErrors.description ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="category">الفئة</Label>
                  <Select
                    value={formData.category}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger className={formErrors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">إيجار</SelectItem>
                      <SelectItem value="utilities">مرافق</SelectItem>
                      <SelectItem value="salaries">رواتب</SelectItem>
                      <SelectItem value="supplies">مستلزمات</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.category && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={formErrors.date ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.date && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="moneyBoxId">صندوق المال</Label>
                  <Select
                    value={formData.moneyBoxId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, moneyBoxId: value }))}
                  >
                    <SelectTrigger className={formErrors.moneyBoxId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="اختر صندوق المال" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_box">صندوق النقد</SelectItem>
                      {moneyBoxes.map((moneyBox) => (
                        <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                          {moneyBox.name} - {formatCurrency(moneyBox.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.moneyBoxId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.moneyBoxId}</p>
                  )}
                  {formData.moneyBoxId && formData.moneyBoxId !== 'cash_box' && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700">
                        الرصيد المتوفر: {formatCurrency(moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0)}
                      </p>
                      {parseFloat(formData.amount) > 0 && (
                        <p className={`text-sm ${parseFloat(formData.amount) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) ? 'text-red-600' : 'text-green-600'}`}>
                          {parseFloat(formData.amount) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) 
                            ? '⚠️ الرصيد غير كافٍ' 
                            : '✅ الرصيد كافٍ'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <Button type="submit">حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث عن مصروف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl shadow-md bg-white">
          <table className="min-w-full text-right border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 text-sm font-bold text-gray-600">المبلغ</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الوصف</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الفئة</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">التاريخ</th>
                <th className="py-3 px-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, idx) => (
                <tr
                  key={expense.id}
                  className={
                    `transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`
                  }
                >
                  <td className="py-3 px-4 font-bold text-blue-700 text-lg whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                  <td className="py-3 px-4 max-w-xs truncate text-gray-700">{expense.description}</td>
                  <td className="py-3 px-4">
                    <span className={
                      `inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        expense.category === 'rent' ? 'bg-blue-100 text-blue-700' :
                        expense.category === 'utilities' ? 'bg-yellow-100 text-yellow-700' :
                        expense.category === 'salaries' ? 'bg-green-100 text-green-700' :
                        expense.category === 'supplies' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`
                    }>
                      {expense.category === 'rent' ? 'إيجار' :
                       expense.category === 'utilities' ? 'مرافق' :
                       expense.category === 'salaries' ? 'رواتب' :
                       expense.category === 'supplies' ? 'مستلزمات' :
                       'أخرى'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(expense.date)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-2 bg-gray-200 hover:bg-gray-600 hover:text-gray-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">فتح القائمة</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-40 ml-12">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(expense)}
                            onSelect={(e) => e.preventDefault()}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(expense)}
                            onSelect={(e) => e.preventDefault()}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>حذف</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="rtl">
            <DialogHeader>
              <DialogTitle>تعديل المصروف</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-amount">المبلغ</Label>
                <Input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className={formErrors.amount ? 'border-red-500' : ''}
                  required
                />
                {formErrors.amount && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.amount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-description">الوصف</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={formErrors.description ? 'border-red-500' : ''}
                  required
                />
                {formErrors.description && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-category">الفئة</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger className={formErrors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">إيجار</SelectItem>
                    <SelectItem value="utilities">مرافق</SelectItem>
                    <SelectItem value="salaries">رواتب</SelectItem>
                    <SelectItem value="supplies">مستلزمات</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.category && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-date">التاريخ</Label>
                <Input
                  id="edit-date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={formErrors.date ? 'border-red-500' : ''}
                  required
                />
                {formErrors.date && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.date}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-moneyBoxId">صندوق المال</Label>
                <Select
                  value={formData.moneyBoxId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, moneyBoxId: value }))}
                >
                  <SelectTrigger className={formErrors.moneyBoxId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="اختر صندوق المال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_box">صندوق النقد</SelectItem>
                    {moneyBoxes.map((moneyBox) => (
                      <SelectItem key={moneyBox.id} value={moneyBox.id.toString()}>
                        {moneyBox.name} - {formatCurrency(moneyBox.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.moneyBoxId && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.moneyBoxId}</p>
                )}
                {formData.moneyBoxId && formData.moneyBoxId !== 'cash_box' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      الرصيد المتوفر: {formatCurrency(moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0)}
                    </p>
                    {parseFloat(formData.amount) > 0 && (
                      <p className={`text-sm ${parseFloat(formData.amount) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) ? 'text-red-600' : 'text-green-600'}`}>
                        {parseFloat(formData.amount) > (moneyBoxes.find(box => box.id.toString() === formData.moneyBoxId)?.amount || 0) 
                          ? '⚠️ الرصيد غير كافٍ' 
                          : '✅ الرصيد كافٍ'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button type="submit">حفظ التغييرات</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="rtl">
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
            </DialogHeader>
            <p>هل أنت متأكد من حذف هذا المصروف؟</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                حذف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CashBoxGuard>
  );
};

export default Expenses;
