/**
 * Order Summary — shared cart totals for checkout and cart pages.
 * Reads the already-applied coupon from cart-coupon (validated in Cart).
 * Does not re-validate or recalculate discounts.
 */

import { getCartCount, getCartTotal } from '../modules/cart-service.js';
import { getAppliedCoupon } from '../modules/cart-coupon.js';

/**
 * Build order summary totals from the current cart + applied coupon snapshot.
 * @returns {{
 *   productCount: number,
 *   subtotal: number,
 *   discount: number,
 *   delivery: number,
 *   grandTotal: number,
 *   finalTotal: number,
 *   isFreeDelivery: boolean,
 *   couponCode: string|null
 * }}
 */
export function getOrderSummary() {
  const subtotal = getCartTotal();
  const applied = getAppliedCoupon();
  const discount = applied ? Number(applied.discount) || 0 : 0;
  const delivery = 0;
  const grandTotal = Math.max(0, subtotal - discount + delivery);

  return {
    productCount: getCartCount(),
    subtotal,
    discount,
    delivery,
    grandTotal,
    finalTotal: grandTotal,
    isFreeDelivery: true,
    couponCode: applied?.code ?? null,
  };
}

/**
 * Format a number as Indian Rupee display string (without symbol).
 * @param {number} amount
 * @returns {string}
 */
export function formatOrderAmount(amount) {
  return Number(amount).toLocaleString('en-IN');
}
