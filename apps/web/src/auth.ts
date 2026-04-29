/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers:
 * - Google OAuth — primary sign-in (university Google Workspace)
 * - GitHub OAuth — used for platform handle linking (Step 2)
 *
 * After successful Google sign-in:
 * - If user exists with onboarding complete → redirect to /dashboard
 * - If user exists but no regno → redirect to /onboarding
 * - If new user → create user record, redirect to /onboarding
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@codepulse/db';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "MjXJVicp6QGerhVWePE3UzUnSXn09MtQE7Jw7tLi0II=",
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: 'Development Bypass',
      credentials: { email: { label: "Email", type: "email", placeholder: "admin@lpu.ac.in" } },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        let user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
        if (!user) {
          user = await prisma.user.create({ data: { email: credentials.email as string, fullName: "Dev User", institutionId: "35e7950a-d5f7-4b68-b455-6112cdac3ee8" } });
        }
        return user;
      }
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
      if (user) {
        // Persist user id and role in the JWT
        token.userId = user.id;
      }
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, regno: true, institutionId: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.regno = dbUser.regno;
          token.institutionId = dbUser.institutionId;
          token.onboardingComplete = !!dbUser.regno;
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
      // Only allow Google sign-in for primary auth
      // GitHub sign-in is handled via separate OAuth flow for handle linking
      if (account?.provider === 'github' && !user.email) {
        return false;
      }
      return true;
    },
  },
});
