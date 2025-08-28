export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'IQD'
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};

export const formatDateShort = (date: string): string => {
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
};

export const formatDateNumeric = (date: string): string => {
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(date));
};

export const formatMonthYear = (date: string): string => {
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'long'
  }).format(new Date(date));
}; 