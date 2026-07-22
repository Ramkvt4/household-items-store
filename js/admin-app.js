/**
 * Admin Dashboard Application
 * Orchestrates auth, product list, and product form modules
 */

const AdminApp = (() => {
  function init() {
    if (!FirebaseConfig.isConfigured()) {
      AdminUI.showToast('Add Firebase credentials in js/config/firebase-config.js', 'error');
    }

    const { db, auth } = FirebaseConfig.init();
    ProductService.init(db);
    AuthService.init(auth);

    AdminProductList.init({
      onEdit: (id) => AdminProductForm.open(id),
    });

    AdminProductForm.init({
      onSaved: async () => {
        await AdminProductList.load();
        AdminUI.showView('products');
      },
    });

    bindEvents();

    AuthService.onAuthStateChanged((user) => {
      if (user && AuthService.isAdmin(user)) {
        AdminUI.showDashboard(user);
        AdminUI.showView('products');
        AdminProductList.load();
      } else {
        AdminUI.showLogin();
      }
    });
  }

  function bindEvents() {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', () => AuthService.signOut());
    document.getElementById('add-product-btn')?.addEventListener('click', () => AdminProductForm.open());
    document.getElementById('seed-btn')?.addEventListener('click', handleSeed);

    document.querySelectorAll('.admin-sidebar__link[data-view]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.dataset.view === 'add') {
          AdminProductForm.open();
        } else {
          AdminUI.showView('products');
        }
      });
    });

    window.addEventListener('admin:open-form', () => AdminProductForm.open());
    window.addEventListener('admin:show-products', () => AdminUI.showView('products'));
    window.addEventListener('admin:show-form', (e) => {
      AdminUI.showView('form', e.detail?.editing);
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
      errorEl.hidden = true;
      await AuthService.signIn(email, password);
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    }
  }

  async function handleSeed() {
    if (!confirm('Import sample products into Firestore? Skips if products already exist.')) return;

    try {
      const count = await ProductService.seedFromLocalData();
      AdminUI.showToast(
        count ? `Imported ${count} products` : 'Products already exist — skipped',
        count ? 'success' : 'info'
      );
      await AdminProductList.load();
    } catch (error) {
      AdminUI.showToast('Import failed: ' + error.message, 'error');
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => AdminApp.init());
