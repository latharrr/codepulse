/**
 * Augments Auth.js (NextAuth v5) session types with CodePulse-specific fields.
 * These fields are set in the `jwt` and `session` callbacks in auth.ts.
 */
import type { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      regno: string;
      institutionId: string;
      onboardingComplete: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string;
    role: string;
    regno: string;
    institutionId: string;
    onboardingComplete: boolean;
  }
}
