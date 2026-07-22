/**
 * Admin Dashboard Application
 */

const AdminApp = (() => {
  let products = [];
  let editingId = null;
  let existingImages = [];
  let deleteTargetId = null;

  function init() {
    if (!FirebaseConfig.isConfigured()) {
      showToast('Add Firebase credentials in js/config/firebase-config.js', 'error');
    }

    const { db, storage, auth } = FirebaseConfig.init();
    ProductService.init(db);
    StorageService.init(storage);
    AuthService.init(auth);

    populateCategorySelect();
    bindEvents();

    AuthService.onAuthStateChanged((user) => {
      if (user && AuthService.isAdmin(user)) {
        showDashboard(user);
        loadProducts();
      } else {
        showLogin();
      }
    });
  }

  function bindEvents() {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', () => AuthService.signOut());
    document.getElementById('product-form')?.addEventListener('submit', handleSaveProduct);
    document.getElementById('cancel-form-btn')?.addEventListener('click', () => showView('products'));
    document.getElementById('add-product-btn')?.addEventListener('click', () => openForm());
    document.getElementById('empty-add-btn')?.addEventListener('click', () => openForm());
    document.getElementById('seed-btn')?.addEventListener('click', handleSeed);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
    document.getElementById('cancel-delete-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-overlay')?.addEventListener('click', closeDeleteModal);

    document.querySelectorAll('[data-view]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view === 'add') openForm();
        else showView('products');
      });
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

  function showLogin() {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('dashboard').hidden = true;
  }

  function showDashboard(user) {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    document.getElementById('admin-user-email').textContent = user.email;
    showView('products');
  }

  function showView(view) {
    document.getElementById('view-products').hidden = view !== 'products';
    document.getElementById('view-form').hidden = view !== 'form';

    document.querySelectorAll('.admin-sidebar__link[data-view]').forEach((link) => {
      link.classList.toggle('admin-sidebar__link--active', link.dataset.view === view || (view === 'form' && link.dataset.view === 'add'));
    });

    document.getElementById('page-title').textContent = view === 'form'
      ? (editingId ? 'Edit Product' : 'Add Product')
      : 'Products';
  }

  async function loadProducts() {
    const loading = document.getElementById('products-loading');
    const table = document.getElementById('products-table');
    const empty = document.getElementById('products-empty');

    loading.hidden = false;
    table.hidden = true;
    empty.hidden = true;

    try {
      products = await ProductService.getAll();
      updateStats();
      renderTable();
    } catch (error) {
      showToast('Failed to load products: ' + error.message, 'error');
    } finally {
      loading.hidden = true;
    }
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

    if (products.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      return;
    }

    table.hidden = false;
    empty.hidden = true;

    const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td><img class="admin-table__thumb" src="${ProductUtils.getPrimaryImage(p)}" alt=""></td>
        <td>
          <strong>${escapeHtml(p.name)}</strong><br>
          <small style="color: var(--color-text-muted)">${escapeHtml(p.brand)}</small>
        </td>
        <td>${escapeHtml(categoryMap[p.category] || p.category)}</td>
        <td>₹${ProductUtils.formatPrice(p.price)}</td>
        <td>${p.discount ? p.discount + '%' : '—'}</td>
        <td>
          <span class="admin-badge ${p.inStock ? 'admin-badge--success' : 'admin-badge--danger'}">
            ${p.stock}
          </span>
        </td>
        <td>${p.rating}</td>
        <td>
          <div class="admin-table__actions">
            <button type="button" class="btn btn--secondary btn--sm" data-edit="${p.id}">Edit</button>
            <button type="button" class="btn btn--secondary btn--sm" data-delete="${p.id}" style="color: var(--color-danger);">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openForm(btn.dataset.edit));
    });

    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.delete));
    });
  }

  function populateCategorySelect() {
    const select = document.getElementById('product-category');
    if (!select) return;

    select.innerHTML = CATEGORIES.map((c) =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  }

  function openForm(id) {
    editingId = id || null;
    existingImages = [];
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('existing-images').innerHTML = '';

    if (id) {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-brand').value = product.brand;
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-discount').value = product.discount || 0;
      document.getElementById('product-rating').value = product.rating;
      document.getElementById('product-stock').value = product.stock;
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-featured').checked = product.featured;

      existingImages = [...(product.images || [])];
      renderExistingImages();
    }

    showView('form');
  }

  function renderExistingImages() {
    const container = document.getElementById('existing-images');
    container.innerHTML = existingImages.map((url, i) => `
      <div class="admin-image-preview">
        <img src="${url}" alt="">
        <button type="button" class="admin-image-preview__remove" data-remove-image="${i}" aria-label="Remove image">×</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-remove-image]').forEach((btn) => {
      btn.addEventListener('click', () => {
        existingImages.splice(Number(btn.dataset.removeImage), 1);
        renderExistingImages();
      });
    });
  }

  async function handleSaveProduct(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const formData = {
        name: document.getElementById('product-name').value,
        brand: document.getElementById('product-brand').value,
        category: document.getElementById('product-category').value,
        price: document.getElementById('product-price').value,
        discount: document.getElementById('product-discount').value,
        description: document.getElementById('product-description').value,
        rating: document.getElementById('product-rating').value,
        stock: document.getElementById('product-stock').value,
        featured: document.getElementById('product-featured').checked,
        images: [...existingImages],
      };

      const fileInput = document.getElementById('product-images');
      if (fileInput.files.length > 0) {
        const uploaded = await StorageService.uploadProductImages(fileInput.files, editingId || 'new');
        formData.images.push(...uploaded);
      }

      const payload = ProductUtils.fromFormData(formData);

      if (editingId) {
        await ProductService.update(editingId, payload);
        showToast('Product updated successfully', 'success');
      } else {
        await ProductService.create(payload);
        showToast('Product added successfully', 'success');
      }

      await loadProducts();
      showView('products');
    } catch (error) {
      showToast('Save failed: ' + error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
    }
  }

  function openDeleteModal(id) {
    const product = products.find((p) => p.id === id);
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
      const product = products.find((p) => p.id === deleteTargetId);
      await ProductService.remove(deleteTargetId);

      if (product?.images) {
        product.images.forEach((url) => StorageService.deleteByUrl(url));
      }

      showToast('Product deleted', 'success');
      closeDeleteModal();
      await loadProducts();
    } catch (error) {
      showToast('Delete failed: ' + error.message, 'error');
    }
  }

  async function handleSeed() {
    if (!confirm('Import 12 sample products into Firestore? Skips if products already exist.')) return;

    try {
      const count = await ProductService.seedFromLocalData();
      showToast(count ? `Imported ${count} products` : 'Products already exist — skipped', count ? 'success' : 'info');
      await loadProducts();
    } catch (error) {
      showToast('Import failed: ' + error.message, 'error');
    }
  }

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

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => AdminApp.init());
