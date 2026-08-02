/**
 * Auth entry point (Module 6.2 Phase 1)
 * Firebase Authentication setup only — login/register in later phases.
 */

import {
  initFirebaseAuth,
  getFirebaseAuth,
  AUTH_SIGN_IN_METHOD,
  isFirebaseConfigured,
} from './modules/firebase-init.js';

await initFirebaseAuth();

export {
  initFirebaseAuth,
  getFirebaseAuth,
  AUTH_SIGN_IN_METHOD,
  isFirebaseConfigured,
};
