import { NextRequest, NextResponse } from 'next/server';
import { databaseConnectionError, databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { buildRegistryWhere } from '@/lib/registry-query';

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return databaseSetupError();
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const domain = searchParams.get('domain');
    const includeDocs = searchParams.get('docs') === 'true';

    const where = buildRegistryWhere(q, domain);

    const tools = await prisma.manifest.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        serverUrl: true,
        authType: true,
        domain: true,
        tools: true,
        tokenCount: true,
        publishedAt: true,
        ...(includeDocs ? { docString: true } : {}),
        mcpConfig: {
          select: { mcpEndpoint: true, active: true },
        },
      },
    });

    return NextResponse.json({
      count: tools.length,
      filters: {
        q: q?.trim() || null,
        domain: domain?.trim() || null,
      },
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
