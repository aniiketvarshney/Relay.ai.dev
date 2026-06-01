import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logTelemetry } from '@/lib/telemetry';

type Params = { params: Promise<{ id: string }> };

type ManifestTool = {
  name: string;
  description?: string;
  endpoint?: string;
  method?: string;
  inputSchema?: Record<string, unknown>;
};

type McpExecuteBody = {
  method?: string;
  tool?: string;
  input?: unknown;
  agentId?: string;
};

const MCP_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonWithMcpHeaders(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...MCP_HEADERS, ...init?.headers },
  });
}

function mapMcpTools(tools: unknown) {
  const list = Array.isArray(tools) ? (tools as ManifestTool[]) : [];
  return list.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
  }));
}

type ManifestWithMcp = {
  name: string;
  version: string;
  description: string;
  serverUrl: string;
  authType: string;
  tools: unknown;
  docString: string | null;
  tokenCount: number | null;
  mcpConfig: { mcpEndpoint: string; active: boolean; rateLimit: number | null } | null;
};

function fullManifestPayload(manifest: ManifestWithMcp) {
  return {
    type: 'manifest' as const,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    serverUrl: manifest.serverUrl,
    authType: manifest.authType,
    tools: manifest.tools,
    mcpEndpoint: manifest.mcpConfig!.mcpEndpoint,
    docString: manifest.docString,
    tokenCount: manifest.tokenCount,
  };
}

// OPTIONS /api/mcp/[id] — CORS preflight for ChatGPT and other MCP clients
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: MCP_HEADERS });
}

// GET /api/mcp/[id] — returns manifest for agent discovery (MCP-compatible shape)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: {
      mcpConfig: {
        select: { mcpEndpoint: true, active: true, rateLimit: true },
      },
    },
  });

  if (!manifest || !manifest.mcpConfig?.active) {
    return jsonWithMcpHeaders({ error: 'Tool not found or inactive' }, { status: 404 });
  }

  const mcpTools = mapMcpTools(manifest.tools);

  return jsonWithMcpHeaders({
    ...fullManifestPayload(manifest),
    name: manifest.name,
    description: manifest.description,
    tools: mcpTools,
  });
}

// POST /api/mcp/[id] — MCP protocol methods + execute a tool call
export async function POST(req: NextRequest, { params }: Params) {
  const start = Date.now();
  const { id } = await params;

  let body: McpExecuteBody;
  try {
    body = (await req.json()) as McpExecuteBody;
  } catch {
    return jsonWithMcpHeaders({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const manifest = await prisma.manifest.findUnique({
    where: { id },
    include: { mcpConfig: true },
  });

  if (!manifest || !manifest.mcpConfig?.active) {
    return jsonWithMcpHeaders({ error: 'Tool not found or inactive' }, { status: 404 });
  }

  const mcpTools = mapMcpTools(manifest.tools);

  if (body.method === 'tools/list') {
    return jsonWithMcpHeaders({ tools: mcpTools });
  }

  if (body.method === 'tools/call') {
    return jsonWithMcpHeaders({
      result:
        'Tool call received. Route to proxy at /api/proxy with manifestId and toolName.',
    });
  }

  if (body.method !== undefined) {
    return jsonWithMcpHeaders(fullManifestPayload(manifest));
  }

  const { tool, input, agentId } = body;

  if (!tool) {
    return jsonWithMcpHeaders(fullManifestPayload(manifest));
  }

  const tools = manifest.tools as Array<{ name: string; endpoint: string; method: string }>;
  const targetTool = tools.find((t) => t.name === tool);

  if (!targetTool) {
    await logTelemetry({
      manifestId: manifest.id,
      toolName: tool,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: 'TOOL_NOT_FOUND',
    });
    return jsonWithMcpHeaders(
      { error: `Tool "${tool}" not found in this manifest` },
      { status: 404 }
    );
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (manifest.authType === 'apikey' && manifest.authHeader) {
    const key = req.headers.get('x-tool-api-key');
    if (!key) {
      return jsonWithMcpHeaders({ error: 'Missing x-tool-api-key header' }, { status: 401 });
    }
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
      manifestId: manifest.id,
      toolName: tool,
      agentId,
      latencyMs: Date.now() - start,
      success: upstream.ok,
      errorType: upstream.ok ? undefined : 'UPSTREAM_ERROR',
    });

    return jsonWithMcpHeaders(result, { status: upstream.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = msg.includes('timeout') || msg.includes('abort');
    await logTelemetry({
      manifestId: manifest.id,
      toolName: tool,
      agentId,
      latencyMs: Date.now() - start,
      success: false,
      errorType: isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      errorMsg: msg,
    });
    return jsonWithMcpHeaders(
      { error: 'Tool execution failed: ' + msg },
      { status: 500 }
    );
  }
}
