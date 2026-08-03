/**
 * Checkout Page — Module 8 Phase 1
 * Validates customer and shipping data; no order creation in this phase.
 */

import {
  getCart,
  initCartService,
  isCartLoading,
  CART_UPDATED_EVENT,
  CART_LOADING_EVENT,
} from './modules/cart-service.js';
import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getAccountDisplayName } from './modules/auth-ui.js';
import { showCartToast, initCartUi } from './modules/cart-ui.js';
import { getOrderSummary, formatOrderAmount } from './utils/order-summary.js';
import {
  validateCheckoutForm,
  validateCartNotEmpty,
} from './utils/checkout-validation.js';

/** Field names mapped to input element IDs */
const FIELD_IDS = {
  fullName: 'full-name',
  mobile: 'mobile',
  email: 'email',
  houseNo: 'house-no',
  street: 'street',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pinCode: 'pin-code',
};

/**
 * Update the header cart badge count.
 * @param {number} count
 */
function updateHeaderBadge(count) {
  const badge = document.querySelector('.header__actions .cart-badge');
  if (!badge) return;

  badge.textContent = count;
  badge.hidden = count === 0;
}

/**
 * Show or hide page sections based on loading and cart state.
 * @param {'loading' | 'empty' | 'ready'} state
 */
function setPageState(state) {
  const loading = document.getElementById('checkout-loading');
  const empty = document.getElementById('checkout-empty');
  const layout = document.getElementById('checkout-layout');
  const subtitle = document.getElementById('checkout-page-subtitle');

  if (loading) {
    loading.hidden = state !== 'loading';
    loading.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  if (empty) {
    empty.hidden = state !== 'empty';
  }

  if (layout) {
    layout.hidden = state !== 'ready';
  }

  if (subtitle) {
    subtitle.hidden = state !== 'ready';
  }
}

/**
 * Render order summary totals from cart-service via order-summary utility.
 */
function renderOrderSummary() {
  const summary = getOrderSummary();
  const countEl = document.getElementById('summary-product-count');
  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const deliveryEl = document.getElementById('summary-delivery');
  const grandTotalEl = document.getElementById('summary-grand-total');

  const countLabel = `${summary.productCount} item${summary.productCount !== 1 ? 's' : ''}`;

  if (countEl) countEl.textContent = countLabel;
  if (subtotalEl) subtotalEl.textContent = `₹${formatOrderAmount(summary.subtotal)}`;
  if (discountEl) {
    discountEl.textContent = summary.discount > 0
      ? `− ₹${formatOrderAmount(summary.discount)}`
      : '− ₹0';
  }
  if (deliveryEl) {
    deliveryEl.textContent = summary.isFreeDelivery ? 'Free' : `₹${formatOrderAmount(summary.delivery)}`;
  }
  if (grandTotalEl) grandTotalEl.textContent = `₹${formatOrderAmount(summary.grandTotal)}`;

  updateHeaderBadge(summary.productCount);
}

/**
 * Read the checkout page based on cart contents.
 */
function renderCheckoutPage() {
  if (isCartLoading()) {
    setPageState('loading');
    return;
  }

  const cart = getCart();

  if (cart.length === 0) {
    setPageState('empty');
    updateHeaderBadge(0);
    return;
  }

  setPageState('ready');
  renderOrderSummary();
}

/**
 * Pre-fill customer fields from Firebase Auth when logged in.
 * @param {import('firebase/auth').User | null} user
 */
function prefillCustomerInfo(user) {
  const fullNameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');

  if (!user) {
    return;
  }

  if (fullNameInput && !fullNameInput.value.trim()) {
    fullNameInput.value = user.displayName || getAccountDisplayName(user);
  }

  if (emailInput && !emailInput.value.trim() && user.email) {
    emailInput.value = user.email;
  }
}

/**
 * Clear all inline validation messages and error styles.
 */
function clearValidationErrors() {
  Object.keys(FIELD_IDS).forEach((field) => {
    const errorEl = document.getElementById(`error-${field}`);
    const inputEl = document.getElementById(FIELD_IDS[field]);

    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.classList.remove('checkout-form__input--error');
  });
}

/**
 * Display inline validation errors for form fields.
 * @param {Array<{ field: string, message: string }>} errors
 */
function showValidationErrors(errors) {
  clearValidationErrors();

  for (const { field, message } of errors) {
    const errorEl = document.getElementById(`error-${field}`);
    const inputEl = document.getElementById(FIELD_IDS[field]);

    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('checkout-form__input--error');
  }

  const firstErrorField = errors[0]?.field;
  if (firstErrorField) {
    const firstInput = document.getElementById(FIELD_IDS[firstErrorField]);
    firstInput?.focus();
  }
}

/**
 * Collect form field values from the checkout form.
 * @returns {Record<string, string>}
 */
function getFormData() {
  const form = document.getElementById('checkout-form');
  if (!form) return {};

  const data = new FormData(form);
  return {
    fullName: String(data.get('fullName') ?? ''),
    mobile: String(data.get('mobile') ?? ''),
    email: String(data.get('email') ?? ''),
    houseNo: String(data.get('houseNo') ?? ''),
    street: String(data.get('street') ?? ''),
    landmark: String(data.get('landmark') ?? ''),
    city: String(data.get('city') ?? ''),
    state: String(data.get('state') ?? ''),
    pinCode: String(data.get('pinCode') ?? ''),
    paymentMethod: String(data.get('paymentMethod') ?? 'cod'),
  };
}

/**
 * Handle Place Order — validate only; no Firestore writes in Phase 1.
 * @param {Event} event
 */
function handlePlaceOrder(event) {
  event.preventDefault();

  clearValidationErrors();

  const cart = getCart();
  const cartError = validateCartNotEmpty(cart);

  if (cartError) {
    showCartToast(cartError, 'error');
    setPageState('empty');
    return;
  }

  const formData = getFormData();
  const formErrors = validateCheckoutForm(formData);

  if (formErrors.length > 0) {
    showValidationErrors(formErrors);
    return;
  }

  showCartToast('Checkout information validated successfully.', 'success');
}

/**
 * Clear field error on input for better UX.
 * @param {Event} event
 */
function handleFieldInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  const fieldEntry = Object.entries(FIELD_IDS).find(([, id]) => id === input.id);
  if (!fieldEntry) return;

  const [field] = fieldEntry;
  const errorEl = document.getElementById(`error-${field}`);

  input.classList.remove('checkout-form__input--error');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Initialize auth listener to pre-fill customer info.
 */
async function initCustomerPrefill() {
  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) return;

  onAuthStateChanged(auth, (user) => {
    prefillCustomerInfo(user);
  });
}

/**
 * Bind checkout form and field events.
 */
function bindCheckoutEvents() {
  const form = document.getElementById('checkout-form');
  if (!form || form.dataset.eventsBound === 'true') return;

  form.dataset.eventsBound = 'true';
  form.addEventListener('submit', handlePlaceOrder);
  form.addEventListener('input', handleFieldInput);
}

document.addEventListener('DOMContentLoaded', async () => {
  initCartUi();
  bindCheckoutEvents();

  setPageState('loading');

  await initCartService();
  await initCustomerPrefill();
  renderCheckoutPage();

  document.addEventListener(CART_UPDATED_EVENT, renderCheckoutPage);
  document.addEventListener(CART_LOADING_EVENT, renderCheckoutPage);
});
