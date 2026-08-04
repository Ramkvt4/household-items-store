# Pages Layer

This folder is reserved for **page controller modules** during the gradual
migration planned for Modules 11–13.

## Current state

Page scripts still live at the `js/` root for backward compatibility, for example:

- `js/app.js`
- `js/cart-page.js`
- `js/checkout-page.js`
- `js/wishlist-page.js`
- `js/my-orders-page.js`
- `js/order-details-page.js`
- `js/profile-page.js`
- `js/saved-addresses-page.js`
- `js/order-success-page.js`
- `js/auth.js`

## Migration guidance

1. Move one page controller at a time.
2. Keep a re-export (or HTML script `src`) pointing at the old path until all callers are updated.
3. Do not change page behavior while relocating files.
