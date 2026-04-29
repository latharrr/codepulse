/**
 * Seed script for CodePulse Phase 1 MVP
 *
 * Creates:
 * - 1 Institution (LPU)
 * - 1 ADMIN user
 * - 5 STUDENT users with stub platform handles
 *
 * Run with: pnpm db:seed
 */
import { PrismaClient, Platform, VerificationState, VerificationMethod, HandleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CodePulse seed...');

  // ── Institution ──────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { slug: 'lpu' },
    update: {},
    create: {
      slug: 'lpu',
      name: 'Lovely Professional University',
      regnoConfig: {
        // LPU format: 12420010
        // pattern: 8 digits
        // yearLogic: chars at index 2-3 → last 2 digits of batch year enrollment
        // e.g. 12420010 → "24" at index 2-3 → batch 2024
        pattern: '^\\d{8}$',
        yearOffset: 1,
        yearLength: 2,
        yearLogic: 'lpu',
        yearBase: 2000,
      },
    },
  });

  console.log(`✅ Institution: ${institution.name} (${institution.id})`);

  // ── Admin user ───────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lpu.ac.in' },
    update: {},
    create: {
      institutionId: institution.id,
      email: 'admin@lpu.ac.in',
      regno: '00000000',
      fullName: 'CodePulse Admin',
      branch: 'Administration',
      section: null,
      batchYear: null,
      currentYear: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      visibility: {},
    },
  });

  console.log(`✅ Admin: ${admin.email}`);

  // ── Student users ────────────────────────────────────────
  const students = [
    {
      email: 'aarav.sharma@lpu.in',
      regno: '12420001',
      fullName: 'Aarav Sharma',
      branch: 'CSE',
      section: 'K21',
      batchYear: 2024,
      currentYear: 1,
      github: 'aaravsharma',
      codeforces: 'aarav_cf',
      leetcode: 'aarav_lc',
    },
    {
      email: 'priya.verma@lpu.in',
      regno: '12321002',
      fullName: 'Priya Verma',
      branch: 'CSE',
      section: 'K22',
      batchYear: 2023,
      currentYear: 2,
      github: 'priyaverma',
      codeforces: 'priya_v',
      leetcode: 'priyaverma_lc',
    },
    {
      email: 'rohan.mehta@lpu.in',
      regno: '12222003',
      fullName: 'Rohan Mehta',
      branch: 'ECE',
      section: 'K11',
      batchYear: 2022,
      currentYear: 3,
      github: 'rohanmehta',
      codeforces: null,
      leetcode: 'rohan_lc',
    },
    {
      email: 'sneha.patel@lpu.in',
      regno: '12123004',
      fullName: 'Sneha Patel',
      branch: 'MBA',
      section: 'M01',
      batchYear: 2021,
      currentYear: 4,
      github: null,
      codeforces: 'sneha_patel',
      leetcode: 'snehapatel',
    },
    {
      email: 'karan.singhania@lpu.in',
      regno: '12420005',
      fullName: 'Karan Singhania',
      branch: 'CSE',
      section: 'K23',
      batchYear: 2024,
      currentYear: 1,
      github: 'karansinghania',
      codeforces: 'karan_cf',
      leetcode: 'karan_lc',
    },
  ];

  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        institutionId: institution.id,
        email: s.email,
        regno: s.regno,
        fullName: s.fullName,
        branch: s.branch,
        section: s.section,
        batchYear: s.batchYear,
        currentYear: s.currentYear,
        role: 'STUDENT',
        status: 'ACTIVE',
        visibility: {},
      },
    });

    // Create stub handles
    const handleData: Array<{
      platform: Platform;
      handle: string;
      verificationState: VerificationState;
      verificationMethod: VerificationMethod | null;
      status: HandleStatus;
    }> = [];

    if (s.github) {
      handleData.push({
        platform: 'GITHUB',
        handle: s.github,
        verificationState: 'UNVERIFIED',
        verificationMethod: null,
        status: 'ACTIVE',
      });
    }
    if (s.codeforces) {
      handleData.push({
        platform: 'CODEFORCES',
        handle: s.codeforces,
        verificationState: 'UNVERIFIED',
        verificationMethod: null,
        status: 'ACTIVE',
      });
    }
    if (s.leetcode) {
      handleData.push({
        platform: 'LEETCODE',
        handle: s.leetcode,
        verificationState: 'UNVERIFIED',
        verificationMethod: null,
        status: 'ACTIVE',
      });
    }

    for (const h of handleData) {
      await prisma.platformHandle.upsert({
        where: { platform_handle: { platform: h.platform, handle: h.handle } },
        update: {},
        create: {
          userId: user.id,
          platform: h.platform,
          handle: h.handle,
          verificationState: h.verificationState,
          verificationMethod: h.verificationMethod,
          status: h.status,
        },
      });
    }

    console.log(`✅ Student: ${user.fullName} (${user.regno}) — ${handleData.length} handles`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
