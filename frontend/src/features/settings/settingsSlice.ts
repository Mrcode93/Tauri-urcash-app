import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { Settings as ApiSettingsData } from './settingsService'; // Use the comprehensive interface

export type SettingsData = ApiSettingsData; // Alias for clarity within the slice

export interface SettingsState {
  data: SettingsData | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  data: null,
  loading: false,
  error: null
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async () => {
    const response = await api.get('/settings');
    const settings = response.data.data;
    
    // Validate and fix exchange rate if it's too high
    if (settings && settings.exchange_rate > 10000) {
      console.warn('Exchange rate too high in API response, limiting to 1000:', settings.exchange_rate);
      settings.exchange_rate = 1000;
    }
    
    return settings;
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (formData: FormData) => {
    const response = await api.put('/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const settings = response.data.data as SettingsData;
    
    // Validate and fix exchange rate if it's too high
    if (settings && settings.exchange_rate > 10000) {
      console.warn('Exchange rate too high in update response, limiting to 1000:', settings.exchange_rate);
      settings.exchange_rate = 1000;
    }
    
    return settings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettings: (state) => {
      state.data = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update settings';
      });
  }
});

export const { clearSettings } = settingsSlice.actions;

// Selectors
export const selectSettings = (state: { settings: SettingsState }) => state.settings.data;
export const selectSettingsLoading = (state: { settings: SettingsState }) => state.settings.loading;
export const selectSettingsError = (state: { settings: SettingsState }) => state.settings.error;

export default settingsSlice.reducer;