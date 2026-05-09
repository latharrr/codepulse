import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
