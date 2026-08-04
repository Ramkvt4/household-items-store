/**
 * Write / Edit Review Modal — My Orders (Module 12 Phase 4–5).
 * Reuses review-service addReview() and updateReview().
 */

import {
  addReview,
  updateReview,
  getUserReview,
  getFriendlyReviewErrorMessage,
  ReviewServiceError,
  REVIEW_ERROR_CODES,
  REVIEW_TEXT_MIN_LENGTH,
  REVIEW_TEXT_MAX_LENGTH,
} from '../services/review-service.js';
import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';
import { getAccountDisplayName } from './auth-ui.js';
import {
  showCartToast,
  initCartUi,
  setControlDisabled,
} from './cart-ui.js';

/** @typedef {'create' | 'edit'} ReviewModalMode */

/** @type {number} */
let selectedRating = 0;

/** @type {boolean} */
let isSubmitting = false;

/** @type {boolean} */
let listenersBound = false;

/** @type {null | (() => void)} */
let onSuccessCallback = null;

/** @type {ReviewModalMode} */
let modalMode = 'create';

/** @type {{ productId: string, name: string, image: string } | null} */
let activeProduct = null;

/**
 * @returns {HTMLElement | null}
 */
function getModal() {
  return document.getElementById('write-review-modal');
}

/**
 * @returns {HTMLFormElement | null}
 */
function getForm() {
  const form = document.getElementById('write-review-form');
  return form instanceof HTMLFormElement ? form : null;
}

/**
 * @param {string} message
 */
function showFormError(message) {
  const errorEl = document.getElementById('write-review-error');
  if (!errorEl) return;
  errorEl.hidden = !message;
  errorEl.textContent = message || '';
}

/**
 * @param {HTMLElement} selector
 * @param {number} rating
 * @param {number} [hoverRating=0]
 */
function paintStarSelector(selector, rating, hoverRating = 0) {
  const active = hoverRating || rating;
  selector.querySelectorAll('[data-rating]').forEach((btn) => {
    const value = Number(btn.getAttribute('data-rating')) || 0;
    const isOn = value <= active && active > 0;
    btn.classList.toggle('write-review-modal__star--active', isOn);
    btn.setAttribute('aria-checked', String(value === rating));
  });
}

/**
 * Update character counter from textarea value.
 */
function updateCharCounter() {
  const textarea = document.getElementById('write-review-text');
  const counter = document.getElementById('write-review-counter');
  if (!(textarea instanceof HTMLTextAreaElement) || !counter) return;

  const length = textarea.value.trim().length;
  counter.textContent = `${length} / ${REVIEW_TEXT_MAX_LENGTH}`;
  counter.classList.toggle(
    'write-review-modal__counter--invalid',
    length > 0 && length < REVIEW_TEXT_MIN_LENGTH,
  );
}

/**
 * Apply create vs edit chrome (title + submit label).
 * @param {ReviewModalMode} mode
 */
function applyModalChrome(mode) {
  const titleEl = document.getElementById('write-review-title');
  const submitBtn = document.getElementById('write-review-submit');

  if (titleEl) {
    titleEl.textContent =
      mode === 'edit' ? 'Edit Your Review' : 'Write a Review';
  }

  if (submitBtn) {
    submitBtn.textContent =
      mode === 'edit' ? 'Save Review' : 'Submit Review';
  }
}

/**
 * Fill product image + name in the modal header.
 * @param {{ name: string, image: string }} product
 */
function fillProductHeader(product) {
  const imageEl = document.getElementById('write-review-product-image');
  const nameEl = document.getElementById('write-review-product-name');

  if (imageEl instanceof HTMLImageElement) {
    imageEl.src = product.image;
    imageEl.alt = product.name;
  }
  if (nameEl) {
    nameEl.textContent = product.name;
  }
}

/**
 * Prefill rating + textarea (edit mode).
 * @param {number} rating
 * @param {string} reviewText
 */
