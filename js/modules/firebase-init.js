/**
 * Firebase Auth Initialization (Module 6.2 Phase 1)
 * Initializes Firebase App and Auth for customer-facing pages.
 * Sign-in method: Email/Password only.
 */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  firebaseAppConfig,
  AUTH_SIGN_IN_METHOD,
  isFirebaseConfigured,
} from '../config/firebase-config.esm.js';

/** @type {import('firebase/auth').Auth | null} */
let auth = null;

/** @type {boolean} */
let initialized = false;

/**
 * Initialize Firebase App and Auth with Email/Password provider.
 * Email/Password must be enabled in Firebase Console:
 * Authentication → Sign-in method → Email/Password → Enable
 * @returns {Promise<import('firebase/auth').Auth | null>}
 */
export async function initFirebaseAuth() {
  if (initialized && auth) {
    return auth;
  }

  if (!isFirebaseConfigured()) {
    console.warn(
      '[Firebase Auth] Add your project credentials in js/config/firebase-config.js',
    );
    return null;
  }

  if (AUTH_SIGN_IN_METHOD !== 'emailPassword') {
    console.warn('[Firebase Auth] Only Email/Password is supported for customer auth.');
    return null;
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseAppConfig);
    auth = getAuth(app);

    await setPersistence(auth, browserLocalPersistence);

    initialized = true;
    return auth;
  } catch (error) {
    console.error('[Firebase Auth] Initialization failed:', error);
    auth = null;
    initialized = false;
    return null;
  }
}

/**
 * Return the initialized Auth instance, or null if not ready.
 * @returns {import('firebase/auth').Auth | null}
 */
export function getFirebaseAuth() {
  return auth;
}

export { AUTH_SIGN_IN_METHOD, isFirebaseConfigured };
