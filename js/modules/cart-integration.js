/**
 * Cart Integration
 * Connects cart-service.js to homepage UI (badge updates only).
 */

import {
  addToCart,
  getCartCount,
  initCartService,
  CART_UPDATED_EVENT,
  CART_LOADING_EVENT,
} from './cart-service.js';
import {
  showCartToast,
  getFriendlyCartErrorMessage,
  findAddToCartButtons,
  setControlsDisabled,
} from './cart-ui.js';

/** @type {Set<string>} */
const pendingAddOperations = new Set();

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
 * Disables matching Add to Cart buttons until the operation completes.
 * @param {object} product
 * @param {HTMLElement} [triggerButton]
 */
export async function handleAddToCart(product, triggerButton = null) {
  if (!product || product.inStock === false) return;

  const productId = product.id;
  const operationKey = `add-${productId}`;

  if (pendingAddOperations.has(operationKey)) return;

  const buttons = triggerButton
    ? [triggerButton]
    : findAddToCartButtons(productId);

  if (buttons.some((button) => button.disabled)) return;

  pendingAddOperations.add(operationKey);
  setControlsDisabled(buttons, true);

  try {
    await addToCart(toCartProduct(product));
    updateCartBadge();
    animateCartBadge();
    showCartToast('Added to Cart', 'success');
  } catch (error) {
    showCartToast(getFriendlyCartErrorMessage(error), 'error');
  } finally {
    pendingAddOperations.delete(operationKey);
    setControlsDisabled(buttons, false);
  }
}

/**
 * Initialize cart badge on page load.
 * Listens for cart updates and loading completion (Firestore sync).
 */
export async function initCartBadge() {
  await initCartService();
  updateCartBadge();
  document.addEventListener(CART_UPDATED_EVENT, updateCartBadge);
  document.addEventListener(CART_LOADING_EVENT, ({ detail }) => {
    if (detail?.loading === false) {
      updateCartBadge();
    }
  });
}
