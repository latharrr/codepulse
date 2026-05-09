import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();
const redisConnection = { 
  host: 'localhost',
  port: 6379,
  password: 'codepulse_redis_password' 
};

async function main() {
  const handles = await prisma.platformHandle.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true },
  });

  console.log(`Found ${handles.length} active handles`);

  for (const h of handles) {
    const qName = h.platform === 'GITHUB' ? 'fetch-github'
      : h.platform === 'CODEFORCES' ? 'fetch-codeforces'
      : 'fetch-leetcode';

    const q = new Queue(qName, { connection: redisConnection });
    await q.add('manual-trigger', {
      handleId: h.id,
      userId: h.userId,
      platform: h.platform,
      handle: h.handle,
      reason: 'manual',
    });
    console.log(`Queued ${h.platform} fetch for @${h.handle} (user: ${h.user.email})`);
    await q.close();
  }

  await prisma.$disconnect();
}

main().catch(console.error);
