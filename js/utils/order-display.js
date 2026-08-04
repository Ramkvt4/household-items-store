/**
 * Order display helpers — shared formatting for My Orders / Order Details.
 */

/**
 * Human-readable order status label.
 * @param {string} status
 * @returns {string}
 */
export function formatOrderStatus(status) {
  const labels = {
    placed: 'Placed',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return labels[status] || status || '—';
}

/**
 * Convert a Firestore Timestamp / Date / number to milliseconds.
 * @param {unknown} value
 * @returns {number}
 */
export function getOrderTimestampMs(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format order createdAt for display (e.g. 4 Aug 2026).
 * @param {unknown} createdAt
 * @returns {string}
 */
export function formatOrderDate(createdAt) {
  const ms = getOrderTimestampMs(createdAt);
  if (!ms) return '—';

  return new Date(ms).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Total quantity across order line items.
 * @param {Array<{ quantity?: number }> | undefined} items
 * @returns {number}
 */
export function getOrderItemCount(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

/**
 * Escape text for safe HTML insertion.
 * @param {unknown} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}
