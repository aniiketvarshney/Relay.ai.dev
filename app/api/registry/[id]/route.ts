import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerdict, getThreatType } from '@/lib/verdict';
import { isDatabaseConfigured } from '@/lib/env';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const { id } = await params;

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: {
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

    dailyVolume.push({
      date: key,
      count,
    });
  }

  const total = manifest.telemetry.length;
  const successful = manifest.telemetry.filter((t) => t.success).length;

  const securityEvents = manifest.telemetry.slice(0, 10).map((t) => ({
    id: t.id,
    calledAt: t.calledAt.toISOString(),
    toolName: t.toolName,
    success: t.success,
    errorType: t.errorType,
    verdict: getVerdict(t),
    threatType: getThreatType(t.errorType, null),
  }));

  const verdicts = {
    allowed: 0,
    flagged: 0,
    blocked: 0,
  };

  for (const t of manifest.telemetry) {
    const v = getVerdict(t);

    if (v === 'ALLOWED') {
      verdicts.allowed++;
    } else if (v === 'FLAGGED') {
      verdicts.flagged++;
    } else {
      verdicts.blocked++;
    }
  }

  const lastActive =
    manifest.telemetry[0]?.calledAt.toISOString() ?? null;

  return NextResponse.json({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    endpoint: manifest.endpoint,
    domain: manifest.domain,

    // Fixed: use createdAt fallback instead of calledAt
    calledAt:
      manifest.createdAt?.toISOString() ??
      new Date().toISOString(),

    analytics: {
      dailyVolume,
      successRate: total
        ? ((successful / total) * 100).toFixed(1)
        : '0',
      avgLatencyMs: 0,
      topAgents: [],
      callCount: total,
      lastActive,
    },

    // Added missing fields
    serverUrl: manifest.serverUrl,
    authType: manifest.authType,
    tools: manifest.tools,

    security: {
      events: securityEvents,
      verdicts,
    },
  });
}