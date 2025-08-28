import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import authService, { User, LoginCredentials, RegisterData, AuthResponse, Permission, UserPermission } from './authService';
import { getToken, getUser, clearAuth } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  authChecked: boolean;
  // Permission management
  userPermissions: UserPermission | null;
  allPermissions: Permission[];
  permissionsLoading: boolean;
  permissionsError: string | null;
}

// Safely get initial user from unified auth storage
const getInitialUser = async (): Promise<User | null> => {
  try {
    const user = await getUser();
    const token = await getToken();
    
    if (user && token) {
      return {
        ...user,
        token: user.token || token || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting initial user data:', error);
    return null;
  }
};

// Initialize authentication state from storage
export const initializeAuth = createAsyncThunk<
  { user: User | null; token: string | null },
  void,
  { rejectValue: string }
>('auth/initialize', async (_, { rejectWithValue }) => {
  try {
    const user = await getInitialUser();
    const token = await getToken();
    
    return { user, token };
  } catch (error: unknown) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to initialize authentication'
    );
  }
});

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  authChecked: false,
  // Permission management
  userPermissions: null,
  allPermissions: [],
  permissionsLoading: false,
  permissionsError: null,
};

// Login user with permissions
export const loginWithPermissions = createAsyncThunk<
  { authResponse: AuthResponse; userPermissions: UserPermission },
  LoginCredentials,
  { rejectValue: string }
>('auth/loginWithPermissions', async (credentials, { rejectWithValue }) => {
  try {
    // First, login the user
    const authResponse = await authService.login(credentials);
    
    // Then, get user permissions (don't pass user ID to get own permissions)
    const userPermissions = await authService.getUserPermissions();
    
    return { authResponse, userPermissions };
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'An error occurred during login'
    );
  }
});

// Login user (legacy - without permissions)
export const login = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'An error occurred during login'
    );
  }
});

// Register user with permissions
export const registerWithPermissions = createAsyncThunk<
  { authResponse: AuthResponse; userPermissions: UserPermission },
  RegisterData,
  { rejectValue: string }
>('auth/registerWithPermissions', async (userData, { rejectWithValue }) => {
  try {
    // First, register the user
    const authResponse = await authService.register(userData);
    
    // Then, get user permissions (don't pass user ID to get own permissions)
    const userPermissions = await authService.getUserPermissions();
    
    return { authResponse, userPermissions };
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'An error occurred during registration'
    );
  }
});

// Register user (legacy - without permissions)
export const register = createAsyncThunk<
  AuthResponse,
  RegisterData,
  { rejectValue: string }
>('auth/register', async (userData, { rejectWithValue }) => {
  try {
    return await authService.register(userData);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'An error occurred during registration'
    );
  }
});

// Get current user with permissions
export const getCurrentUserWithPermissions = createAsyncThunk<
  { user: User; userPermissions: UserPermission },
  void,
  { rejectValue: string }
>('auth/getCurrentUserWithPermissions', async (_, { rejectWithValue }) => {
  try {
    const user = await authService.getCurrentUser();
    const userPermissions = await authService.getUserPermissions();
    return { user, userPermissions };
  } catch (error: unknown) {
    // Clear invalid auth data using unified auth storage
    await clearAuth();
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch user details'
    );
  }
});

// Get current user (legacy - without permissions)
export const getCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>('auth/getCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const user = await authService.getCurrentUser();
    return user;
  } catch (error: unknown) {
    // Clear invalid auth data using unified auth storage
    await clearAuth();
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch user details'
    );
  }
});

// Update user
export const updateUser = createAsyncThunk<
  User,
  Partial<User>,
  { rejectValue: string }
>('auth/updateUser', async (userData, { rejectWithValue }) => {
  try {
    return await authService.updateUser(userData);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to update user details'
    );
  }
});

// Logout user
export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// Permission management thunks
export const getUserPermissions = createAsyncThunk<
  UserPermission,
  number | undefined,
  { rejectValue: string }
>('auth/getUserPermissions', async (userId, { rejectWithValue }) => {
  try {
    return await authService.getUserPermissions(userId);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch user permissions'
    );
  }
});

// Get all permissions
export const getAllPermissions = createAsyncThunk<
  Permission[],
  void,
  { rejectValue: string }
>('auth/getAllPermissions', async (_, { rejectWithValue }) => {
  try {
    return await authService.getAllPermissions();
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch permissions'
    );
  }
});

// Grant permission
export const grantPermission = createAsyncThunk<
  void,
  { userId: number; permissionData: unknown },
  { rejectValue: string }
>('auth/grantPermission', async ({ userId, permissionData }, { rejectWithValue }) => {
  try {
    await authService.grantPermission(userId, permissionData);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to grant permission'
    );
  }
});

// Revoke permission
export const revokePermission = createAsyncThunk<
  void,
  { userId: number; permissionId: string },
  { rejectValue: string }
