/**
 * Cart Page — Dynamic rendering (Module 5.4–5.6, Module 7 Phase 2–5)
 * Coupon UI & totals (Module 11 Phase 2).
 * Reads and updates cart data via cart-service.js (localStorage or Firestore).
 */

import {
  getCart,
  getCartCount,
  initCartService,
  isCartLoading,
  updateQuantity,
  removeFromCart,
  CART_UPDATED_EVENT,
  CART_LOADING_EVENT,
} from './modules/cart-service.js';
import {
  showCartToast,
  getFriendlyCartErrorMessage,
  withCartControl,
  initCartUi,
} from './modules/cart-ui.js';
import {
  applyCouponToCart,
  removeAppliedCoupon,
  getAppliedCoupon,
  revalidateAppliedCoupon,
  clearAppliedCouponIfCartEmpty,
  syncAppliedCouponWithSubtotal,
  CART_COUPON_UPDATED_EVENT,
} from './modules/cart-coupon.js';
import { getOrderSummary, formatOrderAmount } from './utils/order-summary.js';

/** @type {HTMLElement | null} */
let loadingElement = null;

/**
 * Format a number as Indian Rupee display string.
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return formatOrderAmount(price);
}

/**
 * Escape HTML for safe text insertion.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/**
 * Ensure the loading indicator element exists in the DOM.
 * @returns {HTMLElement}
 */
function ensureLoadingElement() {
  if (loadingElement) {
    return loadingElement;
  }

  loadingElement = document.createElement('section');
  loadingElement.id = 'cart-loading';
  loadingElement.className = 'cart-loading';
  loadingElement.setAttribute('aria-live', 'polite');
  loadingElement.setAttribute('aria-busy', 'true');
  loadingElement.innerHTML = `
    <div class="cart-loading__inner">
      <p class="cart-loading__text">Loading your cart…</p>
    </div>
  `;

  loadingElement.style.cssText = [
    'display:flex',
    'justify-content:center',
    'align-items:center',
    'min-height:12rem',
    'color:var(--color-text-muted, #64748b)',
  ].join(';');

  const inner = loadingElement.querySelector('.cart-loading__inner');
  if (inner) {
    inner.style.cssText = 'text-align:center;padding:2rem 1rem;';
  }

  const subtitle = document.getElementById('cart-page-subtitle');
  if (subtitle?.parentNode) {
    subtitle.insertAdjacentElement('afterend', loadingElement);
  } else {
    document.querySelector('.cart-page .container')?.appendChild(loadingElement);
  }

  return loadingElement;
}

/**
 * Show or hide the cart loading state.
 * @param {boolean} loading
 */
function setPageLoading(loading) {
  const layout = document.getElementById('cart-layout');
  const emptyState = document.getElementById('cart-empty');
  const subtitle = document.getElementById('cart-page-subtitle');
  const loader = ensureLoadingElement();

  loader.hidden = !loading;
  loader.setAttribute('aria-busy', loading ? 'true' : 'false');

  if (loading) {
    if (layout) layout.hidden = true;
    if (emptyState) emptyState.hidden = true;
    if (subtitle) subtitle.hidden = true;
  }
}

/**
 * Build HTML for a single cart item card.
 * @param {object} item
 * @returns {string}
 */
