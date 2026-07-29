/**
 * Cart Service
 * Pure data layer for shopping cart persistence via localStorage.
 * No DOM, UI, Firebase, or event handling.
 */

const STORAGE_KEY = 'shoppingCart';

/**
 * Resolve a stable product identifier from a product object.
 * @param {object} product
 * @returns {string|null}
 */
function resolveProductId(product) {
  return product?.productId ?? product?.id ?? null;
}

/**
 * Normalize a product into a cart item shape.
 * @param {object} product
 * @param {number} [quantity=1]
 * @returns {object}
 */
function toCartItem(product, quantity = 1) {
  return {
    productId: resolveProductId(product),
    name: product.name,
    brand: product.brand,
    image: product.image,
    price: Number(product.price),
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

/**
 * Read and parse the cart from localStorage.
 * Returns an empty array if nothing is stored or parsing fails.
 * @returns {Array<object>}
 */
export function getCart() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const cart = JSON.parse(stored);
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

/**
 * Persist the full cart array to localStorage.
 * @param {Array<object>} cart
 * @returns {Array<object>} The saved cart
 */
export function saveCart(cart) {
  const normalized = Array.isArray(cart) ? cart : [];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error('[CartService] Failed to save cart:', error);
  }

  return normalized;
}

/**
 * Add a product to the cart.
 * If the product already exists, its quantity is increased by 1.
 * Duplicate entries are prevented by matching productId.
 * @param {object} product - Must include productId (or id), name, brand, image, price
 * @returns {Array<object>} Updated cart
 */
export function addToCart(product) {
  const productId = resolveProductId(product);

  if (!productId) {
    throw new Error('[CartService] Product must have a productId or id');
  }

  const cart = getCart();
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push(toCartItem(product, 1));
  }

  return saveCart(cart);
}

/**
 * Remove a product entirely from the cart by its productId.
 * @param {string} productId
 * @returns {Array<object>} Updated cart
 */
export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.productId !== productId);
  return saveCart(cart);
}

/**
 * Update the quantity of a cart item.
 * Quantity is clamped to a minimum of 1.
 * @param {string} productId
 * @param {number} quantity
 * @returns {Array<object>} Updated cart
 */
export function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((entry) => entry.productId === productId);

  if (!item) return cart;

  item.quantity = Math.max(1, Number(quantity) || 1);
  return saveCart(cart);
}

/**
 * Remove all items from the cart.
 * @returns {Array<object>} Empty cart
 */
export function clearCart() {
  return saveCart([]);
}

/**
 * Return the total number of items in the cart (sum of all quantities).
 * @returns {number}
 */
export function getCartCount() {
  return getCart().reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

/**
 * Return the total price of all items in the cart (price × quantity).
 * @returns {number}
 */
export function getCartTotal() {
  return getCart().reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}
