/**
 * Storage Service
 * Firebase Storage uploads for product images
 */

const StorageService = (() => {
  let storage = null;

  function init(firebaseStorage) {
    storage = firebaseStorage;
  }

  /**
   * Upload a single product image file
   * @param {File} file
   * @param {string} [productId] - Optional folder segment
   * @returns {Promise<string>} Download URL
   */
  async function uploadProductImage(file, productId) {
    if (!storage) throw new Error('Firebase Storage not initialized');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = productId || `temp_${Date.now()}`;
    const path = `${FirebaseConfig.storagePaths.products}/${folder}/${Date.now()}_${safeName}`;
    const ref = storage.ref().child(path);

    const snapshot = await ref.put(file, {
      contentType: file.type,
      customMetadata: { uploadedAt: new Date().toISOString() },
    });

    return snapshot.ref.getDownloadURL();
  }

  /**
   * Upload multiple image files
   * @param {FileList|File[]} files
   * @param {string} [productId]
   * @returns {Promise<string[]>}
   */
  async function uploadProductImages(files, productId) {
    const list = Array.from(files || []);
    const uploads = list.map((file) => uploadProductImage(file, productId));
    return Promise.all(uploads);
  }

  /**
   * Delete image by URL (best-effort)
   * @param {string} url
   */
  async function deleteByUrl(url) {
    if (!storage || !url || !url.includes('firebasestorage.googleapis.com')) return;

    try {
      const ref = storage.refFromURL(url);
      await ref.delete();
    } catch (error) {
      console.warn('[Storage] Could not delete image:', error.message);
    }
  }

  return {
    init,
    uploadProductImage,
    uploadProductImages,
    deleteByUrl,
  };
})();

if (typeof window !== 'undefined') {
  window.StorageService = StorageService;
}
