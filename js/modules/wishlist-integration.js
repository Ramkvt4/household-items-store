/**
 * Wishlist Integration — product card heart UI (Module 10 Phase 1).
 * Keeps Firestore wishlist-service separate from homepage rendering.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';
import {
  toggleWishlist,
  getWishlistProductIds,
  getFriendlyWishlistErrorMessage,
} from './wishlist-service.js';
import {
  showCartToast,
  initCartUi,
  setControlDisabled,
} from './cart-ui.js';

/** @type {Set<string>} */
let wishlistedIds = new Set();

/** @type {Set<string>} */
const pendingToggleOperations = new Set();

/** @type {boolean} */
let initialized = false;

/**
 * Apply filled/outline heart state from the in-memory wishlist set.
 * @param {ParentNode} [root]
 */
export function syncWishlistButtons(root = document) {
  root.querySelectorAll('[data-action="toggle-wishlist"]').forEach((btn) => {
    const productId = btn.dataset.id;
    if (!productId) return;

    const isActive = wishlistedIds.has(productId);
    btn.classList.toggle('product-card__wishlist--active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.setAttribute(
      'aria-label',
      isActive ? 'Remove from wishlist' : 'Add to wishlist',
    );

    const icon = btn.querySelector('.product-card__wishlist-icon');
    if (icon) {
      icon.textContent = isActive ? '♥' : '♡';
    }
  });
}

/**
 * Update a single heart button immediately after toggle.
 * @param {HTMLElement | null} button
 * @param {boolean} isActive
 */
function setHeartState(button, isActive) {
  if (!button) return;

  button.classList.toggle('product-card__wishlist--active', isActive);
  button.setAttribute('aria-pressed', String(isActive));
  button.setAttribute(
    'aria-label',
    isActive ? 'Remove from wishlist' : 'Add to wishlist',
  );

  const icon = button.querySelector('.product-card__wishlist-icon');
  if (icon) {
    icon.textContent = isActive ? '♥' : '♡';
  }
}

/**
 * Reload wishlist IDs for the current user and refresh hearts.
 * @param {import('firebase/auth').User | null} user
 */
async function refreshWishlistState(user) {
  if (!user) {
    wishlistedIds = new Set();
    syncWishlistButtons();
    return;
  }

  try {
    const ids = await getWishlistProductIds(user.uid);
    wishlistedIds = new Set(ids);
  } catch (error) {
    console.warn('[Wishlist] Failed to load wishlist state:', error);
    wishlistedIds = new Set();
  }

  syncWishlistButtons();
}

/**
 * Toggle wishlist for a product. Guests are redirected to login.
 * @param {object} product
 * @param {HTMLElement} [triggerButton]
 */
export async function handleToggleWishlist(product, triggerButton = null) {
  if (!product?.id) return;

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const productId = product.id;
  const operationKey = `toggle-${productId}`;

  if (pendingToggleOperations.has(operationKey)) return;

  pendingToggleOperations.add(operationKey);
  if (triggerButton) setControlDisabled(triggerButton, true);

  try {
    const { added } = await toggleWishlist(user.uid, product);

    if (added) {
      wishlistedIds.add(productId);
      showCartToast('Added to Wishlist', 'success');
    } else {
      wishlistedIds.delete(productId);
      showCartToast('Removed from Wishlist', 'success');
    }

    setHeartState(triggerButton, added);
    syncWishlistButtons();
  } catch (error) {
    console.error('[Wishlist] Toggle failed:', error);
    showCartToast(getFriendlyWishlistErrorMessage(error), 'error');
  } finally {
    pendingToggleOperations.delete(operationKey);
    if (triggerButton) setControlDisabled(triggerButton, false);
  }
}

/**
 * Initialize auth listener and toast UI for wishlist hearts.
 */
export async function initWishlistIntegration() {
  if (initialized) return;
  initialized = true;

  initCartUi();
  await initFirebaseAuth();

  const auth = getFirebaseAuth();
  if (!auth) return;

  onAuthStateChanged(auth, (user) => {
    refreshWishlistState(user);
  });
}
