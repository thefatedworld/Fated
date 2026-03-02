import { create } from 'zustand';
import { Me } from '@/lib/api-client';
import { saveTokens, clearTokens, getValidAccessToken } from '@/lib/auth';
import { api, AuthTokens } from '@/lib/api-client';

interface AuthState {
  user: Me | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (user: Me | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: user !== null, isLoading: false }),

  loadMe: async () => {
    const token = await getValidAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const me = await api.getMe();
      set({ user: me, isAuthenticated: true, isLoading: false });
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const tokens: AuthTokens = await api.login(email, password);
    await saveTokens(tokens);
    const me = await api.getMe();
    set({ user: me, isAuthenticated: true });
  },

  register: async (data) => {
    const tokens: AuthTokens = await api.register(data);
    await saveTokens(tokens);
    const me = await api.getMe();
    set({ user: me, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const { getRefreshToken } = await import('@/lib/auth');
      const refreshToken = await getRefreshToken();
      if (refreshToken) await api.logout(refreshToken);
    } catch {
      // Best-effort — clear tokens regardless
    }
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