function createCartItemHtml(item) {
  const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

  return `
    <article class="cart-page-item" data-product-id="${escapeHtml(item.productId)}">
      <a href="index.html#products" class="cart-page-item__image-link">
        <img
          class="cart-page-item__image"
          src="${escapeHtml(item.image)}"
          alt="${escapeHtml(item.name)}"
          width="120"
          height="120"
        >
      </a>

      <div class="cart-page-item__details">
        <p class="cart-page-item__brand">${escapeHtml(item.brand)}</p>
        <h3 class="cart-page-item__name">${escapeHtml(item.name)}</h3>
        <p class="cart-page-item__price">₹${formatPrice(item.price)}</p>

        <div class="cart-page-item__controls">
          <div class="quantity-control" aria-label="Quantity">
            <button
              type="button"
              class="quantity-control__btn"
              data-action="decrease"
              data-product-id="${escapeHtml(item.productId)}"
              aria-label="Decrease quantity"
            >−</button>
            <span class="quantity-control__value">${item.quantity}</span>
            <button
              type="button"
              class="quantity-control__btn"
              data-action="increase"
              data-product-id="${escapeHtml(item.productId)}"
              aria-label="Increase quantity"
            >+</button>
          </div>

          <button
            type="button"
            class="cart-page-item__remove"
            data-action="remove"
            data-product-id="${escapeHtml(item.productId)}"
          >Remove</button>
        </div>
      </div>

      <div class="cart-page-item__subtotal">
        <span class="cart-page-item__subtotal-label">Subtotal</span>
        <strong class="cart-page-item__subtotal-value">₹${formatPrice(subtotal)}</strong>
      </div>
    </article>
  `;
}

/**
 * Update the header cart badge count.
 * @param {number} count
 */
function updateHeaderBadge(count) {
  const badge = document.querySelector('.header__actions .cart-badge');
  if (!badge) return;

  badge.textContent = count;
  badge.hidden = count === 0;
}

/**
 * Set coupon card visual/message state.
 * @param {'idle'|'success'|'error'} state
 * @param {string} [message]
 */
function setCouponUiState(state, message = '') {
  const card = document.getElementById('cart-coupon');
  const messageEl = document.getElementById('coupon-message');

  if (card) {
    card.dataset.state = state;
  }

  if (!messageEl) return;

  if (!message) {
    messageEl.hidden = true;
    messageEl.textContent = '';
    messageEl.className = 'cart-coupon__message';
    return;
  }

  messageEl.hidden = false;
  messageEl.textContent = message;
  messageEl.className = `cart-coupon__message cart-coupon__message--${
    state === 'success' ? 'success' : 'error'
  }`;
}

/**
 * Render the coupon section from persisted applied coupon.
 * @param {{ keepMessage?: boolean }} [options]
 */
function renderCouponSection(options = {}) {
  const applied = getAppliedCoupon();
  const card = document.getElementById('cart-coupon');
  const form = document.getElementById('cart-coupon-form');
  const appliedEl = document.getElementById('coupon-applied');
  const codeEl = document.getElementById('coupon-applied-code');
  const discountEl = document.getElementById('coupon-applied-discount');
  const input = document.getElementById('coupon-code-input');

  if (applied) {
    if (form) form.hidden = true;
    if (appliedEl) appliedEl.hidden = false;
    if (codeEl) codeEl.textContent = applied.code;
    if (discountEl) {
      discountEl.textContent = `You save ₹${formatPrice(applied.discount)}`;
    }
    if (input) input.value = applied.code;

    if (!options.keepMessage) {
      setCouponUiState('success');
    } else if (card) {
      card.dataset.state = 'success';
    }
    return;
  }

  if (form) form.hidden = false;
  if (appliedEl) appliedEl.hidden = true;
  if (codeEl) codeEl.textContent = '';
  if (discountEl) discountEl.textContent = '';

  // Keep an explicit apply-error message; otherwise reset (e.g. auto-cleared coupon).
  if (options.keepMessage && card?.dataset.state === 'error') {
    return;
  }

  setCouponUiState('idle');
}

/**
 * Render the order summary totals (subtotal, discount, grand total).
 */
function renderOrderSummary() {
  const summary = getOrderSummary();

  const itemsTotalEl = document.getElementById('summary-items-total');
  const discountEl = document.getElementById('summary-discount');
  const grandTotalEl = document.getElementById('summary-grand-total');

  if (itemsTotalEl) {
    itemsTotalEl.textContent = `₹${formatPrice(summary.subtotal)}`;
  }

  if (discountEl) {
    discountEl.textContent = summary.discount > 0
      ? `− ₹${formatPrice(summary.discount)}`
      : '− ₹0';
  }

  if (grandTotalEl) {
    grandTotalEl.textContent = `₹${formatPrice(summary.grandTotal)}`;
  }
}

