# Architecture Foundation

HomeAppliance Hub — Module 10.5 architecture notes.

This document describes the **target professional structure** and the
**current live layout**. Module 10.5 introduces folders and documentation only.
No runtime behavior changes are intentional in this phase.

---

## Goals

- Prepare for Modules 11–13 growth without risky mass file moves
- Keep services, utilities, UI helpers, and page scripts conceptually separated
- Preserve 100% backward compatibility with existing import paths

---

## Folder structure

### Target structure (introduced in Module 10.5)

```text
js/
  services/     # Domain services (target home; README index only for now)
  utils/        # Shared helpers (validators, formatters, domain utils)
  ui/           # Reusable UI helpers (toast foundation placeholder)
  pages/        # Future home for page controllers (files not moved yet)
  modules/      # CURRENT live services & feature modules
  config/       # Firebase configuration
  data/         # Seed / static data
  admin/        # Admin dashboard modules
```

### Current live layout (do not break)

| Area | Location | Notes |
|------|----------|-------|
| Page scripts | `js/*-page.js`, `js/app.js`, `js/auth.js` | Remain at `js/` root for now |
| Domain services | `js/modules/*` | Cart, wishlist, orders, auth UI, etc. |
| Domain utils | `js/utils/*` | Order, checkout, product helpers |
| Styles | `css/` | Shared + page stylesheets |
| HTML pages | project root + `admin/` | Unchanged |
| Docs | `docs/` | Roadmap, modules, architecture |
| Firestore rules | `firebase/firestore.rules` | Security rules only |

---

## Responsibilities

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| **Pages** | Wire DOM, auth gates, call services | `wishlist-page.js`, `checkout-page.js` |
| **Services** | Firestore/Auth business operations | cart, wishlist, order, profile |
| **Utils** | Pure helpers (format, validate, map) | `order-summary.js`, `checkout-validation.js` |
| **UI** | Presentational helpers | toast, modal, account menu |
| **Config** | Environment / Firebase keys | `firebase-config.esm.js` |

Rules of thumb:

1. Pages should not contain Firestore query logic when a service exists.
2. Services should not manipulate DOM.
3. Utils should be side-effect free where practical.
4. Relocations must keep re-exports so old imports continue to work.

---

## Firestore collections

| Collection / path | Purpose | Owner modules |
|-------------------|---------|---------------|
| `products` | Catalog | Product service, storefront |
| `categories` | Category metadata (if used) | Storefront / admin |
| `carts/{userId}` | Authenticated shopping carts | Cart service |
| `orders` | Placed customer orders | Order service, checkout |
| `users/{userId}` | Customer profile (`savedAddress`) | User profile service |
| `users/{userId}/wishlist/{productId}` | Wishlist items + product snapshot | Wishlist service |
| `inquiries` | Reserved / optional inquiries | Future |
| `admins/{email}` | Optional admin registry | Admin auth |

Schema changes are **out of scope** for Module 10.5.

---

## Completed modules (through Module 10)

| Module | Focus | Status |
|--------|-------|--------|
| 1 | Website UI | Completed |
| 2 | Firebase integration | Completed |
| 3 | Admin authentication | Completed |
| 4 | Product management | Completed |
| 5 | Shopping cart | Completed |
| 6 | Customer authentication | Completed |
| 7 | Firestore cart persistence | Completed |
| 8 | Checkout & order processing | Completed |
| 9 | Customer account (orders, addresses, profile) | Completed |
| 10 | Wishlist backend + wishlist page | Completed |
| 10.5 | Architecture foundation (this document) | Completed |

---

## Future modules (high level)

| Module | Planned focus |
|--------|---------------|
| 11+ | Gradual service/utils migration into `js/services`, `js/ui`, `js/pages` |
| Coupons | Coupon service + checkout discount application |
| Reviews | Review service + product rating UI |
| Admin expansion | Orders admin, inventory, reporting |
| Notifications | Optional customer/order notifications |

Exact sequencing should follow `docs/PROJECT_ROADMAP.md` and `docs/TODO.md`
as those documents are updated.

---

## Foundation placeholders added in Module 10.5

| Path | Role |
|------|------|
| `js/services/README.md` | Service index (current + future) |
| `js/utils/validators.js` | Placeholder for shared validators |
| `js/utils/formatters.js` | Placeholder for shared formatters |
| `js/ui/toast.js` | Placeholder for shared toast API |
| `js/pages/` | Empty target folder for future page controllers |
| `docs/ARCHITECTURE.md` | This document |

Existing callers must continue importing from their current modules
(`cart-ui.js`, `order-summary.js`, `checkout-validation.js`, etc.).

---

## Compatibility policy

- Do not change import paths unless a migration re-export is in place
- Do not move page scripts, Firestore helpers, or authentication in bulk
- Do not redesign UI or alter Firestore schema in architecture-only phases
- Prefer additive changes: new folders, docs, and thin facades first
