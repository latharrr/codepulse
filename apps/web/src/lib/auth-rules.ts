/**
 * Comma-separated list of emails treated as ADMIN on first sign-in.
 * Configurable via ADMIN_EMAILS env var; falls back to the bootstrap email
 * so a fresh deploy can still elect an admin.
 */
const FALLBACK_ADMIN_EMAILS = ['deepanshulathar@gmail.com'];

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const effectiveAdminEmails =
  ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : FALLBACK_ADMIN_EMAILS;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined) {
  return !!email && effectiveAdminEmails.includes(normalizeEmail(email));
}

export function isPrivilegedRole(role: string | null | undefined) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function getHomePathForRole(role: string | null | undefined) {
  return isPrivilegedRole(role) ? '/admin' : '/dashboard';
}

/**
 * Returns AUTH_SECRET. Throws in production if unset so we never sign JWTs
 * with a known fallback string (which would let attackers forge sessions).
 * The fallback exists only so `next build` / typecheck can run without
 * the var present locally.
 */
export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    throw new Error(
      'AUTH_SECRET is required in production. Set it in your environment.',
    );
  }
  return 'fallback_secret_for_typecheck';
}
