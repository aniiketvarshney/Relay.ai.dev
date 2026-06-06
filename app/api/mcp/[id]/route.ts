import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: MCP_HEADERS });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const manifest = await prisma.manifest.findUnique({
    where: { id },
  });
  if (!manifest) {
    return jsonWithMcpHeaders({ error: 'Tool not found' }, { status: 404 });
  }
  return jsonWithMcpHeaders({
    type: 'manifest',
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description ?? '',
    endpoint: manifest.endpoint ?? '',
    domain: manifest.domain ?? '',
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let body: McpExecuteBody;
  try {
    body = (await req.json()) as McpExecuteBody;
  } catch {
    return jsonWithMcpHeaders({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const manifest = await prisma.manifest.findUnique({
    where: { id },
  });
  if (!manifest) {
    return jsonWithMcpHeaders({ error: 'Tool not found' }, { status: 404 });
  }

  if (body.method === 'tools/list') {
    return jsonWithMcpHeaders({ tools: [] });
  }

  if (body.method === 'tools/call') {
    return jsonWithMcpHeaders({
      result: 'Tool call received. Route to proxy at /api/proxy with manifestId and toolName.',
    });
  }

  if (body.method !== undefined) {
    return jsonWithMcpHeaders({
      type: 'manifest',
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description ?? '',
      endpoint: manifest.endpoint ?? '',
      domain: manifest.domain ?? '',
    });
  }

  const { tool } = body;
  if (!tool) {
    return jsonWithMcpHeaders({
      type: 'manifest',
      id: manifest.id,
      name: manifest.name,
    });
  }

  if (!manifest.endpoint) {
    return jsonWithMcpHeaders({ error: 'No endpoint configured' }, { status: 400 });
  }

  try {
    const upstream = await fetch(manifest.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.input),
    });
    const result = await upstream.json();
    return jsonWithMcpHeaders(result, { status: upstream.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return jsonWithMcpHeaders(
      { error: 'Tool execution failed: ' + msg },
      { status: 500 }
    );
  }
}