'use server';

import crypto from 'crypto';
import { auth } from '@/auth';
import { queues } from '@/lib/queues';
import { prisma } from '@codepulse/db';
import { AddHandleRequestSchema } from '@codepulse/types';
import type { Platform } from '@codepulse/types';
import { revalidatePath } from 'next/cache';

export type HandleActionResult =
  | { ok: true; message: string; verificationToken?: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function createVerificationToken() {
  return `cp_${crypto.randomBytes(8).toString('hex')}`;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function enqueueFetch(
  platform: Platform,
  data: {
    handleId: string;
    userId: string;
    handle: string;
    reason: 'initial' | 'scheduled' | 'manual' | 'retry';
  },
) {
  const jobData = { ...data, platform };
  const jobId = `${data.reason}-${data.handleId}-${Date.now()}`;

  if (platform === 'GITHUB') {
    await queues.fetchGithub.add(jobId, jobData);
  } else if (platform === 'CODEFORCES') {
    await queues.fetchCodeforces.add(jobId, jobData);
  } else {
    await queues.fetchLeetcode.add(jobId, jobData);
  }
}

async function enqueueVerification(data: {
  handleId: string;
  userId: string;
  platform: Platform;
  handle: string;
  verificationToken: string;
}) {
  await queues.verifyHandle.add(`verify-${data.handleId}-${Date.now()}`, data);
}

export async function linkHandle(
  platform: Platform,
  rawHandle: string,
): Promise<HandleActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: 'Unauthorized. Please sign in again.' };

  const parsed = AddHandleRequestSchema.safeParse({
    platform,
    handle: rawHandle.trim(),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString();
      if (field) fieldErrors[field] = issue.message;
    }

    return { ok: false, error: 'Please fix the handle value.', fieldErrors };
  }

  const handle = parsed.data.handle;
  const verificationToken = createVerificationToken();

  try {
    const [handleInUse, existingForPlatform] = await Promise.all([
      prisma.platformHandle.findUnique({
        where: { platform_handle: { platform, handle } },
        select: { id: true, userId: true, verificationState: true },
      }),
      prisma.platformHandle.findFirst({
        where: { userId, platform },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (handleInUse && handleInUse.userId !== userId) {
      return {
        ok: false,
        error: 'That platform handle is already linked to another account.',
      };
    }

    if (
      existingForPlatform &&
      existingForPlatform.handle === handle &&
      existingForPlatform.verificationState === 'VERIFIED'
    ) {
      await enqueueFetch(platform, {
        handleId: existingForPlatform.id,
        userId,
        handle,
        reason: 'manual',
      });

      return { ok: true, message: 'This handle is already verified. Sync queued.' };
    }

    const platformHandle = await prisma.$transaction(async (tx) => {
      if (existingForPlatform) {
        const handleChanged = existingForPlatform.handle !== handle;

        const updated = await tx.platformHandle.update({
          where: { id: existingForPlatform.id },
          data: {
            handle,
            status: 'ACTIVE',
            verificationState: 'PENDING',
            verificationMethod: 'BIO_TOKEN',
            verificationToken,
            verifiedAt: null,
            lastFetchedAt: handleChanged ? null : existingForPlatform.lastFetchedAt,
            lastSuccessAt: handleChanged ? null : existingForPlatform.lastSuccessAt,
            consecutiveFailures: 0,
          },
        });

        if (handleChanged) {
          await tx.normalizedMetric.deleteMany({ where: { userId, platform } });
        }

        return updated;
      }

      return tx.platformHandle.create({
        data: {
          userId,
          platform,
          handle,
          status: 'ACTIVE',
          verificationState: 'PENDING',
          verificationMethod: 'BIO_TOKEN',
          verificationToken,
        },
      });
    });

    await enqueueVerification({
      handleId: platformHandle.id,
      userId,
      platform,
      handle,
      verificationToken,
    });

    await queues.recomputeScore.add(`recompute-${userId}-${Date.now()}`, {
      userId,
      triggeredByPlatform: platform,
    });

    revalidatePath('/dashboard');
    revalidatePath('/handles');

    return {
      ok: true,
      message: 'Verification queued. Add the token to your profile, then check again.',
      verificationToken,
    };
  } catch (error) {
    console.error('Handle link failed:', error);
    return {
      ok: false,
      error: 'Failed to link handle. Check Redis/Postgres and try again.',
    };
  }
}

export async function syncHandle(handleId: string): Promise<HandleActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: 'Unauthorized. Please sign in again.' };

  try {
    const handle = await prisma.platformHandle.findUnique({
      where: { id: handleId },
    });

    if (!handle || handle.userId !== userId) {
      return { ok: false, error: 'Handle not found.' };
    }

    if (handle.status === 'DEAD') {
      return {
        ok: false,
        error: 'This handle is marked dead. Reconnect it to reactivate syncing.',
      };
    }

    if (handle.verificationState === 'VERIFIED') {
      await enqueueFetch(handle.platform, {
        handleId: handle.id,
        userId,
        handle: handle.handle,
        reason: 'manual',
      });

      return { ok: true, message: 'Manual sync queued.' };
    }

    const verificationToken = handle.verificationToken ?? createVerificationToken();

    if (!handle.verificationToken || handle.verificationState !== 'PENDING') {
      await prisma.platformHandle.update({
        where: { id: handle.id },
        data: {
          verificationState: 'PENDING',
          verificationMethod: 'BIO_TOKEN',
          verificationToken,
          consecutiveFailures: 0,
        },
      });
    }

    await enqueueVerification({
      handleId: handle.id,
      userId,
      platform: handle.platform,
      handle: handle.handle,
      verificationToken,
    });

    revalidatePath('/handles');

    return {
      ok: true,
      message: 'Verification check queued.',
      verificationToken,
    };
  } catch (error) {
    console.error('Handle sync failed:', error);
    return {
      ok: false,
      error: 'Failed to queue handle work. Check Redis/Postgres and try again.',
    };
  }
}
