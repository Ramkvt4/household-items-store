/**
 * Shared display formatters — thin wrappers over existing domain helpers.
 * Prefer importing domain modules directly when already in use.
 */

import { formatOrderDate, getOrderTimestampMs } from './order-display.js';

/**
 * Format a number as Indian Rupee amount (without ₹ symbol).
 * Avoids importing order-summary (which depends on cart modules).
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return Number(amount).toLocaleString('en-IN');
}

/**
 * Format a timestamp/date for customer-facing display.
 * @param {unknown} value
 * @returns {string}
 */
export function formatDisplayDate(value) {
  return formatOrderDate(value);
}

/**
 * Convert Firestore Timestamp / Date / number to milliseconds.
 * @param {unknown} value
 * @returns {number}
 */
export function getTimestampMs(value) {
  return getOrderTimestampMs(value);
}
