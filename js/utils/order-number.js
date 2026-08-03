/**
 * Order Number Generator — Module 8 Phase 2
 * Format: HAH-YYYYMMDD-XXXXXX (6 random uppercase alphanumeric chars)
 */

const SUFFIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SUFFIX_LENGTH = 6;

/**
 * Generate a cryptographically random uppercase alphanumeric suffix.
 * @param {number} length
 * @returns {string}
 */
function generateRandomSuffix(length) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  let suffix = '';
  for (let i = 0; i < length; i += 1) {
    suffix += SUFFIX_CHARS[values[i] % SUFFIX_CHARS.length];
  }
  return suffix;
}

/**
 * Generate a customer-friendly order number.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function generateOrderNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const suffix = generateRandomSuffix(SUFFIX_LENGTH);

  return `HAH-${datePart}-${suffix}`;
}
