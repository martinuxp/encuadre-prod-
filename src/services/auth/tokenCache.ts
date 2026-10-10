// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Clerk Token Cache
// Soporte de persistencia para Web y Nativo (SecureStore)
// ═══════════════════════════════════════════════════════

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

const createTokenCache = (): TokenCache => {
  if (Platform.OS === 'web') {
    return {
      getToken: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      saveToken: async (key: string, token: string) => {
        try {
          localStorage.setItem(key, token);
        } catch {}
      },
      clearToken: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      },
    };
  }

  return {
    getToken: async (key: string) => {
      try {
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch {
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        await SecureStore.setItemAsync(key, token);
      } catch {}
    },
  };
};

export const tokenCache = createTokenCache();
