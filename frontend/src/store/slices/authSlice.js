import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';

function extractErrorMessage(error, fallback) {
  return error.response?.data?.error || fallback;
}

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await authService.register(payload);
      tokenStorage.setTokens(data);
      return data.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Échec de l'inscription"));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await authService.login(payload);
      tokenStorage.setTokens(data);
      return data.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Identifiants invalides'));
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/google',
  async ({ credential, role }, { rejectWithValue }) => {
    try {
      const data = await authService.google(credential, role);
      tokenStorage.setTokens(data);
      return data.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Échec de la connexion Google'));
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getMe();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Session expirée'));
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refreshToken = tokenStorage.getRefreshToken();
  try {
    if (refreshToken) await authService.logout(refreshToken);
  } finally {
    tokenStorage.clear();
  }
});

const initialState = {
  user: null,
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  // 'idle' tant qu'on n'a pas tenté de restaurer la session au chargement
  bootstrapped: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionCleared: (state) => {
      state.user = null;
      state.status = 'idle';
      state.bootstrapped = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(googleLogin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.bootstrapped = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.status = 'idle';
        state.user = null;
        state.bootstrapped = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
      });
  },
});

export const { sessionCleared } = authSlice.actions;
export default authSlice.reducer;
