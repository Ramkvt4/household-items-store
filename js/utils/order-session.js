/**
 * Order Session — pass order details to the success page (Module 8 Phase 2).
 */

const SESSION_KEY = 'homeappliance_last_order';

/**
 * Store the placed order summary for the success page redirect.
 * @param {object} orderSummary
 */
export function storeLastOrder(orderSummary) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(orderSummary));
  } catch (error) {
    console.warn('[OrderSession] Failed to store order summary:', error);
  }
}

/**
 * Read and remove the last placed order from session storage.
 * @returns {object | null}
 */
export function consumeLastOrder() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(SESSION_KEY);
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[OrderSession] Failed to read order summary:', error);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Peek at the last order without removing it.
 * @returns {object | null}
 */
export function peekLastOrder() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
