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
        include: { manifest: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json({
      total_calls: total,
      success_rate: total > 0 ? ((successful / total) * 100).toFixed(1) + '%' : '0%',
      avg_latency_ms: 0,
      recent: records.map((r) => ({
        id: r.id,
        calledAt: r.calledAt.toISOString(),
        toolName: r.toolName,
        success: r.success,
        errorType: r.errorType,
        manifestName: r.manifest?.name ?? 'Unknown',
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}