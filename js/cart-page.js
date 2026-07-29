/**
 * Cart Page — Dynamic rendering (Module 5.4)
 * Reads cart data from cart-service.js and renders the cart UI.
 */

import { getCart, getCartCount, getCartTotal } from './modules/cart-service.js';

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
    <article class="cart-page-item">
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
            <button type="button" class="quantity-control__btn" aria-label="Decrease quantity">−</button>
            <span class="quantity-control__value">${item.quantity}</span>
            <button type="button" class="quantity-control__btn" aria-label="Increase quantity">+</button>
          </div>

          <button type="button" class="cart-page-item__remove">Remove</button>
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

document.addEventListener('DOMContentLoaded', renderCartPage);
