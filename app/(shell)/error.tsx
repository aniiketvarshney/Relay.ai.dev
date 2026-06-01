'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-[20px] font-semibold mb-3">Something went wrong</h1>
        <p className="text-[14px] text-text-secondary mb-8">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={reset} className="btn-primary">Try again</button>
          <Link href="/" className="btn-ghost">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
