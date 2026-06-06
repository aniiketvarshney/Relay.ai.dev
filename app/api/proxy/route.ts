import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { checkPayloadSecurity } from '@/lib/payload-security';
import { prisma } from '@/lib/prisma';
import { logTelemetry } from '@/lib/telemetry';

const ProxyRequestSchema = z.object({
  manifestId: z.string().min(1, 'manifestId is required'),
  toolName: z.string().min(1, 'toolName is required'),
  payload: z.unknown(),
  agentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const start = Date.now();

  if (!isDatabaseConfigured()) {
    return databaseSetupError();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', fieldErrors: [{ field: 'body', message: 'Request body must be valid JSON' }] },
      { status: 400 }
    );
  }

  const parsed = ProxyRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.errors.map((e) => ({
      field: e.path.length ? e.path.join('.') : 'body',
      message: e.message,
    }));
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const { manifestId, toolName, payload, agentId } = parsed.data;

  const manifest = await prisma.manifest.findUnique({
    where: { id: manifestId },
  });

  if (!manifest) {
    await logTelemetry({ manifestId, toolName, agentId, success: false, errorType: 'MANIFEST_NOT_FOUND' });
    return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
  }

  const security = checkPayloadSecurity(payload);
  if (!security.allowed) {
    await logTelemetry({
      manifestId: manifest.id, toolName, agentId, success: false,
      errorType: 'SECURITY_BLOCKED', errorMsg: `${security.code}: ${security.reason}`,
    });
    return NextResponse.json(
      { error: 'Request blocked by security policy', code: security.code, message: security.reason },
      { status: 403 }
    );
  }

  if (!manifest.endpoint) {
    await logTelemetry({ manifestId: manifest.id, toolName, agentId, success: false, errorType: 'NO_ENDPOINT' });
    return NextResponse.json({ error: 'Manifest has no endpoint configured' }, { status: 400 });
  }

  try {
    const realResponse = await fetch(manifest.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = realResponse.headers.get('content-type') ?? '';
    const latencyMs = Date.now() - start;

    if (contentType.includes('application/json')) {
      const realData = await realResponse.json();
      await logTelemetry({
        manifestId: manifest.id, toolName, agentId, latencyMs,
        success: realResponse.ok, errorType: realResponse.ok ? undefined : 'UPSTREAM_ERROR',
      });
      return NextResponse.json(
        realResponse.ok ? { success: true, data: realData } : { success: false, data: realData },
        { status: realResponse.ok ? 200 : realResponse.status }
      );
    }

    const text = await realResponse.text();
    await logTelemetry({
      manifestId: manifest.id, toolName, agentId, latencyMs,
      success: realResponse.ok, errorType: realResponse.ok ? undefined : 'UPSTREAM_ERROR',
    });
    return new NextResponse(text, {
      status: realResponse.status,
      headers: { 'Content-Type': contentType || 'text/plain' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = msg.includes('timeout') || msg.includes('abort');
    await logTelemetry({
      manifestId: manifest.id, toolName, agentId, latencyMs: Date.now() - start,
      success: false, errorType: isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR', errorMsg: msg,
    });
    return NextResponse.json({ error: `Proxy request failed: ${msg}` }, { status: 502 });
  }
}