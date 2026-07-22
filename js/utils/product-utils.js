/**
 * Product Utilities
 * Normalizes Firestore documents for the storefront UI
 */

const ProductUtils = (() => {
  const PLACEHOLDER = 'assets/images/products/placeholder.svg';

  /**
   * @param {object} data - Raw Firestore product or plain object with id
   * @returns {object} Normalized product for UI modules
   */
  function normalize(data) {
    if (!data) return null;

    const price = Number(data.price) || 0;
    const originalPrice = data.originalPrice ? Number(data.originalPrice) : null;
    let discount = Number(data.discount) || 0;

    if (!discount && originalPrice && originalPrice > price) {
      discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
    const primaryImage = data.image || images[0] || PLACEHOLDER;
    const stock = Number(data.stock ?? 0);

    let badge = data.badge || null;
    if (discount > 0) {
      badge = `${Math.round(discount)}% OFF`;
    } else if (data.deal) {
      badge = 'DEAL';
    }

    return {
      id: data.id,
      name: data.name || '',
      brand: data.brand || '',
      category: data.category || '',
      price,
      discount,
      originalPrice,
      rating: Number(data.rating) || 0,
      reviewCount: Number(data.reviews ?? data.reviewCount) || 0,
      description: data.description || '',
      stock,
      inStock: stock > 0,
      images: images.length ? images : [primaryImage],
      image: primaryImage,
      badge,
      featured: Boolean(data.featured),
      deal: Boolean(data.deal),
      active: data.active !== false,
      specs: data.specs || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    };
  }

  /**
   * Convert legacy seed product to Firestore document shape
   * @param {object} product
   * @returns {object}
   */
  function toFirestoreDoc(product) {
    let discount = 0;
    if (product.originalPrice && product.price) {
      discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }

    return {
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      discount,
      description: product.description || '',
      rating: product.rating || 0,
      stock: product.stock ?? 10,
      images: product.images?.length ? product.images : [product.image].filter(Boolean),
      featured: product.featured ?? false,
      reviewCount: product.reviewCount || 0,
      specs: product.specs || null,
    };
  }

  /**
   * Build payload from admin form values
   * @param {object} formData
   * @returns {object}
   */
  function fromFormData(formData) {
    return {
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      category: formData.category,
      price: Number(formData.price),
      discount: Number(formData.discount) || 0,
      description: formData.description.trim(),
      rating: Number(formData.rating) || 0,
      stock: Number(formData.stock) || 0,
      images: formData.images || [],
      featured: Boolean(formData.featured),
    };
  }

  function formatPrice(price) {
    return Number(price).toLocaleString('en-IN');
  }

  function getPrimaryImage(product) {
    return product?.image || product?.images?.[0] || PLACEHOLDER;
  }

  return {
    normalize,
    toFirestoreDoc,
    fromFormData,
    formatPrice,
    getPrimaryImage,
    PLACEHOLDER,
  };
})();

if (typeof window !== 'undefined') {
  window.ProductUtils = ProductUtils;
}
