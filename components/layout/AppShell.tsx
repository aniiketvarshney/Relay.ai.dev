'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Library,
  Upload,
  Shield,
  Play,
  BookOpen,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/constants';
import { CommandPalette } from '@/components/layout/CommandPalette';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/registry', label: 'Registry', icon: Library },
  { href: '/publish', label: 'Publish', icon: Upload },
  { href: '/security', label: 'Security', icon: Shield },
  { href: '/demo', label: 'Demo', icon: Play },
  { href: '/docs', label: 'Docs', icon: BookOpen },
];

const MOBILE_NAV = NAV.slice(0, 5);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [health, setHealth] = useState<{ healthy: boolean; status: string } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ healthy: false, status: 'unreachable' }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg text-text-primary">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] bg-bg border-r border-border z-40"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="p-4">
          <Link href="/" className="text-[16px] font-bold text-white">
            Relay
          </Link>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] transition-colors duration-150 ${
                isActive(href)
                  ? 'bg-[#1f1f1f] text-white font-medium'
                  : 'text-[#666666] hover:text-text-secondary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <Link href="/status" className="flex items-center gap-2 text-[12px]">
            <span
              className={`w-2 h-2 rounded-full ${health?.healthy ? 'bg-accent-green' : 'bg-accent-red'}`}
            />
            <span className="text-text-secondary">
              {health?.healthy ? 'All systems operational' : 'Degraded'}
            </span>
          </Link>
          <p className="font-mono text-[12px] text-text-muted">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-[220px] pb-16 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-[1400px]">{children}</div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around py-2 z-40">
        {MOBILE_NAV.map(({ href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`p-2 ${isActive(href) ? 'text-white' : 'text-[#666]'}`}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
