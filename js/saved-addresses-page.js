/**
 * Saved Addresses page — Module 9 Phase 1
 * View-only display of the shipping address stored on the user profile.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { initCartService, getCartCount } from './modules/cart-service.js';
import { getSavedAddress } from './modules/user-profile-service.js';
import { escapeHtml } from './utils/order-display.js';

/**
 * @param {number} count
 */
function updateHeaderBadge(count) {
  const badge = document.querySelector('.header__actions .cart-badge');
  if (!badge) return;

  badge.textContent = String(count);
  badge.hidden = count === 0;
}

/**
 * @param {'loading' | 'empty' | 'error' | 'ready'} state
 * @param {string} [errorMessage]
 */
function setPageState(state, errorMessage) {
  const loading = document.getElementById('addresses-loading');
  const empty = document.getElementById('addresses-empty');
  const error = document.getElementById('addresses-error');
  const content = document.getElementById('addresses-content');
  const errorText = document.getElementById('addresses-error-text');

  if (loading) loading.hidden = state !== 'loading';
  if (empty) empty.hidden = state !== 'empty';
  if (error) error.hidden = state !== 'error';
  if (content) content.hidden = state !== 'ready';

  if (errorText && errorMessage) {
    errorText.textContent = errorMessage;
  }

  document.getElementById('main-content')?.setAttribute(
    'aria-busy',
    state === 'loading' ? 'true' : 'false',
  );
}

/**
 * @param {object | null} address
 * @returns {boolean}
 */
function hasSavedAddress(address) {
  if (!address || typeof address !== 'object') return false;

  return Boolean(
    address.houseNo ||
      address.street ||
      address.landmark ||
      address.city ||
      address.state ||
      address.pinCode,
  );
}

/**
 * @param {object} address
 */
function renderAddress(address) {
  const rows = document.getElementById('saved-address-rows');
  if (!rows) return;

  const fields = [
    { label: 'House Number', value: address.houseNo },
    { label: 'Street', value: address.street },
    { label: 'Landmark', value: address.landmark },
    { label: 'City', value: address.city },
    { label: 'State', value: address.state },
    { label: 'PIN Code', value: address.pinCode },
  ];

  rows.innerHTML = fields
    .map(
      (field) => `
      <div class="saved-address-rows__row">
        <dt class="saved-address-rows__label">${escapeHtml(field.label)}</dt>
        <dd class="saved-address-rows__value">${escapeHtml(field.value || '—')}</dd>
      </div>`,
    )
    .join('');
}

/**
 * @param {import('firebase/auth').User} user
 */
async function loadSavedAddress(user) {
  setPageState('loading');

  try {
    const address = await getSavedAddress(user.uid);

    if (!hasSavedAddress(address)) {
      setPageState('empty');
      return;
    }

    renderAddress(address);
    setPageState('ready');
  } catch (error) {
    console.error('[Saved Addresses] Failed to load address:', error);
    setPageState(
      'error',
      'Unable to load your saved address right now. Please check your connection and try again.',
    );
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setPageState('loading');

  await initCartService();
  updateHeaderBadge(getCartCount());

  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) {
    setPageState('error', 'Unable to verify your account. Please try again.');
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    loadSavedAddress(user);
  });
});
