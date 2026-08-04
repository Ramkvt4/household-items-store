/**
 * Delete Review confirmation — My Orders (Module 12 Phase 6).
 * Reuses review-service deleteReview().
 */

import {
  deleteReview,
  getFriendlyReviewErrorMessage,
  ReviewServiceError,
  REVIEW_ERROR_CODES,
} from '../services/review-service.js';
import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';
import {
  showCartToast,
  initCartUi,
  setControlDisabled,
} from './cart-ui.js';

/** @type {boolean} */
let listenersBound = false;

/** @type {boolean} */
let isDeleting = false;

/** @type {string | null} */
let pendingProductId = null;

/** @type {null | (() => void)} */
let onSuccessCallback = null;

/**
 * @returns {HTMLElement | null}
 */
function getModal() {
  return document.getElementById('delete-review-modal');
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function resolveDeleteErrorMessage(error) {
  if (error instanceof ReviewServiceError) {
    if (error.code === REVIEW_ERROR_CODES.FORBIDDEN) {
      return 'You can only delete your own review.';
    }
    if (error.code === REVIEW_ERROR_CODES.NOT_FOUND) {
      return 'No review found to delete.';
    }
    return error.message;
  }

  const message = getFriendlyReviewErrorMessage(error);

  if (/saving your review/i.test(message)) {
    return 'Something went wrong while deleting your review. Please try again.';
  }

  if (/update your review/i.test(message)) {
    return 'Unable to delete your review right now. Please check your connection and try again.';
  }

  return message;
}

/**
 * Close the delete confirmation dialog.
 */
export function closeDeleteReviewModal() {
  const modal = getModal();
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';
  pendingProductId = null;
  isDeleting = false;

  const confirmBtn = document.getElementById('delete-review-confirm');
  setControlDisabled(confirmBtn, false);
}

/**
 * Open the delete confirmation dialog for a product review.
 *
 * @param {{ productId: string }} product
 * @param {{ onSuccess?: () => void }} [options]
 * @returns {Promise<void>}
 */
export async function openDeleteReviewModal(product, options = {}) {
  initCartUi();
  await initFirebaseAuth();

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const productId = String(product?.productId ?? '').trim();
  if (!productId) {
    showCartToast('Unable to delete this review.', 'error');
    return;
  }

  ensureListeners();

  pendingProductId = productId;
  onSuccessCallback = typeof options.onSuccess === 'function'
    ? options.onSuccess
    : null;

  const modal = getModal();
  if (!modal) {
    console.error('[DeleteReviewModal] Modal markup missing from page.');
    return;
  }

  isDeleting = false;
  const confirmBtn = document.getElementById('delete-review-confirm');
  setControlDisabled(confirmBtn, false);

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const cancelBtn = document.getElementById('delete-review-cancel');
  if (cancelBtn instanceof HTMLElement) {
    cancelBtn.focus();
  }
}

/**
 * Bind dialog interactions once.
 */
function ensureListeners() {
  if (listenersBound) return;
  listenersBound = true;

  const modal = getModal();
  const cancelBtn = document.getElementById('delete-review-cancel');
  const confirmBtn = document.getElementById('delete-review-confirm');
  const closeBtn = document.getElementById('delete-review-close');
  const overlay = document.getElementById('delete-review-overlay');

  cancelBtn?.addEventListener('click', () => closeDeleteReviewModal());
  closeBtn?.addEventListener('click', () => closeDeleteReviewModal());
  overlay?.addEventListener('click', () => closeDeleteReviewModal());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeDeleteReviewModal();
    }
  });

  confirmBtn?.addEventListener('click', async () => {
    if (isDeleting || !pendingProductId) return;

    await initFirebaseAuth();
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;

    if (!user) {
      closeDeleteReviewModal();
      window.location.href = 'login.html';
      return;
    }

    isDeleting = true;
    setControlDisabled(confirmBtn, true);

    const productId = pendingProductId;

    try {
      await deleteReview(productId, user.uid);

      showCartToast('Review deleted successfully.', 'success');

      const successCb = onSuccessCallback;
      closeDeleteReviewModal();

      if (successCb) {
        successCb();
      }
    } catch (error) {
      console.error('[DeleteReviewModal] Delete failed:', error);
      showCartToast(resolveDeleteErrorMessage(error), 'error');
      isDeleting = false;
      setControlDisabled(confirmBtn, false);
    }
  });
}
