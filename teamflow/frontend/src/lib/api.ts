import { ApiResponse } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  public code: string;
  public details?: any;
  public statusCode: number;

  constructor(message: string, code = 'UNKNOWN_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const actorId = localStorage.getItem('teamflow_current_actor_id') || '';

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (actorId) {
    headers.set('x-actor-id', actorId);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorPayload = data.error || {};
    throw new ApiError(
      errorPayload.message || response.statusText || 'Request failed',
      errorPayload.code || 'HTTP_ERROR',
      response.status,
      errorPayload.details
    );
  }

  return data as ApiResponse<T>;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
