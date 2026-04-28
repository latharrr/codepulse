/**
 * Layout for (student) route group — dashboard, handles, profile pages.
 * Includes persistent nav bar.
 */
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.onboardingComplete) redirect('/onboarding');
  return <>{children}</>;
}
