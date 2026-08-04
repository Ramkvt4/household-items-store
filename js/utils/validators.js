/**
 * Shared validators foundation (Module 10.5).
 *
 * PURPOSE
 * -------
 * Future home for generic validation helpers reused across pages
 * (auth, checkout, profile, admin forms, etc.).
 *
 * CURRENT STATE
 * -------------
 * No generic validators are shared across modules yet.
 * Checkout-specific validators live in:
 *   js/utils/checkout-validation.js
 * Auth page validation remains inline in:
 *   js/auth.js
 *
 * Do NOT move those helpers here until they are reused by 2+ callers,
 * and always keep backward-compatible re-exports when migrating.
 *
 * TODO (Modules 11–13)
 * --------------------
 * - Export validateRequired / validateEmail / validateMobile once shared
 * - Keep domain-specific rules (PIN, address) near checkout until needed elsewhere
 */

// Placeholder — no shared validators exported yet.
export {};
