/**
 * Order Success Page — Module 8 Phase 2
 * Displays confirmation details from session storage after checkout.
 */

import { initCartService, getCartCount } from './modules/cart-service.js';
import { consumeLastOrder } from './utils/order-session.js';
import { formatOrderAmount } from './utils/order-summary.js';

/**
 * Format order status for display.
 * @param {string} status
 * @returns {string}
 */
function formatOrderStatus(status) {
  const labels = {
    placed: 'Placed',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return labels[status] || status;
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
 * Render the success state with order details.
 * @param {object} order
 */
function renderSuccessState(order) {
  const card = document.getElementById('order-success-card');
  const empty = document.getElementById('order-success-empty');

  const orderNumberEl = document.getElementById('success-order-number');
  const paymentMethodEl = document.getElementById('success-payment-method');
  const orderStatusEl = document.getElementById('success-order-status');
  const grandTotalEl = document.getElementById('success-grand-total');

  if (orderNumberEl) orderNumberEl.textContent = order.orderNumber || '—';
  if (paymentMethodEl) {
    paymentMethodEl.textContent = order.paymentMethodLabel || order.paymentMethod || '—';
  }
  if (orderStatusEl) orderStatusEl.textContent = formatOrderStatus(order.orderStatus || 'placed');
  if (grandTotalEl) {
    grandTotalEl.textContent = `₹${formatOrderAmount(order.grandTotal ?? 0)}`;
  }

  if (card) {
    card.hidden = false;
    card.removeAttribute('hidden');
  }

  if (empty) {
    empty.hidden = true;
    empty.setAttribute('hidden', '');
  }
}

/**
 * Render fallback when no order data is available.
 */
function renderEmptyState() {
  const card = document.getElementById('order-success-card');
  const empty = document.getElementById('order-success-empty');

  if (card) {
    card.hidden = true;
    card.setAttribute('hidden', '');
  }

  if (empty) {
    empty.hidden = false;
    empty.removeAttribute('hidden');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initCartService();
  updateHeaderBadge(getCartCount());

  const order = consumeLastOrder();

  if (!order?.orderNumber) {
    renderEmptyState();
    return;
  }

  renderSuccessState(order);
});
