/**
 * Product Reviews UI — read-only reviews on Product Details (Module 12).
 * Uses review-service subscribeToReviews().
 * Submission UI lives on My Orders — not in the product popup.
 */

import {
  subscribeToReviews,
} from '../services/review-service.js';
import {
  formatOrderDate,
  getOrderTimestampMs,
  escapeHtml,
} from '../utils/order-display.js';

/** @type {null | (() => void)} */
let unsubscribeReviews = null;

/** @type {string | null} */
let activeProductId = null;

/**
 * Render star characters for a rating (supports half-star threshold).
 * @param {number} rating
 * @returns {string}
 */
function renderStars(rating) {
  const value = Number(rating) || 0;
  const full = Math.floor(value);
  const half = value % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < 5; i++) {
    if (i < full || (i === full && half)) {
      html += '<span class="star" aria-hidden="true">★</span>';
    } else {
      html += '<span class="star star--empty" aria-hidden="true">★</span>';
    }
  }

  return html;
}

/**
 * Compute average rating from reviews.
 * @param {Array<{ rating?: number }>} reviews
 * @returns {number}
 */
export function calculateAverageRating(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return 0;

  const total = reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0);
  return total / reviews.length;
}

/**
 * Format average for display (one decimal).
 * @param {number} average
 * @returns {string}
 */
function formatAverage(average) {
  if (!average) return '0.0';
  return average.toFixed(1);
}

/**
 * @param {import('../services/review-service.js').Review} review
 * @returns {string}
 */
function renderReviewCard(review) {
  const name = escapeHtml(review.userName || 'Customer');
  const text = escapeHtml(review.review || '');
  const ms = getOrderTimestampMs(review.createdAt);
  const date = escapeHtml(formatOrderDate(review.createdAt));
  const dateTimeAttr = ms ? ` datetime="${new Date(ms).toISOString()}"` : '';
  const rating = Number(review.rating) || 0;
  const verified = review.verifiedPurchase
    ? '<span class="product-reviews__verified">Verified Purchase</span>'
    : '';

  return `
    <article class="product-reviews__card">
      <div class="product-reviews__card-header">
        <div class="stars" aria-label="Rated ${rating} out of 5">${renderStars(rating)}</div>
        <time class="product-reviews__date"${dateTimeAttr}>${date}</time>
      </div>
      <div class="product-reviews__meta">
        <span class="product-reviews__author">${name}</span>
        ${verified}
      </div>
      <p class="product-reviews__text">${text}</p>
    </article>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {Array<object>} reviews
 */
function renderReviewsContent(root, reviews) {
  const summaryEl = root.querySelector('[data-reviews-summary]');
  const listEl = root.querySelector('[data-reviews-list]');
  if (!summaryEl || !listEl) return;

  const count = reviews.length;
  const average = calculateAverageRating(reviews);

  summaryEl.innerHTML = `
    <div class="product-reviews__summary-rating">
      <div class="stars" aria-hidden="true">${renderStars(average)}</div>
      <span class="product-reviews__average">${formatAverage(average)}</span>
    </div>
    <span class="product-reviews__count">
      ${count.toLocaleString('en-IN')} ${count === 1 ? 'review' : 'reviews'}
    </span>
  `;

  if (count === 0) {
    listEl.innerHTML = `
      <div class="product-reviews__empty" role="status">
        <p>No reviews yet. Be the first to review this product after purchasing.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = reviews.map((review) => renderReviewCard(review)).join('');
}

/**
 * Shell markup for the reviews section (filled by realtime updates).
 * @returns {string}
 */
export function getProductReviewsSectionHtml() {
  return `
    <section class="product-reviews" id="product-reviews" aria-labelledby="product-reviews-title">
      <h3 class="product-reviews__title" id="product-reviews-title">Customer Reviews</h3>
      <div class="product-reviews__summary" data-reviews-summary>
        <p class="product-reviews__loading">Loading reviews…</p>
      </div>
      <div class="product-reviews__list" data-reviews-list></div>
    </section>
  `;
}

/**
 * Stop the active reviews subscription (e.g. when the modal closes).
 */
export function unmountProductReviews() {
  if (typeof unsubscribeReviews === 'function') {
    unsubscribeReviews();
  }
  unsubscribeReviews = null;
  activeProductId = null;
}

/**
 * Mount realtime read-only reviews into a container.
 * @param {HTMLElement | null} container
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function mountProductReviews(container, productId) {
  unmountProductReviews();

  if (!container || !productId) return;

  activeProductId = productId;
  const mountedFor = productId;

  try {
    unsubscribeReviews = await subscribeToReviews(
      productId,
      (reviews) => {
        if (activeProductId !== mountedFor) return;
        renderReviewsContent(container, reviews);
      },
      () => {
        if (activeProductId !== mountedFor) return;
        const listEl = container.querySelector('[data-reviews-list]');
        const summaryEl = container.querySelector('[data-reviews-summary]');
        if (summaryEl) {
          summaryEl.innerHTML = `
            <span class="product-reviews__count">Unable to load reviews</span>
          `;
        }
        if (listEl) {
          listEl.innerHTML = `
            <div class="product-reviews__empty" role="alert">
              <p>Something went wrong while loading reviews. Please try again later.</p>
            </div>
          `;
        }
      },
    );
  } catch (error) {
    console.error('[ProductReviewsUI] Failed to subscribe:', error);
    const listEl = container.querySelector('[data-reviews-list]');
    if (listEl) {
      listEl.innerHTML = `
        <div class="product-reviews__empty" role="alert">
          <p>Something went wrong while loading reviews. Please try again later.</p>
        </div>
      `;
    }
  }
}
