/**
 * My Orders page — Module 9 Phase 1 + Module 12 Phase 4 (write review).
 * Lists Firestore orders for the signed-in customer with per-product review actions.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { initCartService, getCartCount } from './modules/cart-service.js';
import {
  getOrdersByUserId,
  getFriendlyOrderReadErrorMessage,
} from './modules/order-service.js';
import { getUserReview } from './services/review-service.js';
import { getPaymentMethodLabel } from './utils/order-utils.js';
import { formatOrderAmount } from './utils/order-summary.js';
import {
  formatOrderStatus,
  formatOrderDate,
  getOrderItemCount,
  escapeHtml,
} from './utils/order-display.js';
import { openWriteReviewModal, openEditReviewModal } from './modules/write-review-modal.js';
import { openDeleteReviewModal } from './modules/delete-review-modal.js';
import { initCartUi } from './modules/cart-ui.js';

/** @type {import('firebase/auth').User | null} */
let currentUser = null;

/** @type {Array<object>} */
let currentOrders = [];

/** @type {Set<string>} */
let reviewedProductIds = new Set();

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
 * Collect unique product IDs from order line items.
 * @param {Array<object>} orders
 * @returns {string[]}
 */
function collectProductIds(orders) {
  const ids = new Set();

  orders.forEach((order) => {
    if (!Array.isArray(order.items)) return;
    order.items.forEach((item) => {
      const id = String(item?.productId ?? '').trim();
      if (id) ids.add(id);
    });
  });

  return [...ids];
}

/**
 * Load which products the user has already reviewed.
 * @param {string} userId
 * @param {string[]} productIds
 * @returns {Promise<Set<string>>}
 */
async function loadReviewedProductIds(userId, productIds) {
  const reviewed = new Set();
  if (!userId || productIds.length === 0) return reviewed;

  await Promise.all(
    productIds.map(async (productId) => {
      try {
        const review = await getUserReview(productId, userId);
        if (review) reviewed.add(productId);
      } catch (error) {
        console.error('[My Orders] Failed to check review state:', productId, error);
      }
    }),
  );

  return reviewed;
}

/**
 * Review action buttons for a line item.
 * @param {object} item
 * @param {boolean} hasReview
 * @returns {string}
 */
function renderReviewActions(item, hasReview) {
  const productId = escapeHtml(String(item.productId ?? ''));
  const name = escapeHtml(String(item.name ?? 'Product'));
  const image = escapeHtml(
    String(item.image || 'assets/images/products/placeholder.svg'),
  );

  if (hasReview) {
    return `
      <div class="order-product__actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-action="edit-review"
          data-product-id="${productId}"
          data-product-name="${name}"
          data-product-image="${image}"
        >Edit Review</button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-action="delete-review"
          data-product-id="${productId}"
        >Delete Review</button>
      </div>`;
  }

  return `
    <div class="order-product__actions">
      <button
        type="button"
        class="btn btn--accent btn--sm"
        data-action="write-review"
        data-product-id="${productId}"
        data-product-name="${name}"
        data-product-image="${image}"
      >Write Review</button>
    </div>`;
}

/**
 * @param {object} item
 * @param {Set<string>} reviewedIds
 * @returns {string}
 */
function renderOrderProduct(item, reviewedIds) {
  const productId = String(item.productId ?? '').trim();
  const image = item.image || 'assets/images/products/placeholder.svg';
  const hasReview = Boolean(productId && reviewedIds.has(productId));
  const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

  return `
    <article class="order-product" data-product-id="${escapeHtml(productId)}">
      <img
        class="order-product__image"
        src="${escapeHtml(image)}"
        alt=""
        loading="lazy"
        onerror="this.src='assets/images/products/placeholder.svg'"
      >
      <div class="order-product__info">
        ${item.brand ? `<div class="order-product__brand">${escapeHtml(item.brand)}</div>` : ''}
        <h3 class="order-product__name">${escapeHtml(item.name || 'Product')}</h3>
        <p class="order-product__qty">
          Qty: ${escapeHtml(String(item.quantity ?? 1))}
          · ₹${escapeHtml(formatOrderAmount(item.price ?? 0))} each
          · ₹${escapeHtml(formatOrderAmount(lineTotal))}
        </p>
        ${productId ? renderReviewActions(item, hasReview) : ''}
      </div>
    </article>`;
}

