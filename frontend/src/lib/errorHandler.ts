import { AxiosError } from 'axios';

export interface ApiError {
  status: string;
  message: string;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    // Handle Axios errors
    if (error.response?.data) {
      return {
        status: error.response.data.status || 'error',
        message: error.response.data.message || 'An unexpected error occurred'
      };
    }
    return {
      status: 'error',
      message: error.message || 'Network error occurred'
    };
  }

  // Handle other types of errors
  if (error instanceof Error) {
    return {
      status: 'error',
      message: error.message
    };
  }

  // Fallback for unknown errors
  return {
    status: 'error',
    message: 'An unexpected error occurred'
  };
};

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}; 