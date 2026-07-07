/**
 * Firebase Configuration
 * --------------------
 * Replace placeholder values with your Firebase project credentials.
 * Get them from: Firebase Console → Project Settings → Your apps → SDK setup
 *
 * SETUP STEPS:
 * 1. Create a project at https://console.firebase.google.com
 * 2. Enable Firestore Database and Authentication (optional)
 * 3. Replace the config object below
 * 4. Uncomment Firebase SDK scripts in index.html
 * 5. Set USE_FIREBASE to true
 */

const FirebaseConfig = {
  USE_FIREBASE: false,

  config: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },

  /** Firestore collection names */
  collections: {
    products: 'products',
    categories: 'categories',
    orders: 'orders',
    inquiries: 'inquiries',
  },

  /** WhatsApp business number (country code, no + or spaces) */
  whatsappNumber: '919876543210',

  /**
   * Initialize Firebase — call after SDK scripts are loaded
   * @returns {object|null} Firestore instance or null if disabled
   */
  init() {
    if (!this.USE_FIREBASE) {
      console.info('[Firebase] Running in local mode. Set USE_FIREBASE to true to connect.');
      return null;
    }

    if (typeof firebase === 'undefined') {
      console.error('[Firebase] SDK not loaded. Uncomment Firebase scripts in index.html.');
      return null;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(this.config);
      }
      const db = firebase.firestore();
      console.info('[Firebase] Connected successfully.');
      return db;
    } catch (error) {
      console.error('[Firebase] Initialization failed:', error);
      return null;
    }
  },

  /**
   * Fetch products from Firestore
   * @param {object} db - Firestore instance
   * @returns {Promise<Array>}
   */
  async fetchProducts(db) {
    if (!db) return null;

    try {
      const snapshot = await db.collection(this.collections.products).get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[Firebase] Failed to fetch products:', error);
      return null;
    }
  },

  /**
   * Save an inquiry to Firestore
   * @param {object} db - Firestore instance
   * @param {object} inquiry - Inquiry data
   */
  async saveInquiry(db, inquiry) {
    if (!db) return;

    try {
      await db.collection(this.collections.inquiries).add({
        ...inquiry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[Firebase] Failed to save inquiry:', error);
    }
  },

  /**
   * Build WhatsApp inquiry URL
   * @param {string} message - Pre-filled message
   * @returns {string}
   */
  getWhatsAppUrl(message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${this.whatsappNumber}?text=${encoded}`;
  },
};

// Export for module usage
if (typeof window !== 'undefined') {
  window.FirebaseConfig = FirebaseConfig;
}
