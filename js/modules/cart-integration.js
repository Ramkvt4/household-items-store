/**
 * Cart Integration
 * Connects cart-service.js to homepage UI (badge updates only).
 */

import { addToCart, getCartCount } from './cart-service.js';

/**
 * Map a storefront product to the cart-service product shape.
 * @param {object} product
 * @returns {object}
 */
function toCartProduct(product) {
  const image = typeof ProductUtils !== 'undefined'
    ? ProductUtils.getPrimaryImage(product)
    : product.image;

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    image,
    price: product.price,
  };
}

/**
 * Update the navbar cart badge from cart-service count.
 */
export function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;
  badge.hidden = count === 0;
}

/**
 * Brief scale animation on the cart badge after adding an item.
 */
export function animateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;

  badge.style.transform = 'scale(1.3)';
  setTimeout(() => {
    badge.style.transform = '';
  }, 200);
}

/**
 * Add a product to the cart and refresh the navbar badge.
 * @param {object} product
 */
export function handleAddToCart(product) {
  if (!product || product.inStock === false) return;

  addToCart(toCartProduct(product));
  updateCartBadge();
  animateCartBadge();
}

/**
 * Initialize cart badge on page load.
 */
export function initCartBadge() {
  updateCartBadge();
}
