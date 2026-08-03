/**
 * Checkout Validation — reusable field and form validators (Module 8 Phase 1).
 */

/** @typedef {{ field: string, message: string }} ValidationError */

const MOBILE_PATTERN = /^\d{10}$/;
const PIN_PATTERN = /^\d{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a required text field.
 * @param {string} value
 * @param {string} label
 * @returns {string|null}
 */
export function validateRequired(value, label) {
  if (!String(value ?? '').trim()) {
    return `${label} is required.`;
  }
  return null;
}

/**
 * Validate a 10-digit mobile number.
 * @param {string} value
 * @returns {string|null}
 */
export function validateMobile(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return 'Mobile number is required.';
  }

  if (!MOBILE_PATTERN.test(trimmed)) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  return null;
}

/**
 * Validate email format.
 * @param {string} value
 * @returns {string|null}
 */
export function validateEmail(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return 'Email address is required.';
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Please enter a valid email address.';
  }

  return null;
}

/**
 * Validate a 6-digit PIN code.
 * @param {string} value
 * @returns {string|null}
 */
export function validatePinCode(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return 'PIN code is required.';
  }

  if (!PIN_PATTERN.test(trimmed)) {
    return 'Please enter a valid 6-digit PIN code.';
  }

  return null;
}

/**
 * Validate that the cart is not empty.
 * @param {Array<object>} cart
 * @returns {string|null}
 */
export function validateCartNotEmpty(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return 'Your cart is empty. Add items before placing an order.';
  }
  return null;
}

/**
 * Validate the full checkout form data.
 * @param {Record<string, string>} data
 * @returns {ValidationError[]}
 */
export function validateCheckoutForm(data) {
  /** @type {ValidationError[]} */
  const errors = [];

  const checks = [
    { field: 'fullName', message: validateRequired(data.fullName, 'Full name') },
    { field: 'mobile', message: validateMobile(data.mobile) },
    { field: 'email', message: validateEmail(data.email) },
    { field: 'houseNo', message: validateRequired(data.houseNo, 'House / Flat No') },
    { field: 'street', message: validateRequired(data.street, 'Street / Area') },
    { field: 'city', message: validateRequired(data.city, 'City') },
    { field: 'state', message: validateRequired(data.state, 'State') },
    { field: 'pinCode', message: validatePinCode(data.pinCode) },
  ];

  for (const check of checks) {
    if (check.message) {
      errors.push({ field: check.field, message: check.message });
    }
  }

  return errors;
}
