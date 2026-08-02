/**
 * Cart Service
 * Shopping cart persistence — localStorage for guests, Firestore for authenticated users.
 * Document path: carts/{userId}
 *
 * Module 7 Phase 3+4: guest merge, realtime sync, offline handling, loading state.
 */

import {
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirestore, getUserCartDocRef } from './firestore-service.js';
import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';

const STORAGE_KEY = 'shoppingCart';
const CART_UPDATED_EVENT = 'cartUpdated';
const CART_LOADING_EVENT = 'cartLoadingChanged';

/** @type {Array<object>} */
let cachedCart = [];

/** @type {string | null} */
let currentUserId = null;

/** @type {Promise<void> | null} */
let initPromise = null;

/** @type {(() => void) | null} */
let cartUnsubscribe = null;

/** @type {string | null} */
let listenerUserId = null;

/** @type {boolean} */
let isLoading = false;

/** @type {boolean} */
let pendingGuestMerge = false;

/** @type {boolean} */
let storageListenerBound = false;

/**
 * Resolve a stable product identifier from a product object.
 * @param {object} product
 * @returns {string|null}
 */
function resolveProductId(product) {
  return product?.productId ?? product?.id ?? null;
}

/**
 * Normalize a product into a cart item shape.
 * @param {object} product
 * @param {number} [quantity=1]
 * @returns {object}
 */
function toCartItem(product, quantity = 1) {
  return {
    productId: resolveProductId(product),
    name: product.name,
    brand: product.brand,
    image: product.image,
    price: Number(product.price),
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

/**
 * Whether the current session uses Firestore for cart storage.
 * @returns {boolean}
 */
function usesFirestore() {
  return Boolean(currentUserId);
}

/**
 * Update and broadcast the cart loading flag.
 * @param {boolean} loading
 */
function setLoading(loading) {
  if (isLoading === loading) return;

  isLoading = loading;
  document.dispatchEvent(
    new CustomEvent(CART_LOADING_EVENT, { detail: { loading } }),
  );
}

/**
 * Notify UI layers that the cart cache changed.
 */
function notifyCartUpdated() {
  document.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

/**
 * Read and parse the cart from localStorage.
 * @returns {Array<object>}
 */
function readLocalCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const cart = JSON.parse(stored);
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

/**
 * Persist the cart array to localStorage.
 * @param {Array<object>} cart
 * @returns {Array<object>}
 */
function writeLocalCart(cart) {
  const normalized = Array.isArray(cart) ? cart : [];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error('[CartService] Failed to save cart to localStorage:', error);
  }

  return normalized;
}

/**
 * Read a user's cart document from Firestore.
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function readFirestoreCart(userId) {
  const docRef = getUserCartDocRef(userId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.data();
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * Write a user's cart document to Firestore.
 * @param {string} userId
 * @param {Array<object>} cart
 * @returns {Promise<Array<object>>}
 */
async function writeFirestoreCart(userId, cart) {
  const normalized = Array.isArray(cart) ? cart : [];
  const docRef = getUserCartDocRef(userId);

  await setDoc(
    docRef,
    {
      items: normalized,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return normalized;
}

/**
 * Merge guest cart items into a Firestore cart without overwriting existing entries.
 * Duplicate products combine quantities (Firestore + guest).
 * @param {Array<object>} firestoreCart
 * @param {Array<object>} guestCart
 * @returns {Array<object>}
 */
function mergeCarts(firestoreCart, guestCart) {
  const merged = firestoreCart.map((item) => ({ ...item }));

  for (const guestItem of guestCart) {
    const existing = merged.find((item) => item.productId === guestItem.productId);

    if (existing) {
      existing.quantity =
        (Number(existing.quantity) || 0) + (Number(guestItem.quantity) || 0);
    } else {
      merged.push({ ...guestItem });
    }
  }

  return merged;
}

/**
 * Whether two cart arrays contain the same items and quantities.
 * @param {Array<object>} left
 * @param {Array<object>} right
 * @returns {boolean}
 */
function cartsAreEqual(left, right) {
  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.productId === other.productId
      && Number(item.quantity) === Number(other.quantity)
      && Number(item.price) === Number(other.price)
    );
  });
}

/**
 * Merge localStorage guest cart into Firestore for the signed-in user.
 * Clears localStorage only after a successful write.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function mergeGuestCartIntoFirestore(userId) {
  const guestCart = readLocalCart();
  if (guestCart.length === 0) {
    pendingGuestMerge = false;
    return true;
  }

  try {
    const firestoreCart = await readFirestoreCart(userId);
    const merged = mergeCarts(firestoreCart, guestCart);
    await writeFirestoreCart(userId, merged);
    writeLocalCart([]);
    pendingGuestMerge = false;
    return true;
  } catch (error) {
    console.warn(
      '[CartService] Guest cart merge failed, will retry when online:',
      error.message ?? error,
    );
    pendingGuestMerge = true;
    return false;
  }
}

/**
 * Stop the active Firestore cart listener, if any.
 */
function stopCartListener() {
  if (cartUnsubscribe) {
    cartUnsubscribe();
    cartUnsubscribe = null;
  }

  listenerUserId = null;
}

/**
 * Apply cart items from Firestore to the in-memory cache when they changed.
 * @param {Array<object>} items
 */
function applyFirestoreCart(items) {
  const normalized = Array.isArray(items) ? items : [];

  if (cartsAreEqual(cachedCart, normalized)) {
    setLoading(false);
    return;
  }

  cachedCart = normalized;
  setLoading(false);
  notifyCartUpdated();
}

/**
 * Start a realtime Firestore listener for the user's cart document.
 * Reuses the existing listener when already attached to the same user.
 * @param {string} userId
 */
function startCartListener(userId) {
  if (listenerUserId === userId && cartUnsubscribe) {
    return;
  }

  stopCartListener();
  listenerUserId = userId;
  setLoading(true);

  const docRef = getUserCartDocRef(userId);

  cartUnsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      const data = snapshot.data();
      const items = Array.isArray(data?.items) ? data.items : [];
      applyFirestoreCart(items);

      if (pendingGuestMerge) {
        mergeGuestCartIntoFirestore(userId);
      }
    },
    (error) => {
      console.warn(
        '[CartService] Firestore cart listener error (will retry automatically):',
        error.message ?? error,
      );
      setLoading(false);
    },
  );
}

