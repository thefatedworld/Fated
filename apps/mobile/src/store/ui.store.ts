import { create } from 'zustand';

interface UiState {
  // Token balance (refreshed after IAP or unlock)
  tokenBalance: number | null;
  setTokenBalance: (balance: number) => void;
  refreshTokenBalance: () => Promise<void>;
}

export const useUiStore = create<UiState>((set) => ({
  tokenBalance: null,

  setTokenBalance: (balance) => set({ tokenBalance: balance }),

  refreshTokenBalance: async () => {
    try {
      const { api } = await import('@/lib/api-client');
      const wallet = await api.getWallet();
      set({ tokenBalance: wallet.balance });
    } catch {
      // Silently ignore — balance shown as stale
    }
  },
}));
