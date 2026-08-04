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
    const viewDashboard = document.getElementById('view-dashboard');
    const viewProducts = document.getElementById('view-products');
    const viewForm = document.getElementById('view-form');
    const viewOrders = document.getElementById('view-orders');
    const viewCustomers = document.getElementById('view-customers');

    if (viewDashboard) viewDashboard.hidden = view !== 'dashboard';
    if (viewProducts) viewProducts.hidden = view !== 'products';
    if (viewForm) viewForm.hidden = view !== 'form';
    if (viewOrders) viewOrders.hidden = view !== 'orders';
    if (viewCustomers) viewCustomers.hidden = view !== 'customers';

    const dashboardActions = document.getElementById('header-dashboard-actions');
    const productActions = document.getElementById('header-product-actions');
    const orderActions = document.getElementById('header-order-actions');
    const customerActions = document.getElementById('header-customer-actions');

    if (dashboardActions) dashboardActions.hidden = view !== 'dashboard';
    if (productActions) {
      productActions.hidden = view !== 'products' && view !== 'form';
    }
    if (orderActions) orderActions.hidden = view !== 'orders';
    if (customerActions) customerActions.hidden = view !== 'customers';

    document.querySelectorAll('.admin-sidebar__link[data-view]').forEach((link) => {
      link.classList.toggle(
        'admin-sidebar__link--active',
        link.dataset.view === view || (view === 'form' && link.dataset.view === 'add')
      );
    });

    const titles = {
      dashboard: 'Dashboard',
      products: 'Products',
      form: editing ? 'Edit Product' : 'Add Product',
      orders: 'Orders',
      customers: 'Customers',
    };
    document.getElementById('page-title').textContent = titles[view] || 'Dashboard';
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
