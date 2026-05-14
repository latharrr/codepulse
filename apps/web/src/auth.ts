/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Google sign-in accepts personal and organization Google accounts.
 * The configured admin email is promoted automatically and routed to /admin.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@codepulse/db';
import {
  getAuthSecret,
  isAdminEmail,
  isPrivilegedRole,
  normalizeEmail,
} from '@/lib/auth-rules';
import { getOrCreateDefaultInstitution } from '@/lib/institution';

async function findUserByEmail(email: string) {
  // email column is `@unique` and we always write normalized values, so
  // a direct findUnique is both faster and avoids the case where two rows
  // exist with different casings (would be silently returned by findFirst).
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

async function ensureApplicationUser(email: string, fullName?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  const displayName = fullName?.trim() || null;
  const existing = await findUserByEmail(normalizedEmail);
  const role = isAdminEmail(normalizedEmail) ? 'ADMIN' : 'STUDENT';

  if (existing) {
    const shouldPromoteAdmin = role === 'ADMIN' && !isPrivilegedRole(existing.role);
    const shouldNormalizeEmail = existing.email !== normalizedEmail;
    const shouldBackfillName = !!displayName && !existing.fullName;

    if (shouldPromoteAdmin || shouldNormalizeEmail || shouldBackfillName) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(shouldNormalizeEmail ? { email: normalizedEmail } : {}),
          ...(shouldBackfillName ? { fullName: displayName } : {}),
          ...(shouldPromoteAdmin ? { role: 'ADMIN' } : {}),
        },
      });
    }

    return existing;
  }

  const institution = await getOrCreateDefaultInstitution();

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      fullName: displayName,
      role,
      institutionId: institution.id,
    },
  });
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  secret: getAuthSecret(),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: 'Development Bypass',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@lpu.ac.in' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString();
        if (!email) return null;
        return ensureApplicationUser(email, 'Dev User');
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;

      if (email) {
        const normalizedEmail = normalizeEmail(email);
        token.email = normalizedEmail;

        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              role: true,
              regno: true,
              institutionId: true,
              status: true,
            },
          });

          if (!dbUser) {
            // User row was deleted but the JWT still references it. Clear the
            // privileged fields so middleware treats the session as logged-out.
            token.userId = '';
            token.role = '';
            token.regno = null;
            token.institutionId = '';
            token.onboardingComplete = false;
            return token;
          }

          // Suspended / deleted users must lose their privileged context on
          // every JWT refresh. Without this they keep their session until
          // the token's natural expiry.
          if (dbUser.status !== 'ACTIVE') {
            token.userId = '';
            token.role = '';
            token.regno = null;
            token.institutionId = '';
            token.onboardingComplete = false;
            return token;
          }

          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.regno = dbUser.regno;
          token.institutionId = dbUser.institutionId;
          token.onboardingComplete = isPrivilegedRole(dbUser.role) || !!dbUser.regno;
        } catch (err) {
          // DB unavailable — return the stale token so the session stays
          // valid rather than crashing every authenticated request.
          console.error('[jwt] DB lookup failed, using stale token:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Empty strings (set in the jwt callback when the user no longer
        // exists or is suspended) cascade through to route handlers, which
        // should always check `session.user.id` before trusting the session.
        session.user.id = (token.userId as string) ?? '';
        session.user.role = (token.role as string) ?? '';
        session.user.regno = (token.regno as string | null) ?? null;
        session.user.institutionId = (token.institutionId as string) ?? '';
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
      }
      return session;
    },
    async signIn({ user, account }) {
      // Google must provide an email for us to provision an account.
      if (account?.provider === 'google') {
        if (!user.email) return false;
        const dbUser = await ensureApplicationUser(user.email, user.name);
        // Block suspended / deleted users at the door so they never see
        // a redirect-to-/dashboard flicker.
        if (dbUser.status !== 'ACTIVE') return false;
        user.id = dbUser.id;
        user.email = dbUser.email;
        user.name = dbUser.fullName ?? user.name ?? null;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Only allow relative paths or same-origin URLs — never honor an
      // attacker-supplied off-site callbackUrl.
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        /* fall through */
      }
      return baseUrl;
    },
  },
});
