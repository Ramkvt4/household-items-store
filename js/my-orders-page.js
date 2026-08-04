/**
 * My Orders page — Module 9 Phase 1
 * Lists Firestore orders for the signed-in customer.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { initCartService, getCartCount } from './modules/cart-service.js';
import {
  getOrdersByUserId,
  getFriendlyOrderReadErrorMessage,
} from './modules/order-service.js';
import { getPaymentMethodLabel } from './utils/order-utils.js';
import { formatOrderAmount } from './utils/order-summary.js';
import {
  formatOrderStatus,
  formatOrderDate,
  getOrderItemCount,
  escapeHtml,
} from './utils/order-display.js';

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
  const loading = document.getElementById('orders-loading');
  const empty = document.getElementById('orders-empty');
  const error = document.getElementById('orders-error');
  const content = document.getElementById('orders-content');
  const errorText = document.getElementById('orders-error-text');

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
 * @param {object} order
 * @returns {string}
 */
function renderOrderCard(order) {
  const itemCount = getOrderItemCount(order.items);
  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;

  return `
    <a class="order-card" href="order-details.html?id=${encodeURIComponent(order.id)}">
      <div class="order-card__header">
        <div>
          <div class="order-card__number">${escapeHtml(order.orderNumber || '—')}</div>
          <div class="order-card__date">${escapeHtml(formatOrderDate(order.createdAt))}</div>
        </div>
        <span class="order-card__status">${escapeHtml(formatOrderStatus(order.orderStatus))}</span>
      </div>
      <div class="order-card__meta">
        <div>
          <span class="order-card__meta-label">Payment Method</span>
          <span class="order-card__meta-value">${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</span>
        </div>
        <div>
          <span class="order-card__meta-label">Items</span>
          <span class="order-card__meta-value">${escapeHtml(itemLabel)}</span>
        </div>
        <div>
          <span class="order-card__meta-label">Grand Total</span>
          <span class="order-card__meta-value order-card__meta-value--total">₹${escapeHtml(formatOrderAmount(order.grandTotal ?? 0))}</span>
        </div>
      </div>
    </a>`;
}

/**
 * @param {Array<object>} orders
 */
function renderOrders(orders) {
  const list = document.getElementById('orders-list');
  const subtitle = document.getElementById('orders-subtitle');

  if (!list) return;

  list.innerHTML = orders.map(renderOrderCard).join('');

  if (subtitle) {
    const count = orders.length;
    subtitle.textContent =
      count === 1 ? '1 order' : `${count} orders`;
  }
}

/**
 * @param {import('firebase/auth').User} user
 */
async function loadOrders(user) {
  setPageState('loading');

  try {
    const orders = await getOrdersByUserId(user.uid);

    if (!orders.length) {
      setPageState('empty');
      return;
    }

    renderOrders(orders);
    setPageState('ready');
  } catch (error) {
    console.error('[My Orders] Failed to load orders:', error);
    setPageState('error', getFriendlyOrderReadErrorMessage(error));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setPageState('loading');

  await initCartService();
  updateHeaderBadge(getCartCount());

  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) {
    setPageState('error', 'Unable to verify your account. Please try again.');
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    loadOrders(user);
  });
});
