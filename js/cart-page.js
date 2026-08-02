/**
 * Cart Page — Dynamic rendering (Module 5.4–5.6, Module 7 Phase 2–4)
 * Reads and updates cart data via cart-service.js (localStorage or Firestore).
 */

import {
  getCart,
  getCartCount,
  getCartTotal,
  updateQuantity,
  removeFromCart,
  clearCart,
  initCartService,
  isCartLoading,
  CART_UPDATED_EVENT,
  CART_LOADING_EVENT,
} from './modules/cart-service.js';

/** @type {HTMLElement | null} */
let loadingElement = null;

/**
 * Format a number as Indian Rupee display string.
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return Number(price).toLocaleString('en-IN');
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
    layout.hidden = true;
    emptyState.hidden = true;
    subtitle.hidden = true;
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
 * Render the order summary totals.
 * @param {number} total
 */
function renderOrderSummary(total) {
  const formatted = `₹${formatPrice(total)}`;

  document.getElementById('summary-items-total').textContent = formatted;
  document.getElementById('summary-grand-total').textContent = formatted;
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

  const count = getCartCount();
  const total = getCartTotal();

  emptyState.hidden = true;
  layout.hidden = false;
  subtitle.hidden = false;

  subtitle.textContent = `${count} item${count !== 1 ? 's' : ''} in your cart`;
  itemsList.innerHTML = cart.map(createCartItemHtml).join('');
  renderOrderSummary(total);
  updateHeaderBadge(count);
}

/**
 * Render the empty cart state.
 */
function renderEmptyCart() {
  const layout = document.getElementById('cart-layout');
  const emptyState = document.getElementById('cart-empty');
  const subtitle = document.getElementById('cart-page-subtitle');

  layout.hidden = true;
  emptyState.hidden = false;
  subtitle.hidden = true;

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
}

/**
 * Decrease quantity for a cart item by one (minimum 1).
 * @param {string} productId
 */
async function handleDecrease(productId) {
  const item = getCart().find((entry) => entry.productId === productId);
  if (!item || item.quantity <= 1) return;

  await updateQuantity(productId, item.quantity - 1);
}

/**
 * Remove a product from the cart entirely.
 * @param {string} productId
 */
async function handleRemove(productId) {
  await removeFromCart(productId);
}

/**
 * Handle Proceed to Checkout — demo order placement.
 */
async function handleCheckout() {
  const cart = getCart();

  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  alert('Order placed successfully! (Demo)');
  await clearCart();
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
 * Bind click handlers for quantity and remove actions via event delegation.
 */
function bindCartItemEvents() {
  const itemsList = document.getElementById('cart-items-list');
  if (!itemsList || itemsList.dataset.eventsBound === 'true') return;

  itemsList.dataset.eventsBound = 'true';

  itemsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const { action, productId } = button.dataset;
    if (!productId) return;

    switch (action) {
      case 'increase':
        handleIncrease(productId);
        break;
      case 'decrease':
        handleDecrease(productId);
        break;
      case 'remove':
        handleRemove(productId);
        break;
      default:
        break;
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindCartItemEvents();
  bindCheckoutEvent();

  setPageLoading(true);

  await initCartService();
  renderCartPage();

  document.addEventListener(CART_UPDATED_EVENT, renderCartPage);
  document.addEventListener(CART_LOADING_EVENT, renderCartPage);
});
