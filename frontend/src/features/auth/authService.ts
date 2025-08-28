import api from '@/lib/api';
import { saveToken, getToken, clearToken, saveUser, getUser, clearUser, clearAuth } from '@/lib/auth';

// Remove the hardcoded port configuration since it's handled in api.ts
// api.defaults.baseURL = 'http://localhost:8000/api';

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  token?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  name: string;
  role?: string;
}

export interface Permission {
  id: number;
  permission_id: string;
  name: string;
  description: string;
  category: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  role: string;
  rolePermissions: Permission[];
  customPermissions: Permission[];
  allPermissions: Permission[];
}

export interface PermissionGrant {
  permission_id: string;
  expires_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Removed isElectron and cookieOptions - using unified auth storage

// Register user
const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
  const { user, token } = response.data.data;

  if (!token) {
    throw new Error('No token received from server');
  }

  // Store token and user data using unified auth storage
  await saveToken(token);
  await saveUser(user);
  
  return { user, token };
};

// Login user
const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  const { user, token } = response.data.data;

  if (!token) {
    throw new Error('No token received from server');
  }

  // Store token and user data using unified auth storage
  await saveToken(token);
  await saveUser(user);
  
  return { user, token };
};

// Get current user
const getCurrentUser = async (): Promise<User> => {
  try {
    console.log('Fetching current user from /auth/user');
    const response = await api.get<ApiResponse<User>>('/auth/user');
    console.log('Current user response:', response.data);
    
    const user = response.data?.data;
    if (!user) {
      throw new Error('No user data received from server');
    }
    
    // Update stored user data using unified auth storage
    await saveUser(user);
    return user;
  } catch (error: unknown) {
    console.error('Error fetching current user:', error);
    // Clear invalid auth data using unified auth storage
    await clearAuth();
    throw error;
  }
};

// Update user
const updateUser = async (userData: Partial<User>): Promise<User> => {
  const response = await api.put<ApiResponse<User>>('/auth/user', userData);
  const user = response.data?.data;
  
  if (!user) {
    throw new Error('No user data received');
  }

  // Update user data using unified auth storage
  await saveUser(user);

  return user;
};

// Logout user
const logout = async (): Promise<void> => {
  try {
    await api.get('/auth/logout');
  } finally {
    // Clear auth data using unified auth storage
    await clearAuth();
  }
};

// Permission management methods
const getUserPermissions = async (userId?: number): Promise<UserPermission> => {
  // If userId is provided, check if it's the current user's ID
  // If it is, use the user's own permissions endpoint
  // If not, use the admin endpoint (requires users.permissions permission)
  let endpoint: string;
  
  if (userId) {
    // Try to get current user's ID from stored data
    let currentUserId: number | null = null;
    
    try {
      const user = await getUser();
      if (user) {
        currentUserId = user.id;
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
    
    // If requesting own permissions, use user endpoint
    if (currentUserId && userId === currentUserId) {
      endpoint = '/auth/user/permissions';
    } else {
      endpoint = `/auth/users/${userId}/permissions`;
    }
  } else {
    endpoint = '/auth/user/permissions';
  }
  
  try {
    console.log('Fetching permissions from endpoint:', endpoint);
    const response = await api.get<ApiResponse<UserPermission>>(endpoint);
    console.log('Permissions response:', response.data);
    
    if (!response.data?.data) {
      throw new Error('No permissions data received from server');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    throw error;
  }
};

const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await api.get<ApiResponse<Permission[]>>('/auth/permissions');
  return response.data?.data;
};

const getPermissionsByCategory = async (category: string): Promise<Permission[]> => {
  const response = await api.get<ApiResponse<Permission[]>>(`/auth/permissions/category/${category}`);
  return response.data?.data;
};

const getRolePermissions = async (role: string): Promise<Permission[]> => {
  const response = await api.get<ApiResponse<Permission[]>>(`/auth/permissions/role/${role}`);
  return response.data?.data;
};

const updateRolePermissions = async (role: string, permissionIds: string[]): Promise<void> => {
  await api.put<ApiResponse<void>>(`/auth/permissions/role/${role}`, { permission_ids: permissionIds });
};

const grantPermission = async (userId: number, permissionData: PermissionGrant): Promise<void> => {
  await api.post<ApiResponse<void>>(`/auth/users/${userId}/permissions`, permissionData);
};

const revokePermission = async (userId: number, permissionId: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/auth/users/${userId}/permissions/${permissionId}`);
};

const createPermission = async (permissionData: Omit<Permission, 'id' | 'created_at' | 'updated_at'>): Promise<Permission> => {
  const response = await api.post<ApiResponse<Permission>>('/auth/permissions', permissionData);
  return response.data?.data;
};

const updatePermission = async (permissionId: string, permissionData: Partial<Permission>): Promise<Permission> => {
  const response = await api.put<ApiResponse<Permission>>(`/auth/permissions/${permissionId}`, permissionData);
  return response.data?.data;
};

const deletePermission = async (permissionId: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/auth/permissions/${permissionId}`);
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  updateUser,
  // Permission management
  getUserPermissions,
  getAllPermissions,
  getPermissionsByCategory,
  getRolePermissions,
  updateRolePermissions,
  grantPermission,
  revokePermission,
  createPermission,
  updatePermission,
  deletePermission,
};

export default authService;