/**
 * Wishlist page — Module 9 polish
 * Placeholder empty state only (no wishlist functionality).
 */

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { initFirebaseAuth, getFirebaseAuth } from './modules/firebase-init.js';
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

document.addEventListener('DOMContentLoaded', async () => {
  await initCartService();
  updateHeaderBadge(getCartCount());

  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) return;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });
});
