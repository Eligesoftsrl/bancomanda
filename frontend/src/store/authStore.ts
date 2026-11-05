import axios from 'axios';
import { create } from 'zustand';
import { sessionStorage, StoredSession, AuthUser } from '../services/authStorage';
import { useAppStore } from './appStore';

const authHttp = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
});

type Status = 'loading' | 'authed' | 'guest';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const toSession = (data: any): StoredSession => ({
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  user: data.user,
});

let refreshing: Promise<boolean> | null = null;

export const formatApiError = (error: any, fallback: string): string => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join(' ') || fallback;
  if (!error?.response) return 'Connessione assente. Controlla la rete e riprova.';
  return fallback;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const applySession = async (session: StoredSession) => {
    await sessionStorage.save(session);
    set({ status: 'authed', user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
  };

  const clearSession = async () => {
    await sessionStorage.clear();
    useAppStore.setState({ dishes: [], orders: [], customers: [], currentMenu: null, currentOrder: null });
    set({ status: 'guest', user: null, accessToken: null, refreshToken: null });
  };

  return {
    status: 'loading',
    user: null,
    accessToken: null,
    refreshToken: null,

    init: async () => {
      const session = await sessionStorage.load();
      if (session?.refreshToken) {
        set({ status: 'authed', user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
      } else {
        set({ status: 'guest' });
      }
    },

    login: async (email, password) => {
      const { data } = await authHttp.post('/login', { email: email.trim().toLowerCase(), password });
      await applySession(toSession(data));
    },

    logout: async () => {
      const token = get().refreshToken;
      if (token) authHttp.post('/logout', { refresh_token: token }).catch(() => {});
      await clearSession();
    },

    // Rinnova il token; esce solo se il server rifiuta la sessione (non per assenza di rete)
    refresh: async () => {
      if (refreshing) return refreshing;
      const token = get().refreshToken;
      if (!token) return false;
      refreshing = (async () => {
        try {
          const { data } = await authHttp.post('/refresh', { refresh_token: token });
          await applySession(toSession(data));
          return true;
        } catch (error: any) {
          const code = error?.response?.status;
          if (code === 401 || code === 403) await clearSession();
          return false;
        } finally {
          refreshing = null;
        }
      })();
      return refreshing;
    },

    // Il server scollega tutti gli altri dispositivi e restituisce una nuova sessione per questo
    changePassword: async (currentPassword, newPassword) => {
      const send = () =>
        authHttp.post(
          '/change-password',
          { current_password: currentPassword, new_password: newPassword },
          { headers: { Authorization: `Bearer ${get().accessToken}` } }
        );
      let response;
      try {
        response = await send();
      } catch (error: any) {
        if (error?.response?.status !== 401 || !(await get().refresh())) throw error;
        response = await send();
      }
      await applySession(toSession(response.data));
    },
  };
});