/**
 * Render the filled cart state with items and summary.
 * @param {Array<object>} cart
 */
function renderFilledCart(cart) {
  const layout = document.getElementById('cart-layout');
  const emptyState = document.getElementById('cart-empty');
  const itemsList = document.getElementById('cart-items-list');
  const subtitle = document.getElementById('cart-page-subtitle');
  const loader = loadingElement ?? document.getElementById('cart-loading');

  const count = getCartCount();

  if (loader) loader.hidden = true;
  if (emptyState) {
    emptyState.hidden = true;
    emptyState.setAttribute('hidden', '');
  }

  if (layout) {
    layout.hidden = false;
    layout.removeAttribute('hidden');
  }

  if (subtitle) {
    subtitle.hidden = false;
    subtitle.removeAttribute('hidden');
    subtitle.textContent = `${count} item${count !== 1 ? 's' : ''} in your cart`;
  }

  if (itemsList) {
    itemsList.innerHTML = cart.map(createCartItemHtml).join('');
  }

  syncAppliedCouponWithSubtotal();
  renderCouponSection({ keepMessage: true });
  renderOrderSummary();
  updateHeaderBadge(count);
}

/**
 * Render the empty cart state.
 */
function renderEmptyCart() {
  const layout = document.getElementById('cart-layout');
  const emptyState = document.getElementById('cart-empty');
  const itemsList = document.getElementById('cart-items-list');
  const subtitle = document.getElementById('cart-page-subtitle');
  const loader = loadingElement ?? document.getElementById('cart-loading');

  clearAppliedCouponIfCartEmpty(0);

  if (loader) loader.hidden = true;
  if (itemsList) itemsList.innerHTML = '';
  if (subtitle) {
    subtitle.hidden = true;
    subtitle.setAttribute('hidden', '');
    subtitle.textContent = '';
  }

  if (layout) {
    layout.hidden = true;
    layout.setAttribute('hidden', '');
  }

  if (emptyState) {
    emptyState.hidden = false;
    emptyState.removeAttribute('hidden');
  }

  renderCouponSection();
  renderOrderSummary();
  updateHeaderBadge(0);
}

/**
 * Read cart and render the page.
 */
function renderCartPage() {
  if (isCartLoading()) {
    setPageLoading(true);
    return;
  }

  setPageLoading(false);

  const cart = getCart();

  if (cart.length === 0) {
    renderEmptyCart();
    return;
  }

  renderFilledCart(cart);
}

/**
 * Increase quantity for a cart item by one.
 * @param {string} productId
 */
async function handleIncrease(productId) {
  const item = getCart().find((entry) => entry.productId === productId);
  if (!item) return;

  await updateQuantity(productId, item.quantity + 1);
  showCartToast('Quantity Updated', 'success');
}

/**
 * Decrease quantity for a cart item by one (minimum 1).
 * @param {string} productId
 */
async function handleDecrease(productId) {
  const item = getCart().find((entry) => entry.productId === productId);
  if (!item || item.quantity <= 1) return;

  await updateQuantity(productId, item.quantity - 1);
  showCartToast('Quantity Updated', 'success');
}

/**
 * Remove a product from the cart entirely.
 * @param {string} productId
 */
async function handleRemove(productId) {
  await removeFromCart(productId);
  showCartToast('Item Removed', 'success');
}

/**
 * Apply coupon from the form input.
 * @param {HTMLButtonElement} button
 */
async function handleApplyCoupon(button) {
  const input = document.getElementById('coupon-code-input');
  const code = input?.value?.trim() ?? '';

  if (!code) {
    setCouponUiState('error', 'Please enter a coupon code.');
    showCartToast('Please enter a coupon code.', 'error');
    input?.focus();
    return;
  }

  try {
    await withCartControl(button, async () => {
      const result = await applyCouponToCart(code);

      if (!result.ok) {
        setCouponUiState('error', result.message);
        showCartToast(result.message, 'error');
        return;
      }

      renderCouponSection();
      setCouponUiState('success', result.message);
      renderOrderSummary();
      showCartToast(result.message || 'Coupon Applied', 'success');
    });
  } catch (error) {
    const message = getFriendlyCartErrorMessage(error);
    setCouponUiState('error', message);
    showCartToast(message, 'error');
  }
}

