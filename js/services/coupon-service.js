/**
 * Coupon Service — Firestore coupon validation & discount calculation
 * (Module 11 Phase 1).
 *
 * Backend foundation only — no UI wiring in this phase.
 */

import { getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initFirestore, getDocRef } from '../modules/firestore-service.js';
import { firebaseCollections } from '../config/firebase-config.esm.js';

/** @typedef {'flat' | 'percentage'} CouponType */

/**
 * @typedef {object} Coupon
 * @property {string} code
 * @property {CouponType} type
 * @property {number} value
 * @property {number} minOrder
 * @property {number|null} maxDiscount
 * @property {unknown} expiry
 * @property {boolean} active
 */

/**
 * @typedef {object} CouponValidationSuccess
 * @property {true} valid
 * @property {Coupon} coupon
 * @property {number} discount
 * @property {string} message
 * @property {null} error
 */

/**
 * @typedef {object} CouponValidationError
 * @property {false} valid
 * @property {null} coupon
 * @property {0} discount
 * @property {string} message
 * @property {string} error
 */

/** @typedef {CouponValidationSuccess | CouponValidationError} CouponValidationResult */

export const COUPON_TYPES = Object.freeze({
  FLAT: 'flat',
  PERCENTAGE: 'percentage',
});

export const COUPON_ERROR_CODES = Object.freeze({
  INVALID_CODE: 'INVALID_CODE',
  NOT_FOUND: 'NOT_FOUND',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  MIN_ORDER: 'MIN_ORDER',
  INVALID_TYPE: 'INVALID_TYPE',
});

/**
 * Normalize a coupon code for document lookup (trim + uppercase).
 * @param {unknown} code
 * @returns {string}
 */
export function normalizeCouponCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

/**
 * @param {{ coupon: Coupon, discount: number, message?: string }} params
 * @returns {CouponValidationSuccess}
 */
function toSuccess({ coupon, discount, message }) {
  return {
    valid: true,
    coupon,
    discount,
    message: message || 'Coupon applied successfully.',
    error: null,
  };
}

/**
 * @param {string} error
 * @param {string} message
 * @returns {CouponValidationError}
 */
function toError(error, message) {
  return {
    valid: false,
    coupon: null,
    discount: 0,
    message,
    error,
  };
}

/**
 * Convert coupon expiry field to epoch milliseconds, or null if unset/invalid.
 * Supports Firestore Timestamp, Date, number (ms), and ISO/date strings.
 * @param {unknown} expiry
 * @returns {number|null}
 */
function getExpiryMs(expiry) {
  if (expiry == null || expiry === '') return null;

  if (typeof expiry === 'object') {
    if (typeof expiry.toMillis === 'function') {
      return expiry.toMillis();
    }
    if (typeof expiry.toDate === 'function') {
      return expiry.toDate().getTime();
    }
    if (expiry instanceof Date) {
      return expiry.getTime();
    }
    // Firestore Timestamp-like plain object { seconds, nanoseconds }
    if (typeof expiry.seconds === 'number') {
      return expiry.seconds * 1000 + Math.floor((expiry.nanoseconds || 0) / 1e6);
    }
  }

  if (typeof expiry === 'number' && Number.isFinite(expiry)) {
    return expiry;
  }

  if (typeof expiry === 'string') {
    const parsed = Date.parse(expiry);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * @param {Coupon} coupon
 * @returns {boolean}
 */
function isCouponExpired(coupon) {
  const expiryMs = getExpiryMs(coupon?.expiry);
  if (expiryMs == null) return false;
  return Date.now() > expiryMs;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Normalize a Firestore coupon document for engine use.
 * @param {import('firebase/firestore').DocumentSnapshot} docSnap
 * @returns {Coupon}
 */
function normalizeCoupon(docSnap) {
  const data = docSnap.data() || {};
  const code = normalizeCouponCode(data.code || docSnap.id);
  const type = String(data.type ?? '').trim().toLowerCase();

  const maxRaw = data.maxDiscount;
  const maxDiscount =
    maxRaw == null || maxRaw === ''
      ? null
      : toNonNegativeNumber(maxRaw);

  return {
    code,
    type: /** @type {CouponType} */ (type),
    value: toNonNegativeNumber(data.value),
    minOrder: toNonNegativeNumber(data.minOrder),
    maxDiscount,
    expiry: data.expiry ?? null,
    active: Boolean(data.active),
  };
}

/**
 * Fetch a coupon document by code.
 * Document ID is the coupon code (e.g. SAVE500).
 * @param {string} code
 * @returns {Promise<Coupon|null>}
 */
export async function getCoupon(code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  await initFirestore();

  const snapshot = await getDoc(
    getDocRef(firebaseCollections.coupons, normalized),
  );

  if (!snapshot.exists()) return null;

  return normalizeCoupon(snapshot);
}

/**
 * Calculate discount amount for a validated coupon and cart subtotal.
 * Flat: min(value, subtotal). Percentage: honors optional maxDiscount.
 * @param {Coupon|null|undefined} coupon
 * @param {number} subtotal
 * @returns {number}
 */
export function calculateDiscount(coupon, subtotal) {
  const amount = toNonNegativeNumber(subtotal);
  if (!coupon || amount <= 0) return 0;

  const value = toNonNegativeNumber(coupon.value);
  if (value <= 0) return 0;

  if (coupon.type === COUPON_TYPES.FLAT) {
    return Math.min(value, amount);
  }

  if (coupon.type === COUPON_TYPES.PERCENTAGE) {
    let discount = (amount * value) / 100;

    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, toNonNegativeNumber(coupon.maxDiscount));
    }

    return Math.min(discount, amount);
  }

  return 0;
}

/**
 * Validate a coupon against the current order subtotal.
 * Checks existence, active flag, expiry, and minimum order.
 * @param {string} code
 * @param {number} subtotal
 * @returns {Promise<CouponValidationResult>}
 */
export async function validateCoupon(code, subtotal) {
  const normalized = normalizeCouponCode(code);

  if (!normalized) {
    return toError(
      COUPON_ERROR_CODES.INVALID_CODE,
      'Please enter a coupon code.',
    );
  }

  let coupon;
  try {
    coupon = await getCoupon(normalized);
  } catch (err) {
    console.error('[Coupon] Failed to load coupon:', err);
    return toError(
      COUPON_ERROR_CODES.NOT_FOUND,
      'Unable to validate this coupon right now. Please try again.',
    );
  }

  if (!coupon) {
    return toError(
      COUPON_ERROR_CODES.NOT_FOUND,
      'This coupon code is invalid.',
    );
  }

  if (!coupon.active) {
    return toError(
      COUPON_ERROR_CODES.INACTIVE,
      'This coupon is no longer active.',
    );
  }

  if (isCouponExpired(coupon)) {
    return toError(
      COUPON_ERROR_CODES.EXPIRED,
      'This coupon has expired.',
    );
  }

  const orderAmount = toNonNegativeNumber(subtotal);
  if (orderAmount < coupon.minOrder) {
    return toError(
      COUPON_ERROR_CODES.MIN_ORDER,
      `Minimum order of ₹${coupon.minOrder.toLocaleString('en-IN')} required for this coupon.`,
    );
  }

  if (
    coupon.type !== COUPON_TYPES.FLAT &&
    coupon.type !== COUPON_TYPES.PERCENTAGE
  ) {
    return toError(
      COUPON_ERROR_CODES.INVALID_TYPE,
      'This coupon is misconfigured.',
    );
  }

  const discount = calculateDiscount(coupon, orderAmount);

  return toSuccess({
    coupon,
    discount,
    message: 'Coupon applied successfully.',
  });
}
