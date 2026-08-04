/**
 * Review Service — Firestore product reviews CRUD (Module 12 Phase 1).
 *
 * Path: reviews/{productId}/items/{reviewId}
 * Document ID = authenticated user's uid (one review per user per product).
 */

import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import {
  initFirestore,
  getProductReviewsCollectionRef,
  getProductReviewDocRef,
} from '../modules/firestore-service.js';
import { getOrderTimestampMs } from '../utils/order-display.js';
import {
  isNetworkOrOfflineError,
  isPermissionError,
} from '../utils/network-error.js';

/** Minimum review text length (characters). */
export const REVIEW_TEXT_MIN_LENGTH = 10;

/** Maximum review text length (characters). */
export const REVIEW_TEXT_MAX_LENGTH = 1000;

/** Allowed star ratings (inclusive). */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const REVIEW_ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_PRODUCT: 'INVALID_PRODUCT',
  INVALID_RATING: 'INVALID_RATING',
  INVALID_REVIEW_TEXT: 'INVALID_REVIEW_TEXT',
  INVALID_USER_NAME: 'INVALID_USER_NAME',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
});

/**
 * @typedef {object} Review
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {number} rating
 * @property {string} review
 * @property {unknown} createdAt
 * @property {unknown} updatedAt
 * @property {boolean} verifiedPurchase
 */

/**
 * Domain error with a stable machine-readable code.
 */
export class ReviewServiceError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'ReviewServiceError';
    this.code = code;
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @returns {never}
 */
function throwReviewError(code, message) {
  throw new ReviewServiceError(code, message);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value ?? '').trim();
}

/**
 * Validate rating is an integer 1–5.
 * @param {unknown} rating
 * @returns {number}
 */
export function validateRating(rating) {
  const n = Number(rating);

  if (!Number.isInteger(n) || n < RATING_MIN || n > RATING_MAX) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_RATING,
      `Rating must be a whole number between ${RATING_MIN} and ${RATING_MAX}.`,
    );
  }

  return n;
}

/**
 * Validate review body length (after trim).
 * @param {unknown} review
 * @returns {string}
 */
export function validateReviewText(review) {
  const text = normalizeText(review);

  if (text.length < REVIEW_TEXT_MIN_LENGTH) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_REVIEW_TEXT,
      `Review must be at least ${REVIEW_TEXT_MIN_LENGTH} characters.`,
    );
  }

  if (text.length > REVIEW_TEXT_MAX_LENGTH) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_REVIEW_TEXT,
      `Review must be at most ${REVIEW_TEXT_MAX_LENGTH} characters.`,
    );
  }

  return text;
}

/**
 * @param {unknown} userName
 * @returns {string}
 */
function validateUserName(userName) {
  const name = normalizeText(userName);
  if (!name) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_USER_NAME,
      'A display name is required to submit a review.',
    );
  }
  return name;
}

/**
 * @param {unknown} productId
 * @returns {string}
 */
function requireProductId(productId) {
  const id = normalizeText(productId);
  if (!id) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_PRODUCT,
      'A product ID is required.',
    );
  }
  return id;
}

/**
 * @param {unknown} userId
 * @returns {string}
 */
function requireUserId(userId) {
  const id = normalizeText(userId);
  if (!id) {
    throwReviewError(
      REVIEW_ERROR_CODES.UNAUTHENTICATED,
      'You must be signed in to manage reviews.',
    );
  }
  return id;
}

/**
 * Normalize a review Firestore document for consumers.
 * @param {import('firebase/firestore').QueryDocumentSnapshot | import('firebase/firestore').DocumentSnapshot} docSnap
 * @returns {Review}
 */
export function normalizeReview(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    userId: String(data.userId || docSnap.id),
    userName: normalizeText(data.userName),
    rating: Number(data.rating) || 0,
    review: normalizeText(data.review),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    verifiedPurchase: Boolean(data.verifiedPurchase),
  };
}

/**
 * Sort reviews newest-first by createdAt.
 * @param {Array<Review>} reviews
 * @returns {Array<Review>}
 */
export function sortReviews(reviews) {
  return [...reviews].sort(
    (a, b) => getOrderTimestampMs(b.createdAt) - getOrderTimestampMs(a.createdAt),
  );
}

/**
 * Load all reviews for a product (newest first).
 * @param {string} productId
 * @returns {Promise<Review[]>}
 */
export async function getProductReviews(productId) {
  const pid = requireProductId(productId);

  await initFirestore();

  const snapshot = await getDocs(getProductReviewsCollectionRef(pid));
  const reviews = snapshot.docs.map((docSnap) => normalizeReview(docSnap));
  return sortReviews(reviews);
}

/**
 * Subscribe to realtime review changes for a product.
 * @param {string} productId
 * @param {(reviews: Review[]) => void} onChange
 * @param {(error: Error) => void} [onError]
 * @returns {Promise<() => void>} Unsubscribe function
 */
