/**
 * Admin Product Form Module
 * Add and edit products with local image paths
 */

const AdminProductForm = (() => {
  let editingId = null;
  let onSaved = null;

  function init(callbacks = {}) {
    onSaved = callbacks.onSaved;
    populateCategorySelect();
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('product-form')?.addEventListener('submit', handleSave);
    document.getElementById('cancel-form-btn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('admin:show-products'));
    });

    document.getElementById('product-image')?.addEventListener('input', updateImagePreview);
  }

  function populateCategorySelect() {
    const select = document.getElementById('product-category');
    if (!select) return;

    select.innerHTML = CATEGORIES.map((c) =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  }

  function open(productId) {
    editingId = productId || null;
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-active').checked = true;
    document.getElementById('product-image').value = '';
    updateImagePreview();

    if (productId) {
      const product = AdminProductList.getProductById(productId);
      if (!product) return;

      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-brand').value = product.brand;
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-original-price').value = product.originalPrice || '';
      document.getElementById('product-rating').value = product.rating;
      document.getElementById('product-reviews').value = product.reviewCount || 0;
      document.getElementById('product-stock').value = product.stock;
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-featured').checked = product.featured;
      document.getElementById('product-deal').checked = product.deal;
      document.getElementById('product-active').checked = product.active !== false;
      document.getElementById('product-image').value = product.image || '';
      updateImagePreview();
    }

    window.dispatchEvent(new CustomEvent('admin:show-form', {
      detail: { editing: Boolean(productId) },
    }));
  }

  function updateImagePreview() {
    const input = document.getElementById('product-image');
    const preview = document.getElementById('image-preview');
    if (!input || !preview) return;

    const path = ProductUtils.normalizeImagePath(input.value);
    if (!path) {
      preview.innerHTML = '';
      return;
    }

    preview.innerHTML = `
      <div class="admin-image-preview">
        <img src="../${path}" alt="Image preview">
      </div>
    `;
  }

  async function handleSave(e) {
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
        originalPrice: document.getElementById('product-original-price').value,
        description: document.getElementById('product-description').value,
        rating: document.getElementById('product-rating').value,
        reviews: document.getElementById('product-reviews').value,
        stock: document.getElementById('product-stock').value,
        featured: document.getElementById('product-featured').checked,
        deal: document.getElementById('product-deal').checked,
        active: document.getElementById('product-active').checked,
        image: document.getElementById('product-image').value,
      };

      const payload = ProductUtils.fromFormData(formData);

      if (editingId) {
        await ProductService.update(editingId, payload);
        AdminUI.showToast('Product updated successfully', 'success');
      } else {
        await ProductService.create(payload);
        AdminUI.showToast('Product added successfully', 'success');
      }

      onSaved?.();
    } catch (error) {
      AdminUI.showToast('Save failed: ' + error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
    }
  }

  return { init, open };
})();

if (typeof window !== 'undefined') {
  window.AdminProductForm = AdminProductForm;
}
