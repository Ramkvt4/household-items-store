/**
 * Modal Module
 * Product detail popup
 */

const ModalModule = (() => {
  let modal = null;
  let overlay = null;
  let closeBtn = null;
  let contentEl = null;
  let previouslyFocused = null;
  /** @type {string | null} */
  let activeProductId = null;
  /** @type {null | typeof import('./product-reviews-ui.js')} */
  let ProductReviewsUI = null;

  async function loadProductReviewsUI() {
    if (!ProductReviewsUI) {
      ProductReviewsUI = await import('./product-reviews-ui.js');
    }
    return ProductReviewsUI;
  }

  function init() {
    modal = document.getElementById('product-modal');
    overlay = document.getElementById('modal-overlay');
    closeBtn = document.getElementById('modal-close');
    contentEl = document.getElementById('modal-content');

    if (!modal) return;

    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
  }

  /**
   * Open modal with product details
   * @param {object} product
   */
  function open(product) {
    if (!modal || !contentEl) return;

    previouslyFocused = document.activeElement;
    activeProductId = product?.id ?? null;

    const stars = renderStars(product.rating);
    const discount = product.discount || (product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);

    const images = product.images?.length ? product.images : [ProductUtils.getPrimaryImage(product)];
    const galleryHtml = images.length > 1
      ? `<div class="modal__gallery">${images.map((url, i) => `
          <button type="button" class="modal__thumb${i === 0 ? ' modal__thumb--active' : ''}" data-image="${url}" aria-label="View image ${i + 1}">
            <img src="${url}" alt="" width="64" height="64">
          </button>
        `).join('')}</div>`
      : '';

    const specsHtml = product.specs
      ? Object.entries(product.specs)
          .map(([key, value]) => `<li><span>${key}</span><strong>${value}</strong></li>`)
          .join('')
      : '';

    const whatsappMessage = `Hi! I'm interested in:\n\n*${product.name}*\nBrand: ${product.brand}\nPrice: ₹${ProductUtils.formatPrice(product.price)}\n\nPlease share more details.`;
    const whatsappUrl = FirebaseConfig.getWhatsAppUrl(whatsappMessage);
    const stockLabel = product.inStock
      ? `<span class="modal__stock modal__stock--in">In Stock (${product.stock} available)</span>`
      : `<span class="modal__stock modal__stock--out">Out of Stock</span>`;

    contentEl.innerHTML = `
      <div class="modal__image-wrap">
        <img
          class="modal__image"
          id="modal-main-image"
          src="${images[0]}"
          alt="${product.name}"
          width="400"
          height="400"
          loading="lazy"
        >
        ${galleryHtml}
      </div>
      <div class="modal__info">
        <span class="modal__brand">${product.brand}</span>
        <h2 class="modal__title" id="modal-title">${product.name}</h2>
        <div class="modal__rating product-card__rating">
          <div class="stars">${stars}</div>
          <span class="rating-count">${product.rating} (${product.reviewCount?.toLocaleString('en-IN') || 0} reviews)</span>
        </div>
        ${stockLabel}
        <div class="modal__price product-card__price">
          <span class="modal__price-current">₹${ProductUtils.formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="modal__price-original">₹${ProductUtils.formatPrice(product.originalPrice)}</span>` : ''}
          ${discount > 0 ? `<span class="product-card__price-off">${discount}% off</span>` : ''}
        </div>
        <p class="modal__desc">${product.description || ''}</p>
        <div class="modal__reviews" id="modal-reviews-root"></div>
        ${specsHtml ? `
          <div class="modal__specs">
            <h3 class="modal__specs-title">Specifications</h3>
            <ul class="modal__specs-list">${specsHtml}</ul>
          </div>
        ` : ''}
        <div class="modal__actions">
          <button type="button" class="btn btn--accent" data-action="add-to-cart" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <a href="${whatsappUrl}" class="btn btn--whatsapp" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp Inquiry
          </a>
        </div>
      </div>
    `;

    contentEl.querySelectorAll('.modal__thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const mainImg = document.getElementById('modal-main-image');
        if (mainImg) mainImg.src = thumb.dataset.image;
        contentEl.querySelectorAll('.modal__thumb').forEach((t) => t.classList.remove('modal__thumb--active'));
        thumb.classList.add('modal__thumb--active');
      });
    });

    contentEl.querySelector('[data-action="add-to-cart"]')?.addEventListener('click', async () => {
      if (!product.inStock) return;

      const cart = window.CartIntegration
        ?? await import('./cart-integration.js');

      cart.handleAddToCart(product);
    });

    const reviewsRoot = contentEl.querySelector('#modal-reviews-root');
    const productId = product.id;
    loadProductReviewsUI()
      .then((ui) => {
        if (activeProductId !== productId || !reviewsRoot?.isConnected) return;
        reviewsRoot.innerHTML = ui.getProductReviewsSectionHtml();
        const section = reviewsRoot.querySelector('#product-reviews');
        return ui.mountProductReviews(section, productId);
      })
      .catch((error) => {
        console.error('[Modal] Failed to load product reviews UI:', error);
      });

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }

  function close() {
    if (!modal) return;

    activeProductId = null;

    if (ProductReviewsUI) {
      ProductReviewsUI.unmountProductReviews();
    } else {
      loadProductReviewsUI()
        .then((ui) => ui.unmountProductReviews())
        .catch(() => {});
    }

    modal.hidden = true;
    document.body.style.overflow = '';
    previouslyFocused?.focus();
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
      if (i < full) {
        html += '<span class="star" aria-hidden="true">★</span>';
      } else if (i === full && half) {
        html += '<span class="star" aria-hidden="true">★</span>';
      } else {
        html += '<span class="star star--empty" aria-hidden="true">★</span>';
      }
    }

    return html;
  }

  function formatPrice(price) {
    return ProductUtils.formatPrice(price);
  }

  return { init, open, close };
})();

if (typeof window !== 'undefined') {
  window.ModalModule = ModalModule;
}
