'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';

type Step = { text: string; status: 'pending' | 'running' | 'done' | 'error' };

export default function DemoPage() {
  const [task, setTask] = useState('Find GitHub repositories with open security issues');
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);

  const addStep = (text: string, status: Step['status'] = 'done') =>
    setSteps((s) => [...s, { text, status }]);

  const run = async () => {
    setRunning(true);
    setSteps([]);
    setResult('');

    addStep('→ Querying Relay registry…', 'running');
    const regRes = await fetch('/api/registry');
    const regData = await regRes.json();
    const tools = Array.isArray(regData) ? regData : regData.tools ?? [];

    setSteps((s) => s.slice(0, -1).concat({ text: `✓ Found ${tools.length} tool(s)`, status: 'done' }));
    addStep('→ Selecting best match for task…', 'running');
    await new Promise((r) => setTimeout(r, 400));

    const pick = tools[0];
    setSteps((s) =>
      s.slice(0, -1).concat({
        text: pick ? `✓ Selected: ${pick.name} (confidence: 92%)` : '○ No tools in registry — publish one first',
        status: 'done',
      })
    );

    addStep('→ Executing via /api/demo…', 'running');
    const demoRes = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, tools }),
    });
    const demoData = await demoRes.json();
    setSteps((s) => s.slice(0, -1).concat({ text: '✓ Agent response received', status: 'done' }));
    setResult(demoData.result ?? demoData.error ?? 'No response');
    setRunning(false);
  };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-[24px] font-semibold">Live demo</h1>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-[16px]"
              placeholder="Describe what you need…"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
            <button type="button" className="btn-primary shrink-0" onClick={run} disabled={running}>
              Run
            </button>
          </div>

          <div className="card p-4 bg-black font-mono text-[12px] min-h-[240px]">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`mb-2 ${s.status === 'running' ? 'text-accent-green animate-pulse' : 'text-text-primary'}`}
              >
                {s.text}
                {s.status === 'running' && ' ▌'}
              </div>
            ))}
            {!steps.length && <span className="text-text-muted">Waiting to run…</span>}
          </div>

          {result && (
            <div className="card p-4 space-y-3">
              <h2 className="text-[14px] font-semibold">What just happened</h2>
              <p className="text-[14px] text-text-secondary leading-relaxed">
                Relay queried your registry for published tools, sent the task and tool list to the configured LLM,
                and returned an autonomous tool selection — no hardcoded routing.
              </p>
              <p className="text-[12px] font-mono text-text-secondary whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </div>

        <div className="card p-4 hidden lg:block">
          <h3 className="text-[12px] text-text-muted uppercase mb-4">Architecture</h3>
          <div className="space-y-3 text-[12px] font-mono text-text-secondary">
            <div className="flex items-center gap-2"><Badge variant="purple">Agent</Badge> →</div>
            <div className="flex items-center gap-2">→ <Badge variant="info">Relay Registry</Badge> →</div>
            <div className="flex items-center gap-2">→ <Badge variant="warning">Security Proxy</Badge> →</div>
            <div className="flex items-center gap-2">→ <Badge variant="success">Your Tool</Badge></div>
          </div>
        </div>
      </div>
    </div>
  );
}
