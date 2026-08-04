/**
 * Auth entry point (Module 6.2)
 * Phase 1: Firebase initialization
 * Phase 2: Customer registration
 * Phase 3: Customer login
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
  signInWithEmailAndPassword,
  signOut,
  fetchSignInMethodsForEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  ensureCustomerProfile,
  assertAccountAllowed,
} from './modules/user-profile-service.js';

await initFirebaseAuth();

const registerForm = document.getElementById('register-form');
if (registerForm) {
  initRegisterPage();
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  initLoginPage();
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
 * Convert Firebase login errors into user-friendly messages.
 * @param {Error & { code?: string }} error
 * @returns {string}
 */
function formatLoginAuthError(error) {
  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'account/blocked': 'Your account has been blocked. Please contact support.',
    'account/deleted': 'This account is no longer available.',
  };

  return messages[error.code] || 'Login failed. Please try again.';
}

/**
 * Resolve ambiguous Firebase credential errors into specific login messages.
 * @param {Error & { code?: string }} error
 * @param {string} email
 * @returns {Promise<string>}
 */
async function resolveLoginAuthError(error, email) {
  const ambiguousCodes = ['auth/invalid-credential', 'auth/invalid-login-credentials'];

  if (!ambiguousCodes.includes(error.code)) {
    return formatLoginAuthError(error);
  }

  const auth = getFirebaseAuth();
  if (!auth || !email) {
    return 'Login failed. Please try again.';
  }

  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length === 0) {
      return 'No account found with this email.';
    }
    return 'Incorrect password.';
  } catch {
    return 'Login failed. Please try again.';
  }
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

  try {
    await ensureCustomerProfile(credential.user);
  } catch (error) {
    console.error('[Auth] Failed to create customer profile:', error);
  }

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

/**
 * Wire up login form handling on the login page.
 */
function initLoginPage() {
  loginForm.addEventListener('submit', handleLoginSubmit);
}

/**
 * Validate login form fields.
 * @param {{ email: string, password: string }} data
 * @returns {string|null} Error message or null if valid
 */
function validateLogin(data) {
  if (!data.email) {
    return 'Email is required.';
  }

  if (!isValidEmail(data.email)) {
    return 'Please enter a valid email address.';
  }

  if (!data.password) {
    return 'Password is required.';
  }

  return null;
}

/**
 * Hide login feedback messages.
 */
function clearLoginMessages() {
  const errorEl = document.getElementById('login-error');
  const successEl = document.getElementById('login-success');

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
 * Show a login error message.
 * @param {string} message
 */
function showLoginError(message) {
  const errorEl = document.getElementById('login-error');
  const successEl = document.getElementById('login-success');

  if (successEl) {
    successEl.hidden = true;
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

/**
 * Show a login success message.
 * @param {string} message
 */
function showLoginSuccess(message) {
  const errorEl = document.getElementById('login-error');
  const successEl = document.getElementById('login-success');

  if (errorEl) {
    errorEl.hidden = true;
  }

  if (successEl) {
    successEl.textContent = message;
    successEl.hidden = false;
  }
}

/**
 * Sign in a user with email and password.
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  const auth = getFirebaseAuth();

  if (!auth) {
    throw new Error('Authentication service is unavailable. Please try again later.');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  try {
    await assertAccountAllowed(user.uid);
  } catch (error) {
    await signOut(auth);
    throw error;
  }

  try {
    await ensureCustomerProfile(user, { recordLogin: true });
  } catch (error) {
    console.error('[Auth] Failed to sync customer profile:', error);
  }

  return user;
}

/**
 * Handle login form submission.
 * @param {SubmitEvent} event
 */
async function handleLoginSubmit(event) {
  event.preventDefault();
  clearLoginMessages();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-submit-btn');

  const formData = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };

  const validationError = validateLogin(formData);
  if (validationError) {
    showLoginError(validationError);
    return;
  }

  const originalButtonText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing In...';

  try {
    await loginUser(formData.email, formData.password);

    showLoginSuccess('Login successful! Redirecting to homepage...');

    loginForm.querySelectorAll('input').forEach((input) => {
      input.disabled = true;
    });

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  } catch (error) {
    const message = error.code
      ? await resolveLoginAuthError(error, formData.email)
      : error.message;
    showLoginError(message);
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
