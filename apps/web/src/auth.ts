/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Google sign-in accepts personal and organization Google accounts.
 * The configured admin email is promoted automatically and routed to /admin.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
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
  return prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } },
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
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
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

        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
          select: { id: true, role: true, regno: true, institutionId: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.regno = dbUser.regno;
          token.institutionId = dbUser.institutionId;
          token.onboardingComplete = isPrivilegedRole(dbUser.role) || !!dbUser.regno;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.regno = token.regno as string;
        session.user.institutionId = token.institutionId as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // GitHub sign-in is handled via separate OAuth flow for handle linking
      if (account?.provider === 'github' && !user.email) {
        return false;
      }

      // Auto-provision user on Google sign-in. Any Google account is allowed.
      if (account?.provider === 'google' && user.email) {
        const dbUser = await ensureApplicationUser(user.email, user.name);
        user.id = dbUser.id;
        user.email = dbUser.email;
        user.name = dbUser.fullName ?? user.name ?? null;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
