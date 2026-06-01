'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PAGES = [
  { href: '/', label: 'Dashboard' },
  { href: '/registry', label: 'Registry' },
  { href: '/publish', label: 'Publish' },
  { href: '/security', label: 'Security' },
  { href: '/demo', label: 'Demo' },
  { href: '/docs', label: 'Docs' },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');

  if (!open) return null;

  const close = () => {
    setQ('');
    onClose();
  };

  const filtered = PAGES.filter((p) =>
    p.label.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={close} />
      <div className="relative w-full max-w-md card p-2">
        <input
          autoFocus
          className="input border-0 mb-2"
          placeholder="Search pages… (⌘K)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul>
          {filtered.map((p) => (
            <li key={p.href}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-[6px] text-[14px] hover:bg-[#1a1a1a]"
                onClick={() => {
                  router.push(p.href);
                  close();
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
