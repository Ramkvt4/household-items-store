/**
 * Product Service
 * Firestore CRUD for products
 */

const ProductService = (() => {
  let db = null;

  function init(firestore) {
    db = firestore;
  }

  function getCollection() {
    if (!db) throw new Error('Firestore not initialized');
    return db.collection(FirebaseConfig.collections.products);
  }

  /**
   * Fetch active products for the storefront
   * @returns {Promise<Array>}
   */
  async function getAll() {
    if (!db) {
      console.error('[ProductService] Firestore not initialized');
      return [];
    }

    try {
      const snapshot = await getCollection().where('active', '==', true).get();

      return snapshot.docs
        .map((doc) => ProductUtils.normalize({ id: doc.id, ...doc.data() }))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[ProductService] Failed to fetch products:', error);
      return [];
    }
  }

  /**
   * Fetch all products for the admin dashboard (including inactive)
   * @returns {Promise<Array>}
   */
  async function getAllForAdmin() {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const snapshot = await getCollection().get();

    return snapshot.docs
      .map((doc) => ProductUtils.normalize({ id: doc.id, ...doc.data() }))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async function getById(id) {
    if (!db) return null;

    const doc = await getCollection().doc(id).get();
    if (!doc.exists) return null;
    return ProductUtils.normalize({ id: doc.id, ...doc.data() });
  }

  /**
   * @param {object} productData - Firestore document fields
   * @returns {Promise<string>} New document ID
   */
  async function create(productData) {
    const payload = {
      ...productData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await getCollection().add(payload);
    return docRef.id;
  }

  /**
   * @param {string} id
   * @param {object} productData
   */
  async function update(id, productData) {
    const payload = {
      ...productData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await getCollection().doc(id).update(payload);
  }

  /**
   * @param {string} id
   */
  async function remove(id) {
    await getCollection().doc(id).delete();
  }

  /**
   * Import sample products when collection is empty
   * @returns {Promise<number>} Count imported
   */
  async function seedFromLocalData() {
    if (!db || typeof STORE_DATA === 'undefined') return 0;

    const existing = await getCollection().limit(1).get();
    if (!existing.empty) return 0;

    const batch = db.batch();
    STORE_DATA.products.forEach((product) => {
      const docRef = getCollection().doc();
      batch.set(docRef, {
        ...ProductUtils.toFirestoreDoc(product),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    return STORE_DATA.products.length;
  }

  return {
    init,
    getAll,
    getAllForAdmin,
    getById,
    create,
    update,
    remove,
    seedFromLocalData,
  };
})();

if (typeof window !== 'undefined') {
  window.ProductService = ProductService;
}
