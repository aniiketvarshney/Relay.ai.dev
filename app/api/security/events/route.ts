import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerdict, getThreatType } from '@/lib/verdict';
import { isDatabaseConfigured } from '@/lib/env';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const verdictFilter = searchParams.get('verdict');
  const days = parseInt(searchParams.get('days') ?? '7', 10);
  const agentId = searchParams.get('agentId')?.trim();
  const manifestId = searchParams.get('manifestId')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const since = daysAgo(days === 1 ? 0 : days - 1);

  const records = await prisma.telemetry.findMany({
    where: {
      calledAt: { gte: since },
      ...(manifestId ? { manifestId } : {}),
      ...(agentId ? { agentId: { contains: agentId, mode: 'insensitive' } } : {}),
    },
    orderBy: { calledAt: 'desc' },
    take: limit,
    include: { manifest: { select: { name: true } } },
  });

  const events = records
    .map((r) => ({
      id: r.id,
      calledAt: r.calledAt.toISOString(),
      manifestId: r.manifestId,
      toolName: r.toolName,
      manifestName: r.manifest.name,
      agentId: r.agentId,
      latencyMs: r.latencyMs,
      verdict: getVerdict(r),
      threatType: getThreatType(r.errorType, r.errorMsg),
      errorType: r.errorType,
      errorMsg: r.errorMsg,
      success: r.success,
    }))
    .filter((e) => !verdictFilter || verdictFilter === 'all' || e.verdict === verdictFilter);

  const breakdown: Record<string, number> = {};
  for (const e of events) {
    const key = e.threatType ?? (e.verdict === 'ALLOWED' ? 'Allowed' : 'Other');
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }

  const today = daysAgo(0);
  const todayEvents = events.filter((e) => new Date(e.calledAt) >= today);

  return NextResponse.json({
    events,
    summary: {
      total: todayEvents.length,
      allowed: todayEvents.filter((e) => e.verdict === 'ALLOWED').length,
      flagged: todayEvents.filter((e) => e.verdict === 'FLAGGED').length,
      blocked: todayEvents.filter((e) => e.verdict === 'BLOCKED').length,
    },
    threatBreakdown: Object.entries(breakdown).map(([type, count]) => ({
      type,
      count,
      pct: events.length ? Math.round((count / events.length) * 100) : 0,
    })),
  });
}
