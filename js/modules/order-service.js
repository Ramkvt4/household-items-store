/**
 * Order Service — Firestore order creation (Module 8 Phase 2).
 */

import {
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initFirestore, getCollectionRef } from './firestore-service.js';
import { firebaseCollections } from '../config/firebase-config.esm.js';

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
