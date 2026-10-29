import axios, { AxiosInstance } from 'axios';

/**
 * Determine API Base URL:
 * - Uses import.meta.env.VITE_API_URL or VITE_BACKEND_URL if defined (ensuring /api path is present).
 * - Defaults to '/api' for local dev with Vite proxy or production with relative rewrites.
 * - Does NOT hardcode localhost or 0.0.0.0 for production.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)?.trim();
  if (envUrl && envUrl.length > 0) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  return '/api';
};

/**
 * Detects if the frontend is running in a hosted production browser environment
 * without a configured backend API URL.
 */
export const isProductionApiMissing = (): boolean => {
  if (!import.meta.env.PROD) return false;
  // If in Node.js test environment or SSR without window, do not trigger
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  // Allow localhost, 127.0.0.1, and 0.0.0.0 (e.g. running 'npm run preview' locally)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return false;
  }

  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)?.trim();
  return !envUrl || envUrl.length === 0;
};

/**
 * Distinguishes backend unavailability, incorrect API URL, CORS errors,
 * timeout errors, and HTTP validation failures into clear user-facing messages.
 */
export const formatApiErrorMessage = (err: any): string => {
  // 1. Backend application response containing custom validation error message
  if (err?.response?.data) {
    const serverMsg = err.response.data.message || err.response.data.error;
    if (typeof serverMsg === 'string' && serverMsg.trim()) {
      return serverMsg.trim();
    }
  }

  // 2. Gateway / Proxy HTTP status errors (502, 503, 504)
  if (err?.response?.status) {
    const status = err.response.status;
    if (status === 502 || status === 503 || status === 504) {
      return `Backend service is temporarily unavailable (HTTP ${status}). If your Render service is waking up, please wait 30 seconds and retry.`;
    }
    if (status === 404) {
      return `API endpoint not found (HTTP 404 at ${err.config?.url || 'server'}). Please verify the backend deployment.`;
    }
    if (status === 413) {
      return 'The uploaded image is too large. Please select an image under 5MB.';
    }
  }

  // 3. Timeout errors (frequent during Render free tier cold-starts)
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase().includes('timeout')) {
    return 'Backend request timed out. If your Render backend was sleeping, it may take up to 60 seconds to wake up. Please wait a moment and try again.';
  }

  // 4. Missing API URL configuration in hosted production
  if (err?.code === 'ERR_MISSING_API_URL' || err?.message?.includes('VITE_API_URL')) {
    return err.message;
  }

  // 5. Network / CORS / Unreachable error
  if (!err?.response) {
    if (import.meta.env.PROD) {
      const baseUrl = getApiBaseUrl();
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://erp-delivery-five.vercel.app';
      return `Backend server at ${baseUrl} is not reachable. If your backend is hosted on Render, ensure the service is live and FRONTEND_URL is configured to allow '${currentOrigin}'.`;
    }
    return `Backend server is not reachable at ${getApiBaseUrl()}. Please start the local backend server with \`npm run dev\` or \`npm run dev:backend\`.`;
  }

  return err?.message || 'An unexpected error occurred while communicating with the backend.';
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60 seconds to accommodate Render container cold-start & OCR processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching JWT Bearer token & checking production API URL configuration
apiClient.interceptors.request.use((config) => {
  if (isProductionApiMissing()) {
    const error: any = new Error(
      'Backend API URL is not configured. Please set the VITE_API_URL environment variable in your Vercel project settings to your deployed Render URL (e.g. https://<your-service>.onrender.com) and redeploy.'
    );
    error.code = 'ERR_MISSING_API_URL';
    return Promise.reject(error);
  }

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
          error.response?.status || error.code || 'NETWORK_ERROR'
        }`
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
