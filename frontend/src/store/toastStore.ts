import { create } from 'zustand';

export type ToastType = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: (id: number) => void;
}

// Avviso unico per tutta l'app: viene disegnato sopra a ogni finestra aperta
export const useToastStore = create<ToastState>((set) => ({
  id: 0,
  message: '',
  type: 'success',
  show: (message, type = 'success') => set((s) => ({ id: s.id + 1, message, type })),
  hide: (id) => set((s) => (s.id === id ? { message: '' } : s)),
}));

export const notify = (message: string, type: ToastType = 'success') => useToastStore.getState().show(message, type);

export const dismissToast = () => useToastStore.getState().hide(useToastStore.getState().id);
