import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'bancomanda.session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const isWeb = Platform.OS === 'web';

export const sessionStorage = {
  async load(): Promise<StoredSession | null> {
    try {
      const raw = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async save(session: StoredSession): Promise<void> {
    const raw = JSON.stringify(session);
    if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
    else await SecureStore.setItemAsync(KEY, raw);
  },
  async clear(): Promise<void> {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  },
};
