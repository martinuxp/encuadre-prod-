// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Firebase Initialization Config
// Incluye Auth inicializado para reglas de Firestore
// ═══════════════════════════════════════════════════════

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  Auth,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar la App de Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializar Firebase Auth
const auth: Auth = getAuth(app);

// Inicializar Firestore con soporte de persistencia local (offline capability)
const db = initializeFirestore(app, {
  localCache:
    Platform.OS === 'web'
      ? persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        })
      : undefined,
});

// Inicializar Firebase Storage
const storage = getStorage(app);

// ─── Auto-authenticate anónimamente con Firebase ─────────────────────────────
// Esto asegura que request.auth != null en las reglas de Firestore/Storage
// mientras se implementa la integración completa Clerk → Firebase Custom Tokens.
const ensureFirebaseAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        // No hay sesión en Firebase → iniciar sesión anónima
        signInAnonymously(auth)
          .then(() => resolve())
          .catch((err) => {
            console.error('[Firebase] Error al autenticar anónimamente:', err);
            resolve(); // Continuar aunque falle
          });
      } else {
        resolve();
      }
    });
  });
};

// Ejecutar la autenticación al cargar el módulo
ensureFirebaseAuth();

export { app, auth, db, storage, ensureFirebaseAuth };
