import api from '@/lib/api';

export interface Employee {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  salary: number;
  commission_rate: number;
  commission_type: 'percentage' | 'fixed';
  commission_amount: number;
  commission_start_date?: string;
  commission_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  salary?: number;
  commission_rate?: number;
  commission_type?: 'percentage' | 'fixed';
  commission_amount?: number;
  commission_start_date?: string;
  commission_end_date?: string;
}

export interface UpdateEmployeeData extends CreateEmployeeData {}

export interface EmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommissionCalculation {
  employeeId: number;
  employeeName: string;
  salesAmount: number;
  commissionRate: number;
  commissionType: string;
  commissionAmount: number;
  calculatedCommission: number;
}

// Get all employees
export const getAllEmployees = async (
  page: number = 1,
  limit: number = 50,
  search: string = ''
): Promise<EmployeesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search: search,
  });

  const response = await api.get(`/employees?${params}`);
  console.log('API Response:', response.data);
  // Return the data property from the response
  return response.data.data;
};

// Get employee by ID
export const getEmployeeById = async (id: number): Promise<Employee> => {
  const response = await api.get(`/employees/${id}`);
  console.log('Employee by ID Response:', response.data);
  return response.data.data;
};

// Create new employee
export const createEmployee = async (data: CreateEmployeeData): Promise<{ id: number }> => {
  const response = await api.post('/employees', data);
  return response.data.data;
};

// Update employee
export const updateEmployee = async (id: number, data: UpdateEmployeeData): Promise<{ success: boolean }> => {
  const response = await api.put(`/employees/${id}`, data);
  return response.data.data;
};

// Delete employee
export const deleteEmployee = async (id: number): Promise<{ success: boolean }> => {
  const response = await api.delete(`/employees/${id}`);
  return response.data.data;
};

// Get employees for dropdown
export const getEmployeesForDropdown = async (): Promise<Employee[]> => {
  const response = await api.get('/employees/dropdown/list');
  return response.data.data;
};

// Get employees with commission
export const getEmployeesWithCommission = async (): Promise<Employee[]> => {
  const response = await api.get('/employees/commission/list');
  return response.data.data;
};

// Calculate commission
export const calculateCommission = async (
  employeeId: number,
  salesAmount: number,
  period: string = 'month'
): Promise<CommissionCalculation> => {
  const response = await api.post('/employees/commission/calculate', {
    employeeId,
    salesAmount,
    period
  });
  return response.data.data;
};
