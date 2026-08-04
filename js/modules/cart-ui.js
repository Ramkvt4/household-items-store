/**
 * Cart UI helpers — Module 7 Phase 5
 * Toast notifications and async control locking for cart actions.
 */

import {
  isNetworkOrOfflineError,
  isPermissionError,
} from '../utils/network-error.js';

/** @type {boolean} */
let cartUiStylesInjected = false;

/**
 * Inject minimal cart UI styles once (storefront-safe, no admin CSS dependency).
 */
function ensureCartUiStyles() {
  if (cartUiStylesInjected) return;

  const style = document.createElement('style');
  style.textContent = `
    #cart-layout[hidden],
    #cart-empty[hidden],
    #cart-loading[hidden] {
      display: none !important;
    }
    .cart-toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      max-width: min(22rem, calc(100vw - 2rem));
      padding: 0.875rem 1.125rem;
      border-radius: var(--radius-md, 8px);
      color: #fff;
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15));
      animation: cart-toast-in 0.25s ease;
    }
    .cart-toast--success { background: var(--color-success-dark, #15803d); }
    .cart-toast--error { background: var(--color-danger, #dc2626); }
    .cart-toast--info { background: var(--color-secondary, #1e293b); }
    @keyframes cart-toast-in {
      from { opacity: 0; transform: translateY(0.5rem); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  cartUiStylesInjected = true;
}

/**
 * Initialize cart UI styles on pages that use cart rendering.
 */
export function initCartUi() {
  ensureCartUiStyles();
}

/**
 * Show a storefront cart toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='success']
 */
export function showCartToast(message, type = 'success') {
  ensureCartUiStyles();

  const toast = document.createElement('div');
  toast.className = `cart-toast cart-toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

/**
 * Return a user-friendly message for cart operation failures.
 * @param {unknown} error
 * @returns {string}
 */
export function getFriendlyCartErrorMessage(error) {
  if (isNetworkOrOfflineError(error)) {
    return 'Unable to update your cart right now. Please check your connection and try again.';
  }

  if (isPermissionError(error)) {
    return 'Please sign in again to update your cart.';
  }

  return 'Something went wrong while updating your cart. Please try again.';
}

/**
 * Disable or enable a cart action control.
 * @param {HTMLElement | null | undefined} control
 * @param {boolean} disabled
 */
export function setControlDisabled(control, disabled) {
  if (!control) return;

  control.disabled = disabled;
  control.setAttribute('aria-busy', disabled ? 'true' : 'false');
}

/**
 * Disable or enable multiple cart action controls.
 * @param {Array<HTMLElement | null | undefined>} controls
 * @param {boolean} disabled
 */
export function setControlsDisabled(controls, disabled) {
  controls.forEach((control) => setControlDisabled(control, disabled));
}

/**
 * Run an async cart action while locking the clicked control.
 * @template T
 * @param {HTMLElement | null | undefined} control
 * @param {() => Promise<T>} operation
 * @returns {Promise<T | undefined>}
 */
export async function withCartControl(control, operation) {
  if (!control || control.disabled) {
    return undefined;
  }

  setControlDisabled(control, true);

  try {
    return await operation();
  } finally {
    setControlDisabled(control, false);
  }
}

/**
 * Find storefront "Add to Cart" buttons for a product.
 * @param {string} productId
 * @returns {HTMLElement[]}
 */
export function findAddToCartButtons(productId) {
  return [
    ...document.querySelectorAll(
      `[data-action="add-to-cart"][data-id="${productId}"], [data-action="add-to-cart"][data-product-id="${productId}"]`,
    ),
  ];
}
