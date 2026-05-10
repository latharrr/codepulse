import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Cookie name + JWE salt must match what Auth.js used when signing the
  // session. Auth.js picks `__Secure-` only when AUTH_URL is https://, not
  // by NODE_ENV. We're served over plain HTTP, so use the unprefixed name.
  const useSecureCookies = process.env.AUTH_URL?.startsWith('https://') ?? false;
  const cookieName = useSecureCookies
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
  const token = await getToken({
    req,
    secret: (process.env.AUTH_SECRET || 'fallback') as string,
    cookieName,
    salt: cookieName,
    raw: false,
  });
  const { pathname } = req.nextUrl;

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
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protected paths
  if (!token) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
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
