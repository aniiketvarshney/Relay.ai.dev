import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerdict, getThreatType } from '@/lib/verdict';
import { isDatabaseConfigured } from '@/lib/env';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: {
      mcpConfig: true,
      telemetry: {
        orderBy: { calledAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!manifest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyVolume: { date: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = manifest.telemetry.filter(
      (t) => t.calledAt.toISOString().slice(0, 10) === key
    ).length;
    dailyVolume.push({ date: key, count });
  }

  const total = manifest.telemetry.length;
  const successful = manifest.telemetry.filter((t) => t.success).length;
  const avgLatency =
    total > 0
      ? Math.round(manifest.telemetry.reduce((s, t) => s + t.latencyMs, 0) / total)
      : 0;

  const agentCounts: Record<string, number> = {};
  for (const t of manifest.telemetry) {
    const a = t.agentId ?? 'anonymous';
    agentCounts[a] = (agentCounts[a] ?? 0) + 1;
  }
  const topAgents = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ agentId: id, count }));

  const securityEvents = manifest.telemetry.slice(0, 10).map((t) => ({
    ...t,
    calledAt: t.calledAt.toISOString(),
    verdict: getVerdict(t),
    threatType: getThreatType(t.errorType, t.errorMsg),
  }));

  const verdicts = { allowed: 0, flagged: 0, blocked: 0 };
  for (const t of manifest.telemetry) {
    const v = getVerdict(t);
    if (v === 'ALLOWED') verdicts.allowed++;
    else if (v === 'FLAGGED') verdicts.flagged++;
    else verdicts.blocked++;
  }

  const lastActive = manifest.telemetry[0]?.calledAt.toISOString() ?? null;
  const callCount = manifest.telemetry.length;

  return NextResponse.json({
    ...manifest,
    publishedAt: manifest.publishedAt.toISOString(),
    updatedAt: manifest.updatedAt.toISOString(),
    analytics: {
      dailyVolume,
      successRate: total ? ((successful / total) * 100).toFixed(1) : '0',
      avgLatencyMs: avgLatency,
      topAgents,
      callCount,
      lastActive,
    },
    security: { events: securityEvents, verdicts },
  });
}
