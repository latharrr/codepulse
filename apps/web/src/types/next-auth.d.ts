/**
 * Augments Auth.js (NextAuth v5) session types with CodePulse-specific fields.
 * These fields are set in the `jwt` and `session` callbacks in auth.ts.
 *
 * regno is nullable because users are created during Google OAuth sign-in
 * before onboarding is complete. Once they submit the onboarding form, regno is set.
 */
import type { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      regno: string | null;
      institutionId: string;
      onboardingComplete: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string;
    role: string;
    regno: string | null;
    institutionId: string;
    onboardingComplete: boolean;
  }
}
