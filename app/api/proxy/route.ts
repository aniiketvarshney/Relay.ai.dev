import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { checkPayloadSecurity } from '@/lib/payload-security';
import { prisma } from '@/lib/prisma';
import { logTelemetry } from '@/lib/telemetry';

type ManifestTool = {
  name: string;
  endpoint: string;
  method?: string;
};

const ProxyRequestSchema = z.object({
  manifestId: z.string().uuid('manifestId must be a valid UUID'),
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
      {
        error: 'Invalid JSON',
        fieldErrors: [{ field: 'body', message: 'Request body must be valid JSON' }],
      },
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
    include: { mcpConfig: true },
  });

  if (!manifest || !manifest.mcpConfig?.active) {
    await logTelemetry({
      manifestId,
      toolName,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: 'MANIFEST_NOT_FOUND',
    });
    return NextResponse.json({ error: 'Manifest not found or inactive' }, { status: 404 });
  }

  const tools = manifest.tools as ManifestTool[];
  const targetTool = tools.find((t) => t.name === toolName);

  if (!targetTool) {
    await logTelemetry({
      manifestId: manifest.id,
      toolName,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: 'TOOL_NOT_FOUND',
    });
    return NextResponse.json(
      { error: `Tool "${toolName}" not found in manifest "${manifest.name}"` },
      { status: 404 }
    );
  }

  const security = checkPayloadSecurity(payload);
  if (!security.allowed) {
    await logTelemetry({
      manifestId: manifest.id,
      toolName,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: 'SECURITY_BLOCKED',
      errorMsg: `${security.code}: ${security.reason}`,
    });
    return NextResponse.json(
      {
        error: 'Request blocked by security policy',
        code: security.code,
        message: security.reason,
      },
      { status: 403 }
    );
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (manifest.authType === 'apikey' && manifest.authHeader) {
    const key = req.headers.get('x-tool-api-key');
    if (!key) {
      await logTelemetry({
        manifestId: manifest.id,
        toolName,
        agentId,
        latencyMs: Date.now() - start,
        success: false,
        errorType: 'AUTH_REQUIRED',
      });
      return NextResponse.json({ error: 'Missing x-tool-api-key header' }, { status: 401 });
    }
    headers[manifest.authHeader] = key;
  }

  const upstreamUrl = `${manifest.serverUrl}${targetTool.endpoint}`;
  const method = (targetTool.method ?? 'POST').toUpperCase();
  const timeout = manifest.mcpConfig.timeout;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
    });

    const contentType = upstream.headers.get('content-type') ?? '';
    const latencyMs = Date.now() - start;

    if (contentType.includes('application/json')) {
      const result = await upstream.json();
      await logTelemetry({
        manifestId: manifest.id,
        toolName,
        agentId,
        latencyMs,
        success: upstream.ok,
        errorType: upstream.ok ? undefined : 'UPSTREAM_ERROR',
      });
      return NextResponse.json(result, { status: upstream.status });
    }

    const text = await upstream.text();
    await logTelemetry({
      manifestId: manifest.id,
      toolName,
      agentId,
      latencyMs,
      success: upstream.ok,
      errorType: upstream.ok ? undefined : 'UPSTREAM_ERROR',
    });
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': contentType || 'text/plain' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = msg.includes('timeout') || msg.includes('abort');
    await logTelemetry({
      manifestId: manifest.id,
      toolName,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      errorMsg: msg,
    });
    return NextResponse.json({ error: `Proxy request failed: ${msg}` }, { status: 502 });
  }
}
