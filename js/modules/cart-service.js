/**
 * Cart Service
 * Shopping cart persistence — localStorage for guests, Firestore for authenticated users.
 * Document path: carts/{userId}
 */

import { getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirestore, getUserCartDocRef } from './firestore-service.js';
import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';

const STORAGE_KEY = 'shoppingCart';
const CART_UPDATED_EVENT = 'cartUpdated';

/** @type {Array<object>} */
let cachedCart = [];

/** @type {string | null} */
let currentUserId = null;

/** @type {Promise<void> | null} */
let initPromise = null;

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
 * Load cart data into the in-memory cache from the active storage backend.
 * @returns {Promise<Array<object>>}
 */
async function loadCartIntoCache() {
  if (usesFirestore()) {
    cachedCart = await readFirestoreCart(currentUserId);
  } else {
    cachedCart = readLocalCart();
  }

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
    cachedCart = await writeFirestoreCart(currentUserId, normalized);
  } else {
    cachedCart = writeLocalCart(normalized);
  }

  notifyCartUpdated();
  return cachedCart;
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
    await initFirestore();
    await initFirebaseAuth();

    const auth = getFirebaseAuth();
    if (!auth) {
      cachedCart = readLocalCart();
      return;
    }

    await new Promise((resolve) => {
      let isFirstAuthEvent = true;

      onAuthStateChanged(auth, async (user) => {
        const nextUserId = user?.uid ?? null;
        const authChanged = nextUserId !== currentUserId;

        currentUserId = nextUserId;
        await loadCartIntoCache();

        if (authChanged || isFirstAuthEvent) {
          notifyCartUpdated();
        }

        if (isFirstAuthEvent) {
          isFirstAuthEvent = false;
          resolve();
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

export { CART_UPDATED_EVENT };
