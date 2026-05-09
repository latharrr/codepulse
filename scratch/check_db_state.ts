import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const users = await prisma.user.findMany({
    include: {
      score: true,
      ranks: true,
      handles: true,
      metrics: true,
    }
  });

  console.log('User Data Detail:');
  for (const u of users) {
    console.log(`\nUser: ${u.email}`);
    console.log(`- Score: ${u.score?.codepulseScore ?? 'None'}`);
    console.log(`- Ranks: ${u.ranks.map(r => `${r.scope}=#${r.rank}`).join(', ') || 'None'}`);
    console.log(`- Handles: ${u.handles.map(h => `${h.platform}:${h.handle} (${h.verificationState})`).join(', ') || 'None'}`);
    console.log(`- Metrics: ${u.metrics.length} entries`);
  }
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
