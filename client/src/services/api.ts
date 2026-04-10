/**
 * ============================================================
 * API CLIENT CONFIGURATION
 * ============================================================
 *
 * This file configures Axios for all API requests to the backend.
 * It includes:
 * - Base URL configuration
 * - Request interceptors (adds auth token)
 * - Response interceptors (handles errors)
 * - Token refresh logic
 *
 * All API calls in the application should use this configured
 * instance to ensure consistent authentication and error handling.
 *
 * ============================================================
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse } from "@/types";

/**
 * API_BASE_URL - The base URL for all API requests
 *
 * In development, Vite's proxy handles /api routes.
 * In production, this would be the actual API server URL.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

/**
 * api - The configured Axios instance
 *
 * Use this instance for all API calls to ensure:
 * - Consistent headers
 * - Automatic token attachment
 * - Standardized error handling
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Timeout after 30 seconds
  timeout: 30000,
});

/**
 * Request Interceptor
 *
 * Runs before every request to:
 * 1. Attach the auth token from localStorage
 * 2. Log requests in development mode
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem("hlms_token");

    // If token exists, add it to Authorization header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development for debugging
    if (import.meta.env.DEV) {
      console.log(
        `📤 ${config.method?.toUpperCase()} ${config.url}`,
        config.data,
      );
    }

    return config;
  },
  (error: AxiosError) => {
    // Log request errors
    console.error("Request Error:", error);
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 *
 * Runs after every response to:
 * 1. Handle successful responses
 * 2. Handle errors (401 unauthorized, etc.)
 * 3. Standardize error format
 */
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.config.url}`, response.data);
    }

    // Return the response data directly
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - User session expired or invalid
    if (error.response?.status === 401) {
      // Clear stored auth data
      localStorage.removeItem("hlms_token");
      localStorage.removeItem("hlms_user");

      // Redirect to login page
      // We use window.location to force a full page reload
      // This ensures all state is cleared
      window.location.href = "/login";

      return Promise.reject(error);
    }

    // Handle 403 Forbidden - User doesn't have permission
    if (error.response?.status === 403) {
      console.error("Access denied:", error.response.data?.error?.message);
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error("Resource not found:", originalRequest?.url);
    }

    // Handle 422 Validation Error
    if (error.response?.status === 422) {
      // The validation errors are in the response data
      return Promise.reject(error);
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data?.error?.message);
    }

    // Handle network errors (no response)
    if (!error.response) {
      console.error("Network error - check your connection");
    }

    // Return a rejected promise with the error
    return Promise.reject(error);
  },
);

/**
 * setAuthToken - Helper to set the auth token
 *
 * @param token - The JWT token to store
 *
 * @example
 * // After successful login
 * setAuthToken(response.data.token);
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem("hlms_token", token);
};

/**
 * removeAuthToken - Helper to clear the auth token
 *
 * @example
 * // On logout
 * removeAuthToken();
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem("hlms_token");
  localStorage.removeItem("hlms_user");
};

/**
 * getAuthToken - Helper to get the current auth token
 *
 * @returns The current token or null
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem("hlms_token");
};

/**
 * isAuthenticated - Check if user is authenticated
 *
 * @returns Boolean indicating if user has a valid token
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;

  // Check if token is expired
  try {
    // JWT tokens have 3 parts: header.payload.signature
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < expiry;
  } catch {
    return false;
  }
};

// Export the configured axios instance as default
export default api;
