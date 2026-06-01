'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SlideOver } from '@/components/ui/SlideOver';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { formatRelative, formatAbsolute } from '@/lib/relative-time';

type Activity = {
  id: string;
  calledAt: string;
  toolName: string;
  manifestName: string;
  agentId: string | null;
  latencyMs: number;
  verdict: 'ALLOWED' | 'FLAGGED' | 'BLOCKED';
  errorMsg: string | null;
};

type DashboardData = {
  stats: {
    totalTools: number;
    callsToday: number;
    proxiedToday: number;
    threatsBlockedToday: number;
  };
  sparkline: { date: string; count: number }[];
  recentActivity: Activity[];
  topTools: { name: string; domain: string | null; calls: number; pct: number }[];
};

function verdictBadge(v: Activity['verdict']) {
  if (v === 'ALLOWED') return <Badge variant="success">ALLOWED</Badge>;
  if (v === 'BLOCKED') return <Badge variant="danger">BLOCKED</Badge>;
  return <Badge variant="warning">FLAGGED</Badge>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [quick, setQuick] = useState({ name: '', description: '', serverUrl: '', domain: 'devtools', toolName: '', endpoint: '/api' });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const quickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: quick.name,
        description: quick.description,
        serverUrl: quick.serverUrl,
        domain: quick.domain,
        authType: 'none',
        tools: [{ name: quick.toolName || 'default', description: quick.description, endpoint: quick.endpoint, method: 'POST' }],
      }),
    });
    setPublishing(false);
    window.location.href = '/registry';
  };

  const maxSpark = Math.max(...(data?.sparkline.map((s) => s.count) ?? [1]), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold mb-1">Dashboard</h1>
        <p className="text-[14px] text-text-secondary">System health at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tools registered" value={loading ? '—' : data?.stats.totalTools ?? 0} />
        <StatCard
          label="Agent calls today"
          value={loading ? '—' : data?.stats.callsToday ?? 0}
          delta={data?.sparkline ? `${data.sparkline[data.sparkline.length - 1]?.count ?? 0} today in 7d trend` : undefined}
        />
        <StatCard label="Proxied today" value={loading ? '—' : data?.stats.proxiedToday ?? 0} />
        <StatCard
          label="Threats blocked today"
          value={loading ? '—' : data?.stats.threatsBlockedToday ?? 0}
          variant={(data?.stats.threatsBlockedToday ?? 0) > 0 ? 'danger' : 'success'}
        />
      </div>

      {data?.sparkline && (
        <div className="card p-4 flex items-end gap-1 h-16">
          {data.sparkline.map((s) => (
            <div
              key={s.date}
              className="flex-1 bg-accent-blue/40 rounded-t-[2px]"
              style={{ height: `${Math.max(4, (s.count / maxSpark) * 100)}%` }}
              title={`${s.date}: ${s.count}`}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card p-4">
          <h2 className="text-[16px] font-semibold mb-4">Recent activity</h2>
          <DataTable
            loading={loading}
            rows={data?.recentActivity ?? []}
            columns={[
              {
                key: 'time',
                header: 'Time',
                render: (r) => (
                  <span className="font-mono text-text-secondary" title={formatAbsolute(r.calledAt)}>
                    {formatRelative(r.calledAt)}
                  </span>
                ),
              },
              { key: 'tool', header: 'Tool', render: (r) => r.toolName },
              { key: 'verdict', header: 'Verdict', render: (r) => verdictBadge(r.verdict) },
              {
                key: 'agent',
                header: 'Agent',
                render: (r) => (
                  <span className="font-mono text-text-muted">{r.agentId?.slice(0, 8) ?? '—'}…</span>
                ),
              },
              {
                key: 'latency',
                header: 'Latency',
                render: (r) => <span className="font-mono">{r.latencyMs}ms</span>,
              },
            ]}
            onRowClick={setSelected}
          />
        </div>

        <div className="lg:col-span-2 card p-4">
          <h2 className="text-[16px] font-semibold mb-4">Top tools</h2>
          <div className="space-y-4">
            {(data?.topTools ?? []).map((t) => (
              <div key={t.name}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span>{t.name}</span>
                  <span className="font-mono text-text-muted">{t.calls}</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
            {!loading && !data?.topTools.length && (
              <p className="text-[12px] text-text-muted">No calls yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-[16px] font-semibold mb-4">Quick publish</h2>
        <form onSubmit={quickPublish} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="input" placeholder="Tool name" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} required />
          <input className="input" placeholder="Server URL" value={quick.serverUrl} onChange={(e) => setQuick({ ...quick, serverUrl: e.target.value })} required />
          <textarea className="input md:col-span-2" placeholder="Description" rows={2} value={quick.description} onChange={(e) => setQuick({ ...quick, description: e.target.value })} required />
          <input className="input" placeholder="Tool endpoint" value={quick.endpoint} onChange={(e) => setQuick({ ...quick, endpoint: e.target.value })} />
          <input className="input" placeholder="Tool name (API method)" value={quick.toolName} onChange={(e) => setQuick({ ...quick, toolName: e.target.value })} />
          <button type="submit" className="btn-primary md:col-span-2" disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </form>
        <Link href="/publish" className="text-[12px] text-accent-blue mt-3 inline-block">
          Full editor →
        </Link>
      </div>

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title="Event detail">
        {selected && (
          <div className="space-y-4">
            <p className="text-[12px] text-text-secondary">{selected.manifestName} · {selected.toolName}</p>
            {verdictBadge(selected.verdict)}
            {selected.errorMsg && <p className="text-[12px] text-accent-red">{selected.errorMsg}</p>}
            <CodeBlock code={JSON.stringify(selected, null, 2)} language="json" />
          </div>
        )}
      </SlideOver>
    </div>
  );
}
