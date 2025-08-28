import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import inventoryService, { Product, CreateProductData, UpdateProductData, Category } from './inventoryService';
import { ApiError } from '@/lib/errorHandler';
import { ListState, SingleItemState } from '@/lib/types';
import { ImportResponse } from './inventoryService';

interface MostSoldProduct {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  total_quantity: number;
  total_revenue: number;
  total_sales: number;
}

interface InventoryState extends ListState<Product> {
  selectedProduct: Product | null;
  mostSoldProducts: MostSoldProduct[];
  mostSoldProductsLoading: boolean;
  mostSoldProductsError: string | null;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  posProducts: Product[];
  posProductsLoading: boolean;
}

const initialState: InventoryState = {
  items: [],
  selectedProduct: null,
  loading: false,
  error: null,
  mostSoldProducts: [],
  mostSoldProductsLoading: false,
  mostSoldProductsError: null,
  categories: [],
  categoriesLoading: false,
  categoriesError: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true
  },
  posProducts: [],
  posProductsLoading: false
};

// Enhanced error handling for async thunks
const handleAsyncError = (error: any, defaultMessage: string): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
};

// Get all products with pagination
export const getProducts = createAsyncThunk<{ products: Product[]; total: number; hasMore: boolean }, { 
  page?: number; 
  limit?: number; 
  cache?: boolean;
  name?: string;
  category?: string;
  lowStock?: number;
  expiring?: number;
  minPrice?: number;
  maxPrice?: number;
  barcode?: string;
}, { rejectValue: string }>(
  'inventory/getProducts',
  async ({ page = 1, limit = 50, cache = true, ...filters }, { rejectWithValue }) => {
    try {
      const result = await inventoryService.getAllProducts({ page, limit, cache, ...filters });
      return result;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المنتجات');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get products optimized for POS
export const getProductsForPOS = createAsyncThunk<Product[], { search?: string; limit?: number; category?: string }, { rejectValue: string }>(
  'inventory/getProductsForPOS',
  async (params, { rejectWithValue }) => {
    try {
      const products = await inventoryService.getProductsForPOS(params);
      return products;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب منتجات نقاط البيع');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get single product
export const getProduct = createAsyncThunk<Product, number, { rejectValue: string }>(
  'inventory/getProduct',
  async (id, { rejectWithValue }) => {
    try {
      const product = await inventoryService.getProductById(id);
      return product;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المنتج');
      return rejectWithValue(errorMessage);
    }
  }
);

// Category async thunks
export const getCategories = createAsyncThunk<Category[], void, { rejectValue: string }>(
  'inventory/getCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await inventoryService.getAllCategories();
      return categories;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب الفئات');
      return rejectWithValue(errorMessage);
    }
  }
);

export const addCategory = createAsyncThunk<Category, string, { rejectValue: string }>(
  'inventory/addCategory',
  async (name, { rejectWithValue }) => {
    try {
      const category = await inventoryService.addCategory(name);
      return category;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في إضافة الفئة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateCategory = createAsyncThunk<Category, { id: number; name: string }, { rejectValue: string }>(
  'inventory/updateCategory',
  async ({ id, name }, { rejectWithValue }) => {
    try {
      const category = await inventoryService.updateCategory(id, name);
      return category;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في تحديث الفئة');
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteCategory = createAsyncThunk<number, number, { rejectValue: string }>(
  'inventory/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      await inventoryService.deleteCategory(id);
      return id;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في حذف الفئة');
      return rejectWithValue(errorMessage);
    }
  }
);

// Create product
export const createProduct = createAsyncThunk<Product, CreateProductData, { rejectValue: string }>(
  'inventory/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const product = await inventoryService.createProduct(productData);
      return product;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في إضافة المنتج');
      return rejectWithValue(errorMessage);
    }
  }
);

// Update product
export const updateProduct = createAsyncThunk<Product, { id: number; data: UpdateProductData }, { rejectValue: string }>(
  'inventory/updateProduct',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const product = await inventoryService.updateProduct(id, data);
      return product;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في تحديث المنتج');
      return rejectWithValue(errorMessage);
    }
  }
);

// Delete product
export const deleteProduct = createAsyncThunk<void, { id: number; force?: boolean }, { rejectValue: string }>(
  'inventory/deleteProduct',
  async ({ id, force = false }, { rejectWithValue }) => {
    try {
      await inventoryService.deleteProduct(id, force);
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في حذف المنتج');
      return rejectWithValue(errorMessage);
    }
  }
);

// Import products
export const importProducts = createAsyncThunk<ImportResponse, File, { rejectValue: string }>(
  "inventory/importProducts",
  async (file, { rejectWithValue }) => {
    try {
      const response = await inventoryService.importFromFile(file);
      if (!response.success) {
        return rejectWithValue(response.message || 'فشل في استيراد المنتجات');
      }
      return response;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في استيراد المنتجات');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get expiring products
export const getExpiringProducts = createAsyncThunk<Product[], number, { rejectValue: string }>(
  "inventory/getExpiringProducts",
  async (days = 30, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getExpiringProducts(days);
    return response;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المنتجات القاربة على انتهاء الصلاحية');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get low stock products
export const getLowStockProducts = createAsyncThunk<Product[], number, { rejectValue: string }>(
  "inventory/getLowStockProducts",
  async (threshold = 10, { rejectWithValue }) => {
    try {
    const response = await inventoryService.getLowStockProducts(threshold);
    return response;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المنتجات منخفضة المخزون');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get most sold products
export const getMostSoldProducts = createAsyncThunk<MostSoldProduct[], { limit?: number; period?: 'week' | 'month' | 'year' }, { rejectValue: string }>(
  'inventory/getMostSoldProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await inventoryService.getMostSoldProducts(params);
      // Cast to unknown first to avoid type error
      return response.data.products as unknown as MostSoldProduct[];
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب المنتجات الأكثر مبيعاً');
      return rejectWithValue(errorMessage);
    }
  }
);

// Get product movements
export const getProductMovements = createAsyncThunk<{ id: number; movements: any[] }, { id: number; startDate?: string; endDate?: string }, { rejectValue: string }>(
  'inventory/getProductMovements',
  async (params, { rejectWithValue }) => {
    try {
      const movements = await inventoryService.getProductMovements(params.id, {
        startDate: params.startDate,
        endDate: params.endDate
      });
      return { id: params.id, movements };
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في جلب حركات المنتج');
      return rejectWithValue(errorMessage);
    }
  }
);

// Adjust stock
export const adjustStock = createAsyncThunk<Product, { product_id: number; adjustment_type: 'add' | 'subtract'; quantity: number; notes?: string }, { rejectValue: string }>(
  'inventory/adjustStock',
  async (data, { rejectWithValue }) => {
    try {
      const product = await inventoryService.adjustStock(data);
      return product;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في تعديل المخزون');
      return rejectWithValue(errorMessage);
    }
  }
);

// Adjust stock with purchase
export const adjustStockWithPurchase = createAsyncThunk<Product, { product_id: number; quantity: number; supplier_id: number; purchase_price: number; invoice_no?: string; notes?: string }, { rejectValue: string }>(
  'inventory/adjustStockWithPurchase',
  async (data, { rejectWithValue }) => {
    try {
      const product = await inventoryService.adjustStockWithPurchase(data);
      return product;
    } catch (error) {
      const errorMessage = handleAsyncError(error, 'فشل في تعديل المخزون مع الشراء');
      return rejectWithValue(errorMessage);
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    clearMostSoldProductsError: (state) => {
      state.mostSoldProductsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all products
      .addCase(getProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination.total = action.payload.total;
        state.pagination.hasMore = action.payload.hasMore;
        // Set current page and limit from the request
        state.pagination.page = action.meta.arg.page || 1;
        state.pagination.limit = action.meta.arg.limit || 50;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في جلب المنتجات';
      })
      // Get single product
      .addCase(getProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(getProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في جلب المنتج';
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في إضافة المنتج';
      })
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في تحديث المنتج';
      })
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        const productId = action.meta.arg.id;
        state.items = state.items.filter(product => product.id !== productId);
        if (state.selectedProduct?.id === productId) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في حذف المنتج';
      })
      // Import Products
      .addCase(importProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importProducts.fulfilled, (state, action) => {
        state.loading = false;
        // The action payload is now ImportResponse, so we can access its properties
        // For now, we'll just set loading to false and let the UI handle the response
      })
      .addCase(importProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "فشل في استيراد المنتجات";
      })
      // Get Expiring Products
      .addCase(getExpiringProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getExpiringProducts.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(getExpiringProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "فشل في جلب المنتجات القاربة على انتهاء الصلاحية";
      })
      // Get Low Stock Products
      .addCase(getLowStockProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLowStockProducts.fulfilled, (state, action) => {
        state.loading = false;
        // Add low stock products to the existing items array
        const lowStockProducts = action.payload;
        lowStockProducts.forEach(product => {
          const existingIndex = state.items.findIndex(item => item.id === product.id);
          if (existingIndex !== -1) {
            state.items[existingIndex] = product;
          } else {
            state.items.push(product);
          }
        });
      })
      .addCase(getLowStockProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "فشل في جلب المنتجات منخفضة المخزون";
      })
      // Get Most Sold Products
      .addCase(getMostSoldProducts.pending, (state) => {
        state.mostSoldProductsLoading = true;
        state.mostSoldProductsError = null;
      })
      .addCase(getMostSoldProducts.fulfilled, (state, action) => {
        state.mostSoldProductsLoading = false;
        state.mostSoldProducts = action.payload;
      })
      .addCase(getMostSoldProducts.rejected, (state, action) => {
        state.mostSoldProductsLoading = false;
        state.mostSoldProductsError = action.payload as string;
      })
      // Get Product Movements
      .addCase(getProductMovements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductMovements.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.items[index].movements = action.payload.movements;
        }
      })
      .addCase(getProductMovements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في جلب حركات المنتج';
      })
      // Get Products for POS
      .addCase(getProductsForPOS.pending, (state) => {
        state.posProductsLoading = true;
        state.error = null;
      })
      .addCase(getProductsForPOS.fulfilled, (state, action) => {
        state.posProductsLoading = false;
        state.posProducts = action.payload;
      })
      .addCase(getProductsForPOS.rejected, (state, action) => {
        state.posProductsLoading = false;
        state.error = action.payload || 'فشل في جلب منتجات نقاط البيع';
      })
      // Adjust Stock
      .addCase(adjustStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في تعديل المخزون';
      })
      // Adjust Stock with Purchase
      .addCase(adjustStockWithPurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adjustStockWithPurchase.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(adjustStockWithPurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'فشل في تعديل المخزون مع الشراء';
      })
      // Get Categories
      .addCase(getCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload || 'فشل في جلب الفئات';
      })
      // Add Category
      .addCase(addCategory.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories.push(action.payload);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload || 'فشل في إضافة الفئة';
      })
      // Update Category
      .addCase(updateCategory.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        const index = state.categories.findIndex(category => category.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload || 'فشل في تحديث الفئة';
      })
      // Delete Category
      .addCase(deleteCategory.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        const categoryId = action.payload;
        state.categories = state.categories.filter(category => category.id !== categoryId);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload || 'فشل في حذف الفئة';
      });
  },
});

export const { clearError, setSelectedProduct, clearMostSoldProductsError } = inventorySlice.actions;

export const selectInventory = (state: RootState) => state.inventory;

export default inventorySlice.reducer;
