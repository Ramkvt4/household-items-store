/**
 * Admin Product List Module
 * Product table, stats, and delete flow
 */

const AdminProductList = (() => {
  let products = [];
  let deleteTargetId = null;
  let onEdit = null;

  function init(callbacks = {}) {
    onEdit = callbacks.onEdit;
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
    document.getElementById('cancel-delete-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-overlay')?.addEventListener('click', closeDeleteModal);
    document.getElementById('empty-add-btn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('admin:open-form'));
    });
  }

  async function load() {
    const loading = document.getElementById('products-loading');
    const table = document.getElementById('products-table');
    const empty = document.getElementById('products-empty');

    loading.hidden = false;
    table.hidden = true;
    empty.hidden = true;

    try {
      products = await ProductService.getAllForAdmin();
      updateStats();
      renderTable();
    } catch (error) {
      AdminUI.showToast('Failed to load products: ' + error.message, 'error');
    } finally {
      loading.hidden = true;
    }
  }

  function getProducts() {
    return products;
  }

  function getProductById(id) {
    return products.find((p) => p.id === id) || null;
  }

  function updateStats() {
    document.getElementById('stat-total').textContent = products.length;
    document.getElementById('stat-instock').textContent = products.filter((p) => p.inStock).length;
    document.getElementById('stat-outstock').textContent = products.filter((p) => !p.inStock).length;
  }

  function renderTable() {
    const tbody = document.getElementById('products-tbody');
    const table = document.getElementById('products-table');
    const empty = document.getElementById('products-empty');
    const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

    if (products.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      return;
    }

    table.hidden = false;
    empty.hidden = true;

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td><img class="admin-table__thumb" src="${p.image ? '../' + p.image : '../assets/images/products/placeholder.svg'}" alt="${AdminUI.escapeHtml(p.name || '')}" width="48" height="48" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='../assets/images/products/placeholder.svg'"></td>
        <td>
          <strong>${AdminUI.escapeHtml(p.name)}</strong><br>
          <small style="color: var(--color-text-muted)">${AdminUI.escapeHtml(p.brand)}</small>
        </td>
        <td>${AdminUI.escapeHtml(categoryMap[p.category] || p.category)}</td>
        <td>₹${ProductUtils.formatPrice(p.price)}</td>
        <td>${p.originalPrice ? '₹' + ProductUtils.formatPrice(p.originalPrice) : '—'}</td>
        <td>
          <span class="admin-badge ${p.inStock ? 'admin-badge--success' : 'admin-badge--danger'}">
            ${p.stock}
          </span>
        </td>
        <td>${p.rating}</td>
        <td>
          <span class="admin-badge ${p.active ? 'admin-badge--success' : 'admin-badge--danger'}">
            ${p.active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div class="admin-table__actions">
            <button type="button" class="btn btn--secondary btn--sm" data-edit="${p.id}">Edit</button>
            <button type="button" class="btn btn--secondary btn--sm" data-delete="${p.id}" style="color: var(--color-danger);">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => onEdit?.(btn.dataset.edit));
    });

    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
    });
  }

  function openDeleteModal(id) {
    const product = getProductById(id);
    deleteTargetId = id;
    document.getElementById('delete-message').textContent =
      `Delete "${product?.name || 'this product'}"? This cannot be undone.`;
    document.getElementById('delete-modal').hidden = false;
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('delete-modal').hidden = true;
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;

    try {
      await ProductService.remove(deleteTargetId);
      AdminUI.showToast('Product deleted', 'success');
      closeDeleteModal();
      await load();
    } catch (error) {
      AdminUI.showToast('Delete failed: ' + error.message, 'error');
    }
  }

  return {
    init,
    load,
    getProducts,
    getProductById,
  };
})();

if (typeof window !== 'undefined') {
  window.AdminProductList = AdminProductList;
}
