import type { NextRequest } from 'next/server';

/** Resolve the public app URL (works locally and on Vercel). */
export function getBaseUrl(req?: NextRequest): string {
  if (req) {
    const origin = req.headers.get('origin');
    if (origin) return origin.replace(/\/$/, '');

    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (host) {
      const proto = req.headers.get('x-forwarded-proto') ?? 'https';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
