/**
 * Admin UI Helpers
 * Shared utilities for the admin dashboard
 */

const AdminUI = (() => {
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showLogin() {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('dashboard').hidden = true;
  }

  function showDashboard(user) {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    document.getElementById('admin-user-email').textContent = user.email;
  }

  function showView(view, editing = false) {
    document.getElementById('view-products').hidden = view !== 'products';
    document.getElementById('view-form').hidden = view !== 'form';

    document.querySelectorAll('.admin-sidebar__link[data-view]').forEach((link) => {
      link.classList.toggle(
        'admin-sidebar__link--active',
        link.dataset.view === view || (view === 'form' && link.dataset.view === 'add')
      );
    });

    const titles = {
      products: 'Products',
      form: editing ? 'Edit Product' : 'Add Product',
    };
    document.getElementById('page-title').textContent = titles[view] || 'Products';
  }

  return {
    showToast,
    escapeHtml,
    showLogin,
    showDashboard,
    showView,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminUI = AdminUI;
}
