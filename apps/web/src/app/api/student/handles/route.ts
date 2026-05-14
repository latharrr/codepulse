import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reject suspended / deleted users — their JWT may still be valid until
  // expiry, but they should be locked out of all data routes immediately.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handles = await prisma.platformHandle.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      platform: true,
      handle: true,
      verificationState: true,
      status: true,
      verificationToken: true,
      lastFetchedAt: true,
      lastSuccessAt: true,
    },
  });

  return NextResponse.json(handles);
}
