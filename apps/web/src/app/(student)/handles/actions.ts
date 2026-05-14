'use server';

import crypto from 'crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { queues } from '@/lib/queues';
import { prisma } from '@codepulse/db';
import { AddHandleRequestSchema } from '@codepulse/types';
import type { Platform } from '@codepulse/types';
import { revalidatePath } from 'next/cache';

export type HandleActionResult =
  | { ok: true; message: string; verificationToken?: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const HandleIdSchema = z.string().uuid();

function createVerificationToken() {
  return `cp_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Resolves the current authenticated, ACTIVE student.
 * Returns null if the user is signed-out, suspended, or deleted —
 * which is the same code path the UI handles ("Unauthorized").
 */
async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user || user.status !== 'ACTIVE') return null;
  return userId;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
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
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: 'That platform handle is already linked to another account.',
      };
    }
    return {
      ok: false,
      error: 'Could not link handle right now. Please retry in a moment.',
    };
  }
}

export async function syncHandle(handleId: string): Promise<HandleActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: 'Unauthorized. Please sign in again.' };

  // Reject obviously-malformed IDs before Prisma throws — Prisma rejects
  // non-UUIDs with a generic error that would be caught below and shown as
  // "Could not queue sync".
  const parsedId = HandleIdSchema.safeParse(handleId);
  if (!parsedId.success) {
    return { ok: false, error: 'Handle not found.' };
  }

  try {
    const handle = await prisma.platformHandle.findUnique({
      where: { id: parsedId.data },
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
      error:
        'Could not queue the verification check. Please retry in a moment.',
    };
  }
}
