/**
 * Shared formatters foundation (Module 10.5).
 *
 * PURPOSE
 * -------
 * Future home for display formatters reused across storefront and account pages.
 *
 * CURRENT STATE
 * -------------
 * Formatting helpers already exist in domain-specific util modules.
 * They are NOT relocated in this phase (zero import-path risk).
 *
 * Canonical locations today:
 * - Currency / order amounts → js/utils/order-summary.js (`formatOrderAmount`)
 * - Product prices           → js/utils/product-utils.js (`formatPrice`)
 * - Order / wishlist dates   → js/utils/order-display.js (`formatOrderDate`)
 *
 * TODO (Modules 11–13)
 * --------------------
 * - Consolidate currency formatting into `formatCurrency(amount)`
 * - Consolidate date formatting into `formatDisplayDate(value)`
 * - Re-export from previous paths for backward compatibility during migration
 */

/**
 * Format a number as Indian Rupee display string (without symbol).
 * @param {number} amount
 * @returns {string}
 * @todo Implement by wrapping existing formatOrderAmount / formatPrice
 */
export function formatCurrency(amount) {
  // Placeholder — callers must continue using existing util modules.
  void amount;
  throw new Error(
    '[formatters] formatCurrency is not migrated yet. Use formatOrderAmount or ProductUtils.formatPrice.',
  );
}

/**
 * Format a timestamp/date for customer-facing display.
 * @param {unknown} value
 * @returns {string}
 * @todo Implement by wrapping existing formatOrderDate
 */
export function formatDisplayDate(value) {
  // Placeholder — callers must continue using existing util modules.
  void value;
  throw new Error(
    '[formatters] formatDisplayDate is not migrated yet. Use formatOrderDate from order-display.js.',
  );
}
