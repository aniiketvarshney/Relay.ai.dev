import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [total, successful, records] = await Promise.all([
      prisma.telemetry.count(),
      prisma.telemetry.count({ where: { success: true } }),
      prisma.telemetry.findMany({
        orderBy: { calledAt: 'desc' },
        take: 20,
        include: { manifest: { select: { name: true } } }
      }),
    ]);

    const avgLatency = records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length)
      : 0;

    return NextResponse.json({
      total_calls: total,
      success_rate: total > 0 ? ((successful / total) * 100).toFixed(1) + '%' : '0%',
      avg_latency_ms: avgLatency,
      recent: records,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
