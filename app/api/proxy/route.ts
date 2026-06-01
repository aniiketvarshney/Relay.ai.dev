import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { checkPayloadSecurity } from '@/lib/payload-security';
import { prisma } from '@/lib/prisma';
import { logTelemetry } from '@/lib/telemetry';

const API_KEYS: Record<string, string> = {
  'api.stripe.com': process.env.STRIPE_API_KEY || '',
  'api.sendgrid.com': process.env.SENDGRID_API_KEY || '',
  'slack.com': process.env.SLACK_API_KEY || '',
  'api.notion.com': process.env.NOTION_API_KEY || '',
  'api.twilio.com': process.env.TWILIO_API_KEY || '',
  'api.resend.com': process.env.RESEND_API_KEY || '',
  'api.airtable.com': process.env.AIRTABLE_API_KEY || '',
  'api.linear.app': process.env.LINEAR_API_KEY || '',
};

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
  const tool = tools.find((t) => t.name === toolName);

  if (!tool) {
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

  const serverDomain = new URL(manifest.serverUrl).hostname;
  const apiKey = API_KEYS[serverDomain];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

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

  const toolEndpoint = tool.endpoint;
  const targetUrl = manifest.serverUrl + toolEndpoint;
  const method = (tool.method ?? 'POST').toUpperCase();
  const timeout = manifest.mcpConfig.timeout;

  try {
    const realResponse = await fetch(targetUrl, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(timeout),
    });

    const contentType = realResponse.headers.get('content-type') ?? '';
    const latencyMs = Date.now() - start;

    if (contentType.includes('application/json')) {
      const realData = await realResponse.json();
      await logTelemetry({
        manifestId: manifest.id,
        toolName,
        agentId,
        latencyMs,
        success: realResponse.ok,
        errorType: realResponse.ok ? undefined : 'UPSTREAM_ERROR',
      });
      return NextResponse.json(
        realResponse.ok
          ? { success: true, data: realData }
          : { success: false, data: realData },
        { status: realResponse.ok ? 200 : realResponse.status }
      );
    }

    const text = await realResponse.text();
    await logTelemetry({
      manifestId: manifest.id,
      toolName,
      agentId,
      latencyMs,
      success: realResponse.ok,
      errorType: realResponse.ok ? undefined : 'UPSTREAM_ERROR',
    });
    return new NextResponse(text, {
      status: realResponse.status,
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
