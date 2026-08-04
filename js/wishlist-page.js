/**
 * Wishlist page — Module 10 Phase 2
 * Lists saved products with Move to Cart and Remove actions.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import {
  initCartService,
  getCartCount,
  addToCart,
  CART_UPDATED_EVENT,
} from './modules/cart-service.js';
import {
  subscribeToWishlist,
  removeFromWishlist,
  getFriendlyWishlistErrorMessage,
} from './modules/wishlist-service.js';
import {
  showCartToast,
  initCartUi,
  getFriendlyCartErrorMessage,
  setControlsDisabled,
} from './modules/cart-ui.js';
import { formatOrderAmount } from './utils/order-summary.js';
import { formatOrderDate, escapeHtml } from './utils/order-display.js';

const PLACEHOLDER_IMAGE = 'assets/images/products/placeholder.svg';

/** @type {string | null} */
let currentUserId = null;

/** @type {(() => void) | null} */
let wishlistUnsubscribe = null;

/** @type {Array<object>} */
let wishlistItems = [];

/** @type {Set<string>} */
const pendingOperations = new Set();

/**
 * @param {number} count
 */
function updateHeaderBadge(count) {
  const badge = document.querySelector('.header__actions .cart-badge');
  if (!badge) return;

  badge.textContent = String(count);
  badge.hidden = count === 0;
}

/**
 * @param {'loading' | 'empty' | 'error' | 'ready'} state
 * @param {string} [errorMessage]
 */
function setPageState(state, errorMessage) {
  const loading = document.getElementById('wishlist-loading');
  const empty = document.getElementById('wishlist-empty');
  const error = document.getElementById('wishlist-error');
  const content = document.getElementById('wishlist-content');
  const errorText = document.getElementById('wishlist-error-text');

  if (loading) loading.hidden = state !== 'loading';
  if (empty) empty.hidden = state !== 'empty';
  if (error) error.hidden = state !== 'error';
  if (content) content.hidden = state !== 'ready';

  if (errorText && errorMessage) {
    errorText.textContent = errorMessage;
  }

  document.getElementById('main-content')?.setAttribute(
    'aria-busy',
    state === 'loading' ? 'true' : 'false',
  );
}

/**
 * @param {object} item
 * @returns {object}
 */
function toCartProduct(item) {
  const snapshot = item.productSnapshot || {};

  return {
    id: item.productId,
    name: snapshot.name,
    brand: snapshot.brand,
    image: snapshot.image || PLACEHOLDER_IMAGE,
    price: snapshot.price,
  };
}

/**
 * @param {object} item
 * @returns {string}
 */
function renderWishlistCard(item) {
  const snapshot = item.productSnapshot || {};
  const image = snapshot.image || PLACEHOLDER_IMAGE;
  const dateAdded = formatOrderDate(item.addedAt);
  const price = formatOrderAmount(snapshot.price ?? 0);

  return `
    <article class="wishlist-card" data-product-id="${escapeHtml(item.productId)}">
      <div class="wishlist-card__media">
        <img
          class="wishlist-card__image"
          src="${escapeHtml(image)}"
          alt="${escapeHtml(snapshot.name || 'Product')}"
          loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMAGE}'"
        >
      </div>
      <div class="wishlist-card__body">
        <span class="wishlist-card__brand">${escapeHtml(snapshot.brand || '—')}</span>
        <h3 class="wishlist-card__name">${escapeHtml(snapshot.name || 'Product')}</h3>
        <p class="wishlist-card__price">₹${escapeHtml(price)}</p>
        ${dateAdded !== '—' ? `<p class="wishlist-card__date">Added ${escapeHtml(dateAdded)}</p>` : ''}
        <div class="wishlist-card__actions">
          <button
            type="button"
            class="btn btn--accent btn--sm"
            data-action="move-to-cart"
            data-product-id="${escapeHtml(item.productId)}"
          >
            Move to Cart
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-action="remove-wishlist"
            data-product-id="${escapeHtml(item.productId)}"
          >
            Remove
          </button>
        </div>
      </div>
    </article>`;
}

/**
 * @param {Array<object>} items
 */
function renderWishlist(items) {
  wishlistItems = items;

  const list = document.getElementById('wishlist-list');
  const subtitle = document.getElementById('wishlist-subtitle');

  if (subtitle) {
    const count = items.length;
    subtitle.textContent =
      count === 1 ? '1 saved product' : `${count} saved products`;
  }

  if (!items.length) {
    if (list) list.innerHTML = '';
    setPageState('empty');
    return;
  }

  if (list) {
    list.innerHTML = items.map(renderWishlistCard).join('');
  }

  setPageState('ready');
}

