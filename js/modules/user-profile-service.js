/**
 * User Profile Service — saved shipping address (Module 8 Phase 2).
 * Stores address under users/{userId} for future checkout pre-fill.
 */

import {
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initFirestore, getDocRef } from './firestore-service.js';
import { firebaseCollections } from '../config/firebase-config.esm.js';

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