export async function subscribeToReviews(productId, onChange, onError) {
  const pid = normalizeText(productId);
  if (!pid) {
    onChange([]);
    return () => {};
  }

  await initFirestore();

  return onSnapshot(
    getProductReviewsCollectionRef(pid),
    (snapshot) => {
      const reviews = snapshot.docs.map((docSnap) => normalizeReview(docSnap));
      onChange(sortReviews(reviews));
    },
    (error) => {
      console.error('[Reviews] Realtime listener failed:', error);
      if (typeof onError === 'function') {
        onError(error);
      }
    },
  );
}

/**
 * Create a review for a product.
 * Document ID is the author's uid — enforces one review per user.
 *
 * @param {string} productId
 * @param {object} payload
 * @param {string} payload.userId
 * @param {string} payload.userName
 * @param {number} payload.rating
 * @param {string} payload.review
 * @param {boolean} [payload.verifiedPurchase=false]
 * @returns {Promise<Review>}
 */
export async function addReview(productId, payload = {}) {
  const pid = requireProductId(productId);
  const userId = requireUserId(payload.userId);
  const userName = validateUserName(payload.userName);
  const rating = validateRating(payload.rating);
  const review = validateReviewText(payload.review);
  const verifiedPurchase = Boolean(payload.verifiedPurchase);

  await initFirestore();

  const docRef = getProductReviewDocRef(pid, userId);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
    throwReviewError(
      REVIEW_ERROR_CODES.ALREADY_EXISTS,
      'You have already reviewed this product.',
    );
  }

  const timestamp = serverTimestamp();

  await setDoc(docRef, {
    userId,
    userName,
    rating,
    review,
    createdAt: timestamp,
    updatedAt: timestamp,
    verifiedPurchase,
  });

  const created = await getDoc(docRef);
  return normalizeReview(created);
}

/**
 * Update the signed-in user's review for a product.
 * Only rating and review text are updatable from the client.
 *
 * @param {string} productId
 * @param {string} userId
 * @param {object} updates
 * @param {number} [updates.rating]
 * @param {string} [updates.review]
 * @returns {Promise<Review>}
 */
export async function updateReview(productId, userId, updates = {}) {
  const pid = requireProductId(productId);
  const uid = requireUserId(userId);

  if (updates.rating == null && updates.review == null) {
    throwReviewError(
      REVIEW_ERROR_CODES.INVALID_REVIEW_TEXT,
      'Provide a rating and/or review text to update.',
    );
  }

  /** @type {Record<string, unknown>} */
  const patch = {
    updatedAt: serverTimestamp(),
  };

  if (updates.rating != null) {
    patch.rating = validateRating(updates.rating);
  }

  if (updates.review != null) {
    patch.review = validateReviewText(updates.review);
  }

  await initFirestore();

  const docRef = getProductReviewDocRef(pid, uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    throwReviewError(
      REVIEW_ERROR_CODES.NOT_FOUND,
      'No review found to update.',
    );
  }

  const data = existing.data() || {};
  if (data.userId && data.userId !== uid) {
    throwReviewError(
      REVIEW_ERROR_CODES.FORBIDDEN,
      'You can only edit your own review.',
    );
  }

  await updateDoc(docRef, patch);

  const updated = await getDoc(docRef);
  return normalizeReview(updated);
}

/**
 * Delete the signed-in user's review for a product.
 * @param {string} productId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteReview(productId, userId) {
  const pid = requireProductId(productId);
  const uid = requireUserId(userId);

  await initFirestore();

  const docRef = getProductReviewDocRef(pid, uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    throwReviewError(
      REVIEW_ERROR_CODES.NOT_FOUND,
      'No review found to delete.',
    );
  }

  const data = existing.data() || {};
  if (data.userId && data.userId !== uid) {
    throwReviewError(
      REVIEW_ERROR_CODES.FORBIDDEN,
      'You can only delete your own review.',
    );
  }

  await deleteDoc(docRef);
}

/**
 * Load a single user's review for a product, or null if none.
 * @param {string} productId
 * @param {string} userId
 * @returns {Promise<Review|null>}
 */
export async function getUserReview(productId, userId) {
  const pid = normalizeText(productId);
  const uid = normalizeText(userId);
  if (!pid || !uid) return null;

  await initFirestore();

  const snapshot = await getDoc(getProductReviewDocRef(pid, uid));
  if (!snapshot.exists()) return null;

  return normalizeReview(snapshot);
}

/**
 * Friendly message for review failures.
 * @param {unknown} error
 * @returns {string}
 */
export function getFriendlyReviewErrorMessage(error) {
  if (error instanceof ReviewServiceError) {
    return error.message;
  }

  if (isNetworkOrOfflineError(error)) {
    return 'Unable to update your review right now. Please check your connection and try again.';
  }

  if (isPermissionError(error)) {
    return 'Please sign in to manage your review.';
  }

  return 'Something went wrong while saving your review. Please try again.';
}
