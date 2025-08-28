import { AxiosError } from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const handleApiError = (error: unknown): Error => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return new Error('Resource not found');
    }
    if (error.response?.status === 400) {
      return new Error('Invalid request');
    }
    if (error.response?.status === 500) {
      return new Error('Server error occurred');
    }
    if (!error.response) {
      return new Error('Network error - please check your connection');
    }
  }
  return new Error('An unexpected error occurred');
};

export const createEmptyResponse = <T>(defaultValue: T): ApiResponse<T> => ({
  success: false,
  message: 'No data available',
  data: defaultValue
});

export const handleApiResponse = <T>(response: any, defaultValue: T): ApiResponse<T> => {
  try {
    if (response?.data?.data) {
      return {
        success: true,
        message: response.data.message || 'Data fetched successfully',
        data: response.data.data
      };
    }
    if (Array.isArray(response?.data)) {
      return {
        success: true,
        message: 'Data fetched successfully',
        data: response.data
      };
    }
    return createEmptyResponse(defaultValue);
  } catch (error) {
    console.error('Error handling API response:', error);
    return createEmptyResponse(defaultValue);
  }
}; 