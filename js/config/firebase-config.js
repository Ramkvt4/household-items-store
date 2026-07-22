/**
 * Firebase Configuration
 * ----------------------
 * 1. Create a project at https://console.firebase.google.com
 * 2. Enable Authentication (Email/Password), Firestore, and Storage
 * 3. Paste your web app config below
 * 4. Deploy rules from /firebase/ via Firebase CLI
 * 5. Add admin emails to adminEmails array
 */

const FirebaseConfig = {
  config: {
    apiKey: 'AIzaSyDkkqKv_RzpTGkDB2dmEdjUKuiwkaFBy8w',
    authDomain: 'homeappliance-hub.firebaseapp.com',
    projectId: 'homeappliance-hub',
    storageBucket: 'homeappliance-hub.firebasestorage.app',
    messagingSenderId: '775949673512',
    appId: '1:775949673512:web:6d0278a527a705dee0011d',
    measurementId: 'G-QZZ5SDJT84',
  },

  /** Emails allowed to access the admin dashboard */
  adminEmails: [
    'jioraichu@gmail.com',
  ],

  collections: {
    products: 'products',
    categories: 'categories',
    orders: 'orders',
    inquiries: 'inquiries',
    admins: 'admins',
  },

  storagePaths: {
    products: 'products',
  },

  whatsappNumber: '918919114283', //test

  _db: null,
  _storage: null,
  _auth: null,
  _initialized: false,

  isConfigured() {
    return this.config.apiKey && !this.config.apiKey.includes('YOUR_');
  },

  init() {
    if (!this.isConfigured()) {
      console.warn('[Firebase] Add your project credentials in js/config/firebase-config.js');
      return { db: null, storage: null, auth: null };
    }

    if (typeof firebase === 'undefined') {
      console.error('[Firebase] SDK not loaded. Check script tags in index.html');
      return { db: null, storage: null, auth: null };
    }

    if (!this._initialized) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.config);
        }
        this._db = firebase.firestore();
        this._storage = firebase.storage();
        this._auth = firebase.auth();
        this._initialized = true;
      } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        return { db: null, storage: null, auth: null };
      }
    }

    return {
      db: this._db,
      storage: this._storage,
      auth: this._auth,
    };
  },

  /**
   * Verify Firestore connectivity (does not read or write products)
   * @returns {Promise<object|null>} Firestore instance
   */
  async connectFirestore() {
    try {
      const { db } = this.init();

      if (!db) {
        throw new Error('Firestore could not be initialized. Check SDK scripts and firebase-config.js credentials.');
      }

      await db.collection('connection_check').doc('ping').get();
      console.log('Firebase Connected Successfully');
      return db;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  get db() {
    return this._db;
  },

  get storage() {
    return this._storage;
  },

  get auth() {
    return this._auth;
  },

  getWhatsAppUrl(message) {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
  },

  isAdminEmail(email) {
    if (!email) return false;
    return this.adminEmails.map((e) => e.toLowerCase()).includes(email.toLowerCase());
  },
};

if (typeof window !== 'undefined') {
  window.FirebaseConfig = FirebaseConfig;
}
