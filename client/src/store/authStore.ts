/**
 * ============================================================
 * AUTHENTICATION STORE (Zustand)
 * ============================================================
 *
 * This store manages all authentication-related state:
 * - Current user information
 * - Login/logout actions
 * - Session management
 * - Loading and error states
 *
 * Using Zustand for state management because it's:
 * - Simple and lightweight
 * - No boilerplate
 * - TypeScript-friendly
 * - Supports middleware (persist, devtools)
 *
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginCredentials, AuthResponse } from "@/types";
import api, { setAuthToken, removeAuthToken } from "@/services/api";
import { socketService } from "@/services/socket";

/**
 * AuthState - The shape of our authentication state
 */
interface AuthState {
  // User data
  user: User | null;
  token: string | null;

  // UI states
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

/**
 * useAuthStore - The Zustand store for authentication
 *
 * Uses persist middleware to save user data to localStorage
 * so users stay logged in across page refreshes.
 *
 * @example
 * // In a component
 * const { user, login, logout, isLoading } = useAuthStore();
 *
 * // Login
 * await login({ username: 'john', password: 'secret' });
 *
 * // Access user
 * console.log(user?.fullName);
 *
 * // Logout
 * await logout();
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      /**
       * login - Authenticates user with credentials
       *
       * Handles the login flow:
       * 1. Sends credentials to /auth/login
       * 2. On success: stores token and user data
       * 3. On failure: sets error message
       *
       * @param credentials - Username and password
       * @returns AuthResponse with success/error info
       */
      login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        // Set loading state, clear previous errors
        set({ isLoading: true, error: null });

        try {
          // Make login API request
          const response = await api.post<AuthResponse>(
            "/auth/login",
            credentials,
          );
          const data = response.data;
          const payload = (data as any).data;

          if (data.success && payload?.token && payload?.user) {
            // Store token in localStorage (for API requests)
            setAuthToken(payload.token);
            socketService.connect(payload.token);

            // Update store state
            set({
              user: payload.user,
              token: payload.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return {
              ...data,
              user: payload.user,
              token: payload.token,
            } as AuthResponse;
          } else {
            // Login failed (e.g., already logged in elsewhere)
            const errorMessage =
              (data as any)?.error?.message || data.error || "Login failed";
            set({
              isLoading: false,
              error: errorMessage,
            });

            return data;
          }
        } catch (error: unknown) {
          // Handle network or server errors
          const axiosError = error as any;
          const errorMessage =
            axiosError?.response?.data?.error?.message ||
            axiosError?.response?.data?.message ||
            (error instanceof Error
              ? error.message
              : "An error occurred during login");

          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      /**
       * logout - Logs out the current user
       *
       * Handles logout flow:
       * 1. Calls /auth/logout to invalidate session
       * 2. Clears local token and user data
       * 3. Resets store to initial state
       */
      logout: async (): Promise<void> => {
        set({ isLoading: true });

        try {
          // Notify server of logout (to invalidate session)
          await api.post("/auth/logout");
        } catch (error) {
          // Even if server call fails, we still clear local data
          console.error("Logout API error:", error);
        } finally {
          // Clear local storage
          removeAuthToken();
          socketService.disconnect();

          // Reset store state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * checkAuth - Validates current authentication status
       *
       * Called on app load to:
       * 1. Check if stored token is still valid
       * 2. Fetch fresh user data
       * 3. Handle expired sessions
       */
      checkAuth: async (): Promise<void> => {
        const { token } = get();

        // No token means not authenticated
        if (!token) {
          set({ isAuthenticated: false, user: null, error: null });
          socketService.disconnect();
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Validate token and get user data
          const response = await api.get<{ success: boolean; data?: { user: User } }>(
            "/auth/me",
          );

          // Get the nested data payload
          const payload = (response.data as any).data;

          if (response.data.success && payload && payload.user) {
            // Also ensure the api interceptor has the token (just in case)
            setAuthToken(token);
            socketService.connect(token);
            set({
              user: payload.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token invalid, clear auth
            removeAuthToken();
            socketService.disconnect();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          // Token expired or invalid
          console.error("Auth check failed:", error);
          removeAuthToken();
          socketService.disconnect();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * clearError - Clears the current error message
       * Used after displaying error to user
       */
      clearError: (): void => {
        set({ error: null });
      },

      /**
       * setUser - Manually set user data
       * Used when user data is updated (e.g., profile edit)
       */
      setUser: (user: User): void => {
        set({ user });
      },
    }),
    {
      // Persist configuration
      name: "hlms-auth-storage", // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/**
 * Selector hooks for common patterns
 * These help components subscribe to specific pieces of state
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