>('auth/revokePermission', async ({ userId, permissionId }, { rejectWithValue }) => {
  try {
    await authService.revokePermission(userId, permissionId);
  } catch (error: unknown) {
    return rejectWithValue(
      error.response?.data?.message || 
      error.message || 
      'Failed to revoke permission'
    );
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    reset: (state) => {
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action: PayloadAction<{ user: User | null; token: string | null }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = !!action.payload.user;
        state.authChecked = true;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to initialize authentication';
        state.authChecked = true;
      })

      // Login with permissions
      .addCase(loginWithPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPermissions.fulfilled, (state, action: PayloadAction<{ authResponse: AuthResponse; userPermissions: UserPermission }>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.authResponse.user;
        state.token = action.payload.authResponse.token;
        state.authChecked = true;
        // Set user permissions
        state.userPermissions = action.payload.userPermissions;
        state.permissionsLoading = false;
        state.permissionsError = null;
      })
      .addCase(loginWithPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        state.authChecked = true;
      })
      
      // Register with permissions
      .addCase(registerWithPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerWithPermissions.fulfilled, (state, action: PayloadAction<{ authResponse: AuthResponse; userPermissions: UserPermission }>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.authResponse.user;
        state.token = action.payload.authResponse.token;
        state.authChecked = true;
        // Set user permissions
        state.userPermissions = action.payload.userPermissions;
        state.permissionsLoading = false;
        state.permissionsError = null;
      })
      .addCase(registerWithPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
        state.authChecked = true;
      })
      
      // Get current user with permissions
      .addCase(getCurrentUserWithPermissions.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUserWithPermissions.fulfilled, (state, action: PayloadAction<{ user: User; userPermissions: UserPermission }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.authChecked = true;
        // Set user permissions
        state.userPermissions = action.payload.userPermissions;
        state.permissionsLoading = false;
        state.permissionsError = null;
      })
      .addCase(getCurrentUserWithPermissions.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
        state.authChecked = true;
        // Clear permissions
        state.userPermissions = null;
        state.permissionsError = null;
      })
      
      // Login (legacy)
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.authChecked = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        state.authChecked = true;
      })
      
      // Register (legacy)
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.authChecked = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
        state.authChecked = true;
      })
      
      // Get Current User (legacy)
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.authChecked = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
        state.authChecked = true;
      })
      
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.authChecked = true;
        // Clear permissions on logout
        state.userPermissions = null;
        state.allPermissions = [];
        state.permissionsError = null;
      })
      
      // Get User Permissions
      .addCase(getUserPermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(getUserPermissions.fulfilled, (state, action: PayloadAction<UserPermission>) => {
        state.permissionsLoading = false;
        state.userPermissions = action.payload;
      })
      .addCase(getUserPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.payload || 'Failed to fetch user permissions';
      })
      
      // Get All Permissions
      .addCase(getAllPermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(getAllPermissions.fulfilled, (state, action: PayloadAction<Permission[]>) => {
        state.permissionsLoading = false;
        state.allPermissions = action.payload;
      })
      .addCase(getAllPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.payload || 'Failed to fetch permissions';
      })
      
      // Grant Permission
      .addCase(grantPermission.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(grantPermission.fulfilled, (state) => {
        state.permissionsLoading = false;
      })
      .addCase(grantPermission.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.payload || 'Failed to grant permission';
      })
      
      // Revoke Permission
      .addCase(revokePermission.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(revokePermission.fulfilled, (state) => {
        state.permissionsLoading = false;
      })
      .addCase(revokePermission.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.payload || 'Failed to revoke permission';
      });
  },
});

export const { clearError, reset } = authSlice.actions;

export const selectAuth = (state: RootState) => state.auth;

// Permission checking selectors
export const selectUserPermissions = (state: RootState) => state.auth.userPermissions;
export const selectAllPermissions = (state: RootState) => state.auth.allPermissions;
export const selectPermissionsLoading = (state: RootState) => state.auth.permissionsLoading;
export const selectPermissionsError = (state: RootState) => state.auth.permissionsError;

// Helper function to check if user has a specific permission
export const selectHasPermission = (permissionId: string) => (state: RootState) => {
  const userPermissions = state.auth.userPermissions;
  if (!userPermissions || !userPermissions.allPermissions) return false;
  
  return userPermissions.allPermissions.some(permission => 
    permission.permission_id === permissionId
  );
};

// Helper function to check if user has any of the specified permissions
export const selectHasAnyPermission = (permissionIds: string[]) => (state: RootState) => {
  const userPermissions = state.auth.userPermissions;
  if (!userPermissions || !userPermissions.allPermissions) return false;
  
  return permissionIds.some(permissionId =>
    userPermissions.allPermissions.some(permission => 
      permission.permission_id === permissionId
    )
  );
};

// Helper function to check if user has all of the specified permissions
export const selectHasAllPermissions = (permissionIds: string[]) => (state: RootState) => {
  const userPermissions = state.auth.userPermissions;
  if (!userPermissions || !userPermissions.allPermissions) return false;
  
  return permissionIds.every(permissionId =>
    userPermissions.allPermissions.some(permission => 
      permission.permission_id === permissionId
    )
  );
};

export default authSlice.reducer;