/**
 * Cart Coupon — applied-coupon persistence & cart integration (Module 11 Phase 2).
 *
 * Stores the applied coupon in localStorage alongside the cart session.
 * Discount is calculated via coupon-service; checkout reads the stored values
 * and must not re-validate or recalculate.
 */

import {
  validateCoupon,
  calculateDiscount,
  normalizeCouponCode,
} from '../services/coupon-service.js';
import { getCartTotal } from './cart-service.js';

const STORAGE_KEY = 'appliedCartCoupon';
export const CART_COUPON_UPDATED_EVENT = 'cartCouponUpdated';

/**
 * @typedef {object} AppliedCoupon
 * @property {string} code
 * @property {'flat'|'percentage'} type
 * @property {number} value
 * @property {number} minOrder
 * @property {number|null} maxDiscount
 * @property {number} discount
 */

/**
 * Notify UI that the applied coupon changed.
 */
function notifyCouponUpdated() {
  document.dispatchEvent(new CustomEvent(CART_COUPON_UPDATED_EVENT));
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
 * Normalize a persisted coupon snapshot.
 * @param {unknown} raw
 * @returns {AppliedCoupon|null}
 */
function normalizeAppliedCoupon(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const code = normalizeCouponCode(raw.code);
  const type = String(raw.type ?? '').trim().toLowerCase();

  if (!code || (type !== 'flat' && type !== 'percentage')) {
    return null;
  }

  const maxRaw = raw.maxDiscount;
  const maxDiscount =
    maxRaw == null || maxRaw === ''
      ? null
      : toNonNegativeNumber(maxRaw);

  return {
    code,
    type: /** @type {'flat'|'percentage'} */ (type),
    value: toNonNegativeNumber(raw.value),
    minOrder: toNonNegativeNumber(raw.minOrder),
    maxDiscount,
    discount: toNonNegativeNumber(raw.discount),
  };
}

/**
 * Read the applied coupon from localStorage.
 * @returns {AppliedCoupon|null}
 */
function readStoredCoupon() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return normalizeAppliedCoupon(JSON.parse(stored));
  } catch {
    return null;
  }
}

/**
 * Persist the applied coupon snapshot.
 * @param {AppliedCoupon|null} coupon
 */
function writeStoredCoupon(coupon) {
  try {
    if (!coupon) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coupon));
    }
  } catch (error) {
    console.error('[CartCoupon] Failed to persist applied coupon:', error);
  }
}

/**
 * Build a cart coupon snapshot from a validated coupon result.
 * @param {{
 *   code: string,
 *   type: 'flat'|'percentage',
 *   value: number,
 *   minOrder: number,
 *   maxDiscount: number|null
 * }} coupon
 * @param {number} discount
 * @returns {AppliedCoupon}
 */
function toAppliedCoupon(coupon, discount) {
  return {
    code: normalizeCouponCode(coupon.code),
    type: coupon.type,
    value: toNonNegativeNumber(coupon.value),
    minOrder: toNonNegativeNumber(coupon.minOrder),
    maxDiscount: coupon.maxDiscount == null ? null : toNonNegativeNumber(coupon.maxDiscount),
    discount: toNonNegativeNumber(discount),
  };
}

/**
 * Return the currently applied coupon (or null).
 * @returns {AppliedCoupon|null}
 */
export function getAppliedCoupon() {
  return readStoredCoupon();
}

/**
 * Whether a coupon is currently applied.
 * @returns {boolean}
 */
export function hasAppliedCoupon() {
  return getAppliedCoupon() != null;
}

/**
 * Recalculate stored discount from the current subtotal without Firestore.
 * Clears the coupon when the minimum order is no longer met.
 * @param {number} [subtotal=getCartTotal()]
 * @returns {AppliedCoupon|null}
 */
export function syncAppliedCouponWithSubtotal(subtotal = getCartTotal()) {
  const applied = readStoredCoupon();
  if (!applied) return null;

  const amount = toNonNegativeNumber(subtotal);

  if (amount < applied.minOrder) {
    writeStoredCoupon(null);
    notifyCouponUpdated();
    return null;
  }

  const discount = calculateDiscount(
    {
      code: applied.code,
      type: applied.type,
      value: applied.value,
      minOrder: applied.minOrder,
      maxDiscount: applied.maxDiscount,
      expiry: null,
      active: true,
    },
    amount,
  );

  if (discount === applied.discount) {
    return applied;
  }

  const updated = { ...applied, discount };
  writeStoredCoupon(updated);
  notifyCouponUpdated();
  return updated;
}

/**
 * Validate and apply a coupon code against the current cart subtotal.
 * @param {string} code
 * @returns {Promise<{
 *   ok: boolean,
 *   coupon: AppliedCoupon|null,
 *   message: string,
 *   error: string|null
 * }>}
 */
export async function applyCouponToCart(code) {
  const subtotal = getCartTotal();
  const result = await validateCoupon(code, subtotal);

  if (!result.valid || !result.coupon) {
    return {
      ok: false,
      coupon: null,
      message: result.message || 'This coupon code is invalid.',
      error: result.error || 'NOT_FOUND',
    };
  }

  const applied = toAppliedCoupon(result.coupon, result.discount);
  writeStoredCoupon(applied);
  notifyCouponUpdated();

  return {
    ok: true,
    coupon: applied,
    message: result.message || 'Coupon applied successfully.',
    error: null,
  };
}

/**
 * Remove the applied coupon and reset discount.
 * @returns {boolean} Whether a coupon was removed
 */
export function removeAppliedCoupon() {
  const existing = readStoredCoupon();
  if (!existing) return false;

  writeStoredCoupon(null);
  notifyCouponUpdated();
  return true;
}

/**
 * Clear applied coupon when the cart is empty (no notify if already clear).
 */
export function clearAppliedCouponIfCartEmpty(cartLength) {
  if (Number(cartLength) > 0) return;
  if (!readStoredCoupon()) return;
  writeStoredCoupon(null);
  notifyCouponUpdated();
}

/**
 * Re-validate a persisted coupon against Firestore on cart page load.
 * Keeps the coupon if still valid; otherwise clears it.
 * @returns {Promise<AppliedCoupon|null>}
 */
export async function revalidateAppliedCoupon() {
  const applied = readStoredCoupon();
  if (!applied) return null;

  const subtotal = getCartTotal();
  const result = await validateCoupon(applied.code, subtotal);

  if (!result.valid || !result.coupon) {
    writeStoredCoupon(null);
    notifyCouponUpdated();
    return null;
  }

  const refreshed = toAppliedCoupon(result.coupon, result.discount);
  writeStoredCoupon(refreshed);

  if (
    refreshed.discount !== applied.discount
    || refreshed.minOrder !== applied.minOrder
    || refreshed.value !== applied.value
  ) {
    notifyCouponUpdated();
  }

  return refreshed;
}
