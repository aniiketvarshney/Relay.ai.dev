import { NextResponse } from 'next/server';
import { getAiProviderStatus } from '@/lib/ai';
import { getBaseUrl } from '@/lib/base-url';
import { getDatabaseEnvStatus, isDatabaseConfigured } from '@/lib/env';
import { prisma } from '@/lib/prisma';

type CheckStatus = 'pass' | 'fail' | 'skip';

export async function GET() {
  const timestamp = new Date().toISOString();
  const ai = getAiProviderStatus();
  const envStatus = getDatabaseEnvStatus();
  const configured = isDatabaseConfigured();

  let dbPing: CheckStatus = configured ? 'fail' : 'skip';
  let dbLatencyMs: number | null = null;
  let schemaReady = false;
  let dbError: string | undefined;

  if (configured) {
    const pingStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbPing = 'pass';
      dbLatencyMs = Date.now() - pingStart;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
      dbPing = 'fail';
    }

    if (dbPing === 'pass') {
      try {
        await prisma.manifest.count();
        schemaReady = true;
      } catch (err) {
        dbError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  const aiConfigured = Object.values(ai).some(Boolean);
  const healthy = dbPing === 'pass' && schemaReady;

  let status: string;
  if (healthy) {
    status = 'ok';
  } else if (!configured) {
    status = 'no_database';
  } else if (dbPing === 'fail') {
    status = 'db_unreachable';
  } else if (!schemaReady) {
    status = 'needs_migration';
  } else {
    status = 'degraded';
  }

  return NextResponse.json(
    {
      healthy,
      status,
      timestamp,
      baseUrl: getBaseUrl(),
      checks: {
        database: {
          status: dbPing,
          latencyMs: dbLatencyMs,
          configured,
          env: envStatus,
          error: dbError ?? null,
        },
        schema: {
          status: schemaReady ? 'pass' : dbPing === 'pass' ? 'fail' : 'skip',
          ready: schemaReady,
        },
        ai: {
          status: aiConfigured ? 'pass' : 'skip',
          providers: ai,
        },
      },
      setup:
        !configured
          ? 'Connect Neon in Vercel Storage, then redeploy.'
          : !schemaReady
            ? 'Run: npx prisma db push'
            : null,
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
