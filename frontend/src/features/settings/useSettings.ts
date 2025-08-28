import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { fetchSettings, selectSettings } from './settingsSlice';

export const useSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector(selectSettings);
  const loading = useSelector((state: RootState) => state.settings.loading);
  const error = useSelector((state: RootState) => state.settings.error);

  // Load settings if not already loaded
  useEffect(() => {
    if (!settings && !loading) {
      dispatch(fetchSettings());
    }
  }, [dispatch, settings, loading]);

  return {
    settings,
    loading,
    error,
    refetch: () => dispatch(fetchSettings())
  };
};

export default useSettings; 