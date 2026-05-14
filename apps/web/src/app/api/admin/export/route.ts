import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { NextResponse } from 'next/server';

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      ...(session?.user?.institutionId
        ? { institutionId: session.user.institutionId }
        : {}),
    },
    orderBy: [{ batchYear: 'desc' }, { fullName: 'asc' }],
    include: {
      score: true,
      handles: {
        select: {
          platform: true,
          handle: true,
          verificationState: true,
          status: true,
          lastSuccessAt: true,
        },
      },
      ranks: {
        where: { scope: 'CAMPUS' },
        take: 1,
      },
    },
  });

  const header = [
    'name',
    'email',
    'regno',
    'branch',
    'section',
    'batchYear',
    'score',
    'campusRank',
    'handles',
  ];

  const rows = users.map((user) => {
    const handles = user.handles
      .map(
        (handle) =>
          `${handle.platform}:${handle.handle}:${handle.verificationState}:${handle.status}`,
      )
      .join('; ');

    return [
      user.fullName,
      user.email,
      user.regno,
      user.branch,
      user.section,
      user.batchYear,
      user.score ? Number(user.score.codepulseScore).toFixed(2) : '',
      user.ranks[0]?.rank ?? '',
      handles,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="codepulse-students.csv"',
    },
  });
}
