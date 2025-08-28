import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';

interface Settings {
  logo?: string;
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const useSettings = () => {
  const settings = useSelector((state: RootState) => state.settings.settings) as Settings;

  return { settings };
}; 