import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiService from '../services/api';
import type { User } from '../services/api';
import { useChessStore } from './chessStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithOAuth: (provider: 'google') => void;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (name: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.login({ email, password });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            apiService.setAuthToken(token);
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            // Load user's boards from backend after successful login
            try {
              await useChessStore.getState().loadBoardsFromBackend();
              // Start auto-sync after successful login and board loading
              useChessStore.getState().startAutoSync();
            } catch (error) {
              console.warn('Failed to load boards after login:', error);
              // Don't fail login if board loading fails
              // Still start auto-sync even if board loading fails
              useChessStore.getState().startAutoSync();
            }
            
            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Login failed'
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          return false;
        }
      },

      register: async (name: string, email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.register({ name, email, password });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            apiService.setAuthToken(token);
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Registration failed'
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          return false;
        }
      },

      loginWithOAuth: (provider: 'google') => {
        const authUrl = apiService.getGoogleAuthUrl();
        
        // Store the current URL to redirect back after OAuth
        localStorage.setItem('oauth_redirect_url', window.location.href);
        
        // Redirect to OAuth provider
        window.location.href = authUrl;
      },

      logout: () => {
        // Stop auto-sync on logout
        useChessStore.getState().stopAutoSync();
        apiService.removeAuthToken();
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const token = apiService.getAuthToken();
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await apiService.getProfile();
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            // Load user's boards from backend after auth check
            try {
              await useChessStore.getState().loadBoardsFromBackend();
              // Start auto-sync after successful auth check and board loading
              useChessStore.getState().startAutoSync();
            } catch (error) {
              console.warn('Failed to load boards after auth check:', error);
              // Still start auto-sync even if board loading fails
              useChessStore.getState().startAutoSync();
            }
          } else {
            // Token is invalid, remove it
            apiService.removeAuthToken();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
          }
        } catch (error) {
          // Token is invalid, remove it
          apiService.removeAuthToken();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      updateProfile: async (name: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.updateProfile({ name });
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isLoading: false,
              error: null
            });
            return true;
          } else {
            set({
              isLoading: false,
              error: response.message || 'Profile update failed'
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          return false;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
