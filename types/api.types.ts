export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
