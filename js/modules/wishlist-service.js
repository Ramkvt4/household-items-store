/**
 * Wishlist Service — Firestore wishlist CRUD (Module 10).
 * Path: users/{uid}/wishlist/{productId}
 */

import {
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  initFirestore,
  getUserWishlistCollectionRef,
  getUserWishlistDocRef,
} from './firestore-service.js';
import { getOrderTimestampMs } from '../utils/order-display.js';
import {
  isNetworkOrOfflineError,
  isPermissionError,
} from '../utils/network-error.js';

/**
 * Build the product snapshot stored on a wishlist document.
 * @param {object} product
 * @returns {{ name: string, brand: string, price: number, image: string }}
 */
export function buildWishlistProductSnapshot(product) {
  return {
    name: String(product?.name ?? '').trim(),
    brand: String(product?.brand ?? '').trim(),
    price: Number(product?.price) || 0,
    image: String(product?.image ?? '').trim(),
  };
}

/**
 * Normalize a wishlist Firestore document for UI use.
 * @param {import('firebase/firestore').QueryDocumentSnapshot | import('firebase/firestore').DocumentSnapshot} docSnap
 * @returns {object}
 */
export function normalizeWishlistItem(docSnap) {
  const data = docSnap.data() || {};
  const snapshot =
    data.productSnapshot && typeof data.productSnapshot === 'object'
      ? data.productSnapshot
      : {};

  const productId = String(data.productId || docSnap.id);

  return {
    id: docSnap.id,
    productId,
    addedAt: data.addedAt ?? null,
    productSnapshot: {
      name: String(snapshot.name ?? '').trim(),
      brand: String(snapshot.brand ?? '').trim(),
      price: Number(snapshot.price) || 0,
      image: String(snapshot.image ?? '').trim(),
    },
  };
}

/**
 * Sort wishlist items newest-first by addedAt.
 * @param {Array<object>} items
 * @returns {Array<object>}
 */
export function sortWishlistItems(items) {
  return [...items].sort(
    (a, b) => getOrderTimestampMs(b.addedAt) - getOrderTimestampMs(a.addedAt),
  );
}

/**
 * Whether a product is already in the user's wishlist.
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
export async function isInWishlist(userId, productId) {
  if (!userId || !productId) return false;

  await initFirestore();
  const snapshot = await getDoc(getUserWishlistDocRef(userId, productId));
  return snapshot.exists();
}

/**
 * Return all wishlisted product IDs for a user.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getWishlistProductIds(userId) {
  if (!userId) return [];

  const items = await getWishlistItems(userId);
  return items.map((item) => item.productId);
}

/**
 * Load all wishlist items for a user (newest first).
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getWishlistItems(userId) {
  if (!userId) return [];

  await initFirestore();
  const snapshot = await getDocs(getUserWishlistCollectionRef(userId));
  const items = snapshot.docs.map((docSnap) => normalizeWishlistItem(docSnap));
  return sortWishlistItems(items);
}

/**
 * Subscribe to realtime wishlist changes for a user.
 * @param {string} userId
 * @param {(items: Array<object>) => void} onChange
 * @param {(error: Error) => void} [onError]
 * @returns {Promise<() => void>} Unsubscribe function
 */
export async function subscribeToWishlist(userId, onChange, onError) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  await initFirestore();

  return onSnapshot(
    getUserWishlistCollectionRef(userId),
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => normalizeWishlistItem(docSnap));
      onChange(sortWishlistItems(items));
    },
    (error) => {
      console.error('[Wishlist] Realtime listener failed:', error);
      if (typeof onError === 'function') {
        onError(error);
      }
    },
  );
}

/**
 * Add a product to the wishlist (doc id = productId prevents duplicates).
 * @param {string} userId
 * @param {object} product
 * @returns {Promise<void>}
 */
export async function addToWishlist(userId, product) {
  const productId = product?.id;
  if (!userId || !productId) {
    throw new Error('[Wishlist] userId and product.id are required');
  }

  await initFirestore();

  await setDoc(getUserWishlistDocRef(userId, productId), {
    productId,
    addedAt: serverTimestamp(),
    productSnapshot: buildWishlistProductSnapshot(product),
  });
}

/**
 * Remove a product from the wishlist.
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function removeFromWishlist(userId, productId) {
  if (!userId || !productId) {
    throw new Error('[Wishlist] userId and productId are required');
  }

  await initFirestore();
  await deleteDoc(getUserWishlistDocRef(userId, productId));
}

/**
 * Toggle wishlist membership for a product.
 * @param {string} userId
 * @param {object} product
 * @returns {Promise<{ added: boolean }>}
 */
export async function toggleWishlist(userId, product) {
  const productId = product?.id;
  if (!userId || !productId) {
    throw new Error('[Wishlist] userId and product.id are required');
  }

  const exists = await isInWishlist(userId, productId);

  if (exists) {
    await removeFromWishlist(userId, productId);
    return { added: false };
  }

  await addToWishlist(userId, product);
  return { added: true };
}

/**
 * Friendly message for wishlist failures.
 * @param {unknown} error
 * @returns {string}
 */
export function getFriendlyWishlistErrorMessage(error) {
  if (isNetworkOrOfflineError(error)) {
    return 'Unable to update wishlist right now. Please check your connection and try again.';
  }

  if (isPermissionError(error)) {
    return 'Please sign in to manage your wishlist.';
  }

  return 'Something went wrong while updating your wishlist. Please try again.';
}
