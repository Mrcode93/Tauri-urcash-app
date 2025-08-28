import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSale } from '../sales/salesSlice';
import { toast } from '@/lib/toast';

export interface CartItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  stock: number;
  unit: string;
  unitType: 'piece' | 'box';
  piecesPerUnit: number;
  notes?: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export interface POSWindowState {
  cart: CartItem[];
  customer_id: number | null;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  paid_amount: number;
  searchQuery: string;
  activeTab: string;
  heldBills: { [key: string]: CartItem[] };
  discount: number;
  discountType: 'percentage' | 'fixed';
  tax: number;
}

export interface POSState {
  sessions: { [sessionId: string]: POSWindowState };
  activeSessionId: string;
  loading: boolean;
  error: string | null;
}

const createInitialSession = (): POSWindowState => ({
  cart: [],
  customer_id: null,
  payment_method: 'cash',
  paid_amount: 0,
  searchQuery: '',
  activeTab: 'current',
  heldBills: {},
  discount: 0,
  discountType: 'fixed',
  tax: 0
});

const initialSessionId = `session_${Date.now()}`;

const initialState: POSState = {
  sessions: { [initialSessionId]: createInitialSession() },
  activeSessionId: initialSessionId,
  loading: false,
  error: null
};

export const processPayment = createAsyncThunk(
  'pos/processPayment',
  async (_, { getState, dispatch }) => {
    const state = getState() as { pos: POSState };
    const session = state.pos.sessions[state.pos.activeSessionId];
    const { cart, customer_id, payment_method, paid_amount } = session;
    if (!customer_id) {
      throw new Error('يرجى اختيار العميل');
    }
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    if (paid_amount < total) {
      throw new Error('المبلغ المدفوع أقل من الإجمالي');
    }
    const saleData = {
      customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_method,
      payment_status: (paid_amount >= total ? 'paid' : 'partial') as 'paid' | 'partial' | 'unpaid',
      paid_amount,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      })),
      total_amount: total
    };
    await dispatch(createSale(saleData));
    return true;
  }
);

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    createSession: (state) => {
      const newId = `session_${Date.now()}`;
      state.sessions[newId] = createInitialSession();
      state.activeSessionId = newId;
    },
    switchSession: (state, action) => {
      if (state.sessions[action.payload]) {
        state.activeSessionId = action.payload;
      }
    },
    removeSession: (state, action) => {
      delete state.sessions[action.payload];
      const sessionIds = Object.keys(state.sessions);
      state.activeSessionId = sessionIds[0] || '';
    },
    addToCart: (state, action) => {
      const { product, allowNegativeStock = false, exchangeRate = 1 } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const existingItem = session.cart.find(item => item.product_id === product.id);
      
      // Use converted price for USD products
      const cartPrice = product.is_dolar && exchangeRate > 1 
        ? product.selling_price * exchangeRate 
        : product.selling_price;
      
      if (existingItem) {
        // Check stock only if negative stock is not allowed
        if (!allowNegativeStock && existingItem.quantity >= product.current_stock) {
          toast.error('الكمية المطلوبة غير متوفرة في المخزون');
          return;
        }
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.price;
      } else {
        session.cart.push({
          product_id: product.id,
          name: product.name,
          quantity: 1,
          price: cartPrice,
          total: cartPrice,
          stock: product.current_stock,
          unit: product.unit,
          unitType: 'piece',
          piecesPerUnit: 1
        });
      }
    },
    addToCartWithUnit: (state, action) => {
      const { product, quantity, unitType, price, allowNegativeStock = false } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const piecesPerUnit = unitType === 'box' ? (product.units_per_box || 1) : 1;
      
      // Check if we can add this quantity (only if negative stock is not allowed)
      if (!allowNegativeStock) {
        const totalPiecesNeeded = quantity * piecesPerUnit;
        if (totalPiecesNeeded > product.current_stock) {
          toast.error('الكمية المطلوبة غير متوفرة في المخزون');
          return;
        }
      }
      
      // Check if item already exists with same unit type
      const existingItem = session.cart.find(item => 
        item.product_id === product.id && item.unitType === unitType
      );
      
      if (existingItem) {
        // Update existing item
        if (!allowNegativeStock) {
          const newTotalPieces = (existingItem.quantity + quantity) * piecesPerUnit;
          if (newTotalPieces > product.current_stock) {
            toast.error('الكمية المطلوبة غير متوفرة في المخزون');
            return;
          }
        }
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * existingItem.price;
      } else {
        // Add new item
        const newItem = {
          product_id: product.id,
          name: product.name,
          quantity: quantity,
          price: price,
          total: price * quantity,
          stock: product.current_stock,
          unit: product.unit,
          unitType: unitType,
          piecesPerUnit: piecesPerUnit
        };
        session.cart.push(newItem);
      }
    },
    updateQuantity: (state, action) => {
      const { productId, change, allowNegativeStock = false } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const item = session.cart.find(item => item.product_id === productId);
      if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
          session.cart = session.cart.filter(item => item.product_id !== productId);
        } else if (!allowNegativeStock && newQuantity > item.stock) {
          toast.error('الكمية المطلوبة غير متوفرة في المخزون');
        } else {
          item.quantity = newQuantity;
          item.total = newQuantity * item.price;
        }
      }
    },
    updateItemUnitType: (state, action) => {
      const { productId, unitType } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const item = session.cart.find(item => item.product_id === productId);
      if (item) {
        const oldUnitType = item.unitType;
        item.unitType = unitType;
        
        // Calculate new price based on unit type change
        if (item.piecesPerUnit && item.piecesPerUnit > 1) {
          if (oldUnitType === 'box' && unitType === 'piece') {
            // Converting from box to piece: divide price by pieces per unit
            item.price = item.price / item.piecesPerUnit;
          } else if (oldUnitType === 'piece' && unitType === 'box') {
            // Converting from piece to box: multiply price by pieces per unit
            item.price = item.price * item.piecesPerUnit;
          }
        }
        
        // Update total
        item.total = item.quantity * item.price;
      }
    },
    removeFromCart: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.cart = session.cart.filter(item => item.product_id !== action.payload);
    },
    clearCart: (state) => {
      const session = state.sessions[state.activeSessionId];
      session.cart = [];
      session.customer_id = null;
      session.payment_method = 'cash';
      session.paid_amount = 0;
    },
    holdBill: (state) => {
      const session = state.sessions[state.activeSessionId];
      const billId = `bill_${Date.now()}`;
      session.heldBills[billId] = session.cart;
      session.cart = [];
      session.customer_id = null;
      session.payment_method = 'cash';
      session.paid_amount = 0;
      toast.success('تم حفظ الفاتورة مؤقتاً');
    },
    loadHeldBill: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      const billId = action.payload;
      const bill = session.heldBills[billId];
      if (bill) {
        session.cart = bill;
        delete session.heldBills[billId];
        toast.success('تم تحميل الفاتورة المحفوظة');
      }
    },
    setCustomer: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.customer_id = action.payload;
    },
    setPaymentMethod: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.payment_method = action.payload;
    },
    setPaidAmount: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.paid_amount = action.payload;
    },
    setSearchQuery: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.searchQuery = action.payload;
    },
    setActiveTab: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.activeTab = action.payload;
    },
    setDiscount: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.discount = action.payload;
    },
    setDiscountType: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.discountType = action.payload;
    },
    setTax: (state, action) => {
      const session = state.sessions[state.activeSessionId];
      session.tax = action.payload;
    },
    addManualItemToCart: (state, action) => {
      const { price, quantity, notes } = action.payload;
      const session = state.sessions[state.activeSessionId];
      
      // Create a unique ID for manual items (negative to avoid conflicts with real products)
      const manualItemId = -(Date.now() + Math.floor(Math.random() * 1000));
      
      const manualItem: CartItem = {
        product_id: manualItemId,
        name: notes ? `مواد اخرى - ${notes}` : 'مواد اخرى',
        quantity: quantity,
        price: price,
        total: price * quantity,
        stock: 999999, // Unlimited stock for manual items
        unit: 'قطعة',
        unitType: 'piece',
        piecesPerUnit: 1,
        notes: notes
      };
      
      session.cart.push(manualItem);
    },
    setItemNotes: (state, action) => {
      const { productId, notes } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const item = session.cart.find(item => item.product_id === productId);
      if (item) {
        item.notes = notes;
      }
    },
    setItemDiscount: (state, action) => {
      const { productId, discount, discountType } = action.payload;
      const session = state.sessions[state.activeSessionId];
      const item = session.cart.find(item => item.product_id === productId);
      if (item) {
        item.discount = discount;
        item.discountType = discountType;
        const baseTotal = item.price * item.quantity;
        const discountAmount = discountType === 'percentage' 
          ? (baseTotal * discount / 100)
          : discount;
        item.total = baseTotal - discountAmount;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state) => {
        state.loading = false;
        const session = state.sessions[state.activeSessionId];
        session.cart = [];
        session.customer_id = null;
        session.payment_method = 'cash';
        session.paid_amount = 0;
        toast.success('تم إنشاء الفاتورة بنجاح');
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'حدث خطأ أثناء إنشاء الفاتورة';
        toast.error(state.error);
      });
  }
});

export const {
  createSession,
  switchSession,
  removeSession,
  addToCart,
  addToCartWithUnit,
  updateQuantity,
  updateItemUnitType,
  removeFromCart,
  clearCart,
  holdBill,
  loadHeldBill,
  setCustomer,
  setPaymentMethod,
  setPaidAmount,
  setSearchQuery,
  setActiveTab,
  setDiscount,
  setDiscountType,
  setTax,
  addManualItemToCart,
  setItemNotes,
  setItemDiscount
} = posSlice.actions;

export default posSlice.reducer; 