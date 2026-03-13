export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface SearchParams {
  query: string;
  sources?: string[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
