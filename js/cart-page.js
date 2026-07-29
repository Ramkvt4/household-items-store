/**
 * Cart Page — Dynamic rendering (Module 5.4–5.6)
 * Reads and updates cart data via cart-service.js.
 */

import {
  getCart,
  getCartCount,
  getCartTotal,
  updateQuantity,
  removeFromCart,
  clearCart,
} from './modules/cart-service.js';

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
 * Read cart from localStorage and render the page.
 */
function renderCartPage() {
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
function handleIncrease(productId) {
  const item = getCart().find((entry) => entry.productId === productId);
  if (!item) return;

  updateQuantity(productId, item.quantity + 1);
  renderCartPage();
}

/**
 * Decrease quantity for a cart item by one (minimum 1).
 * @param {string} productId
 */
function handleDecrease(productId) {
  const item = getCart().find((entry) => entry.productId === productId);
  if (!item || item.quantity <= 1) return;

  updateQuantity(productId, item.quantity - 1);
  renderCartPage();
}

/**
 * Remove a product from the cart entirely.
 * @param {string} productId
 */
function handleRemove(productId) {
  removeFromCart(productId);
  renderCartPage();
}

/**
 * Handle Proceed to Checkout — demo order placement.
 */
function handleCheckout() {
  const cart = getCart();

  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  alert('Order placed successfully! (Demo)');
  clearCart();
  renderCartPage();
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

document.addEventListener('DOMContentLoaded', () => {
  bindCartItemEvents();
  bindCheckoutEvent();
  renderCartPage();
});