/**
 * Load cart data into the in-memory cache from the active storage backend.
 * @returns {Promise<Array<object>>}
 */
async function loadGuestCartIntoCache() {
  cachedCart = readLocalCart();
  setLoading(false);
  return cachedCart;
}

/**
 * Persist the in-memory cart to the active storage backend.
 * @param {Array<object>} cart
 * @returns {Promise<Array<object>>}
 */
async function persistCart(cart) {
  const normalized = Array.isArray(cart) ? cart : [];

  if (usesFirestore()) {
    cachedCart = normalized;
    notifyCartUpdated();

    try {
      await writeFirestoreCart(currentUserId, normalized);
    } catch (error) {
      console.warn(
        '[CartService] Failed to persist cart to Firestore (will retry when online):',
        error.message ?? error,
      );
    }

    return cachedCart;
  }

  cachedCart = writeLocalCart(normalized);
  notifyCartUpdated();
  return cachedCart;
}

/**
 * Sync guest cart from another browser tab via the storage event.
 * @param {StorageEvent} event
 */
function handleStorageEvent(event) {
  if (event.key !== STORAGE_KEY || usesFirestore()) {
    return;
  }

  cachedCart = readLocalCart();
  notifyCartUpdated();
}

/**
 * Bind the cross-tab localStorage listener once per page.
 */
function bindStorageListener() {
  if (storageListenerBound) return;

  window.addEventListener('storage', handleStorageEvent);
  storageListenerBound = true;
}

