/**
 * HomeAppliance Hub — Main Application
 */

const App = (() => {
  let products = [];
  let categories = [];
  let heroInterval = null;
  let currentSlide = 0;
  let CartIntegration = null;

  async function loadCartIntegration() {
    if (!CartIntegration) {
      CartIntegration = await import('./modules/cart-integration.js');
      window.CartIntegration = CartIntegration;
    }
    return CartIntegration;
  }

  async function init() {
    try {
      await FirebaseConfig.connectFirestore();
    } catch (error) {
      // Error logged by connectFirestore
    }

    showLoading(true);

    await loadData();
    renderCategories();
    populateCategoryFilter();
    SearchModule.init(products);
    renderProducts(SearchModule.getFilteredProducts());
    showLoading(false);

    ModalModule.init();
    CartModule.init();

    const cart = await loadCartIntegration();
    cart.initCartBadge();

    initHeroSlider();
    initMobileMenu();
    initFooterYear();

    window.addEventListener('productsUpdated', (e) => {
      renderProducts(e.detail.products);
    });
  }

  async function loadData() {
    categories = typeof CATEGORIES !== 'undefined' ? CATEGORIES : [];
    products = [];

    const { db } = FirebaseConfig.init();
    if (!db) {
      console.error('[App] Firestore unavailable — no products loaded');
      return;
    }

    ProductService.init(db);
    products = await ProductService.getAll();
  }

  function showLoading(show) {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('products-empty');
    if (!grid) return;

    if (show) {
      if (empty) empty.hidden = true;
      grid.innerHTML = Array.from({ length: 8 }, () => `
        <div class="product-card product-card--skeleton" aria-hidden="true">
          <div class="skeleton product-card__image-wrap" style="aspect-ratio:1"></div>
          <div class="product-card__body">
            <div class="skeleton" style="height:12px;width:40%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:16px;width:90%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:14px;width:60%;margin-bottom:12px"></div>
            <div class="skeleton" style="height:32px;width:100%"></div>
          </div>
        </div>
      `).join('');

      const countEl = document.getElementById('search-results-count');
      if (countEl) countEl.textContent = 'Loading products...';
    }
  }

  function showLoadError() {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('products-empty');
    if (grid) grid.innerHTML = '';
    if (empty) {
      empty.hidden = false;
      empty.querySelector('p').textContent = 'Unable to load products. Check Firebase configuration.';
    }
  }

  function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    grid.innerHTML = categories.map((cat) => {
      const count = products.filter((p) => p.category === cat.id).length;
      return `
        <button
          type="button"
          class="category-card"
          data-category="${cat.id}"
          role="listitem"
          aria-label="Browse ${cat.name}"
        >
          <span class="category-card__icon" aria-hidden="true">${cat.icon}</span>
          <span class="category-card__name">${cat.name}</span>
          <span class="category-card__count">${count} item${count !== 1 ? 's' : ''}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.category-card').forEach((card) => {
      card.addEventListener('click', () => {
        SearchModule.filterByCategory(card.dataset.category);
      });
    });
  }

  function populateCategoryFilter() {
    const select = document.getElementById('category-filter');
    if (!select) return;

    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  }

  function renderProducts(productList) {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('products-empty');
    if (!grid) return;

    if (productList.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    grid.innerHTML = productList.map((product) => createProductCard(product)).join('');
    bindProductEvents(grid, productList);
  }

  function createProductCard(product) {
    const discount = product.discount || (product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);

    const stars = renderStars(product.rating);
    const image = ProductUtils.getPrimaryImage(product);
    const whatsappMessage = `Hi! I'm interested in:\n\n*${product.name}*\nBrand: ${product.brand}\nPrice: ₹${ProductUtils.formatPrice(product.price)}`;
    const whatsappUrl = FirebaseConfig.getWhatsAppUrl(whatsappMessage);
    const outOfStock = !product.inStock;

    return `
      <article class="product-card" role="listitem" data-id="${product.id}">
        <div class="product-card__image-wrap" data-action="view" data-id="${product.id}">
          ${product.badge ? `<span class="product-card__badge">${product.badge}</span>` : ''}
          ${outOfStock ? `<span class="product-card__badge product-card__badge--stock">Out of Stock</span>` : ''}
          <img
            class="product-card__image"
            src="${image}"
            alt="${product.name}"
            width="260"
            height="260"
            loading="lazy"
          >
        </div>
        <div class="product-card__body">
          <span class="product-card__brand">${product.brand}</span>
          <h3 class="product-card__title" data-action="view" data-id="${product.id}">${product.name}</h3>
          <div class="product-card__rating">
            <div class="stars">${stars}</div>
            <span class="rating-count">${product.rating}</span>
          </div>
          <div class="product-card__price">
            <span class="product-card__price-current">₹${ProductUtils.formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="product-card__price-original">₹${ProductUtils.formatPrice(product.originalPrice)}</span>` : ''}
            ${discount > 0 ? `<span class="product-card__price-off">${discount}% off</span>` : ''}
          </div>
          <div class="product-card__actions">
            <button type="button" class="btn btn--accent btn--sm" data-action="add-to-cart" data-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
              ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <a href="${whatsappUrl}" class="btn btn--whatsapp btn--sm" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp inquiry for ${product.name}">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function bindProductEvents(grid, productList) {
    grid.querySelectorAll('[data-action="view"]').forEach((el) => {
      el.addEventListener('click', () => {
        const product = productList.find((p) => p.id === el.dataset.id);
        if (product) ModalModule.open(product);
      });
    });

    grid.querySelectorAll('[data-action="add-to-cart"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const product = productList.find((p) => p.id === btn.dataset.id);
        if (!product?.inStock) return;

        const cart = await loadCartIntegration();
        cart.handleAddToCart(product);
      });
    });
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
      if (i < full || (i === full && half)) {
        html += '<span class="star" aria-hidden="true">★</span>';
      } else {
        html += '<span class="star star--empty" aria-hidden="true">★</span>';
      }
    }

    return html;
  }

  function initHeroSlider() {
    const slider = document.getElementById('hero-slider');
    const dotsContainer = document.getElementById('hero-dots');
    if (!slider || !dotsContainer) return;

    const slides = slider.querySelectorAll('.hero__slide');
    if (slides.length === 0) return;

    dotsContainer.innerHTML = Array.from(slides).map((_, i) => `
      <button
        type="button"
        class="hero__dot${i === 0 ? ' hero__dot--active' : ''}"
        data-slide="${i}"
        role="tab"
        aria-label="Go to slide ${i + 1}"
        aria-selected="${i === 0}"
      ></button>
    `).join('');

    dotsContainer.querySelectorAll('.hero__dot').forEach((dot) => {
      dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.slide, 10)));
    });

    heroInterval = setInterval(() => {
      goToSlide((currentSlide + 1) % slides.length);
    }, 5000);

    slider.addEventListener('mouseenter', () => clearInterval(heroInterval));
    slider.addEventListener('mouseleave', () => {
      heroInterval = setInterval(() => {
        goToSlide((currentSlide + 1) % slides.length);
      }, 5000);
    });
  }

  function goToSlide(index) {
    const slider = document.getElementById('hero-slider');
    const dotsContainer = document.getElementById('hero-dots');
    if (!slider) return;

    const slides = slider.querySelectorAll('.hero__slide');
    const dots = dotsContainer?.querySelectorAll('.hero__dot');

    currentSlide = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('hero__slide--active', i === index);
    });

    dots?.forEach((dot, i) => {
      dot.classList.toggle('hero__dot--active', i === index);
      dot.setAttribute('aria-selected', i === index);
    });
  }

  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('main-nav');
    if (!menuBtn || !nav) return;

    menuBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('header__nav--open');
      menuBtn.setAttribute('aria-expanded', isOpen);
      menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    nav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('header__nav--open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
      });
    });
  }

  function initFooterYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
