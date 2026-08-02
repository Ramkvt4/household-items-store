/**
 * Auth entry point (Module 6.2)
 * Phase 1: Firebase initialization
 * Phase 2: Customer registration
 */

import {
  initFirebaseAuth,
  getFirebaseAuth,
  AUTH_SIGN_IN_METHOD,
  isFirebaseConfigured,
} from './modules/firebase-init.js';

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

await initFirebaseAuth();

const registerForm = document.getElementById('register-form');
if (registerForm) {
  initRegisterPage();
}

/**
 * Wire up registration form handling on the register page.
 */
function initRegisterPage() {
  registerForm.addEventListener('submit', handleRegisterSubmit);
}

/**
 * Validate registration form fields.
 * @param {{ name: string, email: string, password: string, confirmPassword: string }} data
 * @returns {string|null} Error message or null if valid
 */
function validateRegistration(data) {
  if (!data.name) {
    return 'Full name is required.';
  }

  if (!isValidEmail(data.email)) {
    return 'Please enter a valid email address.';
  }

  if (data.password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  if (data.password !== data.confirmPassword) {
    return 'Passwords do not match.';
  }

  return null;
}

/**
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Convert Firebase Auth errors into user-friendly messages.
 * @param {Error & { code?: string }} error
 * @returns {string}
 */
function formatFirebaseAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed': 'Email/password registration is not enabled.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  };

  return messages[error.code] || 'Registration failed. Please try again.';
}

/**
 * Hide registration feedback messages.
 */
function clearRegisterMessages() {
  const errorEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');

  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  if (successEl) {
    successEl.textContent = '';
    successEl.hidden = true;
  }
}

/**
 * Show a registration error message.
 * @param {string} message
 */
function showRegisterError(message) {
  const errorEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');

  if (successEl) {
    successEl.hidden = true;
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

/**
 * Show a registration success message.
 * @param {string} message
 */
function showRegisterSuccess(message) {
  const errorEl = document.getElementById('register-error');
  const successEl = document.getElementById('register-success');

  if (errorEl) {
    errorEl.hidden = true;
  }

  if (successEl) {
    successEl.textContent = message;
    successEl.hidden = false;
  }
}

/**
 * Create a Firebase user and set display name.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 */
async function registerUser(name, email, password) {
  const auth = getFirebaseAuth();

  if (!auth) {
    throw new Error('Authentication service is unavailable. Please try again later.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  return credential.user;
}

/**
 * Handle registration form submission.
 * @param {SubmitEvent} event
 */
async function handleRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterMessages();

  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmPasswordInput = document.getElementById('register-confirm-password');
  const submitBtn = document.getElementById('register-submit-btn');

  const formData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value,
    confirmPassword: confirmPasswordInput.value,
  };

  const validationError = validateRegistration(formData);
  if (validationError) {
    showRegisterError(validationError);
    return;
  }

  const originalButtonText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    await registerUser(formData.name, formData.email, formData.password);

    showRegisterSuccess('Account created successfully! Redirecting to login...');

    registerForm.querySelectorAll('input').forEach((input) => {
      input.disabled = true;
    });

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    showRegisterError(
      error.code ? formatFirebaseAuthError(error) : error.message,
    );
    submitBtn.disabled = false;
    submitBtn.textContent = originalButtonText;
  }
}

export {
  initFirebaseAuth,
  getFirebaseAuth,
  AUTH_SIGN_IN_METHOD,
  isFirebaseConfigured,
};