/**
 * Optimistically remove a card from the local UI.
 * @param {string} productId
 */
function removeItemFromLocalState(productId) {
  wishlistItems = wishlistItems.filter((item) => item.productId !== productId);
  renderWishlist(wishlistItems);
}

/**
 * @param {string} productId
 * @returns {object | undefined}
 */
function findWishlistItem(productId) {
  return wishlistItems.find((item) => item.productId === productId);
}

/**
 * @param {string} productId
 * @param {HTMLElement} [triggerButton]
 */
async function handleRemove(productId, triggerButton) {
  if (!currentUserId || !productId) return;

  const operationKey = `remove-${productId}`;
  if (pendingOperations.has(operationKey)) return;

  const card = document.querySelector(
    `.wishlist-card[data-product-id="${CSS.escape(productId)}"]`,
  );
  const buttons = card
    ? [...card.querySelectorAll('button')]
    : triggerButton
      ? [triggerButton]
      : [];

  pendingOperations.add(operationKey);
  setControlsDisabled(buttons, true);

  try {
    await removeFromWishlist(currentUserId, productId);
    removeItemFromLocalState(productId);
    showCartToast('Removed from Wishlist', 'success');
  } catch (error) {
    console.error('[Wishlist Page] Remove failed:', error);
    showCartToast(getFriendlyWishlistErrorMessage(error), 'error');
    setControlsDisabled(buttons, false);
  } finally {
    pendingOperations.delete(operationKey);
  }
}

/**
 * @param {string} productId
 * @param {HTMLElement} [triggerButton]
 */
async function handleMoveToCart(productId, triggerButton) {
  if (!currentUserId || !productId) return;

  const item = findWishlistItem(productId);
  if (!item) return;

  const operationKey = `move-${productId}`;
  if (pendingOperations.has(operationKey)) return;

  const card = document.querySelector(
    `.wishlist-card[data-product-id="${CSS.escape(productId)}"]`,
  );
  const buttons = card
    ? [...card.querySelectorAll('button')]
    : triggerButton
      ? [triggerButton]
      : [];

  pendingOperations.add(operationKey);
  setControlsDisabled(buttons, true);

  try {
    await addToCart(toCartProduct(item));
    await removeFromWishlist(currentUserId, productId);
    removeItemFromLocalState(productId);
    updateHeaderBadge(getCartCount());
    showCartToast('Moved to Cart', 'success');
  } catch (error) {
    console.error('[Wishlist Page] Move to cart failed:', error);
    showCartToast(getFriendlyCartErrorMessage(error), 'error');
    setControlsDisabled(buttons, false);
  } finally {
    pendingOperations.delete(operationKey);
  }
}

/**
 * @param {MouseEvent} event
 */
function handleListClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest('button[data-action]');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;

  const productId = button.dataset.productId;
  if (!productId) return;

  if (button.dataset.action === 'remove-wishlist') {
    handleRemove(productId, button);
    return;
  }

  if (button.dataset.action === 'move-to-cart') {
    handleMoveToCart(productId, button);
  }
}

/**
 * Stop the active wishlist realtime listener.
 */
function stopWishlistListener() {
  if (wishlistUnsubscribe) {
    wishlistUnsubscribe();
    wishlistUnsubscribe = null;
  }
}

/**
 * @param {import('firebase/auth').User} user
 */
async function startWishlistListener(user) {
  stopWishlistListener();
  currentUserId = user.uid;
  setPageState('loading');

  try {
    wishlistUnsubscribe = await subscribeToWishlist(
      user.uid,
      (items) => {
        renderWishlist(items);
      },
      (error) => {
        setPageState('error', getFriendlyWishlistErrorMessage(error));
      },
    );
  } catch (error) {
    console.error('[Wishlist Page] Failed to subscribe:', error);
    setPageState('error', getFriendlyWishlistErrorMessage(error));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setPageState('loading');
  initCartUi();

  await initCartService();
  updateHeaderBadge(getCartCount());
  document.addEventListener(CART_UPDATED_EVENT, () => {
    updateHeaderBadge(getCartCount());
  });

  const list = document.getElementById('wishlist-list');
  list?.addEventListener('click', handleListClick);

  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) {
    setPageState('error', 'Unable to verify your account. Please try again.');
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      stopWishlistListener();
      currentUserId = null;
      window.location.href = 'login.html';
      return;
    }

    startWishlistListener(user);
  });
});
