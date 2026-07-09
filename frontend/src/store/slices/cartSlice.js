import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../../services/cartService';

function extractErrorMessage(error, fallback) {
  return error.response?.data?.error || fallback;
}

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    return await cartService.get();
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Impossible de charger le panier'));
  }
});

export const addCartItem = createAsyncThunk(
  'cart/addItem',
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      return await cartService.addItem(productId, quantity);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Impossible d'ajouter l'article"));
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      return await cartService.updateItem(productId, quantity);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Impossible de modifier la quantité'));
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (productId, { rejectWithValue }) => {
    try {
      return await cartService.removeItem(productId);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Impossible de retirer l'article"));
    }
  }
);

export const clearCart = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
  try {
    await cartService.clear();
    return null;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Impossible de vider le panier'));
  }
});

const emptyCart = { id: null, items: [], total: 0, item_count: 0 };

const initialState = {
  cart: emptyCart,
  status: 'idle',
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    cartReset: (state) => {
      state.cart = emptyCart;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const fulfilledWithCart = (state, action) => {
      state.status = 'succeeded';
      state.cart = action.payload || emptyCart;
      state.error = null;
    };
    const rejected = (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    };

    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCart.fulfilled, fulfilledWithCart)
      .addCase(fetchCart.rejected, rejected)
      .addCase(addCartItem.fulfilled, fulfilledWithCart)
      .addCase(addCartItem.rejected, rejected)
      .addCase(updateCartItem.fulfilled, fulfilledWithCart)
      .addCase(updateCartItem.rejected, rejected)
      .addCase(removeCartItem.fulfilled, fulfilledWithCart)
      .addCase(removeCartItem.rejected, rejected)
      .addCase(clearCart.fulfilled, (state) => {
        state.cart = emptyCart;
        state.status = 'succeeded';
      })
      .addCase(clearCart.rejected, rejected);
  },
});

export const { cartReset } = cartSlice.actions;
export default cartSlice.reducer;