function fillReviewFields(rating, reviewText) {
  selectedRating = Number(rating) || 0;

  const selector = document.getElementById('write-review-stars');
  if (selector) paintStarSelector(selector, selectedRating);

  const textarea = document.getElementById('write-review-text');
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.value = reviewText || '';
  }

  updateCharCounter();
}

/**
 * Reset form fields for the next open.
 */
function resetForm() {
  selectedRating = 0;
  isSubmitting = false;
  modalMode = 'create';

  const form = getForm();
  form?.reset();

  const selector = document.getElementById('write-review-stars');
  if (selector) paintStarSelector(selector, 0);

  applyModalChrome('create');
  showFormError('');
  updateCharCounter();

  const submitBtn = document.getElementById('write-review-submit');
  setControlDisabled(submitBtn, false);
}

/**
 * @param {number} rating
 * @param {string} text
 * @returns {string|null}
 */
function getClientValidationError(rating, text) {
  if (!rating || rating < 1 || rating > 5) {
    return 'Please select a rating from 1 to 5 stars.';
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return 'Please write your review.';
  }

  if (trimmed.length < REVIEW_TEXT_MIN_LENGTH) {
    return `Review must be at least ${REVIEW_TEXT_MIN_LENGTH} characters.`;
  }

  if (trimmed.length > REVIEW_TEXT_MAX_LENGTH) {
    return `Review must be at most ${REVIEW_TEXT_MAX_LENGTH} characters.`;
  }

  return null;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function resolveSubmitErrorMessage(error) {
  if (error instanceof ReviewServiceError) {
    if (error.code === REVIEW_ERROR_CODES.ALREADY_EXISTS) {
      return 'You have already reviewed this product.';
    }
    if (error.code === REVIEW_ERROR_CODES.FORBIDDEN) {
      return 'You can only edit your own review.';
    }
    if (error.code === REVIEW_ERROR_CODES.NOT_FOUND) {
      return 'No review found to update.';
    }
    return error.message;
  }

  return getFriendlyReviewErrorMessage(error);
}

/**
 * Shared auth + product setup before showing the modal.
 * @param {{ productId: string, name?: string, image?: string }} product
 * @param {{ onSuccess?: () => void }} [options]
 * @returns {Promise<{ user: import('firebase/auth').User, productId: string } | null>}
 */
async function prepareModal(product, options = {}) {
  initCartUi();
  await initFirebaseAuth();

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user) {
    window.location.href = 'login.html';
    return null;
  }

  const productId = String(product?.productId ?? '').trim();
  if (!productId) {
    showCartToast('Unable to open review form for this product.', 'error');
    return null;
  }

  ensureListeners();

  activeProduct = {
    productId,
    name: String(product?.name ?? 'Product').trim() || 'Product',
    image:
      String(product?.image ?? '').trim()
      || 'assets/images/products/placeholder.svg',
  };
  onSuccessCallback = typeof options.onSuccess === 'function'
    ? options.onSuccess
    : null;

  return { user, productId };
}

/**
 * Show the modal dialog.
 */
