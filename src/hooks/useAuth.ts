import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '../types/auth';

interface AuthStore extends AuthState {
  setUser: (user: AuthState['user']) => void;
  setToken: (token: AuthState['token']) => void;
  logout: () => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => set((state) => ({ 
        ...state, 
        user, 
        isAuthenticated: !!user 
      })),
      setToken: (token) => set((state) => ({ 
        ...state, 
        token 
      })),
      logout: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
