import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMetrics() {
  const metrics = await prisma.normalizedMetric.findMany({
    take: 10,
    orderBy: { computedAt: 'desc' }
  });

  console.log('Normalized Metrics Sample:');
  console.log(JSON.stringify(metrics, null, 2));
}

checkMetrics()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
