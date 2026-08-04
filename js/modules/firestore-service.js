/**
 * Firestore Service (Module 7 Phase 1)
 * Reusable Firestore initialization and helpers for customer-facing features.
 * Prepares Firestore for customer shopping cart storage (Phase 2+).
 */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  firebaseAppConfig,
  firebaseCollections,
  isFirebaseConfigured,
} from '../config/firebase-config.esm.js';

/** @type {import('firebase/firestore').Firestore | null} */
let db = null;

/** @type {boolean} */
let initialized = false;

/**
 * Return the shared Firebase app instance (creates one if needed).
 * @returns {import('firebase/app').FirebaseApp}
 */
function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseAppConfig);
}

/**
 * Initialize Firestore using the existing Firebase configuration.
 * @returns {Promise<import('firebase/firestore').Firestore | null>}
 */
export async function initFirestore() {
  if (initialized && db) {
    return db;
  }

  if (!isFirebaseConfigured()) {
    console.warn(
      '[Firestore] Add your project credentials in js/config/firebase-config.js',
    );
    return null;
  }

  try {
    const app = getFirebaseApp();
    db = getFirestore(app);
    initialized = true;
    console.log('[Firestore] Initialized successfully');
    return db;
  } catch (error) {
    console.error('[Firestore] Initialization failed:', error);
    db = null;
    initialized = false;
    return null;
  }
}

/**
 * Return the initialized Firestore instance, or null if not ready.
 * @returns {import('firebase/firestore').Firestore | null}
 */
export function getFirestoreDb() {
  return db;
}

/**
 * Whether Firestore has been initialized in this session.
 * @returns {boolean}
 */
export function isFirestoreInitialized() {
  return initialized && db !== null;
}

/**
 * Verify Firestore initialized correctly (no reads or writes).
 * @returns {Promise<import('firebase/firestore').Firestore | null>}
 */
export async function verifyFirestoreConnection() {
  const firestore = db || (await initFirestore());

  if (!firestore) {
    console.error('[Firestore] Verification failed: instance not available');
    return null;
  }

  console.log('[Firestore] Verified — ready for customer cart storage');
  return firestore;
}

/**
 * @param {string} collectionName
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function getCollectionRef(collectionName) {
  if (!db) {
    throw new Error('[Firestore] Not initialized. Call initFirestore() first.');
  }

  return collection(db, collectionName);
}

/**
 * @param {string} collectionName
 * @param {string} docId
 * @returns {import('firebase/firestore').DocumentReference}
 */
export function getDocRef(collectionName, docId) {
  if (!db) {
    throw new Error('[Firestore] Not initialized. Call initFirestore() first.');
  }

  return doc(db, collectionName, docId);
}

/**
 * Document reference for a user's shopping cart (Module 7 Phase 2+).
 * @param {string} userId - Firebase Auth UID
 * @returns {import('firebase/firestore').DocumentReference}
 */
export function getUserCartDocRef(userId) {
  if (!userId) {
    throw new Error('[Firestore] userId is required for cart document reference');
  }

  return getDocRef(firebaseCollections.carts, userId);
}

/** Wishlist subcollection name under users/{uid} (Module 10). */
export const WISHLIST_SUBCOLLECTION = 'wishlist';

/**
 * Collection reference for a user's wishlist.
 * Path: users/{userId}/wishlist
 * @param {string} userId
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function getUserWishlistCollectionRef(userId) {
  if (!userId) {
    throw new Error('[Firestore] userId is required for wishlist collection reference');
  }

  if (!db) {
    throw new Error('[Firestore] Not initialized. Call initFirestore() first.');
  }

  return collection(db, firebaseCollections.users, userId, WISHLIST_SUBCOLLECTION);
}

/**
 * Document reference for a wishlist item.
 * Path: users/{userId}/wishlist/{productId}
 * @param {string} userId
 * @param {string} productId
 * @returns {import('firebase/firestore').DocumentReference}
 */
export function getUserWishlistDocRef(userId, productId) {
  if (!userId) {
    throw new Error('[Firestore] userId is required for wishlist document reference');
  }

  if (!productId) {
    throw new Error('[Firestore] productId is required for wishlist document reference');
  }

  if (!db) {
    throw new Error('[Firestore] Not initialized. Call initFirestore() first.');
  }

  return doc(
    db,
    firebaseCollections.users,
    userId,
    WISHLIST_SUBCOLLECTION,
    productId,
  );
}

export { firebaseCollections as FIRESTORE_COLLECTIONS, isFirebaseConfigured };
