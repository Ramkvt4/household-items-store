/**
 * Customer auth UI (Module 6.2 Phase 3)
 * Header login link and authenticated account dropdown menu.
 */

import { initFirebaseAuth, getFirebaseAuth } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  assertAccountAllowed,
  ensureCustomerProfile,
} from './user-profile-service.js';

const USER_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"
      fill="currentColor"/>
  </svg>`;

/** @type {(() => void) | null} */
let outsideClickHandler = null;

/**
 * @param {import('firebase/auth').User} user
 * @returns {string}
 */
function getAccountDisplayName(user) {
  if (user.displayName) {
    return user.displayName;
  }

  const prefix = user.email?.split('@')[0] || '';
  if (!prefix) {
    return 'Account';
  }

  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

/**
 * @returns {HTMLElement | null}
 */
function getAuthActionSlot() {
  return document.getElementById('auth-action');
}

/**
 * Close the account dropdown and reset trigger state.
 */
function closeAccountDropdown() {
  const dropdown = document.getElementById('account-menu-dropdown');
  const trigger = document.getElementById('account-menu-trigger');

  if (dropdown) {
    dropdown.hidden = true;
  }

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Toggle the account dropdown open/closed.
 */
function toggleAccountDropdown() {
  const dropdown = document.getElementById('account-menu-dropdown');
  const trigger = document.getElementById('account-menu-trigger');

  if (!dropdown || !trigger) {
    return;
  }

  const isOpen = !dropdown.hidden;
  dropdown.hidden = isOpen;
  trigger.setAttribute('aria-expanded', String(!isOpen));
}

/**
 * Remove outside-click listener when the account menu is not rendered.
 */
function removeOutsideClickListener() {
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler);
    outsideClickHandler = null;
  }
}

/**
 * Close dropdown when clicking outside the account menu.
 */
function setupOutsideClickListener() {
  removeOutsideClickListener();

  outsideClickHandler = (event) => {
    const menu = document.getElementById('account-menu');
    if (menu && !menu.contains(/** @type {Node} */ (event.target))) {
      closeAccountDropdown();
    }
  };

  document.addEventListener('click', outsideClickHandler);
}

/**
 * Sign out and return to the homepage login state.
 */
async function handleLogout() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  closeAccountDropdown();

  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('[Auth UI] Logout failed:', error);
  }
}

/**
 * Render the logged-out login link.
 */
function renderLoginLink() {
  const slot = getAuthActionSlot();
  if (!slot) {
    return;
  }

  removeOutsideClickListener();

  slot.innerHTML = `
    <a href="login.html" class="header__action" id="login-btn" aria-label="Login">
      ${USER_ICON_SVG}
      <span class="header__action-label">Login</span>
    </a>`;
}

/**
 * Render the authenticated account menu with dropdown.
 * @param {import('firebase/auth').User} user
 */
function renderAccountMenu(user) {
  const slot = getAuthActionSlot();
  if (!slot) {
    return;
  }

  const displayName = getAccountDisplayName(user);
  const email = user.email || '';

  slot.innerHTML = `
    <div class="account-menu" id="account-menu">
      <button
        type="button"
        class="header__action account-menu__trigger"
        id="account-menu-trigger"
        aria-label="My Account"
        aria-haspopup="true"
        aria-expanded="false"
        aria-controls="account-menu-dropdown"
      >
        ${USER_ICON_SVG}
        <span class="header__action-label">My Account</span>
      </button>

      <div
        class="account-menu__dropdown"
        id="account-menu-dropdown"
        role="menu"
        aria-label="Account menu"
        hidden
      >
        <div class="account-menu__header">
          <span class="account-menu__name">${escapeHtml(displayName)}</span>
          <span class="account-menu__email">${escapeHtml(email)}</span>
        </div>

        <ul class="account-menu__list">
          <li role="none">
            <a href="profile.html" class="account-menu__item" role="menuitem">My Profile</a>
          </li>
          <li role="none">
            <a href="my-orders.html" class="account-menu__item" role="menuitem">My Orders</a>
          </li>
          <li role="none">
            <a href="wishlist.html" class="account-menu__item" role="menuitem">Wishlist</a>
          </li>
          <li role="none">
            <a href="saved-addresses.html" class="account-menu__item" role="menuitem">Saved Addresses</a>
          </li>
          <li class="account-menu__divider" role="separator" aria-hidden="true"></li>
          <li role="none">
            <button type="button" class="account-menu__item account-menu__logout" role="menuitem">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>`;

  const trigger = document.getElementById('account-menu-trigger');
  const logoutBtn = slot.querySelector('.account-menu__logout');
  const placeholderLinks = slot.querySelectorAll(
    '.account-menu__item[href="#"]:not(.account-menu__logout)',
  );
  const navLinks = slot.querySelectorAll(
    '.account-menu__item[href]:not([href="#"]):not(.account-menu__logout)',
  );

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleAccountDropdown();
  });

  logoutBtn?.addEventListener('click', handleLogout);

  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      closeAccountDropdown();
    });
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeAccountDropdown();
    });
  });

  setupOutsideClickListener();
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {import('firebase/auth').User | null} user
 */
function updateAuthHeader(user) {
  if (user) {
    renderAccountMenu(user);
    return;
  }

  renderLoginLink();
}

/**
 * Initialize auth state listener for header UI.
 * Enforces blocked/deleted accounts and syncs Firestore profile for admin listing.
 */
async function initAuthUI() {
  await initFirebaseAuth();
  const auth = getFirebaseAuth();

  if (!auth) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await assertAccountAllowed(user.uid);
      } catch (error) {
        console.warn('[AuthUI] Account not allowed:', error.message);
        await signOut(auth);
        updateAuthHeader(null);
        return;
      }

      try {
        await ensureCustomerProfile(user);
      } catch (error) {
        console.error('[AuthUI] Profile sync failed:', error);
      }
    }

    updateAuthHeader(user);
  });
}

if (getAuthActionSlot()) {
  initAuthUI();
}

export {
  initAuthUI,
  getAccountDisplayName,
  updateAuthHeader,
  renderAccountMenu,
  renderLoginLink,
  closeAccountDropdown,
  handleLogout,
};
