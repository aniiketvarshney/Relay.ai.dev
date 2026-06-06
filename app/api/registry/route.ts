import { NextRequest, NextResponse } from 'next/server';
import { databaseConnectionError, databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return databaseSetupError();
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const domain = searchParams.get('domain')?.trim();

    const tools = await prisma.manifest.findMany({
      where: {
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]} : {}),
        ...(domain ? { domain: { contains: domain, mode: 'insensitive' } } : {}),
      },
      orderBy: { calledAt: 'desc' },
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        endpoint: true,
        domain: true,
        calledAt: true,
      },
    });

    return NextResponse.json({
      count: tools.length,
      filters: { q: q ?? null, domain: domain ?? null },
      tools,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('P2021')) {
      return databaseConnectionError('Tables missing — run: npx prisma db push');
    }
    return databaseConnectionError(msg);
  }
}