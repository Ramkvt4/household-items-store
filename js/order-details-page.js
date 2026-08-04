/**
 * Order Details page — Module 9 Phase 1
 * Displays a single Firestore order owned by the signed-in customer.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { initCartService, getCartCount } from './modules/cart-service.js';
import {
  getOrderById,
  getFriendlyOrderReadErrorMessage,
} from './modules/order-service.js';
import { getPaymentMethodLabel } from './utils/order-utils.js';
import { formatOrderAmount } from './utils/order-summary.js';
import {
  formatOrderStatus,
  formatOrderDate,
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
 * @returns {string | null}
 */
function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? id.trim() : null;
}

/**
 * @param {'loading' | 'empty' | 'error' | 'ready'} state
 * @param {string} [errorMessage]
 */
function setPageState(state, errorMessage) {
  const loading = document.getElementById('order-details-loading');
  const empty = document.getElementById('order-details-empty');
  const error = document.getElementById('order-details-error');
  const content = document.getElementById('order-details-content');
  const errorText = document.getElementById('order-details-error-text');

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
 * @param {object | null | undefined} address
 * @returns {string}
 */
function formatShippingAddressHtml(address) {
  if (!address || typeof address !== 'object') {
    return '<p class="order-address__line">—</p>';
  }

  const lines = [
    address.houseNo,
    address.street,
    address.landmark ? `Landmark: ${address.landmark}` : '',
    [address.city, address.state].filter(Boolean).join(', '),
    address.pinCode ? `PIN: ${address.pinCode}` : '',
  ].filter(Boolean);

  if (!lines.length) {
    return '<p class="order-address__line">—</p>';
  }

  return lines
    .map((line) => `<p class="order-address__line">${escapeHtml(line)}</p>`)
    .join('');
}

/**
 * @param {Array<object> | undefined} items
 * @returns {string}
 */
function renderOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p class="account-empty__text">No products in this order.</p>';
  }

  return items
    .map((item) => {
      const image = item.image || 'assets/images/products/placeholder.svg';
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

      return `
        <article class="order-item">
          <img
            class="order-item__image"
            src="${escapeHtml(image)}"
            alt=""
            loading="lazy"
            onerror="this.src='assets/images/products/placeholder.svg'"
          >
          <div>
            ${item.brand ? `<div class="order-item__brand">${escapeHtml(item.brand)}</div>` : ''}
            <h3 class="order-item__name">${escapeHtml(item.name || 'Product')}</h3>
            <p class="order-item__qty">Qty: ${escapeHtml(String(item.quantity ?? 1))} · ₹${escapeHtml(formatOrderAmount(item.price ?? 0))} each</p>
          </div>
          <div class="order-item__price">₹${escapeHtml(formatOrderAmount(lineTotal))}</div>
        </article>`;
    })
    .join('');
}

/**
 * @param {object} order
 */
function renderOrderDetails(order) {
  const customer = order.customer || {};
  const subtitle = document.getElementById('order-details-subtitle');
  const overview = document.getElementById('order-overview');
  const customerEl = document.getElementById('order-customer');
  const addressEl = document.getElementById('order-shipping-address');
  const itemsEl = document.getElementById('order-items');
  const totalsEl = document.getElementById('order-totals');

  if (subtitle) {
    subtitle.textContent = order.orderNumber || '';
  }

  if (overview) {
    overview.innerHTML = `
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Order Number</dt>
        <dd class="order-detail-rows__value order-detail-rows__value--highlight">${escapeHtml(order.orderNumber || '—')}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Order Date</dt>
        <dd class="order-detail-rows__value">${escapeHtml(formatOrderDate(order.createdAt))}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Order Status</dt>
        <dd class="order-detail-rows__value">${escapeHtml(formatOrderStatus(order.orderStatus))}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Payment Method</dt>
        <dd class="order-detail-rows__value">${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</dd>
      </div>`;
  }

  if (customerEl) {
    customerEl.innerHTML = `
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Name</dt>
        <dd class="order-detail-rows__value">${escapeHtml(customer.fullName || '—')}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Mobile</dt>
        <dd class="order-detail-rows__value">${escapeHtml(customer.mobile || '—')}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Email</dt>
        <dd class="order-detail-rows__value">${escapeHtml(customer.email || '—')}</dd>
      </div>`;
  }

  if (addressEl) {
    addressEl.innerHTML = formatShippingAddressHtml(order.shippingAddress);
  }

  if (itemsEl) {
    itemsEl.innerHTML = renderOrderItems(order.items);
  }

  if (totalsEl) {
    const delivery = Number(order.delivery) || 0;
    const discount = Number(order.discount) || 0;

    totalsEl.innerHTML = `
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Subtotal</dt>
        <dd class="order-detail-rows__value">₹${escapeHtml(formatOrderAmount(order.subtotal ?? 0))}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Discount</dt>
        <dd class="order-detail-rows__value">${discount > 0 ? `− ₹${escapeHtml(formatOrderAmount(discount))}` : '₹0'}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Delivery</dt>
        <dd class="order-detail-rows__value">${delivery > 0 ? `₹${escapeHtml(formatOrderAmount(delivery))}` : 'Free'}</dd>
      </div>
      <div class="order-detail-rows__row">
        <dt class="order-detail-rows__label">Grand Total</dt>
        <dd class="order-detail-rows__value order-detail-rows__value--highlight">₹${escapeHtml(formatOrderAmount(order.grandTotal ?? 0))}</dd>
      </div>`;
  }
}

/**
 * @param {import('firebase/auth').User} user
 */
async function loadOrderDetails(user) {
  const orderId = getOrderIdFromUrl();

  if (!orderId) {
    setPageState('empty');
    return;
  }

  setPageState('loading');

  try {
    const order = await getOrderById(orderId);

    if (!order || order.userId !== user.uid) {
      setPageState('empty');
      return;
    }

    renderOrderDetails(order);
    setPageState('ready');
  } catch (error) {
    console.error('[Order Details] Failed to load order:', error);
    setPageState(
      'error',
      getFriendlyOrderReadErrorMessage(error).replace('orders', 'order'),
    );
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

    loadOrderDetails(user);
  });
});
