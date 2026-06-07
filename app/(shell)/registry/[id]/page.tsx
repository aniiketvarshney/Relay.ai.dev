'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { DataTable } from '@/components/ui/DataTable';
import { domainMeta } from '@/lib/domains';
import { formatRelative } from '@/lib/relative-time';

type Tab = 'overview' | 'analytics' | 'security';

function ToolDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/registry/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  if (!data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    );
  }

  if (data.error) {
    return <p className="text-accent-red">Tool not found</p>;
  }

  const meta = domainMeta(data.domain as string);

  const mcpEndpoint =
    (data.mcpConfig as { mcpEndpoint?: string })?.mcpEndpoint ?? '';

  const analytics = data.analytics as {
    dailyVolume: { date: string; count: number }[];
    successRate: string;
    avgLatencyMs: number;
    topAgents: { agentId: string; count: number }[];
    callCount: number;
  };

  const security = data.security as {
    events: {
      id: string;
      verdict: string;
      threatType: string | null;
      calledAt: string;
    }[];
    verdicts: {
      allowed: number;
      flagged: number;
      blocked: number;
    };
  };

  const tools = data.tools as {
    name: string;
    endpoint: string;
    method: string;
  }[];

  const proxySnippet = `POST /api/proxy
{
  "manifestId": "${id}",
  "toolName": "${tools[0]?.name ?? 'your_tool'}",
  "payload": { /* your input */ }
}`;

  // Fixed: prevents crash if analytics or dailyVolume is missing
  const maxBar = Math.max(
    ...(analytics?.dailyVolume ?? []).map((d) => d.count),
    1
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-semibold">
            {data.name as string}
          </h1>

          <p className="font-mono text-[12px] text-text-muted mt-1">
            {data.serverUrl as string}
          </p>

          <div className="flex gap-2 mt-3">
            <Badge variant="info">{meta.label}</Badge>
            <Badge variant="neutral">
              {data.authType as string}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <CopyButton value={mcpEndpoint} />

          <button type="button" className="btn-ghost">
            Copy MCP Endpoint
          </button>

          <Link
            href={`/api/registry/${id}`}
            className="btn-ghost"
            target="_blank"
          >
            View Raw Manifest
          </Link>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border mb-6">
        {(['overview', 'analytics', 'security'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[14px] capitalize border-b-2 -mb-px ${
              tab === t
                ? 'border-accent-blue text-white'
                : 'border-transparent text-[#666]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {data.description as string}
          </p>

          <div className="card p-4 space-y-3">
            <h3 className="text-[14px] font-medium">Tools</h3>

            {tools.map((t) => (
              <div
                key={t.name}
                className="font-mono text-[12px] border-b border-border pb-2"
              >
                <span className="text-white">{t.name}</span>

                <span className="text-text-muted ml-2">
                  {t.method} {t.endpoint}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[14px] font-medium mb-2">
              Integration snippet
            </h3>

            <CodeBlock code={proxySnippet} language="http" />
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 font-mono text-[24px]">
              {analytics.callCount}
            </div>

            <div className="card p-4 font-mono text-[24px]">
              {analytics.successRate}%
            </div>

            <div className="card p-4 font-mono text-[24px]">
              {analytics.avgLatencyMs}ms
            </div>
          </div>

          <div className="card p-4 flex items-end gap-2 h-32">
            {analytics.dailyVolume.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-accent-blue/50 rounded-t"
                  style={{
                    height: `${(d.count / maxBar) * 100}%`,
                    minHeight: 4,
                  }}
                />

                <span className="text-[12px] text-text-muted font-mono">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>

          <DataTable
            rows={analytics.topAgents.map((a, i) => ({
              id: String(i),
              ...a,
            }))}
            columns={[
              {
                key: 'agent',
                header: 'Agent',
                render: (r) => (
                  <span className="font-mono">
                    {(r as { agentId: string }).agentId}
                  </span>
                ),
              },
              {
                key: 'count',
                header: 'Calls',
                render: (r) => (r as { count: number }).count,
              },
            ]}
          />
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <p className="text-[12px] text-text-secondary">
            Allowed {security.verdicts.allowed} · Flagged{' '}
            {security.verdicts.flagged} · Blocked{' '}
            {security.verdicts.blocked}
          </p>

          <DataTable
            rows={security.events.map((e) => ({
              ...e,
              id: e.id,
            }))}
            columns={[
              {
                key: 'time',
                header: 'Time',
                render: (r) => (
                  <span className="font-mono">
                    {formatRelative(
                      (r as { calledAt: string }).calledAt
                    )}
                  </span>
                ),
              },
              {
                key: 'verdict',
                header: 'Verdict',
                render: (r) => (r as { verdict: string }).verdict,
              },
              {
                key: 'threat',
                header: 'Threat',
                render: (r) =>
                  (r as { threatType: string | null }).threatType ?? '—',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export default function ToolDetailPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <ToolDetailContent />
    </Suspense>
  );
}