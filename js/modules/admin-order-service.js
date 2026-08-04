/**
 * Admin Order Service
 * Firestore read / realtime listen / status update for admin dashboard (compat SDK)
 */

const AdminOrderService = (() => {
  let db = null;
  let unsubscribe = null;

  const ORDER_STATUSES = [
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ];

  const STATUS_LABELS = {
    placed: 'Placed',
    confirmed: 'Confirmed',
    packed: 'Packed',
    shipped: 'Shipped',
    out_for_delivery: 'Out For Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const PENDING_STATUSES = [
    'placed',
    'confirmed',
    'packed',
    'shipped',
    'out_for_delivery',
  ];

  function init(firestore) {
    db = firestore;
  }

  function getCollection() {
    if (!db) throw new Error('Firestore not initialized');
    return db.collection(FirebaseConfig.collections.orders);
  }

  function isValidStatus(status) {
    return ORDER_STATUSES.includes(status);
  }

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || status || '—';
  }

  function getPaymentMethodLabel(method) {
    const labels = {
      cod: 'Cash on Delivery (COD)',
    };
    return labels[method] || method || '—';
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
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Subscribe to all orders (newest first). Replaces any previous listener.
   * @param {(orders: Array<object>) => void} onData
   * @param {(error: Error) => void} [onError]
   * @returns {() => void} Unsubscribe
   */
  function subscribeAll(onData, onError) {
    stopListening();

    unsubscribe = getCollection()
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          onData(snapshot.docs.map(mapDoc));
        },
        (error) => {
          console.error('[AdminOrderService] Listen failed:', error);
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
   * Update order status and append to statusHistory.
   * @param {string} orderId
   * @param {string} newStatus
   * @param {string} [adminEmail]
   * @returns {Promise<void>}
   */
  async function updateStatus(orderId, newStatus, adminEmail) {
    if (!isValidStatus(newStatus)) {
      throw new Error('Invalid order status');
    }

    const ref = getCollection().doc(orderId);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new Error('Order not found');
    }

    const current = snap.data().orderStatus;
    if (current === newStatus) {
      return;
    }

    await ref.update({
      orderStatus: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      statusHistory: firebase.firestore.FieldValue.arrayUnion({
        status: newStatus,
        at: firebase.firestore.Timestamp.now(),
        by: adminEmail || null,
      }),
    });
  }

  return {
    init,
    subscribeAll,
    stopListening,
    updateStatus,
    isValidStatus,
    getStatusLabel,
    getPaymentMethodLabel,
    getTimestampMs,
    ORDER_STATUSES,
    STATUS_LABELS,
    PENDING_STATUSES,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminOrderService = AdminOrderService;
}
