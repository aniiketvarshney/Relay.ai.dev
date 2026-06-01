'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CodeBlock } from '@/components/ui/CodeBlock';

export default function StatusPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth);
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-[24px] font-semibold">System status</h1>
      {health && (
        <>
          <div className="flex items-center gap-3">
            <Badge variant={health.healthy ? 'success' : 'danger'}>
              {(health.status as string)?.toUpperCase()}
            </Badge>
            <span className="text-[14px] text-text-secondary">{health.timestamp as string}</span>
          </div>
          <CodeBlock code={JSON.stringify(health, null, 2)} language="json" />
        </>
      )}
      {!health && <div className="skeleton h-32" />}
    </div>
  );
}
