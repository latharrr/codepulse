import { prisma } from '@codepulse/db';
import { LPU_REGNO_CONFIG } from '@codepulse/types';

export async function getOrCreateDefaultInstitution() {
  const slug = process.env.DEFAULT_INSTITUTION_SLUG || 'lpu';

  return prisma.institution.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: slug === 'lpu' ? 'Lovely Professional University' : slug.toUpperCase(),
      regnoConfig: LPU_REGNO_CONFIG,
    },
  });
}
