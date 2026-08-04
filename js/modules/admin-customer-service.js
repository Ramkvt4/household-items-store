/**
 * Admin Customer Service
 * Firestore realtime listen + account status updates (compat SDK)
 */

const AdminCustomerService = (() => {
  let db = null;
  let unsubscribe = null;

  const ACCOUNT_STATUSES = {
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    DELETED: 'deleted',
  };

  function init(firestore) {
    db = firestore;
  }

  function getCollection() {
    if (!db) throw new Error('Firestore not initialized');
    return db.collection(FirebaseConfig.collections.users);
  }

  function getTimestampMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function mapDoc(doc) {
    const data = doc.data() || {};
    return {
      id: doc.id,
      displayName: data.displayName || '',
      email: data.email || '',
      phone: data.phone || '',
      photoURL: data.photoURL || null,
      emailVerified: Boolean(data.emailVerified),
      accountStatus: data.accountStatus || ACCOUNT_STATUSES.ACTIVE,
      savedAddress: data.savedAddress || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
      lastLoginAt: data.lastLoginAt || null,
      statusUpdatedAt: data.statusUpdatedAt || null,
      statusUpdatedBy: data.statusUpdatedBy || null,
    };
  }

  /**
   * Subscribe to all customer profiles (newest first by createdAt client-side).
   * @param {(customers: Array<object>) => void} onData
   * @param {(error: Error) => void} [onError]
   * @returns {() => void}
   */
  function subscribeAll(onData, onError) {
    stopListening();

    unsubscribe = getCollection().onSnapshot(
      (snapshot) => {
        const customers = snapshot.docs.map(mapDoc);
        customers.sort(
          (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
        );
        onData(customers);
      },
      (error) => {
        console.error('[AdminCustomerService] Listen failed:', error);
        onError?.(error);
      }
    );

    return stopListening;
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  /**
   * @param {string} userId
   * @param {'active'|'blocked'|'deleted'} status
   * @param {string} [adminEmail]
   */
  async function updateAccountStatus(userId, status, adminEmail) {
    const allowed = Object.values(ACCOUNT_STATUSES);
    if (!allowed.includes(status)) {
      throw new Error('Invalid account status');
    }

    await getCollection().doc(userId).set(
      {
        accountStatus: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        statusUpdatedBy: adminEmail || null,
      },
      { merge: true }
    );
  }

  /**
   * @param {string} userId
   * @returns {Promise<{ wishlistCount: number, cartItemsCount: number, reviewsCount: number }>}
   */
  async function getEngagementCounts(userId) {
    const result = {
      wishlistCount: 0,
      cartItemsCount: 0,
      reviewsCount: 0,
    };

    if (!userId || !db) return result;

    try {
      const wishlistSnap = await getCollection().doc(userId).collection('wishlist').get();
      result.wishlistCount = wishlistSnap.size;
    } catch (error) {
      console.warn('[AdminCustomerService] Wishlist count failed:', error);
    }

    try {
      const cartSnap = await db.collection(FirebaseConfig.collections.carts).doc(userId).get();
      if (cartSnap.exists) {
        const items = cartSnap.data()?.items;
        if (Array.isArray(items)) {
          result.cartItemsCount = items.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0
          );
        }
      }
    } catch (error) {
      console.warn('[AdminCustomerService] Cart count failed:', error);
    }

    try {
      const reviewsSnap = await db
        .collectionGroup('items')
        .where('userId', '==', userId)
        .get();
      result.reviewsCount = reviewsSnap.size;
    } catch (error) {
      console.warn('[AdminCustomerService] Reviews count failed:', error);
    }

    return result;
  }

  return {
    init,
    subscribeAll,
    stopListening,
    updateAccountStatus,
    getEngagementCounts,
    getTimestampMs,
    ACCOUNT_STATUSES,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminCustomerService = AdminCustomerService;
}