/**
 * Remove the applied coupon and reset totals.
 * @param {HTMLButtonElement} button
 */
async function handleRemoveCoupon(button) {
  try {
    await withCartControl(button, async () => {
      const removed = removeAppliedCoupon();
      if (!removed) return;

      const input = document.getElementById('coupon-code-input');
      if (input) input.value = '';

      renderCouponSection();
      setCouponUiState('idle');
      renderOrderSummary();
      showCartToast('Coupon Removed', 'success');
    });
  } catch (error) {
    showCartToast(getFriendlyCartErrorMessage(error), 'error');
  }
}

/**
 * Handle Proceed to Checkout — navigate to checkout page.
 * Coupon code, discount, and final total persist via cart-coupon + order-summary.
 */
function handleCheckout() {
  const cart = getCart();

  if (cart.length === 0) {
    showCartToast('Your cart is empty.', 'info');
    return;
  }

  syncAppliedCouponWithSubtotal();
  window.location.href = 'checkout.html';
}

/**
 * Bind coupon form apply / remove handlers.
 */
function bindCouponEvents() {
  const form = document.getElementById('cart-coupon-form');
  const removeBtn = document.getElementById('coupon-remove-btn');

  if (form && form.dataset.eventsBound !== 'true') {
    form.dataset.eventsBound = 'true';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const applyBtn = document.getElementById('coupon-apply-btn');
      if (!(applyBtn instanceof HTMLButtonElement) || applyBtn.disabled) return;
      handleApplyCoupon(applyBtn);
    });
  }

  if (removeBtn && removeBtn.dataset.eventsBound !== 'true') {
    removeBtn.dataset.eventsBound = 'true';
    removeBtn.addEventListener('click', () => {
      if (removeBtn.disabled) return;
      handleRemoveCoupon(removeBtn);
    });
  }
}

/**
 * Bind click handler for the checkout button.
 */
function bindCheckoutEvent() {
  const checkoutBtn = document.querySelector('.cart-summary__checkout');
  if (!checkoutBtn || checkoutBtn.dataset.eventsBound === 'true') return;

  checkoutBtn.dataset.eventsBound = 'true';
  checkoutBtn.addEventListener('click', handleCheckout);
}

/**
 * Run a cart item action with per-control locking and error handling.
 * @param {HTMLButtonElement} button
 * @param {string} action
 * @param {string} productId
 */
async function runCartItemAction(button, action, productId) {
  try {
    await withCartControl(button, async () => {
      switch (action) {
        case 'increase':
          await handleIncrease(productId);
          break;
        case 'decrease':
          await handleDecrease(productId);
          break;
        case 'remove':
          await handleRemove(productId);
          break;
        default:
          break;
      }
    });
  } catch (error) {
    showCartToast(getFriendlyCartErrorMessage(error), 'error');
  }
}

/**
 * Bind click handlers for quantity and remove actions via event delegation.
 */
function bindCartItemEvents() {
  const itemsList = document.getElementById('cart-items-list');
  if (!itemsList || itemsList.dataset.eventsBound === 'true') return;

  itemsList.dataset.eventsBound = 'true';

  itemsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;

    const { action, productId } = button.dataset;
    if (!productId) return;

    runCartItemAction(button, action, productId);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initCartUi();
  bindCartItemEvents();
  bindCouponEvents();
  bindCheckoutEvent();

  setPageLoading(true);

  await initCartService();

  try {
    await revalidateAppliedCoupon();
  } catch (error) {
    console.warn('[Cart] Coupon revalidation skipped:', error);
  }

  renderCartPage();

  document.addEventListener(CART_UPDATED_EVENT, renderCartPage);
  document.addEventListener(CART_LOADING_EVENT, renderCartPage);
  document.addEventListener(CART_COUPON_UPDATED_EVENT, () => {
    renderCouponSection({ keepMessage: true });
    renderOrderSummary();
  });
});
