'use server';

import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { queues } from '@/lib/queues';
import { Platform } from '@codepulse/types';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function linkHandle(platform: Platform, handle: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userId = session.user.id;
  const verificationToken = `cp_${crypto.randomBytes(8).toString('hex')}`;

  // 1. Create handle in DB
  const platformHandle = await prisma.platformHandle.upsert({
    where: { platform_handle: { platform, handle } },
    create: {
      userId,
      platform,
      handle,
      status: 'ACTIVE', 
      verificationState: platform === 'GITHUB' ? 'VERIFIED' : 'PENDING',
      verificationMethod: 'MANUAL',
      verificationToken,
    },
    update: {
      userId, // Allow changing owner if it was somehow unlinked or for dev ease
      status: 'ACTIVE',
      verificationState: platform === 'GITHUB' ? 'VERIFIED' : 'PENDING',
    }
  });

  // 2. Enqueue Fetch Job
  const jobData = {
    handleId: platformHandle.id,
    userId,
    platform,
    handle,
    reason: 'initial' as const,
  };

  if (platform === 'GITHUB') {
    await queues.fetchGithub.add(`fetch-${handle}`, jobData);
  } else if (platform === 'CODEFORCES') {
    await queues.fetchCodeforces.add(`fetch-${handle}`, jobData);
  } else if (platform === 'LEETCODE') {
    await queues.fetchLeetcode.add(`fetch-${handle}`, jobData);
  }

  revalidatePath('/dashboard');
  revalidatePath('/handles');

  return { success: true, verificationToken };
}
