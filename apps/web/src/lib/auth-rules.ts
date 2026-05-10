export const ADMIN_EMAILS = ['deepanshulathar@gmail.com'];

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(normalizeEmail(email));
}

export function isPrivilegedRole(role: string | null | undefined) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function getHomePathForRole(role: string | null | undefined) {
  return isPrivilegedRole(role) ? '/admin' : '/dashboard';
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET || 'fallback_secret_for_typecheck';
}
