import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerdict, getThreatType } from '@/lib/verdict';
import { isDatabaseConfigured } from '@/lib/env';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const today = startOfDay();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    totalTools,
    callsToday,
    proxiedToday,
    threatsBlockedToday,
    recentRaw,
    topToolsRaw,
    sparklineRaw,
  ] = await Promise.all([
    prisma.manifest.count(),
    prisma.telemetry.count({ where: { calledAt: { gte: today } } }),
    prisma.telemetry.count({ where: { calledAt: { gte: today } } }),
    prisma.telemetry.count({
      where: {
        calledAt: { gte: today },
        success: false,
        errorType: {
          in: [
            'SECURITY_BLOCKED',
            'FORBIDDEN_KEY',
            'PROMPT_INJECTION',
            'PAYLOAD_TOO_LARGE',
            'PAYLOAD_TOO_DEEP',
          ],
        },
      },
    }),
    prisma.telemetry.findMany({
      take: 20,
      orderBy: { calledAt: 'desc' },
      include: { manifest: { select: { name: true } } },
    }),
    prisma.telemetry.groupBy({
      by: ['manifestId', 'toolName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
    prisma.telemetry.findMany({
      where: { calledAt: { gte: sevenDaysAgo } },
      select: { calledAt: true },
    }),
  ]);

  const manifestIds = [...new Set(topToolsRaw.map((t) => t.manifestId).filter((id): id is string => id !== null))];
  const manifests = await prisma.manifest.findMany({
    where: { id: { in: manifestIds } },
    select: { id: true, name: true, domain: true },
  });
  const manifestMap = Object.fromEntries(manifests.map((m) => [m.id, m]));

  const sparkline: { date: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = sparklineRaw.filter(
      (r) => r.calledAt.toISOString().slice(0, 10) === key
    ).length;
    sparkline.push({ date: key, count });
  }

  const maxCalls = Math.max(...topToolsRaw.map((t) => t._count.id), 1);

  return NextResponse.json({
    stats: {
      totalTools,
      callsToday,
      proxiedToday,
      threatsBlockedToday,
    },
    sparkline,
    recentActivity: recentRaw.map((r) => ({
      id: r.id,
      calledAt: r.calledAt.toISOString(),
      toolName: r.toolName,
      manifestName: r.manifest.name,
      manifestId: r.manifestId,
      agentId: r.agentId,
      latencyMs: r.latencyMs,
      verdict: getVerdict(r),
      threatType: getThreatType(r.errorType, r.errorMsg),
      errorMsg: r.errorMsg,
      success: r.success,
    })),
    topTools: topToolsRaw.map((t) => ({
      manifestId: t.manifestId,
      toolName: t.toolName,
      name: manifestMap[t.manifestId]?.name ?? t.toolName,
      domain: manifestMap[t.manifestId]?.domain,
      calls: t._count.id,
      pct: Math.round((t._count.id / maxCalls) * 100),
    })),
  });
}
