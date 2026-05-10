import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret, getHomePathForRole, isPrivilegedRole } from './lib/auth-rules';

function useSecureAuthCookie(req: NextRequest) {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) return authUrl.startsWith('https://');
  return req.nextUrl.protocol === 'https:';
}

export async function middleware(req: NextRequest) {
  const secureCookie = useSecureAuthCookie(req);
  const cookieName = secureCookie
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
  const token = await getToken({
    req,
    secret: getAuthSecret(),
    secureCookie,
    salt: cookieName,
    raw: false,
  });
  const { pathname } = req.nextUrl;
  const isAdmin = isPrivilegedRole(token?.role as string | undefined);
  const signedInHome = isAdmin
    ? getHomePathForRole(token?.role as string | undefined)
    : token?.onboardingComplete
      ? '/dashboard'
      : '/onboarding';

  // Use req.nextUrl as the base for redirects: `req.url` reports the
  // internal Docker host (http://0.0.0.0:3000/...) under standalone mode,
  // whereas req.nextUrl is built from the trusted X-Forwarded-* headers
  // Caddy sends and reflects the user-facing host (https://...sslip.io).
  // Public paths
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth')
  ) {
    if (token && (pathname === '/' || pathname.startsWith('/login'))) {
      return NextResponse.redirect(new URL(signedInHome, req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protected paths
  if (!token) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isAdmin &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))
  ) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  if (!isAdmin && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Onboarding check
  const isOnboarding = pathname.startsWith('/onboarding');
  if (!token.onboardingComplete && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', req.nextUrl));
  }
  if (token.onboardingComplete && isOnboarding) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
