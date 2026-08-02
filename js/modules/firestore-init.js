/**
 * Firestore bootstrap (Module 7 Phase 1)
 * Initializes and verifies Firestore on customer-facing pages.
 * No cart migration or UI changes — preparation only.
 */

import { initFirestore, verifyFirestoreConnection } from './firestore-service.js';

await initFirestore();
await verifyFirestoreConnection();
