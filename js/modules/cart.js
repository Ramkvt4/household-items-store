/**
 * Cart Module
 * Shopping cart with localStorage persistence and WhatsApp checkout
 */

const CartModule = (() => {
  const STORAGE_KEY = 'homeappliance_cart';
  let items = [];

  function init() {
    loadFromStorage();
    bindEvents();
    updateUI();
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      items = stored ? JSON.parse(stored) : [];
    } catch {
      items = [];
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function bindEvents() {
    document.getElementById('cart-toggle')?.addEventListener('click', open);
    document.getElementById('cart-close')?.addEventListener('click', close);
    document.getElementById('cart-overlay')?.addEventListener('click', close);
    document.getElementById('cart-whatsapp')?.addEventListener('click', sendWhatsAppInquiry);

    document.addEventListener('keydown', (e) => {
      const sidebar = document.getElementById('cart-sidebar');
      if (e.key === 'Escape' && sidebar && !sidebar.hidden) close();
    });
  }

  function addItem(product) {
    if (product.inStock === false) return;

    const existing = items.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: ProductUtils.getPrimaryImage(product),
        quantity: 1,
      });
    }

    saveToStorage();
    updateUI();
    open();
    animateBadge();
  }

  function removeItem(productId) {
    items = items.filter((item) => item.id !== productId);
    saveToStorage();
    updateUI();
  }

  function getTotal() {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getItemCount() {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  function updateUI() {
    updateBadge();
    renderItems();
    updateTotal();
  }

  function updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const count = getItemCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  function animateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    badge.style.transform = 'scale(1.3)';
    setTimeout(() => {
      badge.style.transform = '';
    }, 200);
  }

  function renderItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-sidebar__empty">
          <p>Your cart is empty</p>
          <p style="font-size: var(--font-size-sm); margin-top: 0.5rem;">Browse products and add items to inquire via WhatsApp.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="cart-item" data-id="${item.id}">
        <img
          class="cart-item__image"
          src="${item.image}"
          alt="${item.name}"
          width="64"
          height="64"
          loading="lazy"
          decoding="async"
          onerror="this.onerror=null;this.src='assets/images/products/placeholder.svg'"
        >
        <div class="cart-item__info">
          <p class="cart-item__name">${item.name}</p>
          <p class="cart-item__price">₹${formatPrice(item.price)} × ${item.quantity}</p>
          <button type="button" class="cart-item__remove" data-remove="${item.id}">Remove</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removeItem(btn.dataset.remove));
    });
  }

  function updateTotal() {
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = `₹${formatPrice(getTotal())}`;

    const whatsappBtn = document.getElementById('cart-whatsapp');
    if (whatsappBtn) whatsappBtn.disabled = items.length === 0;
  }

  function open() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;

    sidebar.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('cart-close')?.focus();
  }

  function close() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;

    sidebar.hidden = true;
    document.body.style.overflow = '';
    document.getElementById('cart-toggle')?.focus();
  }

  function sendWhatsAppInquiry() {
    if (items.length === 0) return;

    const lines = items.map(
      (item) => `• ${item.name} (${item.brand}) — ₹${formatPrice(item.price)} × ${item.quantity}`
    );

    const message = [
      'Hi! I would like to inquire about the following items:',
      '',
      ...lines,
      '',
      `*Total: ₹${formatPrice(getTotal())}*`,
      '',
      'Please share availability and delivery details.',
    ].join('\n');

    const url = FirebaseConfig.getWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function formatPrice(price) {
    return typeof ProductUtils !== 'undefined'
      ? ProductUtils.formatPrice(price)
      : Number(price).toLocaleString('en-IN');
  }

  function getItems() {
    return [...items];
  }

  return {
    init,
    addItem,
    removeItem,
    open,
    close,
    getItems,
    getTotal,
    getItemCount,
  };
})();

if (typeof window !== 'undefined') {
  window.CartModule = CartModule;
}
