/**
 * Profile page — Module 9 polish
 * Read-only customer profile from Firebase Auth.
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
import { getAccountDisplayName } from './modules/auth-ui.js';
import { initCartService, getCartCount } from './modules/cart-service.js';

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
 * @param {'loading' | 'error' | 'ready'} state
 * @param {string} [errorMessage]
 */
function setPageState(state, errorMessage) {
  const loading = document.getElementById('profile-loading');
  const error = document.getElementById('profile-error');
  const content = document.getElementById('profile-content');
  const errorText = document.getElementById('profile-error-text');

  if (loading) loading.hidden = state !== 'loading';
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
 * @param {string} name
 * @returns {string}
 */
function getAvatarInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * @param {import('firebase/auth').User} user
 */
function renderProfile(user) {
  const displayName = getAccountDisplayName(user);
  const email = user.email || '—';
  const mobile = user.phoneNumber || 'Not provided';

  const avatar = document.getElementById('profile-avatar');
  const heading = document.getElementById('profile-card-heading');
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const mobileEl = document.getElementById('profile-mobile');

  if (avatar) avatar.textContent = getAvatarInitials(displayName);
  if (heading) heading.textContent = displayName;
  if (nameEl) nameEl.textContent = user.displayName || displayName;
  if (emailEl) emailEl.textContent = email;
  if (mobileEl) mobileEl.textContent = mobile;
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

    renderProfile(user);
    setPageState('ready');
  });
});
