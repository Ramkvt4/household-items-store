/**
 * Shared network / Firestore error detection (production helper).
 * Domain modules keep their own user-facing messages.
 */

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isNetworkOrOfflineError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';

  return /network|offline|unavailable|failed-precondition|auth\/network-request-failed/i.test(
    `${message} ${code}`,
  );
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPermissionError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';

  return /permission|unauthenticated|auth\/|permission-denied/i.test(
    `${message} ${code}`,
  );
}
