/**
 * Order Service — Firestore order create/read (Module 8–9).
 */

import {
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initFirestore, getCollectionRef, getDocRef } from './firestore-service.js';
import { firebaseCollections } from '../config/firebase-config.esm.js';
import { getOrderTimestampMs } from '../utils/order-display.js';

/**
 * Persist an order document to Firestore.
 * @param {object} orderPayload — output of buildOrderPayload()
 * @returns {Promise<{ orderNumber: string, documentId: string }>}
 */
export async function createOrder(orderPayload) {
  await initFirestore();

  const ordersRef = getCollectionRef(firebaseCollections.orders);
  const timestamp = serverTimestamp();

  const docRef = await addDoc(ordersRef, {
    ...orderPayload,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    orderNumber: orderPayload.orderNumber,
    documentId: docRef.id,
  };
}

/**
 * Load orders for the signed-in user, newest first.
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getOrdersByUserId(userId) {
  if (!userId) return [];

  await initFirestore();

  const ordersRef = getCollectionRef(firebaseCollections.orders);
  const ordersQuery = query(ordersRef, where('userId', '==', userId));
  const snapshot = await getDocs(ordersQuery);

  const orders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  orders.sort(
    (a, b) => getOrderTimestampMs(b.createdAt) - getOrderTimestampMs(a.createdAt),
  );

  return orders;
}

/**
 * Load a single order by Firestore document ID.
 * @param {string} orderId
 * @returns {Promise<object | null>}
 */
export async function getOrderById(orderId) {
  if (!orderId) return null;

  await initFirestore();

  const snapshot = await getDoc(getDocRef(firebaseCollections.orders, orderId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Return a user-friendly message for order creation failures.
 * @param {unknown} error
 * @returns {string}
 */
export function getFriendlyOrderErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/network|offline|unavailable|failed-precondition/i.test(message)) {
    return 'Unable to place your order right now. Please check your connection and try again.';
  }

  if (/permission|unauthenticated|auth/i.test(message)) {
    return 'Unable to place your order. Please sign in and try again.';
  }

  return 'Something went wrong while placing your order. Please try again.';
}

/**
 * Return a user-friendly message for order read failures.
 * @param {unknown} error
 * @returns {string}
 */
export function getFriendlyOrderReadErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/network|offline|unavailable|failed-precondition/i.test(message)) {
    return 'Unable to load your orders right now. Please check your connection and try again.';
  }

  if (/permission|unauthenticated|auth/i.test(message)) {
    return 'Unable to load your orders. Please sign in and try again.';
  }

  return 'Something went wrong while loading your orders. Please try again.';
}
