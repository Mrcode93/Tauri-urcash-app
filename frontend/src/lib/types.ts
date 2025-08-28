export interface BaseState {
  loading: boolean;
  error: string | null;
}

export interface PaginatedState<T> extends BaseState {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleItemState<T> extends BaseState {
  item: T | null;
}

export interface ListState<T> extends BaseState {
  items: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
} 