import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await auth();
  
  // Extra safety check (middleware already handles this)
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/dashboard');
  }

  const stats = await prisma.$transaction([
    prisma.user.count(),
    prisma.platformHandle.count(),
    prisma.institution.count(),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Total Students</p>
          <p className="text-4xl font-bold">{stats[0]}</p>
        </div>
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Connected Handles</p>
          <p className="text-4xl font-bold">{stats[1]}</p>
        </div>
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <p className="text-muted-foreground text-sm uppercase">Institutions</p>
          <p className="text-4xl font-bold">{stats[2]}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Sync All Data</button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">Export Reports</button>
        </div>
      </div>
    </div>
  );
}
