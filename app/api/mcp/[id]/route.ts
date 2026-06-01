import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logTelemetry } from '@/lib/telemetry';

type Params = { params: Promise<{ id: string }> };

type McpExecuteBody = {
  tool?: string;
  input?: unknown;
  agentId?: string;
};

// GET /api/mcp/[id] — returns manifest for agent discovery
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: {
      mcpConfig: {
        select: { mcpEndpoint: true, active: true, rateLimit: true }
      }
    },
  });

  if (!manifest || !manifest.mcpConfig?.active) {
    return NextResponse.json({ error: 'Tool not found or inactive' }, { status: 404 });
  }

  return NextResponse.json({
    type: 'manifest',
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    serverUrl: manifest.serverUrl,
    authType: manifest.authType,
    tools: manifest.tools,
    mcpEndpoint: manifest.mcpConfig.mcpEndpoint,
    docString: manifest.docString,
    tokenCount: manifest.tokenCount,
  });
}

// POST /api/mcp/[id] — execute a tool call
export async function POST(req: NextRequest, { params }: Params) {
  const start = Date.now();
  const { id } = await params;

  let body: McpExecuteBody;
  try {
    body = (await req.json()) as McpExecuteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tool, input, agentId } = body;

  if (!tool) {
    return NextResponse.json({ error: '`tool` field is required' }, { status: 400 });
  }

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: { mcpConfig: true },
  });

  if (!manifest || !manifest.mcpConfig?.active) {
    return NextResponse.json({ error: 'Tool not found or inactive' }, { status: 404 });
  }

  const tools = manifest.tools as Array<{ name: string; endpoint: string; method: string }>;
  const targetTool = tools.find(t => t.name === tool);

  if (!targetTool) {
    await logTelemetry({
      manifestId: manifest.id, toolName: tool, agentId,
      latencyMs: Date.now() - start, success: false, errorType: 'TOOL_NOT_FOUND',
    });
    return NextResponse.json({ error: `Tool "${tool}" not found in this manifest` }, { status: 404 });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (manifest.authType === 'apikey' && manifest.authHeader) {
    const key = req.headers.get('x-tool-api-key');
    if (!key) return NextResponse.json({ error: 'Missing x-tool-api-key header' }, { status: 401 });
    headers[manifest.authHeader] = key;
  }

  try {
    const upstream = await fetch(`${manifest.serverUrl}${targetTool.endpoint}`, {
      method: targetTool.method || 'POST',
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(manifest.mcpConfig.timeout),
    });

    const result = await upstream.json();
    await logTelemetry({
      manifestId: manifest.id, toolName: tool, agentId,
      latencyMs: Date.now() - start, success: upstream.ok,
      errorType: upstream.ok ? undefined : 'UPSTREAM_ERROR',
    });

    return NextResponse.json(result, { status: upstream.status });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = msg.includes('timeout') || msg.includes('abort');
    await logTelemetry({
      manifestId: manifest.id, toolName: tool, agentId,
      latencyMs: Date.now() - start, success: false,
      errorType: isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      errorMsg: msg,
    });
    return NextResponse.json({ error: 'Tool execution failed: ' + msg }, { status: 500 });
  }
}
