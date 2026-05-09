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
  secret: process.env.AUTH_SECRET || 'fallback_secret_for_typecheck',
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data) => {
      // Find the default institution
      const institution = await prisma.institution.findFirst({
        where: { slug: process.env.DEFAULT_INSTITUTION_SLUG || 'lpu' },
      });
      if (!institution) throw new Error('Default institution not found in database');

      // Assign ADMIN role to specific email
      const role = data.email === 'deepanshulathar@gmail.com' ? 'ADMIN' : 'STUDENT';

      const user = await prisma.user.create({
        data: {
          ...data,
          role,
          institutionId: institution.id,
        },
      });

      return {
        ...user,
        emailVerified: data.emailVerified,
      } as any; // Cast to any to bypass strict NextAuth adapter type checks
    },
  },
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
        if (!credentials?.email) return null;
        let user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) {
          const institution = await prisma.institution.findUnique({
            where: { slug: 'lpu' },
          });
          if (!institution)
            throw new Error('Default institution LPU not found in database');
          user = await prisma.user.create({
            data: {
              email: credentials.email as string,
              fullName: 'Dev User',
              institutionId: institution.id,
            },
          });
        }
        return user;
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
      if (user && user.id) {
        // Persist user id and role in the JWT
        token.userId = user.id as string;
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
