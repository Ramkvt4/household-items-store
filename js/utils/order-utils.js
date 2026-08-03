/**
 * Order Utilities — build order payloads from checkout data (Module 8 Phase 2).
 */

import { generateOrderNumber } from './order-number.js';

/**
 * Human-readable label for a payment method code.
 * @param {string} method
 * @returns {string}
 */
export function getPaymentMethodLabel(method) {
  const labels = {
    cod: 'Cash on Delivery (COD)',
  };

  return labels[method] || method;
}

/**
 * Normalize customer fields from checkout form data.
 * @param {Record<string, string>} formData
 * @returns {{ fullName: string, mobile: string, email: string }}
 */
export function buildCustomerFromForm(formData) {
  return {
    fullName: String(formData.fullName ?? '').trim(),
    mobile: String(formData.mobile ?? '').trim(),
    email: String(formData.email ?? '').trim(),
  };
}

/**
 * Normalize shipping address fields from checkout form data.
 * @param {Record<string, string>} formData
 * @returns {{
 *   houseNo: string,
 *   street: string,
 *   landmark: string,
 *   city: string,
 *   state: string,
 *   pinCode: string
 * }}
 */
export function buildShippingAddressFromForm(formData) {
  return {
    houseNo: String(formData.houseNo ?? '').trim(),
    street: String(formData.street ?? '').trim(),
    landmark: String(formData.landmark ?? '').trim(),
    city: String(formData.city ?? '').trim(),
    state: String(formData.state ?? '').trim(),
    pinCode: String(formData.pinCode ?? '').trim(),
  };
}

/**
 * Snapshot cart items for order storage.
 * @param {Array<object>} cart
 * @returns {Array<object>}
 */
export function snapshotCartItems(cart) {
  return cart.map((item) => ({
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    image: item.image,
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
  }));
}

/**
 * Build a Firestore-ready order object from checkout inputs.
 * @param {{
 *   formData: Record<string, string>,
 *   cart: Array<object>,
 *   summary: ReturnType<import('./order-summary.js').getOrderSummary>,
 *   userId: string | null
 * }} params
 * @returns {object}
 */
export function buildOrderPayload({ formData, cart, summary, userId }) {
  const paymentMethod = String(formData.paymentMethod ?? 'cod');

  return {
    orderNumber: generateOrderNumber(),
    userId: userId || null,
    customer: buildCustomerFromForm(formData),
    shippingAddress: buildShippingAddressFromForm(formData),
    items: snapshotCartItems(cart),
    subtotal: summary.subtotal,
    discount: summary.discount,
    delivery: summary.delivery,
    grandTotal: summary.grandTotal,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    orderStatus: 'placed',
  };
}
