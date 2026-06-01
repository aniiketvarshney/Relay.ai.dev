'use client';

import { CopyButton } from './CopyButton';

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="relative card p-4 bg-[#0d0d0d]">
      {language && (
        <span className="absolute top-3 left-3 text-[12px] text-text-muted font-mono uppercase">
          {language}
        </span>
      )}
      <div className="absolute top-2 right-2">
        <CopyButton value={code} />
      </div>
      <pre className="font-mono text-[12px] text-text-secondary overflow-x-auto pt-4 whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
