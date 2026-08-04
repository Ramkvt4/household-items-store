# Services Layer

This folder is the **target home** for domain services as the project migrates
gradually in Modules 11–13.

> **Important:** Existing services currently live under `js/modules/`.
> Do not move them yet. This index documents the intended architecture only.

---

## Current services (live locations)

| Service | Current path | Responsibility |
|---------|--------------|----------------|
| Firestore Service | `js/modules/firestore-service.js` | Shared Firestore init and document/collection helpers |
| Firebase Auth Init | `js/modules/firebase-init.js` | Customer Firebase Auth initialization |
| Auth Service (Admin) | `js/modules/auth-service.js` | Admin authentication (compat SDK) |
| Auth UI | `js/modules/auth-ui.js` | Header Login / My Account menu |
| Product Service | `js/modules/product-service.js` | Product CRUD for admin + storefront reads |
| Cart Service | `js/modules/cart-service.js` | Guest localStorage + authenticated Firestore cart |
| Cart UI / Integration | `js/modules/cart-ui.js`, `cart-integration.js` | Toasts, badge, Add to Cart wiring |
| User Profile Service | `js/modules/user-profile-service.js` | Saved shipping address on `users/{uid}` |
| Order Service | `js/modules/order-service.js` | Order create + customer order reads |
| Wishlist Service | `js/modules/wishlist-service.js` | Wishlist CRUD + realtime subscription |
| Wishlist Integration | `js/modules/wishlist-integration.js` | Product-card heart toggle UI |

---

## Future services (planned)

These modules are **not implemented** yet. Names are reserved for upcoming work:

| Service | Planned responsibility |
|---------|------------------------|
| Coupon Service | Coupon codes, discount validation, order discount application |
| Review Service | Product reviews and ratings persistence |
| Admin Service | Consolidated admin operations beyond product CRUD |
| Notification Service | Order/status customer notifications (optional) |
| Inventory Service | Stock reservation and low-stock handling (optional) |

---

## Migration guidance

1. Keep new shared business logic in services (not page scripts).
2. Prefer importing from this folder once a service is relocated.
3. Relocate one service at a time with re-exports for backward compatibility.
4. Never change Firestore document shapes during relocation.