function showModal() {
  const modal = getModal();
  if (!modal) {
    console.error('[WriteReviewModal] Modal markup missing from page.');
    return;
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const firstStar = document.querySelector('#write-review-stars [data-rating="1"]');
  if (firstStar instanceof HTMLElement) {
    firstStar.focus();
  }
}

/**
 * Close the write/edit review modal.
 */
export function closeWriteReviewModal() {
  const modal = getModal();
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';
  activeProduct = null;
  resetForm();
}

/**
 * Open the modal to create a new review.
 *
 * @param {{ productId: string, name?: string, image?: string }} product
 * @param {{ onSuccess?: () => void }} [options]
 * @returns {Promise<void>}
 */
export async function openWriteReviewModal(product, options = {}) {
  const prepared = await prepareModal(product, options);
  if (!prepared || !activeProduct) return;

  resetForm();
  modalMode = 'create';
  applyModalChrome('create');
  fillProductHeader(activeProduct);
  showModal();
}

/**
 * Open the modal to edit an existing review (pre-filled).
 *
 * @param {{ productId: string, name?: string, image?: string }} product
 * @param {{ onSuccess?: () => void }} [options]
 * @returns {Promise<void>}
 */
export async function openEditReviewModal(product, options = {}) {
  const prepared = await prepareModal(product, options);
  if (!prepared || !activeProduct) return;

  const { user, productId } = prepared;

  resetForm();
  modalMode = 'edit';
  applyModalChrome('edit');
  fillProductHeader(activeProduct);

  try {
    const existing = await getUserReview(productId, user.uid);

    if (!existing) {
      showCartToast('No review found to edit.', 'error');
      activeProduct = null;
      return;
    }

    if (existing.userId && existing.userId !== user.uid) {
      showCartToast('You can only edit your own review.', 'error');
      activeProduct = null;
      return;
    }

    fillReviewFields(existing.rating, existing.review);
    showModal();
  } catch (error) {
    console.error('[WriteReviewModal] Failed to load review for edit:', error);
    showCartToast(resolveSubmitErrorMessage(error), 'error');
    activeProduct = null;
  }
}

/**
 * Bind modal interactions once.
 */
function ensureListeners() {
  if (listenersBound) return;
  listenersBound = true;

  const modal = getModal();
  const form = getForm();
  const selector = document.getElementById('write-review-stars');
  const textarea = document.getElementById('write-review-text');
  const cancelBtn = document.getElementById('write-review-cancel');
  const closeBtn = document.getElementById('write-review-close');
  const overlay = document.getElementById('write-review-overlay');

  selector?.querySelectorAll('[data-rating]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.getAttribute('data-rating')) || 0;
      paintStarSelector(selector, selectedRating);
      showFormError('');
    });

    btn.addEventListener('mouseenter', () => {
      const hover = Number(btn.getAttribute('data-rating')) || 0;
      paintStarSelector(selector, selectedRating, hover);
    });

    btn.addEventListener('mouseleave', () => {
      paintStarSelector(selector, selectedRating);
    });
  });

  textarea?.addEventListener('input', () => {
    showFormError('');
    updateCharCounter();
  });

  cancelBtn?.addEventListener('click', () => closeWriteReviewModal());
  closeBtn?.addEventListener('click', () => closeWriteReviewModal());
  overlay?.addEventListener('click', () => closeWriteReviewModal());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeWriteReviewModal();
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting || !activeProduct) return;

    showFormError('');

    const text =
      textarea instanceof HTMLTextAreaElement ? textarea.value : '';
    const validationError = getClientValidationError(selectedRating, text);
    if (validationError) {
      showFormError(validationError);
      return;
    }

    await initFirebaseAuth();
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;

    if (!user) {
      closeWriteReviewModal();
      window.location.href = 'login.html';
      return;
    }

    const submitBtn = document.getElementById('write-review-submit');
    isSubmitting = true;
    setControlDisabled(submitBtn, true);

    const mode = modalMode;
    const productId = activeProduct.productId;

    try {
      if (mode === 'edit') {
        await updateReview(productId, user.uid, {
          rating: selectedRating,
          review: text,
        });
        showCartToast('Review updated successfully.', 'success');
      } else {
        await addReview(productId, {
          userId: user.uid,
          userName: getAccountDisplayName(user),
          rating: selectedRating,
          review: text,
          verifiedPurchase: false,
        });
        showCartToast('Review submitted successfully.', 'success');
      }

      const successCb = onSuccessCallback;
      closeWriteReviewModal();

      if (successCb) {
        successCb();
      }
    } catch (error) {
      console.error('[WriteReviewModal] Submit failed:', error);
      const message = resolveSubmitErrorMessage(error);
      showFormError(message);
      showCartToast(message, 'error');
    } finally {
      isSubmitting = false;
      const stillOpen = getModal() && !getModal().hidden;
      if (stillOpen) {
        setControlDisabled(submitBtn, false);
      }
    }
  });
}
