import { Platform } from 'react-native';
import { create } from 'zustand';

const KEY = 'bancomanda.sidebarCollapsed';
const isWeb = Platform.OS === 'web';

const load = () => {
  try {
    return isWeb && globalThis.localStorage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

type UiState = { sidebarCollapsed: boolean; toggleSidebar: () => void };

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: load(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    if (isWeb) globalThis.localStorage?.setItem(KEY, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },
}));
