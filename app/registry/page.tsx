'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tool {
  name: string;
  description: string;
  endpoint: string;
  method: string;
}

interface Manifest {
  id: string;
  name: string;
  description: string;
  serverUrl: string;
  authType: string;
  domain: string;
  version: string;
  tools: Tool[];
  createdAt: string | null;
  updatedAt: string | null;
}

interface RegistryResponse {
  count: number;
  tools: Manifest[];
  filters: { q: string | null; domain: string | null };
}

const DOMAINS = ['All', 'Finance', 'Communication', 'DevTools', 'Productivity', 'Analytics', 'AI'];

const AUTH_COLORS: Record<string, string> = {
  none: 'bg-gray-500/20 text-gray-300',
  apikey: 'bg-yellow-500/20 text-yellow-300',
  bearer: 'bg-blue-500/20 text-blue-300',
  oauth2: 'bg-purple-500/20 text-purple-300',
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  DELETE: 'text-red-400',
  PATCH: 'text-orange-400',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RegistryPage() {
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (domain !== 'All') params.set('domain', domain.toLowerCase());

    setLoading(true);
    fetch(`/api/registry?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load registry'); setLoading(false); });
  }, [search, domain]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Registry</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {loading ? 'Loading...' : `${data?.count ?? 0} tools registered`}
            </p>
          </div>
          <Link
            href="/publish"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium rounded-lg transition-colors"
          >
            + Publish tool
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
          <div className="flex gap-2 flex-wrap">
            {DOMAINS.map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  domain === d
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-white/10 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/5 rounded w-full mb-2" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {data.tools.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-4xl mb-4">📭</p>
                <p className="text-white/50 text-sm">No tools found</p>
                <Link
                  href="/publish"
                  className="inline-block mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium rounded-lg transition-colors"
                >
                  Publish the first tool
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.tools.map((manifest) => (
                  <div
                    key={manifest.id}
                    className="group border border-white/10 hover:border-white/25 rounded-xl p-5 transition-all bg-white/[0.02] hover:bg-white/[0.04]"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{manifest.name}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{timeAgo(manifest.createdAt)}</p>
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${AUTH_COLORS[manifest.authType?.toLowerCase()] ?? AUTH_COLORS.none}`}>
                        {manifest.authType ?? 'none'}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-white/50 text-xs leading-relaxed mb-4 line-clamp-2">
                      {manifest.description || 'No description provided.'}
                    </p>

                    {/* Tools list */}
                    <div className="space-y-1.5 mb-4">
                      {(manifest.tools ?? []).slice(0, 3).map((tool, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`font-mono font-semibold text-[10px] w-10 flex-shrink-0 ${METHOD_COLORS[tool.method] ?? 'text-white/40'}`}>
                            {tool.method}
                          </span>
                          <span className="text-white/60 truncate">{tool.name}</span>
                        </div>
                      ))}
                      {(manifest.tools ?? []).length > 3 && (
                        <p className="text-white/30 text-xs">+{manifest.tools.length - 3} more</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <span className="text-white/30 text-[10px] font-mono truncate max-w-[140px]">
                        {manifest.domain ?? 'general'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(manifest.id, manifest.id)}
                          className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
                          title="Copy manifest ID"
                        >
                          {copied === manifest.id ? '✓ copied' : 'copy id'}
                        </button>
                        <Link
                          href={`/registry/${manifest.id}`}
                          className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/70 transition-colors"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}