/**
 * @param {object} order
 * @param {Set<string>} reviewedIds
 * @returns {string}
 */
function renderOrderCard(order, reviewedIds) {
  const itemCount = getOrderItemCount(order.items);
  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`;
  const items = Array.isArray(order.items) ? order.items : [];
  const productsHtml = items.length
    ? items.map((item) => renderOrderProduct(item, reviewedIds)).join('')
    : '<p class="order-card__no-items">No products in this order.</p>';

  return `
    <article class="order-card order-card--expanded">
      <a
        class="order-card__summary"
        href="order-details.html?id=${encodeURIComponent(order.id)}"
      >
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
        <span class="order-card__details-link">View order details</span>
      </a>
      <div class="order-card__products" aria-label="Ordered products">
        ${productsHtml}
      </div>
    </article>`;
}

/**
 * @param {Array<object>} orders
 * @param {Set<string>} reviewedIds
 */
function renderOrders(orders, reviewedIds) {
  const list = document.getElementById('orders-list');
  const subtitle = document.getElementById('orders-subtitle');

  if (!list) return;

  list.innerHTML = orders.map((order) => renderOrderCard(order, reviewedIds)).join('');

  if (subtitle) {
    const count = orders.length;
    subtitle.textContent =
      count === 1 ? '1 order' : `${count} orders`;
  }
}

/**
 * Re-check review state and re-render product actions without full page reload.
 * @returns {Promise<void>}
 */
async function refreshReviewState() {
  if (!currentUser || !currentOrders.length) return;

  const productIds = collectProductIds(currentOrders);
  reviewedProductIds = await loadReviewedProductIds(currentUser.uid, productIds);
  renderOrders(currentOrders, reviewedProductIds);
}

/**
 * @param {import('firebase/auth').User} user
 */
async function loadOrders(user) {
  setPageState('loading');

  try {
    const orders = await getOrdersByUserId(user.uid);

    if (!orders.length) {
      currentOrders = [];
      reviewedProductIds = new Set();
      setPageState('empty');
      return;
    }

    currentOrders = orders;
    const productIds = collectProductIds(orders);
    reviewedProductIds = await loadReviewedProductIds(user.uid, productIds);

    renderOrders(orders, reviewedProductIds);
    setPageState('ready');
  } catch (error) {
    console.error('[My Orders] Failed to load orders:', error);
    setPageState('error', getFriendlyOrderReadErrorMessage(error));
  }
}

/**
 * Delegate Write / Edit / Delete Review clicks.
 */
function bindOrderListActions() {
  const list = document.getElementById('orders-list');
  if (!list || list.dataset.reviewActionsBound === 'true') return;

  list.dataset.reviewActionsBound = 'true';

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const writeBtn = target.closest('[data-action="write-review"]');
    if (writeBtn instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      openWriteReviewModal(
        {
          productId: writeBtn.dataset.productId || '',
          name: writeBtn.dataset.productName || 'Product',
          image: writeBtn.dataset.productImage || '',
        },
        { onSuccess: () => refreshReviewState() },
      );
      return;
    }

    const editBtn = target.closest('[data-action="edit-review"]');
    if (editBtn instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      openEditReviewModal(
        {
          productId: editBtn.dataset.productId || '',
          name: editBtn.dataset.productName || 'Product',
          image: editBtn.dataset.productImage || '',
        },
        { onSuccess: () => refreshReviewState() },
      );
      return;
    }

    const deleteBtn = target.closest('[data-action="delete-review"]');
    if (deleteBtn instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      openDeleteReviewModal(
        { productId: deleteBtn.dataset.productId || '' },
        { onSuccess: () => refreshReviewState() },
      );
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setPageState('loading');
  initCartUi();
  bindOrderListActions();

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
      currentUser = null;
      window.location.href = 'login.html';
      return;
    }

    currentUser = user;
    loadOrders(user);
  });
});
