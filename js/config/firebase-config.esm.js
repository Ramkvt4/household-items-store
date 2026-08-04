/**
 * Firebase config — ES module export for auth pages.
 * Keep in sync with js/config/firebase-config.js
 */

export const firebaseAppConfig = {
  apiKey: 'AIzaSyDkkqKv_RzpTGkDB2dmEdjUKuiwkaFBy8w',
  authDomain: 'homeappliance-hub.firebaseapp.com',
  projectId: 'homeappliance-hub',
  storageBucket: 'homeappliance-hub.firebasestorage.app',
  messagingSenderId: '775949673512',
  appId: '1:775949673512:web:6d0278a527a705dee0011d',
  measurementId: 'G-QZZ5SDJT84',
};

/**
 * Customer auth uses Email/Password only (enable in Firebase Console).
 * @type {'emailPassword'}
 */
export const AUTH_SIGN_IN_METHOD = 'emailPassword';

/** Firestore collection names — keep in sync with js/config/firebase-config.js */
export const firebaseCollections = {
  products: 'products',
  categories: 'categories',
  orders: 'orders',
  inquiries: 'inquiries',
  admins: 'admins',
  carts: 'carts',
  users: 'users',
  coupons: 'coupons',
  reviews: 'reviews',
};

/**
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseAppConfig.apiKey && !firebaseAppConfig.apiKey.includes('YOUR_'),
  );
}
