import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  return useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login: state.login,
    register: state.register,
    logout: state.logout,
    loadMe: state.loadMe,
  }));
}
