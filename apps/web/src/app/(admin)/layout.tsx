/**
 * Layout for the (admin) route group.
 *
 * Defense-in-depth role check: middleware already redirects non-admins away
 * from /admin/**, but a layout-level guard means the moment someone adds a
 * new admin sub-page they automatically inherit the role check.
 */
import { auth } from '@/auth';
import { isPrivilegedRole } from '@/lib/auth-rules';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!isPrivilegedRole(session.user.role)) redirect('/dashboard');
  return <>{children}</>;
}
