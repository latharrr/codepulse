import { prisma } from '@codepulse/db';
import type { Platform } from '@codepulse/types';

type HandleJobState = {
  handleId: string;
  userId: string;
  platform: Platform;
  handle: string;
};

export async function isCurrentHandleJob({
  handleId,
  userId,
  platform,
  handle,
}: HandleJobState) {
  const current = await prisma.platformHandle.findUnique({
    where: { id: handleId },
    select: {
      userId: true,
      platform: true,
      handle: true,
      status: true,
    },
  });

  return (
    !!current &&
    current.userId === userId &&
    current.platform === platform &&
    current.handle === handle &&
    current.status === 'ACTIVE'
  );
}

export async function isCurrentVerificationJob({
  handleId,
  userId,
  platform,
  handle,
  verificationToken,
}: HandleJobState & { verificationToken: string }) {
  const current = await prisma.platformHandle.findUnique({
    where: { id: handleId },
    select: {
      userId: true,
      platform: true,
      handle: true,
      status: true,
      verificationState: true,
      verificationToken: true,
    },
  });

  return (
    !!current &&
    current.userId === userId &&
    current.platform === platform &&
    current.handle === handle &&
    current.status === 'ACTIVE' &&
    current.verificationState === 'PENDING' &&
    current.verificationToken === verificationToken
  );
}

export async function isCurrentVerifiedFetchJob(state: HandleJobState) {
  const current = await prisma.platformHandle.findUnique({
    where: { id: state.handleId },
    select: {
      userId: true,
      platform: true,
      handle: true,
      status: true,
      verificationState: true,
    },
  });

  return (
    !!current &&
    current.userId === state.userId &&
    current.platform === state.platform &&
    current.handle === state.handle &&
    current.status === 'ACTIVE' &&
    current.verificationState === 'VERIFIED'
  );
}
