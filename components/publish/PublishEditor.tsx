'use client';

import { useMemo, useState } from 'react';
import { Manifest, validateManifest } from '@/lib/manifest-validator';
import { DOMAIN_OPTIONS } from '@/lib/domains';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { CopyButton } from '@/components/ui/CopyButton';
import { EMPTY_MANIFEST } from '@/lib/constants';
import { Lock } from 'lucide-react';

export function PublishEditor({ compact }: { compact?: boolean }) {
  const [yamlMode, setYamlMode] = useState(false);
  const [yaml, setYaml] = useState('');
  const [draft, setDraft] = useState<Manifest>(EMPTY_MANIFEST);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ id: string; mcpEndpoint: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const manifestJson = useMemo(() => JSON.stringify(draft, null, 2), [draft]);

  const readiness = useMemo(() => {
    const v = validateManifest(draft);
    const checks = [
      { label: 'Name present', ok: draft.name.length > 0 },
      { label: 'Valid URL', ok: /^https?:\/\/.+/.test(draft.serverUrl) },
      { label: 'Description', ok: draft.description.length > 0 },
      { label: 'At least one tool', ok: draft.tools.length > 0 },
      { label: 'Tool has endpoint', ok: draft.tools.every((t) => t.endpoint) },
      { label: 'Schema valid', ok: v.valid },
    ];
    return { checks, valid: v.valid && checks.every((c) => c.ok), fieldErrors: v.fieldErrors };
  }, [draft]);

  const publish = async () => {
    const v = validateManifest(draft);
    if (!v.valid) {
      const map: Record<string, string> = {};
      v.fieldErrors.forEach((e) => { map[e.field] = e.message; });
      setErrors(map);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      const map: Record<string, string> = {};
      (data.fieldErrors ?? []).forEach((e: { field: string; message: string }) => {
        map[e.field] = e.message;
      });
      setErrors(map);
      return;
    }
    setSuccess({ id: data.id, mcpEndpoint: data.mcpEndpoint });
  };

  const updateTool = (i: number, patch: Partial<Manifest['tools'][0]>) => {
    const tools = [...draft.tools];
    tools[i] = { ...tools[i], ...patch };
    setDraft({ ...draft, tools });
  };

  if (success) {
    const curl = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/proxy \\
  -H "Content-Type: application/json" \\
  -d '{"manifestId":"${success.id}","toolName":"${draft.tools[0]?.name}","payload":{}}'`;
    return (
      <div className="card p-6 space-y-4">
        <p className="text-accent-green font-semibold">Published successfully</p>
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <span className="text-text-muted">ID:</span> {success.id}
          <CopyButton value={success.id} />
        </div>
        <div className="flex items-center gap-2 font-mono text-[12px] break-all">
          <span className="text-text-muted">MCP:</span> {success.mcpEndpoint}
          <CopyButton value={success.mcpEndpoint} />
        </div>
        <CodeBlock code={curl} language="bash" />
      </div>
    );
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
      <div className="card p-4 bg-[#0d0d0d] space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-[16px] font-semibold">Manifest editor</h2>
          <button type="button" className="text-[12px] text-accent-blue" onClick={() => setYamlMode(!yamlMode)}>
            {yamlMode ? 'Form editor' : 'Paste YAML instead'}
          </button>
        </div>

        {yamlMode ? (
          <textarea
            className="input font-mono min-h-[400px]"
            value={yaml || manifestJson}
            onChange={(e) => setYaml(e.target.value)}
            placeholder="Paste YAML or JSON manifest…"
          />
        ) : (
          <>
            <input
              className="input text-[18px]"
              placeholder="My Tool Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {errors.name && <p className="text-[12px] text-accent-red">{errors.name}</p>}

            <textarea
              className="input"
              rows={3}
              placeholder="Analyzes GitHub repositories and returns open issues, PR counts, and contributor stats."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />

            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input
                className="input pl-10"
                placeholder="https://api.example.com/v1"
                value={draft.serverUrl}
                onChange={(e) => setDraft({ ...draft, serverUrl: e.target.value })}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(['none', 'bearer', 'apikey', 'oauth2'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setDraft({ ...draft, authType: a })}
                  className={`px-3 py-1 rounded-[6px] text-[12px] capitalize ${draft.authType === a ? 'bg-[#1f1f1f] text-white' : 'text-[#666]'}`}
                >
                  {a === 'apikey' ? 'API Key' : a}
                </button>
              ))}
            </div>

            <select
              className="input"
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>

            <input
              className="input max-w-[120px] ml-auto block text-right"
              value={draft.version}
              onChange={(e) => setDraft({ ...draft, version: e.target.value })}
            />

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-[12px] text-text-muted font-medium">Tools</p>
              {draft.tools.map((tool, i) => (
                <div key={i} className="card p-3 space-y-2">
                  <input className="input" placeholder="Tool name" value={tool.name} onChange={(e) => updateTool(i, { name: e.target.value })} />
                  <input className="input" placeholder="Endpoint" value={tool.endpoint} onChange={(e) => updateTool(i, { endpoint: e.target.value })} />
                  <select className="input" value={tool.method} onChange={(e) => updateTool(i, { method: e.target.value as Manifest['tools'][number]['method'] })}>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              ))}
              {draft.tools.length < 8 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDraft({ ...draft, tools: [...draft.tools, { name: '', description: '', endpoint: '/', method: 'POST', inputSchema: { type: 'object', properties: {} } }] })}
                >
                  + Add tool
                </button>
              )}
            </div>
          </>
        )}

        <button type="button" className="btn-primary w-full" disabled={!readiness.valid || loading} onClick={publish}>
          {loading ? 'Publishing…' : 'Publish manifest'}
        </button>
      </div>

      {!compact && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-[14px] font-medium mb-3">Live preview</h3>
            <CodeBlock code={manifestJson} language="json" />
          </div>
          <div className="card p-4">
            <h3 className="text-[14px] font-medium mb-3">Readiness</h3>
            <ul className="space-y-2 text-[12px]">
              {readiness.checks.map((c) => (
                <li key={c.label} className={c.ok ? 'text-accent-green' : 'text-text-muted'}>
                  {c.ok ? '✓' : '○'} {c.label}
                </li>
              ))}
            </ul>
            {readiness.fieldErrors.map((e) => (
              <p key={e.field} className="text-[12px] text-accent-red mt-2">{e.field}: {e.message}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
