/**
 * Shared toast UI foundation (Module 10.5).
 *
 * PURPOSE
 * -------
 * Future home for storefront toast notifications.
 *
 * CURRENT STATE
 * -------------
 * The live shared toast helper is:
 *   js/modules/cart-ui.js → showCartToast(message, type?)
 *
 * It is already reused by cart, checkout, wishlist, and homepage flows.
 * This Module 10.5 phase intentionally does NOT relocate that helper
 * (avoids mass import updates and regression risk).
 *
 * TODO (Modules 11–13)
 * --------------------
 * - Move showToast / initToastStyles here
 * - Re-export from cart-ui.js for backward compatibility
 * - Optionally rename showCartToast → showToast once all callers migrate
 */

/**
 * Show a temporary toast message.
 * @param {string} message
 * @param {'success' | 'error' | 'info'} [type='success']
 * @returns {void}
 * @todo Delegate to cart-ui showCartToast after migration
 */
export function showToast(message, type = 'success') {
  void message;
  void type;
  throw new Error(
    '[toast] showToast is not migrated yet. Import showCartToast from js/modules/cart-ui.js.',
  );
}

/**
 * Ensure toast styles / container are initialized.
 * @returns {void}
 * @todo Delegate to cart-ui initCartUi after migration
 */
export function initToast() {
  throw new Error(
    '[toast] initToast is not migrated yet. Import initCartUi from js/modules/cart-ui.js.',
  );
}