/**
 * Handle Firebase Auth state transitions for cart storage backend switching.
 * @param {import('firebase/auth').User | null} user
 * @param {boolean} [isInitial=false]
 */
async function handleAuthStateChange(user, isInitial = false) {
  const nextUserId = user?.uid ?? null;
  const previousUserId = currentUserId;
  const authChanged = nextUserId !== previousUserId;

  if (!authChanged && !isInitial) {
    return;
  }

  currentUserId = nextUserId;

  if (!nextUserId) {
    stopCartListener();
    pendingGuestMerge = false;
    await loadGuestCartIntoCache();
    notifyCartUpdated();
    return;
  }

  stopCartListener();

  const guestCart = readLocalCart();
  if (guestCart.length > 0) {
    setLoading(true);
    await mergeGuestCartIntoFirestore(nextUserId);
  }

  startCartListener(nextUserId);
}

/**
 * Ensure Firestore, Auth, and the cart cache are ready before operations.
 * @returns {Promise<void>}
 */
async function ensureReady() {
  await initCartService();
}

/**
 * Initialize cart service — Firestore, auth listener, and initial cache load.
 * @returns {Promise<void>}
 */
export async function initCartService() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    bindStorageListener();
    await initFirestore();
    await initFirebaseAuth();

    const auth = getFirebaseAuth();
    if (!auth) {
      await loadGuestCartIntoCache();
      return;
    }

    await new Promise((resolve) => {
      let isFirstAuthEvent = true;

      onAuthStateChanged(auth, async (user) => {
        const isInitial = isFirstAuthEvent;
        await handleAuthStateChange(user, isInitial);

        if (isFirstAuthEvent) {
          isFirstAuthEvent = false;
          resolve();
        } else {
          notifyCartUpdated();
        }
      });
    });
  })();

  return initPromise;
}

/**
 * Return the current cart items from the in-memory cache.
 * Call initCartService() before relying on authenticated cart data.
 * @returns {Array<object>}
 */
export function getCart() {
  return [...cachedCart];
}

/**
 * Return the total number of items in the cart (sum of all quantities).
 * @returns {number}
 */
export function getCartCount() {
  return cachedCart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

/**
 * Return the total price of all items in the cart (price × quantity).
 * @returns {number}
 */
export function getCartTotal() {
  return cachedCart.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );
}

/**
 * Whether the Firestore cart is currently loading for an authenticated user.
 * @returns {boolean}
 */
export function isCartLoading() {
  return isLoading;
}

/**
 * Add a product to the cart.
 * If the product already exists, its quantity is increased by 1.
 * @param {object} product
 * @returns {Promise<Array<object>>}
 */
export async function addToCart(product) {
  await ensureReady();

  const productId = resolveProductId(product);
  if (!productId) {
    throw new Error('[CartService] Product must have a productId or id');
  }

  const cart = getCart();
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push(toCartItem(product, 1));
  }

  return persistCart(cart);
}

/**
 * Remove a product entirely from the cart by its productId.
 * @param {string} productId
 * @returns {Promise<Array<object>>}
 */
export async function removeFromCart(productId) {
  await ensureReady();

  const cart = getCart().filter((item) => item.productId !== productId);
  return persistCart(cart);
}

/**
 * Update the quantity of a cart item (minimum 1).
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Array<object>>}
 */
export async function updateQuantity(productId, quantity) {
  await ensureReady();

  const cart = getCart();
  const item = cart.find((entry) => entry.productId === productId);

  if (!item) {
    return cart;
  }

  item.quantity = Math.max(1, Number(quantity) || 1);
  return persistCart(cart);
}

/**
 * Remove all items from the cart.
 * @returns {Promise<Array<object>>}
 */
export async function clearCart() {
  await ensureReady();
  return persistCart([]);
}

/**
 * Whether the cart is stored in Firestore for the current session.
 * @returns {boolean}
 */
export function isUsingFirestoreCart() {
  return usesFirestore();
}

export { CART_UPDATED_EVENT, CART_LOADING_EVENT };
