import axios, { AxiosInstance } from 'axios';

/**
 * Determine API Base URL:
 * - Uses import.meta.env.VITE_API_URL if defined (ensuring /api path is present).
 * - Defaults to '/api' for local dev with Vite proxy or production with Vercel rewrites.
 * - Does NOT hardcode localhost or 0.0.0.0 for production.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  return '/api';
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching JWT Bearer token & safe dev diagnostics
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Safe diagnostic logging in development (never logs request payloads or tokens)
  if (import.meta.env.DEV) {
    console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }

  return config;
});

// Interceptor for safe error diagnostics in development
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.warn(
        `[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> Status: ${
          error.response?.status || 'NETWORK_ERROR'
        }`
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
