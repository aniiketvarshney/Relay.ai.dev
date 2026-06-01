import { NextResponse } from 'next/server';
import { getDatabaseEnvStatus, isDatabaseConfigured } from './env';

export { isDatabaseConfigured };

export function apiError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

/** 503 when DB env vars are missing (common on fresh Vercel deploys). */
export function databaseSetupError() {
  return apiError('Database not configured', 503, {
    hint: 'In Vercel: Project → Storage → Connect Neon (or add env vars manually).',
    required: ['POSTGRES_URL', 'DIRECT_URL'],
    accepted_aliases: [
      'POSTGRES_PRISMA_URL',
      'DATABASE_URL',
      'POSTGRES_URL_NON_POOLING',
    ],
    next_steps: [
      'Connect Neon to your Relay project in Vercel Storage',
      'Redeploy after env vars appear',
      'Run schema once: npx prisma db push (local, with same POSTGRES_URL)',
    ],
    env_detected: getDatabaseEnvStatus(),
    health: '/api/health',
  });
}

/** 503 when env exists but DB is unreachable or schema not pushed. */
export function databaseConnectionError(cause?: string) {
  return apiError('Database connection failed', 503, {
    hint: cause ?? 'Check Neon is active and run: npx prisma db push',
    env_detected: getDatabaseEnvStatus(),
    health: '/api/health',
  });
}
