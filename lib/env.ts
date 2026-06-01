/**
 * Normalize DB env vars for Vercel + Neon.
 * Vercel may set POSTGRES_URL, POSTGRES_PRISMA_URL, DATABASE_URL, etc.
 */
export function getDatabaseUrl(): string | undefined {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.DATABASE_URL
  );
}

export function getDirectUrl(): string | undefined {
  return (
    process.env.DIRECT_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL_UNPOOLED ??
    getDatabaseUrl()
  );
}

/** Map Vercel/Neon env names → names Prisma expects in schema.prisma */
export function ensurePrismaEnv(): void {
  const url = getDatabaseUrl();
  const direct = getDirectUrl();
  if (url && !process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL = url;
  }
  if (direct && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = direct;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

/** Which env keys are present (for /api/health — never log values). */
export function getDatabaseEnvStatus(): Record<string, boolean> {
  return {
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING),
  };
}
