/**
 * Order Summary — shared cart totals for checkout and cart pages.
 * Uses cart-service calculations; does not duplicate pricing logic.
 */

import { getCartCount, getCartTotal } from '../modules/cart-service.js';

/**
 * Build order summary totals from the current cart.
 * Discount and delivery match the cart page (no discount, free delivery).
 * @returns {{
 *   productCount: number,
 *   subtotal: number,
 *   discount: number,
 *   delivery: number,
 *   grandTotal: number,
 *   isFreeDelivery: boolean
 * }}
 */
export function getOrderSummary() {
  const subtotal = getCartTotal();
  const discount = 0;
  const delivery = 0;

  return {
    productCount: getCartCount(),
    subtotal,
    discount,
    delivery,
    grandTotal: subtotal - discount + delivery,
    isFreeDelivery: true,
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
