'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DOMAIN_OPTIONS, domainMeta } from '@/lib/domains';
import { formatRelative } from '@/lib/relative-time';
import { Package } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  description: string;
  serverUrl: string;
  domain?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  mcpConfig?: { mcpEndpoint: string; active: boolean } | null;
};

function ToolCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-8 w-full" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  );
}

export default function RegistryPageClient() {
  const searchParams = useSearchParams();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [domain, setDomain] = useState(searchParams.get('domain') ?? 'all');

  const fetchTools = useCallback(async (q: string, d: string) => {
    setLoading(true);

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (d !== 'all') params.set('domain', d);

    const res = await fetch(`/api/registry?${params}`);
    const data = await res.json();

    setTools(Array.isArray(data) ? data : data.tools ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchTools(query, domain), 300);
    return () => clearTimeout(t);
  }, [query, domain, fetchTools]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-[24px] font-semibold">Registry</h1>

        <input
          className="input max-w-xs"
          placeholder="Search tools…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setDomain('all')}
          className={`px-3 py-1 rounded-[6px] text-[12px] ${
            domain === 'all'
              ? 'bg-[#1f1f1f] text-white'
              : 'text-[#666]'
          }`}
        >
          All
        </button>

        {DOMAIN_OPTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDomain(d.id)}
            className={`px-3 py-1 rounded-[6px] text-[12px] flex items-center gap-1.5 ${
              domain === d.id
                ? 'bg-[#1f1f1f] text-white'
                : 'text-[#666]'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: d.color }}
            />
            {d.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && tools.length === 0 && (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={
            query
              ? `No tools found for "${query}"`
              : 'No tools published yet'
          }
          description="Publish your first tool to make it discoverable by agents."
          cta={{
            label: 'Publish a tool',
            href: '/publish',
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const meta = domainMeta(tool.domain);
          const endpoint = tool.mcpConfig?.mcpEndpoint ?? '';

          return (
            <div key={tool.id} className="card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link
                  href={`/registry/${tool.id}`}
                  className="text-[16px] font-semibold text-white hover:underline"
                >
                  {tool.name}
                </Link>

                <Badge variant="info" className="shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block mr-1"
                    style={{ background: meta.color }}
                  />
                  {meta.label}
                </Badge>
              </div>

              <p className="font-mono text-[12px] text-text-muted truncate mb-2">
                {tool.serverUrl}
              </p>

              <p className="text-[14px] text-text-secondary line-clamp-2 flex-1 mb-4">
                {tool.description}
              </p>

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-[12px] text-text-muted">
                  {formatRelative(
                    tool.publishedAt ??
                      tool.createdAt ??
                      new Date().toISOString()
                  )}
                </span>

                <div className="flex gap-2">
                  {endpoint && <CopyButton value={endpoint} />}

                  <Link
                    href={`/registry/${tool.id}`}
                    className="btn-ghost"
                  >
                    View manifest
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}