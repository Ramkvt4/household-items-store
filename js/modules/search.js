/**
 * Search Module
 * Handles product search, filtering, and sorting
 */

const SearchModule = (() => {
  let products = [];
  let filteredProducts = [];
  let currentQuery = '';
  let currentCategory = 'all';
  let currentSort = 'featured';
  let debounceTimer = null;

  /**
   * Initialize search with product data
   * @param {Array} productList
   */
  function init(productList) {
    products = productList;
    filteredProducts = [...products];
    bindEvents();
  }

  function bindEvents() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearSearchBtn = document.getElementById('clear-search');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentQuery = e.target.value.trim().toLowerCase();
          applyFilters();
        }, 250);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(debounceTimer);
          currentQuery = e.target.value.trim().toLowerCase();
          applyFilters();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const input = document.getElementById('search-input');
        if (input) {
          currentQuery = input.value.trim().toLowerCase();
          applyFilters();
        }
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        applyFilters();
      });
    }

    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        currentQuery = '';
        currentCategory = 'all';
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        applyFilters();
      });
    }
  }

  /**
   * Filter by category (from category cards)
   * @param {string} categoryId
   */
  function filterByCategory(categoryId) {
    currentCategory = categoryId;
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = categoryId;

    document.querySelectorAll('.category-card').forEach((card) => {
      card.classList.toggle('category-card--active', card.dataset.category === categoryId);
    });

    applyFilters();

    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function applyFilters() {
    filteredProducts = products.filter((product) => {
      const matchesCategory = currentCategory === 'all' || product.category === currentCategory;

      const searchTerms = currentQuery.split(/\s+/).filter(Boolean);
      const matchesSearch = searchTerms.length === 0 || searchTerms.every((term) => {
        const searchable = [
          product.name,
          product.brand,
          product.category,
          product.description,
        ].join(' ').toLowerCase();
        return searchable.includes(term);
      });

      return matchesCategory && matchesSearch;
    });

    sortProducts();
    updateResultsCount();
    dispatchUpdate();
  }

  function sortProducts() {
    switch (currentSort) {
      case 'price-low':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
  }

  function updateResultsCount() {
    const countEl = document.getElementById('search-results-count');
    if (!countEl) return;

    if (currentQuery) {
      countEl.textContent = `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${currentQuery}"`;
    } else if (currentCategory !== 'all') {
      const category = STORE_DATA.categories.find((c) => c.id === currentCategory);
      countEl.textContent = `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} in ${category?.name || currentCategory}`;
    } else {
      countEl.textContent = `Showing all ${filteredProducts.length} products`;
    }
  }

  function dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('productsUpdated', {
      detail: { products: filteredProducts },
    }));
  }

  function getFilteredProducts() {
    return filteredProducts;
  }

  function getAllProducts() {
    return products;
  }

  function setProducts(productList) {
    products = productList;
    applyFilters();
  }

  return {
    init,
    filterByCategory,
    getFilteredProducts,
    getAllProducts,
    setProducts,
  };
})();

if (typeof window !== 'undefined') {
  window.SearchModule = SearchModule;
}
