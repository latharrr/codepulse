import { auth } from '@/auth';
import { prisma } from '@codepulse/db';
import { NextResponse } from 'next/server';

/**
 * CSV-injection-safe cell serializer. Excel will execute formulas in cells
 * that begin with `=`, `+`, `-`, `@`, or whitespace followed by one of those,
 * so we prepend an apostrophe to neutralize them.
 */
function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Regular ADMIN must have an institutionId — if it's missing (stale JWT
  // or misconfigured account) refuse rather than fall back to a global
  // unfiltered query that would leak other tenants' students.
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const institutionId = session?.user?.institutionId ?? '';
  if (!isSuperAdmin && !institutionId) {
    return NextResponse.json(
      { error: 'Missing institution scope' },
      { status: 403 },
    );
  }

  const whereClause = isSuperAdmin
    ? { role: 'STUDENT' as const }
    : { role: 'STUDENT' as const, institutionId };

  const users = await prisma.user.findMany({
    where: whereClause,
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

  // RFC 4180 CRLF; Excel-on-Windows reads it correctly and so do all parsers.
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

  // Best-effort audit log; never block the download if it fails.
  if (session?.user?.id) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          actorRole: role,
          action: 'admin.export.students',
          targetType: 'institution',
          targetId: institutionId || null,
          payload: { rowCount: users.length },
        },
      });
    } catch (err) {
      console.error('[admin/export] audit log failed:', err);
    }
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="codepulse-students.csv"',
    },
  });
}
