/**
 * User Profile Service — saved address + customer account profile (Module 8 / 13).
 * Stores data under users/{userId}.
 */

import {
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initFirestore, getDocRef } from './firestore-service.js';
import { firebaseCollections } from '../config/firebase-config.esm.js';

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted',
};

/**
 * @param {string} userId
 * @returns {import('firebase/firestore').DocumentReference}
 */
function getUserProfileDocRef(userId) {
  if (!userId) {
    throw new Error('[UserProfile] userId is required');
  }

  return getDocRef(firebaseCollections.users, userId);
}

/**
 * Load the saved shipping address for a logged-in user.
 * @param {string} userId
 * @returns {Promise<object | null>}
 */
export async function getSavedAddress(userId) {
  if (!userId) return null;

  await initFirestore();
  const snapshot = await getDoc(getUserProfileDocRef(userId));

  if (!snapshot.exists()) {
    return null;
  }

  const address = snapshot.data()?.savedAddress;
  return address && typeof address === 'object' ? address : null;
}

/**
 * Save shipping address to the user's Firestore profile.
 * @param {string} userId
 * @param {object} address
 * @returns {Promise<void>}
 */
export async function saveUserAddress(userId, address) {
  if (!userId) {
    throw new Error('[UserProfile] userId is required to save address');
  }

  await initFirestore();

  await setDoc(
    getUserProfileDocRef(userId),
    {
      savedAddress: address,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Load full customer profile document.
 * @param {string} userId
 * @returns {Promise<object | null>}
 */
export async function getUserProfile(userId) {
  if (!userId) return null;

  await initFirestore();
  const snapshot = await getDoc(getUserProfileDocRef(userId));
  if (!snapshot.exists()) return null;

  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Create or refresh a customer profile from a Firebase Auth user.
 * Preserves existing accountStatus / savedAddress.
 * @param {import('firebase/auth').User} user
 * @param {{ recordLogin?: boolean }} [options]
 * @returns {Promise<object | null>}
 */
export async function ensureCustomerProfile(user, options = {}) {
  if (!user?.uid) return null;

  await initFirestore();

  const ref = getUserProfileDocRef(user.uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : null;

  if (
    existing?.accountStatus === ACCOUNT_STATUS.BLOCKED ||
    existing?.accountStatus === ACCOUNT_STATUS.DELETED
  ) {
    return { id: user.uid, ...existing };
  }

  const payload = {
    displayName: user.displayName || existing?.displayName || '',
    email: user.email || existing?.email || '',
    phone: user.phoneNumber || existing?.phone || '',
    photoURL: user.photoURL || existing?.photoURL || null,
    emailVerified: Boolean(user.emailVerified),
    accountStatus: existing?.accountStatus || ACCOUNT_STATUS.ACTIVE,
    updatedAt: serverTimestamp(),
  };

  if (!existing?.createdAt) {
    payload.createdAt = serverTimestamp();
  }

  if (options.recordLogin) {
    payload.lastLoginAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });

  return {
    id: user.uid,
    ...existing,
    ...payload,
  };
}

/**
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function getAccountStatus(userId) {
  const profile = await getUserProfile(userId);
  return profile?.accountStatus || ACCOUNT_STATUS.ACTIVE;
}

/**
 * Throw if the account is blocked or soft-deleted.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function assertAccountAllowed(userId) {
  const status = await getAccountStatus(userId);

  if (status === ACCOUNT_STATUS.BLOCKED) {
    const error = new Error('Your account has been blocked. Please contact support.');
    error.code = 'account/blocked';
    throw error;
  }

  if (status === ACCOUNT_STATUS.DELETED) {
    const error = new Error('This account is no longer available.');
    error.code = 'account/deleted';
    throw error;
  }
}
