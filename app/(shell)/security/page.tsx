'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { formatRelative } from '@/lib/relative-time';

type Event = {
  id: string;
  calledAt: string;
  toolName: string;
  manifestName: string;
  manifestId: string;
  verdict: 'ALLOWED' | 'FLAGGED' | 'BLOCKED';
  threatType: string | null;
  agentId: string | null;
  latencyMs: number;
  errorMsg: string | null;
};

export default function SecurityPage() {
  const [verdict, setVerdict] = useState('all');
  const [days, setDays] = useState('7');
  const [agentQ, setAgentQ] = useState('');
  const [data, setData] = useState<{
    events: Event[];
    summary: { total: number; allowed: number; flagged: number; blocked: number };
    threatBreakdown: { type: string; count: number; pct: number }[];
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ days, limit: '50' });
    if (verdict !== 'all') params.set('verdict', verdict);
    if (agentQ.trim()) params.set('agentId', agentQ.trim());
    const load = () => fetch(`/api/security/events?${params}`).then((r) => r.json()).then(setData);
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [verdict, days, agentQ]);

  const verdictBadge = (v: Event['verdict']) => {
    if (v === 'ALLOWED') return <Badge variant="success">ALLOWED</Badge>;
    if (v === 'BLOCKED') return <Badge variant="danger">BLOCKED</Badge>;
    return <Badge variant="warning">FLAGGED</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold">Security</h1>
        <p className="text-[14px] text-text-secondary">Layer 2 proxy audit log</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Requests today" value={data?.summary.total ?? '—'} />
        <StatCard label="Flagged" value={data?.summary.flagged ?? '—'} variant="default" />
        <div className={`card p-4 ${(data?.summary.blocked ?? 0) > 0 ? 'bg-accent-red/5' : ''}`}>
          <div className="flex items-center gap-2 font-mono text-[32px] text-accent-red">
            {(data?.summary.blocked ?? 0) > 0 && <AlertTriangle className="w-5 h-5" />}
            {data?.summary.blocked ?? '—'}
          </div>
          <div className="text-[12px] text-text-muted mt-2">Blocked</div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-[14px] font-medium mb-4">Threat breakdown</h2>
        <div className="space-y-3">
          {(data?.threatBreakdown ?? []).map((t) => (
            <div key={t.type}>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-mono">{t.type}</span>
                <span className="text-text-muted">{t.count} ({t.pct}%)</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent-amber" style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'ALLOWED', 'FLAGGED', 'BLOCKED'].map((v) => (
          <button key={v} type="button" onClick={() => setVerdict(v)} className={`btn-ghost ${verdict === v ? 'text-white' : ''}`}>{v}</button>
        ))}
        {['1', '7', '30'].map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={`btn-ghost ${days === d ? 'text-white' : ''}`}>{d === '1' ? 'Today' : `${d} days`}</button>
        ))}
        <input className="input max-w-[200px]" placeholder="Agent ID" value={agentQ} onChange={(e) => setAgentQ(e.target.value)} />
      </div>

      <div className="card p-4">
        <DataTable
          rows={data?.events ?? []}
          columns={[
            { key: 'time', header: 'Time', render: (r) => <span className="font-mono">{formatRelative(r.calledAt)}</span> },
            { key: 'tool', header: 'Tool', render: (r) => <Link href={`/registry/${r.manifestId}`} className="text-accent-blue hover:underline">{r.toolName}</Link> },
            { key: 'verdict', header: 'Verdict', render: (r) => verdictBadge(r.verdict) },
            { key: 'threat', header: 'Threat', render: (r) => <span className="font-mono text-[12px]">{r.threatType ?? '—'}</span> },
            { key: 'agent', header: 'Agent', render: (r) => <span className="font-mono">{r.agentId?.slice(0, 8) ?? '—'}</span> },
            { key: 'latency', header: 'Latency', render: (r) => `${r.latencyMs}ms` },
          ]}
          onRowClick={(r) => setExpanded(expanded === r.id ? null : r.id)}
        />
        {expanded && data?.events.find((e) => e.id === expanded) && (
          <div className="mt-4 p-4 bg-[#0d0d0d] rounded-[8px] font-mono text-[12px]">
            <pre>{JSON.stringify(data.events.find((e) => e.id === expanded), null, 2)}</pre>
            <button type="button" className="btn-ghost mt-2">Mark as false positive</button>
          </div>
        )}
      </div>
    </div>
  );
}
