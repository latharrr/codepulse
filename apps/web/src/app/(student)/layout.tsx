/**
 * Layout for (student) route group — dashboard, handles, profile pages.
 * Includes persistent nav bar.
 */
import { auth } from '@/auth';
import { isPrivilegedRole } from '@/lib/auth-rules';
import { redirect } from 'next/navigation';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (isPrivilegedRole(session.user.role)) redirect('/admin');
  if (!session.user.onboardingComplete) redirect('/onboarding');
  return <>{children}</>;
}
