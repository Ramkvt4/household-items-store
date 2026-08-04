# HomeAppliance Hub

Household appliances e-commerce storefront and admin panel. Built with static HTML/CSS/JS and Firebase (Auth + Firestore).

## Stack

- Storefront: vanilla JS (ES modules) + Firebase modular SDK
- Admin: vanilla JS (compat SDK globals) + shared CSS
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Local product images under `assets/images/products/`

## Project structure

```
├── index.html              # Storefront home (categories, products, deals)
├── cart.html / checkout.html / wishlist.html / …
├── login.html / register.html / profile.html / …
├── admin/index.html        # Admin SPA (Dashboard, Products, Orders, Customers)
├── css/                    # Storefront + admin styles
├── js/
│   ├── config/             # Firebase config (compat + ESM)
│   ├── modules/            # Services & UI modules
│   ├── admin/modules/      # Admin UI modules
│   ├── utils/              # Shared helpers
│   └── data/               # Categories + sample products (admin seed)
├── assets/images/          # Favicon + product images
├── firebase/               # Firestore + Storage security rules
├── docs/                   # Architecture notes
├── robots.txt
└── sitemap.xml
```

## Firebase collections

| Collection | Purpose |
|------------|---------|
| `products` | Catalog |
| `orders` | Customer orders |
| `users` | Profiles, `savedAddress`, `accountStatus` |
| `users/{uid}/wishlist` | Wishlist items |
| `carts/{uid}` | Persistent carts |
| `coupons` | Promo codes |
| `reviews/{productId}/items/{uid}` | Product reviews |
| `admins/{email}` | Optional admin registry docs |

## Configuration

1. Create a Firebase project and enable **Authentication → Email/Password** and **Firestore**.
2. Copy web app credentials into:
   - `js/config/firebase-config.js` (admin / compat)
   - `js/config/firebase-config.esm.js` (storefront modules)
3. Keep both configs in sync (same `apiKey`, `projectId`, etc.).
4. Add admin emails to `FirebaseConfig.adminEmails` in `firebase-config.js`.
5. Deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

There are no `.env` files. Credentials live in the config JS files (client-side Firebase keys are expected to be public; protect data with Firestore rules).

## Local development

Serve the repo root with any static server so ES modules resolve correctly:

```bash
# Example (Python)
python -m http.server 5500

# Example (Node)
npx --yes serve .
```

Open `http://localhost:5500/index.html` and `http://localhost:5500/admin/index.html`.

## Admin quick start

1. Create an Auth user whose email is listed in `adminEmails`.
2. Sign in at `/admin/index.html`.
3. Use **Import Sample Data** to seed products from `js/data/products.js` (skips if products already exist).
4. Place product image files in `assets/images/products/`.

## Production deploy

`firebase.json` includes Hosting pointing at the repo root. After `firebase login` and project selection:

```bash
firebase deploy
```

Update the public site URL in:

- `index.html` (canonical / Open Graph / Twitter)
- `sitemap.xml`
- `robots.txt` Sitemap line

Replace `https://homeappliancehub.example.com` with your real domain.

## SEO & indexing

- Public: home (`index.html`) is indexable.
- Account/checkout flows use `noindex, follow`.
- Admin is `noindex, nofollow`.
- `robots.txt` blocks `/admin/` and private account paths.

## Security notes

- Admin UI access is gated by Firebase Auth + email allowlist (`adminEmails`) and matching Firestore `isAdmin()` rules.
- Customers cannot change `accountStatus`; only admins can set `active` / `blocked` / `deleted`.
- Never weaken Firestore rules for convenience. Client validation is UX-only — rules are the real enforcement.

## License

Private project — all rights reserved.
